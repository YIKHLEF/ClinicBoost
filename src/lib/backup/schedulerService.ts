/**
 * Backup Scheduler Service
 * 
 * Service for managing automated backup schedules and execution
 */

import {
  BackupSchedule,
  BackupFrequency,
  BackupType,
  RetentionPolicy,
  NotificationSettings,
  BackupLocation,
  EncryptionInfo
} from './types';
import { backupService } from './backupService';

class SchedulerService {
  private schedules = new Map<string, BackupSchedule>();
  private timers = new Map<string, NodeJS.Timeout>();
  private isRunning = false;

  /**
   * Initialize the scheduler service
   */
  async initialize(): Promise<void> {
    try {
      // Load existing schedules
      await this.loadSchedules();
      
      // Start the scheduler
      this.start();
      
      console.log('Backup scheduler initialized successfully');
    } catch (error) {
      console.error('Failed to initialize backup scheduler:', error);
      throw error;
    }
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Schedule all active backup schedules
    for (const schedule of this.schedules.values()) {
      if (schedule.enabled) {
        this.scheduleBackup(schedule);
      }
    }
    
    console.log('Backup scheduler started');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) return;
    
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    
    this.isRunning = false;
    console.log('Backup scheduler stopped');
  }

  /**
   * Create a new backup schedule
   */
  async createSchedule(
    name: string,
    type: BackupType,
    frequency: BackupFrequency,
    options: {
      time?: string;
      timezone?: string;
      retention?: RetentionPolicy;
      location?: BackupLocation;
      encryption?: EncryptionInfo;
      notifications?: NotificationSettings;
      enabled?: boolean;
    } = {}
  ): Promise<string> {
    const scheduleId = this.generateId();
    
    const schedule: BackupSchedule = {
      id: scheduleId,
      name,
      enabled: options.enabled ?? true,
      type,
      frequency,
      time: options.time || '02:00', // Default to 2 AM
      timezone: options.timezone || 'UTC',
      retention: options.retention || this.getDefaultRetentionPolicy(),
      location: options.location || this.getDefaultLocation(),
      encryption: options.encryption || this.getDefaultEncryption(),
      notifications: options.notifications || this.getDefaultNotifications(),
      nextRun: this.calculateNextRun(frequency, options.time || '02:00'),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.schedules.set(scheduleId, schedule);
    
    // Schedule the backup if enabled
    if (schedule.enabled && this.isRunning) {
      this.scheduleBackup(schedule);
    }
    
    // Save to storage
    await this.saveSchedule(schedule);
    
    return scheduleId;
  }

  /**
   * Update an existing schedule
   */
  async updateSchedule(
    scheduleId: string,
    updates: Partial<BackupSchedule>
  ): Promise<boolean> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) return false;

    // Clear existing timer
    const timer = this.timers.get(scheduleId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(scheduleId);
    }

    // Update schedule
    Object.assign(schedule, updates, { updatedAt: new Date() });
    
    // Recalculate next run if frequency or time changed
    if (updates.frequency || updates.time) {
      schedule.nextRun = this.calculateNextRun(schedule.frequency, schedule.time);
    }

    // Reschedule if enabled
    if (schedule.enabled && this.isRunning) {
      this.scheduleBackup(schedule);
    }

    // Save to storage
    await this.saveSchedule(schedule);
    
    return true;
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(scheduleId: string): Promise<boolean> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) return false;

    // Clear timer
    const timer = this.timers.get(scheduleId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(scheduleId);
    }

    // Remove from memory
    this.schedules.delete(scheduleId);
    
    // Remove from storage
    await this.removeSchedule(scheduleId);
    
    return true;
  }

  /**
   * Enable/disable a schedule
   */
  async toggleSchedule(scheduleId: string, enabled: boolean): Promise<boolean> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) return false;

    schedule.enabled = enabled;
    schedule.updatedAt = new Date();

    if (enabled && this.isRunning) {
      this.scheduleBackup(schedule);
    } else {
      const timer = this.timers.get(scheduleId);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(scheduleId);
      }
    }

    await this.saveSchedule(schedule);
    return true;
  }

  /**
   * Schedule a backup
   */
  private scheduleBackup(schedule: BackupSchedule): void {
    const now = new Date();
    const nextRun = schedule.nextRun || this.calculateNextRun(schedule.frequency, schedule.time);
    const delay = nextRun.getTime() - now.getTime();

    if (delay <= 0) {
      // Should run immediately
      this.executeScheduledBackup(schedule);
    } else {
      // Schedule for future execution
      const timer = setTimeout(() => {
        this.executeScheduledBackup(schedule);
      }, delay);
      
      this.timers.set(schedule.id, timer);
    }
  }

  /**
   * Execute a scheduled backup
   */
  private async executeScheduledBackup(schedule: BackupSchedule): Promise<void> {
    try {
      console.log(`Executing scheduled backup: ${schedule.name}`);
      
      // Update last run time
      schedule.lastRun = new Date();
      
      // Calculate next run
      schedule.nextRun = this.calculateNextRun(schedule.frequency, schedule.time);
      
      // Create backup
      const jobId = await backupService.createBackup(schedule.type, {
        name: `${schedule.name} - ${new Date().toISOString()}`,
        description: `Automated backup from schedule: ${schedule.name}`,
        location: schedule.location,
        encryption: schedule.encryption,
        tags: ['scheduled', schedule.type, schedule.id]
      });

      console.log(`Scheduled backup started: ${jobId}`);
      
      // Schedule next backup
      if (schedule.enabled) {
        this.scheduleBackup(schedule);
      }
      
      // Save updated schedule
      await this.saveSchedule(schedule);
      
    } catch (error) {
      console.error(`Failed to execute scheduled backup ${schedule.name}:`, error);
      
      // Send failure notification
      await this.sendFailureNotification(schedule, error);
      
      // Reschedule for next run
      if (schedule.enabled) {
        this.scheduleBackup(schedule);
      }
    }
  }

  /**
   * Calculate next run time
   */
  private calculateNextRun(frequency: BackupFrequency, time: string): Date {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    
    let nextRun = new Date();
    nextRun.setHours(hours, minutes, 0, 0);

    switch (frequency.type) {
      case 'daily':
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        break;

      case 'weekly':
        const targetDay = frequency.daysOfWeek?.[0] || 0; // Default to Sunday
        const currentDay = nextRun.getDay();
        let daysUntilTarget = targetDay - currentDay;
        
        if (daysUntilTarget <= 0 || (daysUntilTarget === 0 && nextRun <= now)) {
          daysUntilTarget += 7;
        }
        
        nextRun.setDate(nextRun.getDate() + daysUntilTarget);
        break;

      case 'monthly':
        const targetDate = frequency.dayOfMonth || 1;
        nextRun.setDate(targetDate);
        
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1);
          nextRun.setDate(targetDate);
        }
        break;

      case 'custom':
        if (frequency.customCron) {
          // In a real implementation, use a cron parser
          // For now, default to daily
          if (nextRun <= now) {
            nextRun.setDate(nextRun.getDate() + 1);
          }
        } else if (frequency.interval) {
          nextRun = new Date(now.getTime() + frequency.interval * 60 * 60 * 1000);
        }
        break;
    }

    return nextRun;
  }

  /**
   * Get schedule by ID
   */
  getSchedule(scheduleId: string): BackupSchedule | undefined {
    return this.schedules.get(scheduleId);
  }

  /**
   * List all schedules
   */
  listSchedules(): BackupSchedule[] {
    return Array.from(this.schedules.values());
  }

  /**
   * Get active schedules
   */
  getActiveSchedules(): BackupSchedule[] {
    return Array.from(this.schedules.values()).filter(s => s.enabled);
  }

  /**
   * Get next scheduled backup
   */
  getNextScheduledBackup(): { schedule: BackupSchedule; nextRun: Date } | null {
    const activeSchedules = this.getActiveSchedules();
    if (activeSchedules.length === 0) return null;

    const nextSchedule = activeSchedules.reduce((earliest, current) => {
      const currentNext = current.nextRun || new Date(Date.now() + 24 * 60 * 60 * 1000);
      const earliestNext = earliest.nextRun || new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      return currentNext < earliestNext ? current : earliest;
    });

    return {
      schedule: nextSchedule,
      nextRun: nextSchedule.nextRun || new Date()
    };
  }

  /**
   * Trigger immediate backup for a schedule
   */
  async triggerImmediateBackup(scheduleId: string): Promise<string | null> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) return null;

    const jobId = await backupService.createBackup(schedule.type, {
      name: `${schedule.name} - Manual Trigger - ${new Date().toISOString()}`,
      description: `Manual backup trigger from schedule: ${schedule.name}`,
      location: schedule.location,
      encryption: schedule.encryption,
      tags: ['manual', 'triggered', schedule.type, schedule.id]
    });

    return jobId;
  }

  /**
   * Storage and utility methods
   */
  private async loadSchedules(): Promise<void> {
    // In a real implementation, load from database
    // For demo, create a sample schedule
    const sampleSchedule: BackupSchedule = {
      id: 'schedule_daily_full',
      name: 'Daily Full Backup',
      enabled: true,
      type: 'full',
      frequency: { type: 'daily' },
      time: '02:00',
      timezone: 'UTC',
      retention: this.getDefaultRetentionPolicy(),
      location: this.getDefaultLocation(),
      encryption: this.getDefaultEncryption(),
      notifications: this.getDefaultNotifications(),
      nextRun: this.calculateNextRun({ type: 'daily' }, '02:00'),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.schedules.set(sampleSchedule.id, sampleSchedule);
  }

  private async saveSchedule(schedule: BackupSchedule): Promise<void> {
    // In a real implementation, save to database
    console.log(`Saving schedule: ${schedule.name}`);
  }

  private async removeSchedule(scheduleId: string): Promise<void> {
    // In a real implementation, remove from database
    console.log(`Removing schedule: ${scheduleId}`);
  }

  private async sendFailureNotification(schedule: BackupSchedule, error: any): Promise<void> {
    if (schedule.notifications.onFailure) {
      console.log(`Backup failure notification for ${schedule.name}:`, error.message);
      // In a real implementation, send actual notifications
    }
  }

  private generateId(): string {
    return `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultRetentionPolicy(): RetentionPolicy {
    return {
      keepDaily: 7,
      keepWeekly: 4,
      keepMonthly: 12,
      keepYearly: 3,
      maxAge: 365,
      maxSize: 100 * 1024 * 1024 * 1024 // 100GB
    };
  }

  private getDefaultLocation(): BackupLocation {
    return {
      type: 'local',
      path: '/backups'
    };
  }

  private getDefaultEncryption(): EncryptionInfo {
    return {
      enabled: true,
      algorithm: 'AES-256'
    };
  }

  private getDefaultNotifications(): NotificationSettings {
    return {
      onSuccess: false,
      onFailure: true,
      onWarning: true,
      email: []
    };
  }
}

export const schedulerService = new SchedulerService();
