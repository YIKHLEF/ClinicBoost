#!/usr/bin/env node

/**
 * Database Backup Script
 * Creates backups of the ClinicBoost database
 */

const { createClient } = require('@supabase/supabase-js');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration
const config = {
  supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
  databaseUrl: process.env.DATABASE_URL || process.env.VITE_DATABASE_URL,
  backupDir: path.join(__dirname, '..', 'backups'),
  environment: process.env.NODE_ENV || 'development',
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
  s3Bucket: process.env.BACKUP_S3_BUCKET,
  s3Region: process.env.BACKUP_S3_REGION || 'us-east-1'
};

// Initialize Supabase client
const supabase = createClient(config.supabaseUrl, config.supabaseKey);

/**
 * Logging utility
 */
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  if (level === 'error') {
    console.error(`${prefix} ${message}`);
  } else if (level === 'warn') {
    console.warn(`${prefix} ${message}`);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

/**
 * Ensure backup directory exists
 */
async function ensureBackupDirectory() {
  try {
    await fs.access(config.backupDir);
  } catch (error) {
    log(`Creating backup directory: ${config.backupDir}`);
    await fs.mkdir(config.backupDir, { recursive: true });
  }
}

/**
 * Generate backup filename
 */
function generateBackupFilename(customName = null) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const name = customName || `backup-${config.environment}-${timestamp}`;
  return `${name}.sql`;
}

/**
 * Create database backup using pg_dump
 */
async function createDatabaseBackup(filename) {
  log(`Creating database backup: ${filename}`);
  
  const backupPath = path.join(config.backupDir, filename);
  
  // Parse database URL
  const dbUrl = new URL(config.databaseUrl);
  const host = dbUrl.hostname;
  const port = dbUrl.port || 5432;
  const database = dbUrl.pathname.slice(1);
  const username = dbUrl.username;
  const password = dbUrl.password;
  
  // Set environment variables for pg_dump
  const env = {
    ...process.env,
    PGPASSWORD: password
  };
  
  // Create pg_dump command
  const pgDumpCmd = [
    'pg_dump',
    `--host=${host}`,
    `--port=${port}`,
    `--username=${username}`,
    `--dbname=${database}`,
    '--verbose',
    '--clean',
    '--if-exists',
    '--create',
    '--format=custom',
    `--file=${backupPath}`
  ].join(' ');
  
  try {
    log(`Executing: ${pgDumpCmd.replace(/--password=\S+/, '--password=***')}`);
    
    const { stdout, stderr } = await execAsync(pgDumpCmd, { env });
    
    if (stderr && !stderr.includes('NOTICE')) {
      log(`pg_dump warnings: ${stderr}`, 'warn');
    }
    
    // Verify backup file was created
    const stats = await fs.stat(backupPath);
    log(`Backup created successfully: ${backupPath} (${Math.round(stats.size / 1024 / 1024)}MB)`);
    
    return backupPath;
    
  } catch (error) {
    log(`Backup failed: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Create metadata file for backup
 */
async function createBackupMetadata(backupPath, metadata = {}) {
  const metadataPath = backupPath.replace('.sql', '.json');
  
  const backupMetadata = {
    filename: path.basename(backupPath),
    created_at: new Date().toISOString(),
    environment: config.environment,
    database_url: config.databaseUrl.replace(/:\/\/[^@]+@/, '://***:***@'),
    size_bytes: (await fs.stat(backupPath)).size,
    ...metadata
  };
  
  await fs.writeFile(metadataPath, JSON.stringify(backupMetadata, null, 2));
  log(`Metadata created: ${metadataPath}`);
  
  return metadataPath;
}

/**
 * Upload backup to S3 (if configured)
 */
async function uploadToS3(backupPath) {
  if (!config.s3Bucket) {
    log('S3 bucket not configured, skipping upload');
    return;
  }
  
  log(`Uploading backup to S3: ${config.s3Bucket}`);
  
  const filename = path.basename(backupPath);
  const s3Key = `database-backups/${config.environment}/${filename}`;
  
  try {
    const awsCmd = [
      'aws s3 cp',
      `"${backupPath}"`,
      `"s3://${config.s3Bucket}/${s3Key}"`,
      `--region ${config.s3Region}`,
      '--storage-class STANDARD_IA'
    ].join(' ');
    
    await execAsync(awsCmd);
    log(`Backup uploaded to S3: s3://${config.s3Bucket}/${s3Key}`);
    
  } catch (error) {
    log(`S3 upload failed: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Clean up old backups
 */
async function cleanupOldBackups() {
  log(`Cleaning up backups older than ${config.retentionDays} days`);
  
  try {
    const files = await fs.readdir(config.backupDir);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.retentionDays);
    
    let deletedCount = 0;
    
    for (const file of files) {
      if (file.endsWith('.sql') || file.endsWith('.json')) {
        const filePath = path.join(config.backupDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          log(`Deleted old backup: ${file}`);
          deletedCount++;
        }
      }
    }
    
    log(`Cleanup completed: ${deletedCount} files deleted`);
    
  } catch (error) {
    log(`Cleanup failed: ${error.message}`, 'error');
  }
}

/**
 * List available backups
 */
async function listBackups() {
  try {
    await ensureBackupDirectory();
    
    const files = await fs.readdir(config.backupDir);
    const backups = [];
    
    for (const file of files) {
      if (file.endsWith('.sql')) {
        const filePath = path.join(config.backupDir, file);
        const stats = await fs.stat(filePath);
        
        // Try to read metadata
        const metadataPath = filePath.replace('.sql', '.json');
        let metadata = {};
        
        try {
          const metadataContent = await fs.readFile(metadataPath, 'utf8');
          metadata = JSON.parse(metadataContent);
        } catch (error) {
          // Metadata file doesn't exist or is invalid
        }
        
        backups.push({
          filename: file,
          size: stats.size,
          created: stats.mtime,
          ...metadata
        });
      }
    }
    
    // Sort by creation date (newest first)
    backups.sort((a, b) => new Date(b.created) - new Date(a.created));
    
    console.log('\nAvailable Backups:');
    console.log('==================');
    
    if (backups.length === 0) {
      console.log('No backups found.');
      return;
    }
    
    backups.forEach(backup => {
      const size = Math.round(backup.size / 1024 / 1024);
      const date = new Date(backup.created).toLocaleString();
      console.log(`${backup.filename} - ${size}MB - ${date}`);
    });
    
  } catch (error) {
    log(`Failed to list backups: ${error.message}`, 'error');
    process.exit(1);
  }
}

/**
 * Main backup function
 */
async function createBackup(customName = null) {
  try {
    log(`Starting backup process for ${config.environment} environment`);
    
    // Ensure backup directory exists
    await ensureBackupDirectory();
    
    // Generate filename
    const filename = generateBackupFilename(customName);
    
    // Create database backup
    const backupPath = await createDatabaseBackup(filename);
    
    // Create metadata
    await createBackupMetadata(backupPath, {
      custom_name: customName,
      triggered_by: process.env.USER || process.env.USERNAME || 'automated'
    });
    
    // Upload to S3 if configured
    if (config.s3Bucket) {
      await uploadToS3(backupPath);
    }
    
    // Clean up old backups
    await cleanupOldBackups();
    
    log('Backup process completed successfully');
    
    return backupPath;
    
  } catch (error) {
    log(`Backup process failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  const command = process.argv[2] || 'create';
  const customName = process.argv[3];
  
  switch (command) {
    case 'create':
      createBackup(customName);
      break;
    case 'list':
      listBackups();
      break;
    default:
      console.log('Usage: node db-backup.js [create|list] [custom-name]');
      process.exit(1);
  }
}
