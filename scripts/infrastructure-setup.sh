#!/bin/bash

# ClinicBoost Infrastructure Setup Script
# Sets up complete technical infrastructure including security, performance, and monitoring

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-development}"
SKIP_CONFIRMATION="${2:-false}"

# Logging
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

# Validation functions
validate_environment() {
    case "$ENVIRONMENT" in
        development|staging|production)
            log_info "Setting up infrastructure for $ENVIRONMENT environment"
            ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT"
            log_info "Valid environments: development, staging, production"
            exit 1
            ;;
    esac
}

validate_dependencies() {
    log_info "Validating dependencies..."
    
    local missing_deps=()
    
    # Check required tools
    command -v node >/dev/null 2>&1 || missing_deps+=("node")
    command -v npm >/dev/null 2>&1 || missing_deps+=("npm")
    command -v docker >/dev/null 2>&1 || missing_deps+=("docker")
    command -v docker-compose >/dev/null 2>&1 || missing_deps+=("docker-compose")
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        exit 1
    fi
    
    log_success "All dependencies validated"
}

# Environment setup
setup_environment_config() {
    log_info "Setting up environment configuration..."
    
    local env_file=".env.$ENVIRONMENT"
    
    if [ ! -f "$env_file" ]; then
        log_error "Environment file $env_file not found"
        exit 1
    fi
    
    # Copy environment file to .env for local development
    if [ "$ENVIRONMENT" = "development" ]; then
        cp "$env_file" .env
        log_success "Copied $env_file to .env"
    fi
    
    # Validate required environment variables
    local required_vars=(
        "VITE_APP_NAME"
        "VITE_APP_VERSION"
        "VITE_APP_ENV"
    )
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^$var=" "$env_file"; then
            log_error "Required environment variable $var not found in $env_file"
            exit 1
        fi
    done
    
    log_success "Environment configuration validated"
}

# Security setup
setup_security_infrastructure() {
    log_info "Setting up security infrastructure..."
    
    # Generate secure secrets if not present
    if [ "$ENVIRONMENT" != "development" ]; then
        log_info "Generating secure secrets..."
        
        # Generate JWT secret if not set
        if ! grep -q "^VITE_JWT_SECRET=" ".env.$ENVIRONMENT" || grep -q "your-jwt-secret" ".env.$ENVIRONMENT"; then
            local jwt_secret=$(openssl rand -base64 32)
            sed -i "s/VITE_JWT_SECRET=.*/VITE_JWT_SECRET=$jwt_secret/" ".env.$ENVIRONMENT"
            log_success "Generated JWT secret"
        fi
        
        # Generate CSRF secret if not set
        if ! grep -q "^VITE_CSRF_SECRET=" ".env.$ENVIRONMENT" || grep -q "csrf-secret-key" ".env.$ENVIRONMENT"; then
            local csrf_secret=$(openssl rand -base64 32)
            sed -i "s/VITE_CSRF_SECRET=.*/VITE_CSRF_SECRET=$csrf_secret/" ".env.$ENVIRONMENT"
            log_success "Generated CSRF secret"
        fi
    fi
    
    # Set up SSL certificates for production
    if [ "$ENVIRONMENT" = "production" ]; then
        log_info "Setting up SSL certificates..."
        
        if [ ! -d "ssl" ]; then
            mkdir -p ssl
            log_info "Created SSL directory"
        fi
        
        # In production, you would obtain real SSL certificates
        log_warning "Remember to obtain and configure SSL certificates for production"
    fi
    
    log_success "Security infrastructure configured"
}

# Performance setup
setup_performance_infrastructure() {
    log_info "Setting up performance infrastructure..."
    
    # Build optimized assets
    log_info "Building optimized application..."
    npm run build:$ENVIRONMENT
    log_success "Application built successfully"
    
    # Set up CDN configuration
    if [ "$ENVIRONMENT" = "production" ] || [ "$ENVIRONMENT" = "staging" ]; then
        log_info "Configuring CDN settings..."
        
        # Create CDN configuration
        cat > "cdn-config.json" << EOF
{
  "environment": "$ENVIRONMENT",
  "enabled": true,
  "caching": {
    "static": "public, max-age=31536000, immutable",
    "dynamic": "public, max-age=300, s-maxage=600",
    "api": "private, max-age=0, no-cache"
  },
  "compression": {
    "enabled": true,
    "types": ["text/html", "text/css", "application/javascript", "application/json"]
  }
}
EOF
        log_success "CDN configuration created"
    fi
    
    log_success "Performance infrastructure configured"
}

# Monitoring setup
setup_monitoring_infrastructure() {
    log_info "Setting up monitoring infrastructure..."
    
    # Create monitoring configuration
    mkdir -p monitoring/config
    
    # Prometheus configuration
    cat > "monitoring/config/prometheus.yml" << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'clinicboost'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
EOF

    # Alert rules
    cat > "monitoring/config/alert_rules.yml" << EOF
groups:
  - name: clinicboost_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is above 5% for 5 minutes"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is above 2 seconds"

      - alert: LowCacheHitRate
        expr: cache_hit_rate < 0.7
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Low cache hit rate"
          description: "Cache hit rate is below 70%"
EOF

    log_success "Monitoring configuration created"
    
    # Set up log rotation
    if [ "$ENVIRONMENT" = "production" ]; then
        log_info "Setting up log rotation..."
        
        cat > "/etc/logrotate.d/clinicboost" << EOF
/var/log/clinicboost/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 clinicboost clinicboost
    postrotate
        systemctl reload clinicboost
    endscript
}
EOF
        log_success "Log rotation configured"
    fi
}

# Database setup
setup_database_infrastructure() {
    log_info "Setting up database infrastructure..."
    
    # Start database services
    if [ "$ENVIRONMENT" = "development" ]; then
        log_info "Starting development database..."
        docker-compose up -d postgres redis
        
        # Wait for database to be ready
        log_info "Waiting for database to be ready..."
        sleep 10
        
        # Run migrations
        log_info "Running database migrations..."
        npm run db:migrate
        
        log_success "Development database ready"
    else
        log_info "Database setup for $ENVIRONMENT environment"
        log_warning "Ensure database is properly configured and accessible"
    fi
}

# Docker setup
setup_docker_infrastructure() {
    log_info "Setting up Docker infrastructure..."
    
    # Build Docker images
    log_info "Building Docker images..."
    
    if [ "$ENVIRONMENT" = "development" ]; then
        docker-compose build
    else
        docker-compose -f "docker-compose.$ENVIRONMENT.yml" build
    fi
    
    log_success "Docker images built successfully"
}

# Health checks
run_health_checks() {
    log_info "Running infrastructure health checks..."
    
    local health_check_passed=true
    
    # Check if application builds successfully
    if ! npm run build:$ENVIRONMENT > /dev/null 2>&1; then
        log_error "Application build failed"
        health_check_passed=false
    else
        log_success "Application build check passed"
    fi
    
    # Check environment configuration
    if [ ! -f ".env.$ENVIRONMENT" ]; then
        log_error "Environment configuration missing"
        health_check_passed=false
    else
        log_success "Environment configuration check passed"
    fi
    
    # Check Docker configuration
    if [ ! -f "docker-compose.$ENVIRONMENT.yml" ] && [ "$ENVIRONMENT" != "development" ]; then
        log_error "Docker configuration missing for $ENVIRONMENT"
        health_check_passed=false
    else
        log_success "Docker configuration check passed"
    fi
    
    if [ "$health_check_passed" = true ]; then
        log_success "All health checks passed"
    else
        log_error "Some health checks failed"
        exit 1
    fi
}

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary files..."
    # Add cleanup logic here if needed
}

# Main execution
main() {
    log_info "Starting ClinicBoost Infrastructure Setup"
    log_info "Environment: $ENVIRONMENT"
    
    # Validation
    validate_environment
    validate_dependencies
    
    # Confirmation
    if [ "$SKIP_CONFIRMATION" != "true" ]; then
        echo
        log_warning "This will set up the complete infrastructure for $ENVIRONMENT environment."
        read -p "Do you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Setup cancelled"
            exit 0
        fi
    fi
    
    # Setup steps
    setup_environment_config
    setup_security_infrastructure
    setup_performance_infrastructure
    setup_monitoring_infrastructure
    setup_database_infrastructure
    setup_docker_infrastructure
    
    # Health checks
    run_health_checks
    
    log_success "Infrastructure setup completed successfully!"
    
    # Next steps
    echo
    log_info "Next steps:"
    echo "1. Review the generated configuration files"
    echo "2. Update any placeholder values with actual credentials"
    echo "3. Start the application with: npm run start:$ENVIRONMENT"
    echo "4. Access monitoring dashboard at: http://localhost:3000/admin/monitoring"
    
    if [ "$ENVIRONMENT" = "production" ]; then
        echo
        log_warning "Production deployment checklist:"
        echo "- Obtain and configure SSL certificates"
        echo "- Set up external monitoring services (Sentry, DataDog, etc.)"
        echo "- Configure backup systems"
        echo "- Set up CI/CD pipelines"
        echo "- Review security configurations"
    fi
}

# Trap cleanup on exit
trap cleanup EXIT

# Run main function
main "$@"
