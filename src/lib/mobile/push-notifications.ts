/**
 * Push Notifications System
 * 
 * Comprehensive push notification management for PWA including:
 * - Notification permission handling
 * - Push subscription management
 * - Local notifications
 * - Background notifications
 * - Notification actions
 * - Notification scheduling
 */

import { logger } from '../logging-monitoring';
import { pwaFeatures } from './pwa-features';

export interface NotificationConfig {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: any;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
  vibrate?: number[];
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface ScheduledNotification extends NotificationConfig {
  id: string;
  scheduledTime: Date;
  recurring?: {
    type: 'daily' | 'weekly' | 'monthly';
    interval: number;
  };
}

export interface NotificationPermissionState {
  permission: NotificationPermission;
  canRequest: boolean;
  isSupported: boolean;
}

class PushNotificationManager {
  private isInitialized = false;
  private subscription: PushSubscription | null = null;
  private scheduledNotifications: Map<string, ScheduledNotification> = new Map();
  private notificationQueue: NotificationConfig[] = [];

  constructor() {
    this.initialize();
  }

  /**
   * Initialize push notification system
   */
  private async initialize(): Promise<void> {
    try {
      if (!this.isNotificationSupported()) {
        logger.warn('Push notifications not supported', 'push-notifications');
        return;
      }

      // Setup event listeners
      this.setupEventListeners();

      // Load scheduled notifications
      this.loadScheduledNotifications();

      // Setup notification scheduler
      this.setupNotificationScheduler();

      this.isInitialized = true;
      logger.info('Push notification system initialized', 'push-notifications');
    } catch (error) {
      logger.error('Failed to initialize push notification system', 'push-notifications', { error });
    }
  }

  /**
   * Check if notifications are supported
   */
  isNotificationSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  }

  /**
   * Get notification permission state
   */
  getPermissionState(): NotificationPermissionState {
    return {
      permission: Notification.permission,
      canRequest: Notification.permission === 'default',
      isSupported: this.isNotificationSupported(),
    };
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isNotificationSupported()) {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      logger.info('Notification permission requested', 'push-notifications', { permission });
      
      if (permission === 'granted') {
        await this.setupPushSubscription();
      }
      
      return permission;
    } catch (error) {
      logger.error('Failed to request notification permission', 'push-notifications', { error });
      return 'denied';
    }
  }

  /**
   * Setup push subscription
   */
  private async setupPushSubscription(): Promise<void> {
    try {
      this.subscription = await pwaFeatures.subscribeToPushNotifications();
      
      if (this.subscription) {
        // Send subscription to server
        await this.sendSubscriptionToServer(this.subscription);
        logger.info('Push subscription established', 'push-notifications');
      }
    } catch (error) {
      logger.error('Failed to setup push subscription', 'push-notifications', { error });
    }
  }

  /**
   * Send subscription to server
   */
  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Subscription failed: ${response.statusText}`);
      }

      logger.info('Push subscription sent to server', 'push-notifications');
    } catch (error) {
      logger.error('Failed to send subscription to server', 'push-notifications', { error });
    }
  }

  /**
   * Show local notification
   */
  async showNotification(config: NotificationConfig): Promise<boolean> {
    if (Notification.permission !== 'granted') {
      logger.warn('Cannot show notification: permission not granted', 'push-notifications');
      return false;
    }

    try {
      const notification = new Notification(config.title, {
        body: config.body,
        icon: config.icon || '/icons/notification-icon.png',
        badge: config.badge || '/icons/notification-badge.png',
        image: config.image,
        tag: config.tag,
        data: config.data,
        requireInteraction: config.requireInteraction || false,
        silent: config.silent || false,
        timestamp: config.timestamp || Date.now(),
        vibrate: config.vibrate || [200, 100, 200],
      });

      // Handle notification click
      notification.onclick = (event) => {
        event.preventDefault();
        this.handleNotificationClick(config);
        notification.close();
      };

      // Auto-close after 5 seconds if not requiring interaction
      if (!config.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      logger.info('Local notification shown', 'push-notifications', { title: config.title });
      return true;
    } catch (error) {
      logger.error('Failed to show notification', 'push-notifications', { error });
      return false;
    }
  }

  /**
   * Schedule notification
   */
  scheduleNotification(notification: ScheduledNotification): void {
    this.scheduledNotifications.set(notification.id, notification);
    this.saveScheduledNotifications();
    
    logger.info('Notification scheduled', 'push-notifications', {
      id: notification.id,
      scheduledTime: notification.scheduledTime,
    });
  }

  /**
   * Cancel scheduled notification
   */
  cancelScheduledNotification(id: string): boolean {
    const deleted = this.scheduledNotifications.delete(id);
    if (deleted) {
      this.saveScheduledNotifications();
      logger.info('Scheduled notification cancelled', 'push-notifications', { id });
    }
    return deleted;
  }

  /**
   * Get scheduled notifications
   */
  getScheduledNotifications(): ScheduledNotification[] {
    return Array.from(this.scheduledNotifications.values());
  }

  /**
   * Setup notification scheduler
   */
  private setupNotificationScheduler(): void {
    // Check for due notifications every minute
    setInterval(() => {
      this.checkScheduledNotifications();
    }, 60000);

    // Initial check
    this.checkScheduledNotifications();
  }

  /**
   * Check and trigger scheduled notifications
   */
  private checkScheduledNotifications(): void {
    const now = new Date();
    
    for (const [id, notification] of this.scheduledNotifications) {
      if (notification.scheduledTime <= now) {
        // Show the notification
        this.showNotification(notification);
        
        // Handle recurring notifications
        if (notification.recurring) {
          const nextTime = this.calculateNextRecurrence(notification.scheduledTime, notification.recurring);
          notification.scheduledTime = nextTime;
          this.scheduledNotifications.set(id, notification);
        } else {
          // Remove one-time notification
          this.scheduledNotifications.delete(id);
        }
        
        this.saveScheduledNotifications();
      }
    }
  }

  /**
   * Calculate next recurrence time
   */
  private calculateNextRecurrence(
    lastTime: Date,
    recurring: { type: 'daily' | 'weekly' | 'monthly'; interval: number }
  ): Date {
    const nextTime = new Date(lastTime);
    
    switch (recurring.type) {
      case 'daily':
        nextTime.setDate(nextTime.getDate() + recurring.interval);
        break;
      case 'weekly':
        nextTime.setDate(nextTime.getDate() + (recurring.interval * 7));
        break;
      case 'monthly':
        nextTime.setMonth(nextTime.getMonth() + recurring.interval);
        break;
    }
    
    return nextTime;
  }

  /**
   * Handle notification click
   */
  private handleNotificationClick(config: NotificationConfig): void {
    // Focus the app window
    if (window.focus) {
      window.focus();
    }

    // Handle custom data
    if (config.data) {
      const event = new CustomEvent('notification:click', {
        detail: config.data,
      });
      window.dispatchEvent(event);
    }

    logger.info('Notification clicked', 'push-notifications', { tag: config.tag });
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'PUSH_NOTIFICATION') {
          this.handlePushMessage(event.data.payload);
        }
      });
    }

    // Listen for visibility change to handle queued notifications
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.notificationQueue.length > 0) {
        this.processNotificationQueue();
      }
    });
  }

  /**
   * Handle push message from service worker
   */
  private handlePushMessage(payload: any): void {
    try {
      const notificationConfig: NotificationConfig = {
        title: payload.title || 'ClinicBoost',
        body: payload.body || 'You have a new notification',
        icon: payload.icon,
        badge: payload.badge,
        image: payload.image,
        tag: payload.tag,
        data: payload.data,
        actions: payload.actions,
        requireInteraction: payload.requireInteraction,
      };

      if (document.hidden) {
        // Queue notification if app is not visible
        this.notificationQueue.push(notificationConfig);
      } else {
        // Show notification immediately if app is visible
        this.showNotification(notificationConfig);
      }
    } catch (error) {
      logger.error('Failed to handle push message', 'push-notifications', { error });
    }
  }

  /**
   * Process queued notifications
   */
  private processNotificationQueue(): void {
    while (this.notificationQueue.length > 0) {
      const notification = this.notificationQueue.shift();
      if (notification) {
        this.showNotification(notification);
      }
    }
  }

  /**
   * Save scheduled notifications to localStorage
   */
  private saveScheduledNotifications(): void {
    try {
      const notifications = Array.from(this.scheduledNotifications.entries()).map(([id, notification]) => ({
        id,
        ...notification,
        scheduledTime: notification.scheduledTime.toISOString(),
      }));
      
      localStorage.setItem('scheduled-notifications', JSON.stringify(notifications));
    } catch (error) {
      logger.error('Failed to save scheduled notifications', 'push-notifications', { error });
    }
  }

  /**
   * Load scheduled notifications from localStorage
   */
  private loadScheduledNotifications(): void {
    try {
      const stored = localStorage.getItem('scheduled-notifications');
      if (stored) {
        const notifications = JSON.parse(stored);
        
        for (const notification of notifications) {
          this.scheduledNotifications.set(notification.id, {
            ...notification,
            scheduledTime: new Date(notification.scheduledTime),
          });
        }
      }
    } catch (error) {
      logger.error('Failed to load scheduled notifications', 'push-notifications', { error });
    }
  }

  /**
   * Create appointment reminder notification
   */
  createAppointmentReminder(appointmentId: string, patientName: string, appointmentTime: Date): void {
    const reminderTime = new Date(appointmentTime.getTime() - 24 * 60 * 60 * 1000); // 24 hours before
    
    const notification: ScheduledNotification = {
      id: `appointment-reminder-${appointmentId}`,
      title: 'Appointment Reminder',
      body: `Reminder: ${patientName} has an appointment tomorrow`,
      icon: '/icons/appointment-icon.png',
      tag: 'appointment-reminder',
      data: {
        type: 'appointment-reminder',
        appointmentId,
        patientName,
      },
      scheduledTime: reminderTime,
      requireInteraction: true,
    };

    this.scheduleNotification(notification);
  }

  /**
   * Create medication reminder notification
   */
  createMedicationReminder(patientId: string, medicationName: string, times: string[]): void {
    times.forEach((time, index) => {
      const [hours, minutes] = time.split(':').map(Number);
      const reminderTime = new Date();
      reminderTime.setHours(hours, minutes, 0, 0);
      
      // If time has passed today, schedule for tomorrow
      if (reminderTime <= new Date()) {
        reminderTime.setDate(reminderTime.getDate() + 1);
      }

      const notification: ScheduledNotification = {
        id: `medication-reminder-${patientId}-${index}`,
        title: 'Medication Reminder',
        body: `Time to take ${medicationName}`,
        icon: '/icons/medication-icon.png',
        tag: 'medication-reminder',
        data: {
          type: 'medication-reminder',
          patientId,
          medicationName,
        },
        scheduledTime: reminderTime,
        recurring: {
          type: 'daily',
          interval: 1,
        },
        requireInteraction: false,
      };

      this.scheduleNotification(notification);
    });
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    try {
      if (this.subscription) {
        await this.subscription.unsubscribe();
        this.subscription = null;
        
        // Notify server
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        logger.info('Unsubscribed from push notifications', 'push-notifications');
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to unsubscribe from push notifications', 'push-notifications', { error });
      return false;
    }
  }

  /**
   * Get subscription status
   */
  isSubscribed(): boolean {
    return !!this.subscription;
  }

  /**
   * Clear all notifications
   */
  clearAllNotifications(): void {
    this.scheduledNotifications.clear();
    this.notificationQueue.length = 0;
    this.saveScheduledNotifications();
    logger.info('All notifications cleared', 'push-notifications');
  }
}

// Export singleton instance
export const pushNotifications = new PushNotificationManager();

// Export utility functions
export const requestNotificationPermission = () => pushNotifications.requestPermission();
export const showNotification = (config: NotificationConfig) => pushNotifications.showNotification(config);
export const scheduleNotification = (notification: ScheduledNotification) => pushNotifications.scheduleNotification(notification);
export const cancelScheduledNotification = (id: string) => pushNotifications.cancelScheduledNotification(id);
export const getScheduledNotifications = () => pushNotifications.getScheduledNotifications();
export const createAppointmentReminder = (appointmentId: string, patientName: string, appointmentTime: Date) =>
  pushNotifications.createAppointmentReminder(appointmentId, patientName, appointmentTime);
export const createMedicationReminder = (patientId: string, medicationName: string, times: string[]) =>
  pushNotifications.createMedicationReminder(patientId, medicationName, times);
export const isNotificationSupported = () => pushNotifications.isNotificationSupported();
export const getNotificationPermissionState = () => pushNotifications.getPermissionState();
export const unsubscribeFromNotifications = () => pushNotifications.unsubscribe();
export const isSubscribedToNotifications = () => pushNotifications.isSubscribed();
export const clearAllNotifications = () => pushNotifications.clearAllNotifications();
