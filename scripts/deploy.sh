#!/bin/bash

# ClinicBoost Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENTS=("development" "staging" "production")

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_usage() {
    echo "Usage: $0 [ENVIRONMENT] [OPTIONS]"
    echo ""
    echo "Environments:"
    echo "  development  Deploy to development environment"
    echo "  staging      Deploy to staging environment"
    echo "  production   Deploy to production environment"
    echo ""
    echo "Options:"
    echo "  --build-only     Only build, don't deploy"
    echo "  --no-tests       Skip running tests"
    echo "  --force          Force deployment without confirmation"
    echo "  --rollback       Rollback to previous version"
    echo "  --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 staging"
    echo "  $0 production --force"
    echo "  $0 staging --build-only"
}

validate_environment() {
    local env=$1
    if [[ ! " ${ENVIRONMENTS[@]} " =~ " ${env} " ]]; then
        log_error "Invalid environment: $env"
        log_info "Valid environments: ${ENVIRONMENTS[*]}"
        exit 1
    fi
}

check_prerequisites() {
    local env=$1
    
    log_info "Checking prerequisites for $env deployment..."
    
    # Check if required tools are installed
    command -v docker >/dev/null 2>&1 || { log_error "Docker is required but not installed."; exit 1; }
    command -v docker-compose >/dev/null 2>&1 || { log_error "Docker Compose is required but not installed."; exit 1; }
    command -v npm >/dev/null 2>&1 || { log_error "npm is required but not installed."; exit 1; }
    
    # Check if environment file exists
    if [[ ! -f "$PROJECT_ROOT/.env.$env" ]]; then
        log_error "Environment file .env.$env not found"
        exit 1
    fi
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

run_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log_warning "Skipping tests as requested"
        return 0
    fi
    
    log_info "Running tests..."
    
    cd "$PROJECT_ROOT"
    
    # Install dependencies
    npm ci
    
    # Run linting
    npm run lint
    
    # Run type checking
    npm run type-check
    
    # Run unit tests
    npm run test:unit
    
    # Run integration tests
    npm run test:integration
    
    log_success "All tests passed"
}

build_application() {
    local env=$1
    
    log_info "Building application for $env environment..."
    
    cd "$PROJECT_ROOT"
    
    # Build the application
    npm run build:$env
    
    # Build Docker image
    docker build \
        --build-arg NODE_ENV=$env \
        --build-arg VITE_APP_VERSION=$(git rev-parse HEAD) \
        --build-arg VITE_BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
        --build-arg VITE_COMMIT_SHA=$(git rev-parse HEAD) \
        -t clinicboost:$env \
        .
    
    log_success "Application built successfully"
}

deploy_to_environment() {
    local env=$1
    
    log_info "Deploying to $env environment..."
    
    cd "$PROJECT_ROOT"
    
    case $env in
        "development")
            docker-compose down
            docker-compose up -d
            ;;
        "staging")
            docker-compose -f docker-compose.staging.yml down
            docker-compose -f docker-compose.staging.yml up -d
            ;;
        "production")
            # Production deployment with zero downtime
            docker-compose -f docker-compose.production.yml up -d --scale app=3
            ;;
    esac
    
    # Wait for services to be ready
    sleep 30
    
    # Run health checks
    run_health_checks $env
    
    log_success "Deployment to $env completed successfully"
}

run_health_checks() {
    local env=$1
    
    log_info "Running health checks for $env..."
    
    local health_url
    case $env in
        "development")
            health_url="http://localhost:3000/health"
            ;;
        "staging")
            health_url="https://staging.clinicboost.com/health"
            ;;
        "production")
            health_url="https://app.clinicboost.com/health"
            ;;
    esac
    
    # Wait for application to be ready
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f "$health_url" >/dev/null 2>&1; then
            log_success "Health check passed"
            return 0
        fi
        
        log_info "Health check attempt $attempt/$max_attempts failed, retrying..."
        sleep 10
        ((attempt++))
    done
    
    log_error "Health check failed after $max_attempts attempts"
    exit 1
}

rollback_deployment() {
    local env=$1
    
    log_warning "Rolling back $env deployment..."
    
    cd "$PROJECT_ROOT"
    
    # Get previous image tag
    local previous_tag=$(docker images clinicboost --format "table {{.Tag}}" | grep -v TAG | head -2 | tail -1)
    
    if [[ -z "$previous_tag" ]]; then
        log_error "No previous version found for rollback"
        exit 1
    fi
    
    log_info "Rolling back to version: $previous_tag"
    
    # Tag previous version as current
    docker tag clinicboost:$previous_tag clinicboost:$env
    
    # Redeploy with previous version
    deploy_to_environment $env
    
    log_success "Rollback completed successfully"
}

confirm_deployment() {
    local env=$1
    
    if [[ "$FORCE_DEPLOY" == "true" ]]; then
        return 0
    fi
    
    echo ""
    log_warning "You are about to deploy to $env environment."
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Deployment cancelled"
        exit 0
    fi
}

# Main script
main() {
    local environment=""
    local build_only=false
    local rollback=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            development|staging|production)
                environment=$1
                shift
                ;;
            --build-only)
                build_only=true
                shift
                ;;
            --no-tests)
                SKIP_TESTS=true
                shift
                ;;
            --force)
                FORCE_DEPLOY=true
                shift
                ;;
            --rollback)
                rollback=true
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Validate arguments
    if [[ -z "$environment" ]]; then
        log_error "Environment is required"
        show_usage
        exit 1
    fi
    
    validate_environment "$environment"
    
    # Handle rollback
    if [[ "$rollback" == "true" ]]; then
        confirm_deployment "$environment"
        rollback_deployment "$environment"
        exit 0
    fi
    
    # Main deployment flow
    log_info "Starting deployment to $environment environment..."
    
    check_prerequisites "$environment"
    
    if [[ "$build_only" != "true" ]]; then
        confirm_deployment "$environment"
    fi
    
    run_tests
    build_application "$environment"
    
    if [[ "$build_only" == "true" ]]; then
        log_success "Build completed successfully"
        exit 0
    fi
    
    deploy_to_environment "$environment"
    
    log_success "Deployment completed successfully!"
    log_info "Application is now running in $environment environment"
}

# Run main function with all arguments
main "$@"
