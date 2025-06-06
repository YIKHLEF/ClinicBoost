#!/usr/bin/env node

/**
 * Automated Backup Scheduler
 * 
 * Provides automated scheduling for backup operations with cron-like functionality,
 * cross-region replication, and automated recovery testing.
 */

const fs = require('fs').promises;
const path = require('path');
const { execAsync } = require('./utils');
const { createBackup } = require('./db-backup');

// Configuration
const config = {
  schedules: {
    daily: '0 2 * * *',      // 2 AM daily
    weekly: '0 3 * * 0',     // 3 AM Sunday
    monthly: '0 4 1 * *',    // 4 AM 1st of month
  },
  crossRegion: {
    enabled: process.env.CROSS_REGION_BACKUP === 'true',
    primaryRegion: process.env.BACKUP_PRIMARY_REGION || 'us-east-1',
    replicationRegions: (process.env.BACKUP_REPLICATION_REGIONS || 'us-west-2,eu-west-1').split(','),
    s3Bucket: process.env.BACKUP_S3_BUCKET,
  },
  recoveryTesting: {
    enabled: process.env.AUTOMATED_RECOVERY_TESTING === 'true',
    frequency: process.env.RECOVERY_TEST_FREQUENCY || 'weekly',
    testDatabase: process.env.RECOVERY_TEST_DB || 'clinicboost_recovery_test',
  },
  notifications: {
    webhook: process.env.BACKUP_WEBHOOK_URL,
    email: process.env.BACKUP_NOTIFICATION_EMAIL,
  },
  retentionPolicy: {
    daily: 7,    // Keep 7 daily backups
    weekly: 4,   // Keep 4 weekly backups
    monthly: 12, // Keep 12 monthly backups
    yearly: 3,   // Keep 3 yearly backups
  }
};

class BackupScheduler {
  constructor() {
    this.schedules = new Map();
    this.timers = new Map();
    this.isRunning = false;
    this.logFile = path.join(__dirname, '..', 'logs', 'backup-scheduler.log');
  }

  /**
   * Initialize the scheduler
   */
  async initialize() {
    try {
      await this.ensureLogDirectory();
      await this.loadSchedules();
      this.log('Backup scheduler initialized');
    } catch (error) {
      this.log(`Failed to initialize scheduler: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Start the scheduler
   */
  async start() {
    if (this.isRunning) {
      this.log('Scheduler is already running');
      return;
    }

    this.isRunning = true;
    this.log('Starting backup scheduler');

    // Schedule default backups
    await this.scheduleDefaultBackups();

    // Start monitoring loop
    this.startMonitoringLoop();

    this.log('Backup scheduler started successfully');
  }

  /**
   * Stop the scheduler
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.log('Stopping backup scheduler');

    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();

    this.log('Backup scheduler stopped');
  }

  /**
   * Schedule default backup jobs
   */
  async scheduleDefaultBackups() {
    // Daily full backup
    await this.scheduleBackup('daily-full', {
      type: 'full',
      cron: config.schedules.daily,
      enabled: true,
      crossRegionReplication: config.crossRegion.enabled,
    });

    // Weekly configuration backup
    await this.scheduleBackup('weekly-config', {
      type: 'configuration',
      cron: config.schedules.weekly,
      enabled: true,
      crossRegionReplication: false,
    });

    // Monthly comprehensive backup with testing
    await this.scheduleBackup('monthly-comprehensive', {
      type: 'full',
      cron: config.schedules.monthly,
      enabled: true,
      crossRegionReplication: config.crossRegion.enabled,
      includeRecoveryTest: config.recoveryTesting.enabled,
    });
  }

  /**
   * Schedule a backup job
   */
  async scheduleBackup(name, options) {
    const schedule = {
      id: `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      ...options,
      nextRun: this.calculateNextRun(options.cron),
      lastRun: null,
      status: 'scheduled',
      createdAt: new Date(),
    };

    this.schedules.set(schedule.id, schedule);
    
    if (schedule.enabled && this.isRunning) {
      this.scheduleNextRun(schedule);
    }

    this.log(`Scheduled backup: ${name} (${schedule.id})`);
    return schedule.id;
  }

  /**
   * Execute a scheduled backup
   */
  async executeScheduledBackup(scheduleId) {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      this.log(`Schedule not found: ${scheduleId}`, 'error');
      return;
    }

    this.log(`Executing scheduled backup: ${schedule.name}`);
    
    try {
      schedule.status = 'running';
      schedule.lastRun = new Date();

      // Create backup
      const backupPath = await this.createBackupWithOptions(schedule);
      
      // Cross-region replication
      if (schedule.crossRegionReplication) {
        await this.replicateToRegions(backupPath);
      }

      // Recovery testing
      if (schedule.includeRecoveryTest) {
        await this.performRecoveryTest(backupPath);
      }

      // Send success notification
      await this.sendNotification('success', {
        schedule: schedule.name,
        backupPath,
        timestamp: new Date(),
      });

      schedule.status = 'completed';
      this.log(`Backup completed successfully: ${schedule.name}`);

    } catch (error) {
      schedule.status = 'failed';
      schedule.lastError = error.message;
      
      this.log(`Backup failed: ${schedule.name} - ${error.message}`, 'error');
      
      // Send failure notification
      await this.sendNotification('failure', {
        schedule: schedule.name,
        error: error.message,
        timestamp: new Date(),
      });
    }

    // Schedule next run
    schedule.nextRun = this.calculateNextRun(schedule.cron);
    this.scheduleNextRun(schedule);
  }

  /**
   * Create backup with specific options
   */
  async createBackupWithOptions(schedule) {
    const customName = `${schedule.name}_${new Date().toISOString().split('T')[0]}`;
    
    switch (schedule.type) {
      case 'full':
        return await createBackup(customName);
      case 'configuration':
        return await this.createConfigurationBackup(customName);
      case 'data':
        return await this.createDataOnlyBackup(customName);
      default:
        throw new Error(`Unknown backup type: ${schedule.type}`);
    }
  }

  /**
   * Replicate backup to multiple regions
   */
  async replicateToRegions(backupPath) {
    if (!config.crossRegion.enabled || !config.crossRegion.s3Bucket) {
      this.log('Cross-region replication not configured');
      return;
    }

    this.log('Starting cross-region replication');
    const filename = path.basename(backupPath);
    const replicationPromises = [];

    for (const region of config.crossRegion.replicationRegions) {
      const replicationPromise = this.replicateToRegion(backupPath, region, filename);
      replicationPromises.push(replicationPromise);
    }

    try {
      await Promise.all(replicationPromises);
      this.log('Cross-region replication completed successfully');
    } catch (error) {
      this.log(`Cross-region replication failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Replicate to a specific region
   */
  async replicateToRegion(backupPath, region, filename) {
    const s3Key = `cross-region-backups/${region}/${filename}`;
    
    try {
      const awsCmd = [
        'aws s3 cp',
        `"${backupPath}"`,
        `"s3://${config.crossRegion.s3Bucket}/${s3Key}"`,
        `--region ${region}`,
        '--storage-class STANDARD_IA'
      ].join(' ');

      await execAsync(awsCmd);
      this.log(`Replicated to ${region}: ${s3Key}`);
    } catch (error) {
      this.log(`Failed to replicate to ${region}: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Perform automated recovery test
   */
  async performRecoveryTest(backupPath) {
    if (!config.recoveryTesting.enabled) {
      this.log('Recovery testing not enabled');
      return;
    }

    this.log('Starting automated recovery test');
    
    try {
      // Create test database
      await this.createTestDatabase();
      
      // Restore backup to test database
      await this.restoreToTestDatabase(backupPath);
      
      // Validate restored data
      await this.validateRestoredData();
      
      // Cleanup test database
      await this.cleanupTestDatabase();
      
      this.log('Recovery test completed successfully');
    } catch (error) {
      this.log(`Recovery test failed: ${error.message}`, 'error');
      
      // Cleanup on failure
      try {
        await this.cleanupTestDatabase();
      } catch (cleanupError) {
        this.log(`Cleanup failed: ${cleanupError.message}`, 'error');
      }
      
      throw error;
    }
  }

  /**
   * Create test database for recovery testing
   */
  async createTestDatabase() {
    const createDbCmd = `createdb -h ${process.env.POSTGRES_HOST || 'localhost'} -U ${process.env.POSTGRES_USER || 'postgres'} ${config.recoveryTesting.testDatabase}`;
    await execAsync(createDbCmd);
    this.log(`Test database created: ${config.recoveryTesting.testDatabase}`);
  }

  /**
   * Restore backup to test database
   */
  async restoreToTestDatabase(backupPath) {
    const restoreCmd = `pg_restore -h ${process.env.POSTGRES_HOST || 'localhost'} -U ${process.env.POSTGRES_USER || 'postgres'} -d ${config.recoveryTesting.testDatabase} --clean --if-exists "${backupPath}"`;
    await execAsync(restoreCmd);
    this.log(`Backup restored to test database: ${backupPath}`);
  }

  /**
   * Validate restored data
   */
  async validateRestoredData() {
    // Basic validation queries
    const validationQueries = [
      'SELECT COUNT(*) FROM patients',
      'SELECT COUNT(*) FROM appointments',
      'SELECT COUNT(*) FROM clinics',
      'SELECT COUNT(*) FROM users'
    ];

    for (const query of validationQueries) {
      const psqlCmd = `psql -h ${process.env.POSTGRES_HOST || 'localhost'} -U ${process.env.POSTGRES_USER || 'postgres'} -d ${config.recoveryTesting.testDatabase} -c "${query}"`;
      await execAsync(psqlCmd);
    }

    this.log('Data validation completed');
  }

  /**
   * Cleanup test database
   */
  async cleanupTestDatabase() {
    const dropDbCmd = `dropdb -h ${process.env.POSTGRES_HOST || 'localhost'} -U ${process.env.POSTGRES_USER || 'postgres'} ${config.recoveryTesting.testDatabase}`;
    await execAsync(dropDbCmd);
    this.log(`Test database cleaned up: ${config.recoveryTesting.testDatabase}`);
  }

  /**
   * Calculate next run time based on cron expression
   */
  calculateNextRun(cronExpression) {
    // Simple cron parser for basic expressions
    const [minute, hour, dayOfMonth, month, dayOfWeek] = cronExpression.split(' ');

    const now = new Date();
    const nextRun = new Date(now);

    // Set time
    nextRun.setHours(parseInt(hour), parseInt(minute), 0, 0);

    // If time has passed today, move to next occurrence
    if (nextRun <= now) {
      if (dayOfWeek !== '*') {
        // Weekly schedule
        const targetDay = parseInt(dayOfWeek);
        const currentDay = now.getDay();
        const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7;
        nextRun.setDate(now.getDate() + daysUntilTarget);
      } else if (dayOfMonth !== '*') {
        // Monthly schedule
        const targetDate = parseInt(dayOfMonth);
        nextRun.setDate(targetDate);
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1);
        }
      } else {
        // Daily schedule
        nextRun.setDate(now.getDate() + 1);
      }
    }

    return nextRun;
  }

  /**
   * Schedule next run for a backup
   */
  scheduleNextRun(schedule) {
    const now = new Date();
    const delay = schedule.nextRun.getTime() - now.getTime();

    if (delay <= 0) {
      // Should run immediately
      setImmediate(() => this.executeScheduledBackup(schedule.id));
    } else {
      // Schedule for future execution
      const timer = setTimeout(() => {
        this.executeScheduledBackup(schedule.id);
      }, delay);

      this.timers.set(schedule.id, timer);
    }
  }

  /**
   * Start monitoring loop
   */
  startMonitoringLoop() {
    const monitoringInterval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(monitoringInterval);
        return;
      }

      // Check for missed schedules
      this.checkMissedSchedules();

      // Cleanup old logs
      this.cleanupOldLogs();

    }, 60000); // Check every minute
  }

  /**
   * Check for missed schedules
   */
  checkMissedSchedules() {
    const now = new Date();

    for (const schedule of this.schedules.values()) {
      if (schedule.enabled && schedule.nextRun && schedule.nextRun <= now && schedule.status !== 'running') {
        this.log(`Missed schedule detected: ${schedule.name}`, 'warn');
        this.executeScheduledBackup(schedule.id);
      }
    }
  }

  /**
   * Send notification
   */
  async sendNotification(type, data) {
    try {
      if (config.notifications.webhook) {
        await this.sendWebhookNotification(type, data);
      }

      if (config.notifications.email) {
        await this.sendEmailNotification(type, data);
      }
    } catch (error) {
      this.log(`Failed to send notification: ${error.message}`, 'error');
    }
  }

  /**
   * Send webhook notification
   */
  async sendWebhookNotification(type, data) {
    const payload = {
      type,
      timestamp: new Date().toISOString(),
      data
    };

    const response = await fetch(config.notifications.webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook notification failed: ${response.statusText}`);
    }
  }

  /**
   * Load schedules from storage
   */
  async loadSchedules() {
    // In a real implementation, load from database or file
    this.log('Schedules loaded from storage');
  }

  /**
   * Cleanup old logs
   */
  async cleanupOldLogs() {
    // Keep logs for 30 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    // Implementation would clean up old log files
  }

  /**
   * Utility methods
   */
  async ensureLogDirectory() {
    const logDir = path.dirname(this.logFile);
    await fs.mkdir(logDir, { recursive: true });
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;

    console.log(logMessage.trim());

    // Append to log file
    fs.appendFile(this.logFile, logMessage).catch(console.error);
  }
}

// Export for use as module
module.exports = BackupScheduler;

// CLI usage
if (require.main === module) {
  const scheduler = new BackupScheduler();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'start':
      scheduler.initialize().then(() => scheduler.start());
      break;
    case 'stop':
      scheduler.stop();
      break;
    default:
      console.log('Usage: node backup-scheduler.js [start|stop]');
      process.exit(1);
  }
}
