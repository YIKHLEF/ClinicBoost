/**
 * Third-Party Analytics Core System
 * 
 * This module provides core analytics integration functionality including:
 * - Analytics provider management
 * - Event tracking and metrics collection
 * - Data transformation and normalization
 * - Privacy compliance and data filtering
 * - Real-time analytics streaming
 */

import { logger } from '../logging-monitoring';
import { secureConfig } from '../config/secure-config';

export interface AnalyticsProvider {
  id: string;
  name: string;
  type: 'google_analytics' | 'mixpanel' | 'amplitude' | 'segment' | 'hotjar' | 'fullstory' | 'heap' | 'custom';
  enabled: boolean;
  credentials?: Record<string, any>;
  settings: AnalyticsProviderSettings;
  status: 'connected' | 'disconnected' | 'error' | 'initializing';
  lastSync?: Date;
}

export interface AnalyticsProviderSettings {
  trackingId?: string;
  apiKey?: string;
  projectId?: string;
  dataStreams: AnalyticsDataStream[];
  eventFilters: EventFilter[];
  privacySettings: PrivacySettings;
  realTimeEnabled: boolean;
  batchSize: number;
  flushInterval: number; // seconds
  retryAttempts: number;
  customDimensions?: CustomDimension[];
}

export interface AnalyticsDataStream {
  id: string;
  name: string;
  type: 'events' | 'pageviews' | 'user_properties' | 'custom_metrics' | 'conversion_events';
  enabled: boolean;
  filters: string[];
  transformations: DataTransformation[];
}

export interface EventFilter {
  id: string;
  name: string;
  eventType: string;
  conditions: FilterCondition[];
  action: 'include' | 'exclude' | 'transform';
  enabled: boolean;
}

export interface FilterCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'regex';
  value: any;
}

export interface PrivacySettings {
  anonymizeIPs: boolean;
  excludePII: boolean;
  consentRequired: boolean;
  dataRetentionDays: number;
  allowedRegions: string[];
  blockedRegions: string[];
  cookieConsent: boolean;
}

export interface DataTransformation {
  id: string;
  name: string;
  type: 'map' | 'filter' | 'aggregate' | 'enrich' | 'anonymize';
  config: Record<string, any>;
  enabled: boolean;
}

export interface CustomDimension {
  id: string;
  name: string;
  scope: 'hit' | 'session' | 'user' | 'product';
  type: 'text' | 'number' | 'boolean' | 'date';
  defaultValue?: any;
}

export interface AnalyticsEvent {
  id: string;
  name: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  properties: Record<string, any>;
  context: EventContext;
}

export interface EventContext {
  page?: {
    url: string;
    title: string;
    referrer?: string;
  };
  user?: {
    id?: string;
    role?: string;
    department?: string;
    anonymousId?: string;
  };
  session?: {
    id: string;
    startTime: Date;
    duration?: number;
  };
  device?: {
    type: 'desktop' | 'mobile' | 'tablet';
    os: string;
    browser: string;
    screenResolution?: string;
  };
  location?: {
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
  };
}

export interface AnalyticsMetric {
  id: string;
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'timer';
  value: number;
  unit?: string;
  tags: Record<string, string>;
  timestamp: Date;
}

export interface BatchPayload {
  providerId: string;
  events: AnalyticsEvent[];
  metrics: AnalyticsMetric[];
  timestamp: Date;
  batchId: string;
}

export interface SendResult {
  success: boolean;
  providerId: string;
  eventsProcessed: number;
  metricsProcessed: number;
  errors: string[];
  retryable: boolean;
  timestamp: Date;
}

class AnalyticsCoreManager {
  private providers: Map<string, AnalyticsProvider> = new Map();
  private eventQueue: AnalyticsEvent[] = [];
  private metricsQueue: AnalyticsMetric[] = [];
  private flushIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isInitialized = false;
  private consentGiven = false;

  constructor() {
    this.setupDefaultProviders();
    this.setupEventListeners();
  }

  /**
   * Initialize analytics core system
   */
  async initialize(): Promise<void> {
    try {
      await this.loadProviderConfigurations();
      await this.checkConsentStatus();
      await this.setupFlushSchedules();
      this.isInitialized = true;
      
      logger.info('Analytics core system initialized', 'analytics-core');
    } catch (error) {
      logger.error('Failed to initialize analytics core system', 'analytics-core', { error });
      throw error;
    }
  }

  /**
   * Setup default analytics providers
   */
  private setupDefaultProviders(): void {
    const defaultProviders: AnalyticsProvider[] = [
      {
        id: 'google-analytics',
        name: 'Google Analytics 4',
        type: 'google_analytics',
        enabled: false,
        settings: {
          dataStreams: [
            {
              id: 'pageviews',
              name: 'Page Views',
              type: 'pageviews',
              enabled: true,
              filters: [],
              transformations: [],
            },
            {
              id: 'events',
              name: 'Custom Events',
              type: 'events',
              enabled: true,
              filters: [],
              transformations: [],
            },
          ],
          eventFilters: [],
          privacySettings: {
            anonymizeIPs: true,
            excludePII: true,
            consentRequired: true,
            dataRetentionDays: 365,
            allowedRegions: [],
            blockedRegions: [],
            cookieConsent: true,
          },
          realTimeEnabled: true,
          batchSize: 20,
          flushInterval: 30,
          retryAttempts: 3,
        },
        status: 'disconnected',
      },
      {
        id: 'mixpanel',
        name: 'Mixpanel',
        type: 'mixpanel',
        enabled: false,
        settings: {
          dataStreams: [
            {
              id: 'events',
              name: 'User Events',
              type: 'events',
              enabled: true,
              filters: [],
              transformations: [],
            },
            {
              id: 'user_properties',
              name: 'User Properties',
              type: 'user_properties',
              enabled: true,
              filters: [],
              transformations: [],
            },
          ],
          eventFilters: [],
          privacySettings: {
            anonymizeIPs: false,
            excludePII: true,
            consentRequired: true,
            dataRetentionDays: 730,
            allowedRegions: [],
            blockedRegions: [],
            cookieConsent: true,
          },
          realTimeEnabled: true,
          batchSize: 50,
          flushInterval: 10,
          retryAttempts: 3,
        },
        status: 'disconnected',
      },
      {
        id: 'amplitude',
        name: 'Amplitude',
        type: 'amplitude',
        enabled: false,
        settings: {
          dataStreams: [
            {
              id: 'events',
              name: 'Product Events',
              type: 'events',
              enabled: true,
              filters: [],
              transformations: [],
            },
          ],
          eventFilters: [],
          privacySettings: {
            anonymizeIPs: true,
            excludePII: true,
            consentRequired: true,
            dataRetentionDays: 365,
            allowedRegions: [],
            blockedRegions: [],
            cookieConsent: true,
          },
          realTimeEnabled: true,
          batchSize: 30,
          flushInterval: 15,
          retryAttempts: 3,
        },
        status: 'disconnected',
      },
      {
        id: 'hotjar',
        name: 'Hotjar',
        type: 'hotjar',
        enabled: false,
        settings: {
          dataStreams: [
            {
              id: 'heatmaps',
              name: 'Heatmaps',
              type: 'pageviews',
              enabled: true,
              filters: [],
              transformations: [],
            },
            {
              id: 'recordings',
              name: 'Session Recordings',
              type: 'events',
              enabled: false,
              filters: [],
              transformations: [],
            },
          ],
          eventFilters: [],
          privacySettings: {
            anonymizeIPs: true,
            excludePII: true,
            consentRequired: true,
            dataRetentionDays: 365,
            allowedRegions: [],
            blockedRegions: [],
            cookieConsent: true,
          },
          realTimeEnabled: false,
          batchSize: 1,
          flushInterval: 60,
          retryAttempts: 2,
        },
        status: 'disconnected',
      },
    ];

    defaultProviders.forEach(provider => {
      this.providers.set(provider.id, provider);
    });
  }

  /**
   * Setup event listeners for automatic tracking
   */
  private setupEventListeners(): void {
    // Page view tracking
    if (typeof window !== 'undefined') {
      // Track initial page load
      this.trackPageView();

      // Track navigation changes (for SPAs)
      window.addEventListener('popstate', () => {
        this.trackPageView();
      });

      // Track clicks on important elements
      document.addEventListener('click', (event) => {
        this.handleClickTracking(event);
      });

      // Track form submissions
      document.addEventListener('submit', (event) => {
        this.handleFormSubmission(event);
      });

      // Track errors
      window.addEventListener('error', (event) => {
        this.trackError(event.error, 'javascript_error');
      });

      // Track unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.trackError(event.reason, 'unhandled_promise_rejection');
      });
    }
  }

  /**
   * Load provider configurations from storage
   */
  private async loadProviderConfigurations(): Promise<void> {
    try {
      const storedConfigs = localStorage.getItem('analytics-providers');
      if (storedConfigs) {
        const configs = JSON.parse(storedConfigs);
        Object.entries(configs).forEach(([id, config]) => {
          if (this.providers.has(id)) {
            this.providers.set(id, { ...this.providers.get(id)!, ...config });
          }
        });
      }
    } catch (error) {
      logger.error('Failed to load analytics provider configurations', 'analytics-core', { error });
    }
  }

  /**
   * Check consent status
   */
  private async checkConsentStatus(): Promise<void> {
    try {
      const consent = localStorage.getItem('analytics-consent');
      this.consentGiven = consent === 'true';
      
      if (!this.consentGiven) {
        logger.info('Analytics consent not given, tracking disabled', 'analytics-core');
      }
    } catch (error) {
      logger.error('Failed to check consent status', 'analytics-core', { error });
    }
  }

  /**
   * Setup flush schedules for enabled providers
   */
  private async setupFlushSchedules(): Promise<void> {
    this.providers.forEach((provider, id) => {
      if (provider.enabled) {
        this.scheduleFlushForProvider(id);
      }
    });
  }

  /**
   * Schedule flush for a specific provider
   */
  private scheduleFlushForProvider(providerId: string): void {
    const provider = this.providers.get(providerId);
    if (!provider) return;

    // Clear existing interval
    const existingInterval = this.flushIntervals.get(providerId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Setup new interval
    const interval = setInterval(async () => {
      await this.flushProvider(providerId);
    }, provider.settings.flushInterval * 1000);

    this.flushIntervals.set(providerId, interval);
  }

  /**
   * Track analytics event
   */
  trackEvent(
    name: string,
    category: string,
    action: string,
    properties: Record<string, any> = {},
    options: {
      label?: string;
      value?: number;
      userId?: string;
      immediate?: boolean;
    } = {}
  ): void {
    if (!this.isInitialized || !this.consentGiven) {
      return;
    }

    const event: AnalyticsEvent = {
      id: this.generateEventId(),
      name,
      category,
      action,
      label: options.label,
      value: options.value,
      timestamp: new Date(),
      userId: options.userId,
      sessionId: this.getSessionId(),
      properties: this.sanitizeProperties(properties),
      context: this.getEventContext(),
    };

    // Apply filters
    if (this.shouldTrackEvent(event)) {
      this.eventQueue.push(event);

      // Immediate flush if requested
      if (options.immediate) {
        this.flushAllProviders();
      }
    }
  }

  /**
   * Track page view
   */
  trackPageView(
    url?: string,
    title?: string,
    properties: Record<string, any> = {}
  ): void {
    if (!this.isInitialized || !this.consentGiven) {
      return;
    }

    const pageUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
    const pageTitle = title || (typeof document !== 'undefined' ? document.title : '');

    this.trackEvent(
      'page_view',
      'navigation',
      'view',
      {
        page_url: pageUrl,
        page_title: pageTitle,
        ...properties,
      }
    );
  }

  /**
   * Track metric
   */
  trackMetric(
    name: string,
    value: number,
    type: AnalyticsMetric['type'] = 'gauge',
    tags: Record<string, string> = {},
    unit?: string
  ): void {
    if (!this.isInitialized || !this.consentGiven) {
      return;
    }

    const metric: AnalyticsMetric = {
      id: this.generateEventId(),
      name,
      type,
      value,
      unit,
      tags: this.sanitizeTags(tags),
      timestamp: new Date(),
    };

    this.metricsQueue.push(metric);
  }

  /**
   * Track error
   */
  trackError(
    error: Error | string,
    category: string = 'error',
    properties: Record<string, any> = {}
  ): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    this.trackEvent(
      'error',
      category,
      'exception',
      {
        error_message: errorMessage,
        error_stack: errorStack,
        ...properties,
      },
      { immediate: true }
    );
  }

  /**
   * Handle click tracking
   */
  private handleClickTracking(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target) return;

    // Track button clicks
    if (target.tagName === 'BUTTON' || target.role === 'button') {
      this.trackEvent(
        'button_click',
        'interaction',
        'click',
        {
          button_text: target.textContent?.trim(),
          button_id: target.id,
          button_class: target.className,
        }
      );
    }

    // Track link clicks
    if (target.tagName === 'A') {
      const link = target as HTMLAnchorElement;
      this.trackEvent(
        'link_click',
        'interaction',
        'click',
        {
          link_url: link.href,
          link_text: link.textContent?.trim(),
          link_target: link.target,
        }
      );
    }
  }

  /**
   * Handle form submission tracking
   */
  private handleFormSubmission(event: SubmitEvent): void {
    const form = event.target as HTMLFormElement;
    if (!form) return;

    this.trackEvent(
      'form_submit',
      'interaction',
      'submit',
      {
        form_id: form.id,
        form_name: form.name,
        form_action: form.action,
        form_method: form.method,
      }
    );
  }

  /**
   * Check if event should be tracked based on filters
   */
  private shouldTrackEvent(event: AnalyticsEvent): boolean {
    // Check global filters
    for (const provider of this.providers.values()) {
      if (!provider.enabled) continue;

      for (const filter of provider.settings.eventFilters) {
        if (!filter.enabled) continue;

        if (filter.eventType === event.name || filter.eventType === '*') {
          const matches = filter.conditions.every(condition => 
            this.evaluateFilterCondition(event, condition)
          );

          if (matches && filter.action === 'exclude') {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Evaluate filter condition
   */
  private evaluateFilterCondition(event: AnalyticsEvent, condition: FilterCondition): boolean {
    const fieldValue = this.getFieldValue(event, condition.field);
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'not_contains':
        return !String(fieldValue).includes(String(condition.value));
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'regex':
        return new RegExp(condition.value).test(String(fieldValue));
      default:
        return false;
    }
  }

  /**
   * Get field value from event
   */
  private getFieldValue(event: AnalyticsEvent, field: string): any {
    const parts = field.split('.');
    let value: any = event;
    
    for (const part of parts) {
      value = value?.[part];
    }
    
    return value;
  }

  /**
   * Sanitize properties to remove PII
   */
  private sanitizeProperties(properties: Record<string, any>): Record<string, any> {
    const sanitized = { ...properties };
    
    // Remove common PII fields
    const piiFields = ['email', 'phone', 'ssn', 'credit_card', 'password', 'token'];
    
    for (const field of piiFields) {
      if (field in sanitized) {
        delete sanitized[field];
      }
    }

    // Sanitize nested objects
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeProperties(value);
      }
    }

    return sanitized;
  }

  /**
   * Sanitize tags
   */
  private sanitizeTags(tags: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(tags)) {
      // Only include non-PII tags
      if (!this.isPIIField(key)) {
        sanitized[key] = String(value);
      }
    }

    return sanitized;
  }

  /**
   * Check if field contains PII
   */
  private isPIIField(field: string): boolean {
    const piiPatterns = [
      /email/i,
      /phone/i,
      /ssn/i,
      /credit/i,
      /password/i,
      /token/i,
      /key/i,
    ];

    return piiPatterns.some(pattern => pattern.test(field));
  }

  /**
   * Get event context
   */
  private getEventContext(): EventContext {
    const context: EventContext = {};

    if (typeof window !== 'undefined') {
      context.page = {
        url: window.location.href,
        title: document.title,
        referrer: document.referrer,
      };

      context.device = {
        type: this.getDeviceType(),
        os: this.getOS(),
        browser: this.getBrowser(),
        screenResolution: `${screen.width}x${screen.height}`,
      };
    }

    context.session = {
      id: this.getSessionId(),
      startTime: this.getSessionStartTime(),
    };

    return context;
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get session ID
   */
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Get session start time
   */
  private getSessionStartTime(): Date {
    const startTime = sessionStorage.getItem('analytics_session_start');
    if (startTime) {
      return new Date(startTime);
    }
    
    const now = new Date();
    sessionStorage.setItem('analytics_session_start', now.toISOString());
    return now;
  }

  /**
   * Get device type
   */
  private getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    if (typeof window === 'undefined') return 'desktop';
    
    const userAgent = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
      return 'tablet';
    }
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
      return 'mobile';
    }
    return 'desktop';
  }

  /**
   * Get operating system
   */
  private getOS(): string {
    if (typeof window === 'undefined') return 'unknown';
    
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'unknown';
  }

  /**
   * Get browser
   */
  private getBrowser(): string {
    if (typeof window === 'undefined') return 'unknown';
    
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    return 'unknown';
  }

  /**
   * Flush events to all providers
   */
  async flushAllProviders(): Promise<void> {
    const promises = Array.from(this.providers.keys()).map(providerId => 
      this.flushProvider(providerId)
    );
    
    await Promise.allSettled(promises);
  }

  /**
   * Flush events to specific provider
   */
  async flushProvider(providerId: string): Promise<SendResult | null> {
    const provider = this.providers.get(providerId);
    if (!provider || !provider.enabled || this.eventQueue.length === 0) {
      return null;
    }

    try {
      // Get events for this provider
      const eventsToSend = this.eventQueue.splice(0, provider.settings.batchSize);
      const metricsToSend = this.metricsQueue.splice(0, provider.settings.batchSize);

      if (eventsToSend.length === 0 && metricsToSend.length === 0) {
        return null;
      }

      const batch: BatchPayload = {
        providerId,
        events: eventsToSend,
        metrics: metricsToSend,
        timestamp: new Date(),
        batchId: this.generateEventId(),
      };

      // Send to provider (implementation would be in provider-specific modules)
      const result = await this.sendBatchToProvider(provider, batch);
      
      // Update last sync time
      provider.lastSync = new Date();
      this.providers.set(providerId, provider);

      return result;
    } catch (error) {
      logger.error(`Failed to flush events to provider ${providerId}`, 'analytics-core', { error });
      return null;
    }
  }

  /**
   * Send batch to provider (placeholder - implemented in provider-specific modules)
   */
  private async sendBatchToProvider(provider: AnalyticsProvider, batch: BatchPayload): Promise<SendResult> {
    // This would be implemented in provider-specific modules
    return {
      success: true,
      providerId: provider.id,
      eventsProcessed: batch.events.length,
      metricsProcessed: batch.metrics.length,
      errors: [],
      retryable: false,
      timestamp: new Date(),
    };
  }

  /**
   * Set consent status
   */
  setConsent(granted: boolean): void {
    this.consentGiven = granted;
    localStorage.setItem('analytics-consent', granted.toString());
    
    if (granted) {
      logger.info('Analytics consent granted', 'analytics-core');
    } else {
      logger.info('Analytics consent revoked, clearing queues', 'analytics-core');
      this.eventQueue = [];
      this.metricsQueue = [];
    }
  }

  /**
   * Get consent status
   */
  getConsent(): boolean {
    return this.consentGiven;
  }

  /**
   * Get all providers
   */
  getProviders(): AnalyticsProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get provider by ID
   */
  getProvider(providerId: string): AnalyticsProvider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Get queue status
   */
  getQueueStatus(): { events: number; metrics: number } {
    return {
      events: this.eventQueue.length,
      metrics: this.metricsQueue.length,
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.flushIntervals.forEach(interval => clearInterval(interval));
    this.flushIntervals.clear();
    this.eventQueue = [];
    this.metricsQueue = [];
    this.providers.clear();
    this.isInitialized = false;
  }
}

// Export singleton instance
export const analyticsCore = new AnalyticsCoreManager();

// Export utility functions
export const initializeAnalytics = () => analyticsCore.initialize();
export const trackEvent = (name: string, category: string, action: string, properties?: Record<string, any>, options?: any) =>
  analyticsCore.trackEvent(name, category, action, properties, options);
export const trackPageView = (url?: string, title?: string, properties?: Record<string, any>) =>
  analyticsCore.trackPageView(url, title, properties);
export const trackMetric = (name: string, value: number, type?: AnalyticsMetric['type'], tags?: Record<string, string>, unit?: string) =>
  analyticsCore.trackMetric(name, value, type, tags, unit);
export const trackError = (error: Error | string, category?: string, properties?: Record<string, any>) =>
  analyticsCore.trackError(error, category, properties);
export const setAnalyticsConsent = (granted: boolean) => analyticsCore.setConsent(granted);
export const getAnalyticsConsent = () => analyticsCore.getConsent();
export const getAnalyticsProviders = () => analyticsCore.getProviders();
