#!/bin/bash

# Setup Automated Backup Cron Jobs
# This script configures automated backup scheduling with proper error handling,
# logging, and monitoring integration.

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_SCRIPT="$SCRIPT_DIR/backup.sh"
SCHEDULER_SCRIPT="$SCRIPT_DIR/backup-scheduler.js"
LOG_DIR="$PROJECT_ROOT/logs"
CRON_LOG="$LOG_DIR/cron-backup.log"

# Environment variables
ENVIRONMENT="${NODE_ENV:-production}"
BACKUP_USER="${BACKUP_USER:-root}"
NOTIFICATION_EMAIL="${BACKUP_NOTIFICATION_EMAIL:-admin@clinicboost.com}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")
            echo -e "${GREEN}[INFO]${NC} $message"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} $message"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $message"
            ;;
        *)
            echo -e "${BLUE}[DEBUG]${NC} $message"
            ;;
    esac
    
    echo "[$timestamp] [$level] $message" >> "$CRON_LOG"
}

# Check if running as root or with sudo
check_permissions() {
    if [[ $EUID -ne 0 ]]; then
        log "ERROR" "This script must be run as root or with sudo"
        exit 1
    fi
}

# Create necessary directories
setup_directories() {
    log "INFO" "Setting up directories..."
    
    mkdir -p "$LOG_DIR"
    mkdir -p "$PROJECT_ROOT/backups"
    
    # Set proper permissions
    chmod 755 "$LOG_DIR"
    chmod 755 "$PROJECT_ROOT/backups"
    
    # Create log file if it doesn't exist
    touch "$CRON_LOG"
    chmod 644 "$CRON_LOG"
}

# Install dependencies
install_dependencies() {
    log "INFO" "Installing dependencies..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log "ERROR" "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        log "ERROR" "npm is not installed. Please install npm first."
        exit 1
    fi
    
    # Install Node.js dependencies for scheduler
    cd "$PROJECT_ROOT"
    npm install --production
    
    # Check if PostgreSQL client tools are installed
    if ! command -v pg_dump &> /dev/null; then
        log "WARN" "PostgreSQL client tools not found. Installing..."
        
        if command -v apt-get &> /dev/null; then
            apt-get update
            apt-get install -y postgresql-client
        elif command -v yum &> /dev/null; then
            yum install -y postgresql
        else
            log "ERROR" "Cannot install PostgreSQL client tools automatically"
            exit 1
        fi
    fi
    
    # Check if AWS CLI is installed (for S3 backups)
    if ! command -v aws &> /dev/null; then
        log "WARN" "AWS CLI not found. S3 backups will not be available."
    fi
}

# Create backup wrapper script
create_backup_wrapper() {
    log "INFO" "Creating backup wrapper script..."
    
    local wrapper_script="$SCRIPT_DIR/backup-wrapper.sh"
    
    cat > "$wrapper_script" << 'EOF'
#!/bin/bash

# Backup Wrapper Script
# This script wraps the main backup script with proper error handling,
# logging, and notification capabilities.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_ROOT/logs"
BACKUP_LOG="$LOG_DIR/backup-$(date +%Y%m%d_%H%M%S).log"

# Source environment variables
if [[ -f "$PROJECT_ROOT/.env.production" ]]; then
    source "$PROJECT_ROOT/.env.production"
fi

# Redirect all output to log file
exec > >(tee -a "$BACKUP_LOG")
exec 2>&1

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

send_notification() {
    local status=$1
    local message=$2
    
    if [[ -n "$BACKUP_NOTIFICATION_EMAIL" ]]; then
        local subject="ClinicBoost Backup $status - $(hostname)"
        echo "$message" | mail -s "$subject" "$BACKUP_NOTIFICATION_EMAIL" 2>/dev/null || true
    fi
    
    if [[ -n "$BACKUP_WEBHOOK_URL" ]]; then
        curl -X POST "$BACKUP_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"status\":\"$status\",\"message\":\"$message\",\"hostname\":\"$(hostname)\",\"timestamp\":\"$(date -Iseconds)\"}" \
            2>/dev/null || true
    fi
}

# Main backup execution
main() {
    log "Starting automated backup process..."
    
    local start_time=$(date +%s)
    local backup_type="${1:-full}"
    
    # Check disk space
    local available_space=$(df "$PROJECT_ROOT/backups" | awk 'NR==2 {print $4}')
    local required_space=1048576  # 1GB in KB
    
    if [[ $available_space -lt $required_space ]]; then
        local error_msg="Insufficient disk space for backup. Available: ${available_space}KB, Required: ${required_space}KB"
        log "ERROR: $error_msg"
        send_notification "FAILED" "$error_msg"
        exit 1
    fi
    
    # Execute backup
    if [[ "$backup_type" == "scheduled" ]]; then
        # Use Node.js scheduler for advanced scheduling
        node "$SCRIPT_DIR/backup-scheduler.js" start
    else
        # Use shell script for simple backup
        "$SCRIPT_DIR/backup.sh"
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log "Backup completed successfully in ${duration} seconds"
    send_notification "SUCCESS" "Backup completed successfully in ${duration} seconds"
}

# Error handling
trap 'send_notification "FAILED" "Backup failed with error: $?"' ERR

# Execute main function
main "$@"
EOF

    chmod +x "$wrapper_script"
    log "INFO" "Backup wrapper script created: $wrapper_script"
}

# Setup cron jobs
setup_cron_jobs() {
    log "INFO" "Setting up cron jobs..."
    
    local cron_file="/tmp/clinicboost-backup-cron"
    local wrapper_script="$SCRIPT_DIR/backup-wrapper.sh"
    
    # Create cron configuration
    cat > "$cron_file" << EOF
# ClinicBoost Automated Backup Schedule
# Generated on $(date)

# Environment variables
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
MAILTO=$NOTIFICATION_EMAIL

# Daily full backup at 2:00 AM
0 2 * * * $BACKUP_USER cd $PROJECT_ROOT && $wrapper_script full >> $CRON_LOG 2>&1

# Weekly configuration backup at 3:00 AM on Sundays
0 3 * * 0 $BACKUP_USER cd $PROJECT_ROOT && $wrapper_script config >> $CRON_LOG 2>&1

# Monthly comprehensive backup with testing at 4:00 AM on 1st of month
0 4 1 * * $BACKUP_USER cd $PROJECT_ROOT && $wrapper_script scheduled >> $CRON_LOG 2>&1

# Cleanup old backups daily at 5:00 AM
0 5 * * * $BACKUP_USER find $PROJECT_ROOT/backups -name "*.sql.gz" -mtime +30 -delete >> $CRON_LOG 2>&1

# Health check every 6 hours
0 */6 * * * $BACKUP_USER $SCRIPT_DIR/backup-health-check.sh >> $CRON_LOG 2>&1
EOF

    # Install cron jobs
    crontab "$cron_file"
    rm "$cron_file"
    
    log "INFO" "Cron jobs installed successfully"
}

# Create health check script
create_health_check() {
    log "INFO" "Creating backup health check script..."
    
    local health_script="$SCRIPT_DIR/backup-health-check.sh"
    
    cat > "$health_script" << 'EOF'
#!/bin/bash

# Backup Health Check Script
# Monitors backup system health and sends alerts if issues are detected

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_ROOT/logs"

# Source environment variables
if [[ -f "$PROJECT_ROOT/.env.production" ]]; then
    source "$PROJECT_ROOT/.env.production"
fi

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

send_alert() {
    local message=$1
    
    if [[ -n "$BACKUP_NOTIFICATION_EMAIL" ]]; then
        echo "$message" | mail -s "ClinicBoost Backup Alert - $(hostname)" "$BACKUP_NOTIFICATION_EMAIL" 2>/dev/null || true
    fi
}

# Check last backup age
check_backup_age() {
    local backup_dir="$PROJECT_ROOT/backups"
    local latest_backup=$(find "$backup_dir" -name "*.sql.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
    
    if [[ -z "$latest_backup" ]]; then
        send_alert "No backups found in $backup_dir"
        return 1
    fi
    
    local backup_age=$(( $(date +%s) - $(stat -c %Y "$latest_backup") ))
    local max_age=$((24 * 60 * 60))  # 24 hours
    
    if [[ $backup_age -gt $max_age ]]; then
        send_alert "Latest backup is older than 24 hours: $latest_backup (age: $((backup_age / 3600)) hours)"
        return 1
    fi
    
    log "Backup age check passed: latest backup is $((backup_age / 3600)) hours old"
    return 0
}

# Check disk space
check_disk_space() {
    local backup_dir="$PROJECT_ROOT/backups"
    local usage=$(df "$backup_dir" | awk 'NR==2 {print $5}' | sed 's/%//')
    local threshold=90
    
    if [[ $usage -gt $threshold ]]; then
        send_alert "Backup disk usage is high: ${usage}% (threshold: ${threshold}%)"
        return 1
    fi
    
    log "Disk space check passed: ${usage}% used"
    return 0
}

# Check backup service status
check_service_status() {
    # Check if backup scheduler is running (if using systemd)
    if command -v systemctl &> /dev/null; then
        if systemctl is-active --quiet clinicboost-backup 2>/dev/null; then
            log "Backup service is running"
        else
            log "Backup service status check skipped (service not configured)"
        fi
    fi
    
    return 0
}

# Main health check
main() {
    log "Starting backup health check..."
    
    local issues=0
    
    check_backup_age || ((issues++))
    check_disk_space || ((issues++))
    check_service_status || ((issues++))
    
    if [[ $issues -eq 0 ]]; then
        log "All health checks passed"
    else
        log "Health check completed with $issues issues"
    fi
    
    return $issues
}

main "$@"
EOF

    chmod +x "$health_script"
    log "INFO" "Health check script created: $health_script"
}

# Create systemd service (optional)
create_systemd_service() {
    log "INFO" "Creating systemd service for backup scheduler..."
    
    local service_file="/etc/systemd/system/clinicboost-backup.service"
    
    cat > "$service_file" << EOF
[Unit]
Description=ClinicBoost Backup Scheduler
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=$BACKUP_USER
WorkingDirectory=$PROJECT_ROOT
ExecStart=/usr/bin/node $SCHEDULER_SCRIPT start
ExecStop=/usr/bin/node $SCHEDULER_SCRIPT stop
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=clinicboost-backup

# Environment
Environment=NODE_ENV=$ENVIRONMENT
EnvironmentFile=-$PROJECT_ROOT/.env.production

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd and enable service
    systemctl daemon-reload
    systemctl enable clinicboost-backup.service
    
    log "INFO" "Systemd service created and enabled"
}

# Verify installation
verify_installation() {
    log "INFO" "Verifying installation..."
    
    # Check cron jobs
    if crontab -l | grep -q "ClinicBoost"; then
        log "INFO" "Cron jobs verified"
    else
        log "ERROR" "Cron jobs not found"
        return 1
    fi
    
    # Check scripts
    local scripts=("$BACKUP_SCRIPT" "$SCHEDULER_SCRIPT" "$SCRIPT_DIR/backup-wrapper.sh" "$SCRIPT_DIR/backup-health-check.sh")
    for script in "${scripts[@]}"; do
        if [[ -x "$script" ]]; then
            log "INFO" "Script verified: $script"
        else
            log "ERROR" "Script not found or not executable: $script"
            return 1
        fi
    done
    
    # Test backup script
    log "INFO" "Testing backup script..."
    if "$SCRIPT_DIR/backup-health-check.sh"; then
        log "INFO" "Health check test passed"
    else
        log "WARN" "Health check test failed (this may be normal for first run)"
    fi
    
    log "INFO" "Installation verification completed"
}

# Main installation function
main() {
    log "INFO" "Starting ClinicBoost backup automation setup..."
    
    check_permissions
    setup_directories
    install_dependencies
    create_backup_wrapper
    create_health_check
    setup_cron_jobs
    
    # Create systemd service if systemctl is available
    if command -v systemctl &> /dev/null; then
        create_systemd_service
    fi
    
    verify_installation
    
    log "INFO" "Backup automation setup completed successfully!"
    log "INFO" "Backup schedule:"
    log "INFO" "  - Daily full backup: 2:00 AM"
    log "INFO" "  - Weekly config backup: 3:00 AM Sunday"
    log "INFO" "  - Monthly comprehensive backup: 4:00 AM 1st of month"
    log "INFO" "  - Daily cleanup: 5:00 AM"
    log "INFO" "  - Health check: Every 6 hours"
    log "INFO" ""
    log "INFO" "Logs are stored in: $LOG_DIR"
    log "INFO" "Backups are stored in: $PROJECT_ROOT/backups"
    log "INFO" ""
    log "INFO" "To manually run a backup: $SCRIPT_DIR/backup-wrapper.sh"
    log "INFO" "To check backup health: $SCRIPT_DIR/backup-health-check.sh"
}

# Handle command line arguments
case "${1:-install}" in
    "install")
        main
        ;;
    "uninstall")
        log "INFO" "Removing cron jobs..."
        crontab -l | grep -v "ClinicBoost" | crontab -
        log "INFO" "Cron jobs removed"
        ;;
    "status")
        log "INFO" "Checking backup status..."
        crontab -l | grep "ClinicBoost" || log "WARN" "No backup cron jobs found"
        "$SCRIPT_DIR/backup-health-check.sh"
        ;;
    *)
        echo "Usage: $0 [install|uninstall|status]"
        exit 1
        ;;
esac
