/**
 * Enhanced PWA Features
 * 
 * Provides comprehensive Progressive Web App functionality including:
 * - App installation prompts
 * - Offline capabilities
 * - Background sync
 * - Push notifications
 * - App shortcuts
 * - Share API integration
 * - Fullscreen mode management
 */

import { logger } from '../logging-monitoring';

export interface PWAConfig {
  enableInstallPrompt: boolean;
  enableOfflineMode: boolean;
  enableBackgroundSync: boolean;
  enablePushNotifications: boolean;
  enableAppShortcuts: boolean;
  enableShareAPI: boolean;
  installPromptDelay: number; // milliseconds
  offlinePageUrl: string;
}

export interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface AppShortcut {
  name: string;
  short_name?: string;
  description?: string;
  url: string;
  icons?: Array<{
    src: string;
    sizes: string;
    type?: string;
  }>;
}

export interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

class PWAFeaturesManager {
  private config: PWAConfig;
  private installPromptEvent: InstallPromptEvent | null = null;
  private isInstalled = false;
  private isOnline = navigator.onLine;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

  constructor() {
    this.config = {
      enableInstallPrompt: true,
      enableOfflineMode: true,
      enableBackgroundSync: true,
      enablePushNotifications: true,
      enableAppShortcuts: true,
      enableShareAPI: true,
      installPromptDelay: 3000,
      offlinePageUrl: '/offline',
    };

    this.initialize();
  }

  /**
   * Initialize PWA features
   */
  private async initialize(): Promise<void> {
    try {
      // Check if app is already installed
      this.checkInstallationStatus();

      // Setup event listeners
      this.setupEventListeners();

      // Register service worker
      await this.registerServiceWorker();

      // Setup app shortcuts
      if (this.config.enableAppShortcuts) {
        this.setupAppShortcuts();
      }

      // Setup background sync
      if (this.config.enableBackgroundSync) {
        this.setupBackgroundSync();
      }

      logger.info('PWA features initialized successfully', 'pwa');
    } catch (error) {
      logger.error('Failed to initialize PWA features', 'pwa', { error });
    }
  }

  /**
   * Check if app is installed
   */
  private checkInstallationStatus(): void {
    // Check if running in standalone mode
    this.isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                     (window.navigator as any).standalone === true;

    // Listen for display mode changes
    window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
      this.isInstalled = e.matches;
      this.dispatchInstallationStatusChange();
    });
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Install prompt event
    if (this.config.enableInstallPrompt) {
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        this.installPromptEvent = e as InstallPromptEvent;
        
        // Show install prompt after delay
        setTimeout(() => {
          this.showInstallPrompt();
        }, this.config.installPromptDelay);
      });
    }

    // App installed event
    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.installPromptEvent = null;
      this.dispatchInstallationStatusChange();
      logger.info('App installed successfully', 'pwa');
    });

    // Online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.handleOnlineStatusChange();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.handleOnlineStatusChange();
    });

    // Visibility change for background sync
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.config.enableBackgroundSync) {
        this.triggerBackgroundSync();
      }
    });
  }

  /**
   * Register service worker
   */
  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js');
        
        // Listen for service worker updates
        this.serviceWorkerRegistration.addEventListener('updatefound', () => {
          const newWorker = this.serviceWorkerRegistration!.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.showUpdateAvailableNotification();
              }
            });
          }
        });

        logger.info('Service worker registered successfully', 'pwa');
      } catch (error) {
        logger.error('Service worker registration failed', 'pwa', { error });
      }
    }
  }

  /**
   * Show install prompt
   */
  async showInstallPrompt(): Promise<boolean> {
    if (!this.installPromptEvent || this.isInstalled) {
      return false;
    }

    try {
      await this.installPromptEvent.prompt();
      const choiceResult = await this.installPromptEvent.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        logger.info('User accepted install prompt', 'pwa');
        return true;
      } else {
        logger.info('User dismissed install prompt', 'pwa');
        return false;
      }
    } catch (error) {
      logger.error('Install prompt failed', 'pwa', { error });
      return false;
    } finally {
      this.installPromptEvent = null;
    }
  }

  /**
   * Check if app can be installed
   */
  canInstall(): boolean {
    return !!this.installPromptEvent && !this.isInstalled;
  }

  /**
   * Check if app is installed
   */
  isAppInstalled(): boolean {
    return this.isInstalled;
  }

  /**
   * Setup app shortcuts
   */
  private setupAppShortcuts(): void {
    const shortcuts: AppShortcut[] = [
      {
        name: 'New Appointment',
        short_name: 'Appointment',
        description: 'Schedule a new appointment',
        url: '/appointments/new',
        icons: [
          {
            src: '/icons/appointment-96x96.png',
            sizes: '96x96',
            type: 'image/png',
          },
        ],
      },
      {
        name: 'Patient Search',
        short_name: 'Patients',
        description: 'Search for patients',
        url: '/patients',
        icons: [
          {
            src: '/icons/patients-96x96.png',
            sizes: '96x96',
            type: 'image/png',
          },
        ],
      },
      {
        name: 'Dashboard',
        short_name: 'Dashboard',
        description: 'View clinic dashboard',
        url: '/dashboard',
        icons: [
          {
            src: '/icons/dashboard-96x96.png',
            sizes: '96x96',
            type: 'image/png',
          },
        ],
      },
    ];

    // Update manifest with shortcuts
    this.updateManifestShortcuts(shortcuts);
  }

  /**
   * Update manifest shortcuts
   */
  private updateManifestShortcuts(shortcuts: AppShortcut[]): void {
    try {
      const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      if (manifestLink) {
        // In a real implementation, you would update the manifest file
        // For now, we'll just log the shortcuts
        logger.info('App shortcuts configured', 'pwa', { shortcuts });
      }
    } catch (error) {
      logger.error('Failed to update manifest shortcuts', 'pwa', { error });
    }
  }

  /**
   * Setup background sync
   */
  private async setupBackgroundSync(): Promise<void> {
    if (!this.serviceWorkerRegistration || !('sync' in window.ServiceWorkerRegistration.prototype)) {
      logger.warn('Background sync not supported', 'pwa');
      return;
    }

    try {
      // Register background sync
      await this.serviceWorkerRegistration.sync.register('background-sync');
      logger.info('Background sync registered', 'pwa');
    } catch (error) {
      logger.error('Background sync registration failed', 'pwa', { error });
    }
  }

  /**
   * Trigger background sync
   */
  private async triggerBackgroundSync(): Promise<void> {
    if (!this.serviceWorkerRegistration || !('sync' in window.ServiceWorkerRegistration.prototype)) {
      return;
    }

    try {
      await this.serviceWorkerRegistration.sync.register('data-sync');
      logger.info('Background sync triggered', 'pwa');
    } catch (error) {
      logger.error('Background sync trigger failed', 'pwa', { error });
    }
  }

  /**
   * Request push notification permission
   */
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      logger.warn('Notifications not supported', 'pwa');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    logger.info('Notification permission requested', 'pwa', { permission });
    return permission;
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPushNotifications(): Promise<PushSubscription | null> {
    if (!this.serviceWorkerRegistration || !this.config.enablePushNotifications) {
      return null;
    }

    try {
      const permission = await this.requestNotificationPermission();
      if (permission !== 'granted') {
        return null;
      }

      const subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(process.env.VITE_VAPID_PUBLIC_KEY || ''),
      });

      logger.info('Push notification subscription created', 'pwa');
      return subscription;
    } catch (error) {
      logger.error('Push notification subscription failed', 'pwa', { error });
      return null;
    }
  }

  /**
   * Share content using Web Share API
   */
  async share(data: ShareData): Promise<boolean> {
    if (!this.config.enableShareAPI || !navigator.share) {
      // Fallback to clipboard or other sharing methods
      return this.fallbackShare(data);
    }

    try {
      await navigator.share(data);
      logger.info('Content shared successfully', 'pwa');
      return true;
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        logger.error('Share failed', 'pwa', { error });
      }
      return false;
    }
  }

  /**
   * Fallback share method
   */
  private async fallbackShare(data: ShareData): Promise<boolean> {
    try {
      const shareText = `${data.title || ''}\n${data.text || ''}\n${data.url || ''}`.trim();
      
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        this.showShareFeedback('Copied to clipboard');
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Fallback share failed', 'pwa', { error });
      return false;
    }
  }

  /**
   * Enter fullscreen mode
   */
  async enterFullscreen(): Promise<boolean> {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Fullscreen request failed', 'pwa', { error });
      return false;
    }
  }

  /**
   * Exit fullscreen mode
   */
  async exitFullscreen(): Promise<boolean> {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Exit fullscreen failed', 'pwa', { error });
      return false;
    }
  }

  /**
   * Check if in fullscreen mode
   */
  isFullscreen(): boolean {
    return !!document.fullscreenElement;
  }

  /**
   * Handle online status change
   */
  private handleOnlineStatusChange(): void {
    const event = new CustomEvent('pwa:online-status-change', {
      detail: { isOnline: this.isOnline },
    });
    window.dispatchEvent(event);

    if (this.isOnline && this.config.enableBackgroundSync) {
      this.triggerBackgroundSync();
    }
  }

  /**
   * Dispatch installation status change event
   */
  private dispatchInstallationStatusChange(): void {
    const event = new CustomEvent('pwa:installation-status-change', {
      detail: { isInstalled: this.isInstalled },
    });
    window.dispatchEvent(event);
  }

  /**
   * Show update available notification
   */
  private showUpdateAvailableNotification(): void {
    const event = new CustomEvent('pwa:update-available');
    window.dispatchEvent(event);
  }

  /**
   * Show share feedback
   */
  private showShareFeedback(message: string): void {
    const event = new CustomEvent('pwa:share-feedback', {
      detail: { message },
    });
    window.dispatchEvent(event);
  }

  /**
   * Convert VAPID key
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Get configuration
   */
  getConfig(): PWAConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PWAConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get online status
   */
  getOnlineStatus(): boolean {
    return this.isOnline;
  }
}

// Export singleton instance
export const pwaFeatures = new PWAFeaturesManager();

// Export utility functions
export const showInstallPrompt = () => pwaFeatures.showInstallPrompt();
export const canInstallApp = () => pwaFeatures.canInstall();
export const isAppInstalled = () => pwaFeatures.isAppInstalled();
export const requestNotificationPermission = () => pwaFeatures.requestNotificationPermission();
export const subscribeToPushNotifications = () => pwaFeatures.subscribeToPushNotifications();
export const shareContent = (data: ShareData) => pwaFeatures.share(data);
export const enterFullscreen = () => pwaFeatures.enterFullscreen();
export const exitFullscreen = () => pwaFeatures.exitFullscreen();
export const isFullscreen = () => pwaFeatures.isFullscreen();
export const getOnlineStatus = () => pwaFeatures.getOnlineStatus();
