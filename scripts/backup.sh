#!/bin/bash

# ClinicBoost Backup Script
set -e

# Configuration
BACKUP_DIR="/backups"
RETENTION_DAYS=30
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$BACKUP_DIR/backup_$TIMESTAMP.log"

# Database configuration
DB_HOST="${POSTGRES_HOST:-postgres}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-clinicboost_production}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_PASSWORD="${POSTGRES_PASSWORD}"

# S3 configuration (for remote backup)
S3_BUCKET="${BACKUP_S3_BUCKET}"
S3_PREFIX="${BACKUP_S3_PREFIX:-backups}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")
            echo -e "${BLUE}[$timestamp] [INFO]${NC} $message" | tee -a "$LOG_FILE"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[$timestamp] [SUCCESS]${NC} $message" | tee -a "$LOG_FILE"
            ;;
        "WARNING")
            echo -e "${YELLOW}[$timestamp] [WARNING]${NC} $message" | tee -a "$LOG_FILE"
            ;;
        "ERROR")
            echo -e "${RED}[$timestamp] [ERROR]${NC} $message" | tee -a "$LOG_FILE"
            ;;
    esac
}

create_backup_dir() {
    if [[ ! -d "$BACKUP_DIR" ]]; then
        mkdir -p "$BACKUP_DIR"
        log "INFO" "Created backup directory: $BACKUP_DIR"
    fi
}

backup_database() {
    log "INFO" "Starting database backup..."
    
    local backup_file="$BACKUP_DIR/db_backup_$TIMESTAMP.sql"
    local compressed_file="$backup_file.gz"
    
    # Set password for pg_dump
    export PGPASSWORD="$DB_PASSWORD"
    
    # Create database backup
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --verbose --clean --no-owner --no-privileges > "$backup_file" 2>>"$LOG_FILE"; then
        
        # Compress the backup
        gzip "$backup_file"
        
        local file_size=$(du -h "$compressed_file" | cut -f1)
        log "SUCCESS" "Database backup completed: $compressed_file ($file_size)"
        
        echo "$compressed_file"
    else
        log "ERROR" "Database backup failed"
        return 1
    fi
    
    unset PGPASSWORD
}

backup_uploads() {
    log "INFO" "Starting uploads backup..."
    
    local uploads_dir="/app/uploads"
    local backup_file="$BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz"
    
    if [[ -d "$uploads_dir" ]]; then
        if tar -czf "$backup_file" -C "$(dirname "$uploads_dir")" "$(basename "$uploads_dir")" 2>>"$LOG_FILE"; then
            local file_size=$(du -h "$backup_file" | cut -f1)
            log "SUCCESS" "Uploads backup completed: $backup_file ($file_size)"
            echo "$backup_file"
        else
            log "ERROR" "Uploads backup failed"
            return 1
        fi
    else
        log "WARNING" "Uploads directory not found: $uploads_dir"
    fi
}

backup_config() {
    log "INFO" "Starting configuration backup..."
    
    local config_backup="$BACKUP_DIR/config_backup_$TIMESTAMP.tar.gz"
    local config_files=(
        "/app/.env.production"
        "/etc/nginx/nginx.conf"
        "/etc/nginx/conf.d/"
        "/app/docker-compose.production.yml"
    )
    
    local existing_files=()
    for file in "${config_files[@]}"; do
        if [[ -e "$file" ]]; then
            existing_files+=("$file")
        fi
    done
    
    if [[ ${#existing_files[@]} -gt 0 ]]; then
        if tar -czf "$config_backup" "${existing_files[@]}" 2>>"$LOG_FILE"; then
            local file_size=$(du -h "$config_backup" | cut -f1)
            log "SUCCESS" "Configuration backup completed: $config_backup ($file_size)"
            echo "$config_backup"
        else
            log "ERROR" "Configuration backup failed"
            return 1
        fi
    else
        log "WARNING" "No configuration files found to backup"
    fi
}

upload_to_s3() {
    local file=$1
    
    if [[ -z "$S3_BUCKET" ]]; then
        log "WARNING" "S3 bucket not configured, skipping remote backup"
        return 0
    fi
    
    log "INFO" "Uploading to S3: $(basename "$file")"
    
    local s3_key="$S3_PREFIX/$(basename "$file")"
    
    if command -v aws >/dev/null 2>&1; then
        if aws s3 cp "$file" "s3://$S3_BUCKET/$s3_key" 2>>"$LOG_FILE"; then
            log "SUCCESS" "Uploaded to S3: s3://$S3_BUCKET/$s3_key"
        else
            log "ERROR" "Failed to upload to S3: $file"
            return 1
        fi
    else
        log "WARNING" "AWS CLI not found, skipping S3 upload"
    fi
}

cleanup_old_backups() {
    log "INFO" "Cleaning up old backups (older than $RETENTION_DAYS days)..."
    
    local deleted_count=0
    
    # Local cleanup
    if [[ -d "$BACKUP_DIR" ]]; then
        while IFS= read -r -d '' file; do
            rm -f "$file"
            ((deleted_count++))
            log "INFO" "Deleted old backup: $(basename "$file")"
        done < <(find "$BACKUP_DIR" -name "*.sql.gz" -o -name "*.tar.gz" -type f -mtime +$RETENTION_DAYS -print0)
    fi
    
    # S3 cleanup
    if [[ -n "$S3_BUCKET" ]] && command -v aws >/dev/null 2>&1; then
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)
        
        aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX/" --recursive | while read -r line; do
            local file_date=$(echo "$line" | awk '{print $1}')
            local file_key=$(echo "$line" | awk '{print $4}')
            
            if [[ "$file_date" < "$cutoff_date" ]]; then
                if aws s3 rm "s3://$S3_BUCKET/$file_key" 2>>"$LOG_FILE"; then
                    log "INFO" "Deleted old S3 backup: $file_key"
                fi
            fi
        done
    fi
    
    if [[ $deleted_count -gt 0 ]]; then
        log "SUCCESS" "Cleaned up $deleted_count old backup files"
    else
        log "INFO" "No old backup files to clean up"
    fi
}

verify_backup() {
    local backup_file=$1
    
    log "INFO" "Verifying backup: $(basename "$backup_file")"
    
    if [[ ! -f "$backup_file" ]]; then
        log "ERROR" "Backup file not found: $backup_file"
        return 1
    fi
    
    # Check file size
    local file_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null)
    if [[ $file_size -lt 1024 ]]; then
        log "ERROR" "Backup file too small: $backup_file ($file_size bytes)"
        return 1
    fi
    
    # Test compression integrity
    if [[ "$backup_file" == *.gz ]]; then
        if ! gzip -t "$backup_file" 2>>"$LOG_FILE"; then
            log "ERROR" "Backup file corrupted: $backup_file"
            return 1
        fi
    fi
    
    log "SUCCESS" "Backup verification passed: $(basename "$backup_file")"
}

send_notification() {
    local status=$1
    local message=$2
    
    # Slack notification (if webhook URL is configured)
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        local color="good"
        if [[ "$status" == "error" ]]; then
            color="danger"
        elif [[ "$status" == "warning" ]]; then
            color="warning"
        fi
        
        local payload=$(cat <<EOF
{
    "attachments": [
        {
            "color": "$color",
            "title": "ClinicBoost Backup Report",
            "text": "$message",
            "footer": "Backup System",
            "ts": $(date +%s)
        }
    ]
}
EOF
)
        
        curl -X POST -H 'Content-type: application/json' \
            --data "$payload" \
            "$SLACK_WEBHOOK_URL" 2>>"$LOG_FILE" || true
    fi
    
    # Email notification (if configured)
    if [[ -n "$NOTIFICATION_EMAIL" ]] && command -v mail >/dev/null 2>&1; then
        echo "$message" | mail -s "ClinicBoost Backup Report - $status" "$NOTIFICATION_EMAIL" || true
    fi
}

main() {
    log "INFO" "Starting ClinicBoost backup process..."
    
    create_backup_dir
    
    local backup_files=()
    local errors=0
    
    # Database backup
    if db_backup=$(backup_database); then
        backup_files+=("$db_backup")
        verify_backup "$db_backup" || ((errors++))
        upload_to_s3 "$db_backup" || ((errors++))
    else
        ((errors++))
    fi
    
    # Uploads backup
    if uploads_backup=$(backup_uploads); then
        backup_files+=("$uploads_backup")
        verify_backup "$uploads_backup" || ((errors++))
        upload_to_s3 "$uploads_backup" || ((errors++))
    fi
    
    # Configuration backup
    if config_backup=$(backup_config); then
        backup_files+=("$config_backup")
        verify_backup "$config_backup" || ((errors++))
        upload_to_s3 "$config_backup" || ((errors++))
    fi
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Generate summary
    local total_size=0
    for file in "${backup_files[@]}"; do
        if [[ -f "$file" ]]; then
            local size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
            total_size=$((total_size + size))
        fi
    done
    
    local human_size=$(numfmt --to=iec-i --suffix=B $total_size 2>/dev/null || echo "${total_size} bytes")
    
    if [[ $errors -eq 0 ]]; then
        local message="Backup completed successfully! Created ${#backup_files[@]} backup files (Total size: $human_size)"
        log "SUCCESS" "$message"
        send_notification "success" "$message"
    else
        local message="Backup completed with $errors errors. Check logs for details."
        log "ERROR" "$message"
        send_notification "error" "$message"
        exit 1
    fi
    
    log "INFO" "Backup process completed"
}

# Handle signals
trap 'log "ERROR" "Backup interrupted"; exit 1' INT TERM

# Run main function
main "$@"
