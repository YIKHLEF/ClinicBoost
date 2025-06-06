# ClinicBoost Deployment Guide

This guide provides comprehensive instructions for deploying ClinicBoost across different environments.

## Overview

ClinicBoost supports three deployment environments:
- **Development**: Local development with hot reloading
- **Staging**: Pre-production testing environment
- **Production**: Live production environment

## Prerequisites

### Required Tools
- **Docker** (v20.10+)
- **Docker Compose** (v2.0+)
- **Node.js** (v20+)
- **npm** (v9+)
- **Git**

### Optional Tools
- **Kubernetes** (for K8s deployment)
- **AWS CLI** (for S3 backups)
- **kubectl** (for K8s management)

## Environment Configuration

### 1. Environment Files

Create environment-specific configuration files:

```bash
# Development
cp .env.development.example .env.development

# Staging
cp .env.staging.example .env.staging

# Production
cp .env.production.example .env.production
```

### 2. Required Environment Variables

#### Core Application
```env
VITE_APP_NAME=ClinicBoost
VITE_APP_VERSION=1.0.0
VITE_API_URL=https://api.clinicboost.com
VITE_APP_URL=https://app.clinicboost.com
```

#### Database
```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_DATABASE_URL=postgresql://user:pass@host:5432/db
```

#### External Services
```env
VITE_TWILIO_ACCOUNT_SID=your-twilio-sid
VITE_STRIPE_PUBLISHABLE_KEY=your-stripe-key
VITE_AZURE_AI_ENDPOINT=your-azure-endpoint
```

## Deployment Methods

### Method 1: Docker Compose (Recommended)

#### Development Deployment
```bash
# Start development environment
docker-compose up -d

# View logs
docker-compose logs -f

# Stop environment
docker-compose down
```

#### Staging Deployment
```bash
# Deploy to staging
docker-compose -f docker-compose.staging.yml up -d

# Scale application
docker-compose -f docker-compose.staging.yml up -d --scale app=2
```

#### Production Deployment
```bash
# Deploy to production
docker-compose -f docker-compose.production.yml up -d

# Zero-downtime deployment
docker-compose -f docker-compose.production.yml up -d --scale app=3
```

### Method 2: Automated Deployment Script

#### Quick Deployment
```bash
# Make script executable
chmod +x scripts/deploy.sh

# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production with confirmation
./scripts/deploy.sh production

# Force deployment without confirmation
./scripts/deploy.sh production --force

# Build only (no deployment)
./scripts/deploy.sh staging --build-only
```

#### Rollback Deployment
```bash
# Rollback to previous version
./scripts/deploy.sh production --rollback
```

### Method 3: Kubernetes Deployment

#### Prerequisites
```bash
# Create namespaces
kubectl apply -f k8s/namespace.yaml

# Create secrets
kubectl create secret generic clinicboost-secrets \
  --from-env-file=.env.production \
  -n clinicboost-production
```

#### Deploy Application
```bash
# Deploy to Kubernetes
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n clinicboost-production

# View logs
kubectl logs -f deployment/clinicboost-app -n clinicboost-production
```

## CI/CD Pipeline

### GitHub Actions Workflow

The CI/CD pipeline automatically:
1. **Tests** code on pull requests
2. **Builds** Docker images
3. **Deploys** to staging on `staging` branch
4. **Deploys** to production on `main` branch

#### Manual Deployment
```bash
# Trigger manual deployment
gh workflow run deploy.yml -f environment=staging
```

### Pipeline Stages

1. **Build & Test**
   - Install dependencies
   - Run linting and type checking
   - Execute unit and integration tests
   - Build application

2. **Security Scanning**
   - Vulnerability scanning with Trivy
   - Dependency audit
   - Security policy checks

3. **Docker Build**
   - Multi-platform image build
   - Push to container registry
   - Image vulnerability scanning

4. **Deployment**
   - Environment-specific deployment
   - Health checks
   - Smoke tests
   - Notifications

## Monitoring & Health Checks

### Health Check Endpoints

```bash
# Application health
curl https://app.clinicboost.com/health

# API health
curl https://api.clinicboost.com/api/health
```

### Automated Health Checks

```bash
# Run health check script
node scripts/health-check.js production

# Continuous monitoring
watch -n 30 'node scripts/health-check.js production'
```

### Monitoring Stack

- **Prometheus**: Metrics collection
- **Grafana**: Metrics visualization
- **AlertManager**: Alert routing
- **ELK Stack**: Log aggregation

Access monitoring:
- Grafana: `https://monitoring.clinicboost.com:3001`
- Prometheus: `https://monitoring.clinicboost.com:9090`
- Kibana: `https://monitoring.clinicboost.com:5601`

## Backup & Recovery

### Automated Backups

```bash
# Run backup manually
./scripts/backup.sh

# Schedule with cron (daily at 2 AM)
0 2 * * * /path/to/scripts/backup.sh
```

### Backup Components

1. **Database**: PostgreSQL dump
2. **Uploads**: User-uploaded files
3. **Configuration**: Environment and config files

### Recovery Process

```bash
# Restore database
psql -h localhost -U postgres -d clinicboost_production < backup.sql

# Restore uploads
tar -xzf uploads_backup.tar.gz -C /app/

# Restart services
docker-compose restart
```

## SSL/TLS Configuration

### Let's Encrypt (Staging/Production)

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d staging.clinicboost.com

# Auto-renewal
sudo crontab -e
0 12 * * * /usr/bin/certbot renew --quiet
```

### Custom SSL Certificates

```bash
# Copy certificates
cp your-cert.pem ssl/production/cert.pem
cp your-key.pem ssl/production/key.pem

# Update nginx configuration
# Restart nginx
docker-compose restart nginx
```

## Performance Optimization

### Application Optimization

1. **Bundle Analysis**
   ```bash
   npm run build:analyze
   ```

2. **Lighthouse Audit**
   ```bash
   npm run performance:audit
   ```

3. **Load Testing**
   ```bash
   # Install k6
   npm install -g k6
   
   # Run load test
   k6 run tests/load-test.js
   ```

### Infrastructure Optimization

1. **Database Tuning**
   - Connection pooling
   - Query optimization
   - Index optimization

2. **Caching Strategy**
   - Redis caching
   - CDN configuration
   - Browser caching

3. **Load Balancing**
   - Multiple app instances
   - Database read replicas
   - Geographic distribution

## Security Considerations

### Security Headers

Nginx automatically adds security headers:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Content-Security-Policy`

### Access Control

1. **Network Security**
   - Firewall configuration
   - VPN access for admin
   - IP whitelisting

2. **Application Security**
   - Role-based access control
   - API rate limiting
   - Input validation

3. **Data Security**
   - Encryption at rest
   - Encryption in transit
   - Regular security audits

## Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check logs
docker-compose logs app

# Check environment variables
docker-compose exec app env

# Verify database connection
docker-compose exec app npm run db:test
```

#### Database Connection Issues
```bash
# Check database status
docker-compose exec postgres pg_isready

# Check connection from app
docker-compose exec app psql $DATABASE_URL -c "SELECT 1"
```

#### SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -in cert.pem -text -noout

# Test SSL connection
openssl s_client -connect app.clinicboost.com:443
```

### Log Analysis

```bash
# Application logs
docker-compose logs -f app

# Database logs
docker-compose logs -f postgres

# Nginx logs
docker-compose logs -f nginx

# System logs
journalctl -u docker -f
```

## Maintenance

### Regular Maintenance Tasks

1. **Weekly**
   - Review monitoring alerts
   - Check backup integrity
   - Update dependencies

2. **Monthly**
   - Security updates
   - Performance review
   - Capacity planning

3. **Quarterly**
   - Disaster recovery testing
   - Security audit
   - Architecture review

### Update Process

```bash
# Update application
git pull origin main
./scripts/deploy.sh production

# Update dependencies
npm update
npm audit fix

# Update Docker images
docker-compose pull
docker-compose up -d
```

## Support & Documentation

### Getting Help

- **Documentation**: `/docs`
- **API Reference**: `/api/docs`
- **Health Status**: `/health`
- **Monitoring**: Grafana dashboards

### Emergency Contacts

- **DevOps Team**: devops@clinicboost.com
- **Security Team**: security@clinicboost.com
- **On-call**: +1-XXX-XXX-XXXX
