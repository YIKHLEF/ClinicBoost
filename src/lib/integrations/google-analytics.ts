/**
 * Google Analytics Integration
 * 
 * This module provides Google Analytics 4 integration including:
 * - GA4 event tracking
 * - Enhanced ecommerce tracking
 * - Custom dimensions and metrics
 * - Conversion tracking
 * - Real-time data streaming
 * - Privacy-compliant tracking
 */

import { logger } from '../logging-monitoring';
import { 
  type AnalyticsProvider, 
  type AnalyticsEvent, 
  type BatchPayload, 
  type SendResult,
  analyticsCore 
} from './analytics-core';

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

export interface GA4Config {
  measurementId: string;
  apiSecret?: string;
  debugMode?: boolean;
  cookieDomain?: string;
  cookieExpires?: number;
  customDimensions?: GA4CustomDimension[];
  customMetrics?: GA4CustomMetric[];
  enhancedMeasurement?: GA4EnhancedMeasurement;
}

export interface GA4CustomDimension {
  index: number;
  name: string;
  scope: 'event' | 'user';
  description?: string;
}

export interface GA4CustomMetric {
  index: number;
  name: string;
  measurementUnit: 'standard' | 'currency' | 'feet' | 'meters' | 'kilometers' | 'miles' | 'milliseconds' | 'seconds' | 'minutes' | 'hours';
  description?: string;
}

export interface GA4EnhancedMeasurement {
  pageViews?: boolean;
  scrolls?: boolean;
  outboundClicks?: boolean;
  siteSearch?: boolean;
  videoEngagement?: boolean;
  fileDownloads?: boolean;
}

export interface GA4Event {
  event_name: string;
  event_parameters: Record<string, any>;
  user_id?: string;
  user_properties?: Record<string, any>;
  timestamp_micros?: number;
}

export interface GA4EcommerceItem {
  item_id: string;
  item_name: string;
  category?: string;
  quantity?: number;
  price?: number;
  currency?: string;
  item_brand?: string;
  item_category2?: string;
  item_category3?: string;
  item_category4?: string;
  item_category5?: string;
  item_list_id?: string;
  item_list_name?: string;
  item_variant?: string;
  location_id?: string;
  promotion_id?: string;
  promotion_name?: string;
}

export interface GA4EcommerceEvent {
  currency?: string;
  value?: number;
  transaction_id?: string;
  items?: GA4EcommerceItem[];
  coupon?: string;
  shipping?: number;
  tax?: number;
  payment_type?: string;
}

class GoogleAnalyticsIntegration {
  private config: GA4Config | null = null;
  private isInitialized = false;
  private measurementId = '';

  /**
   * Initialize Google Analytics
   */
  async initialize(config: GA4Config): Promise<void> {
    try {
      this.config = config;
      this.measurementId = config.measurementId;

      // Load GA4 script
      await this.loadGA4Script();

      // Configure GA4
      this.configureGA4();

      // Setup enhanced measurement
      if (config.enhancedMeasurement) {
        this.setupEnhancedMeasurement(config.enhancedMeasurement);
      }

      this.isInitialized = true;
      logger.info('Google Analytics initialized', 'google-analytics', { measurementId: config.measurementId });
    } catch (error) {
      logger.error('Failed to initialize Google Analytics', 'google-analytics', { error });
      throw error;
    }
  }

  /**
   * Load GA4 script
   */
  private async loadGA4Script(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        resolve();
        return;
      }

      // Check if already loaded
      if (window.gtag) {
        resolve();
        return;
      }

      // Create script element
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`;
      
      script.onload = () => {
        // Initialize dataLayer and gtag
        window.dataLayer = window.dataLayer || [];
        window.gtag = function() {
          window.dataLayer.push(arguments);
        };
        
        resolve();
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Google Analytics script'));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Configure GA4
   */
  private configureGA4(): void {
    if (!window.gtag || !this.config) return;

    // Set timestamp
    window.gtag('js', new Date());

    // Configure GA4
    const configParams: Record<string, any> = {
      send_page_view: false, // We'll handle page views manually
    };

    if (this.config.cookieDomain) {
      configParams.cookie_domain = this.config.cookieDomain;
    }

    if (this.config.cookieExpires) {
      configParams.cookie_expires = this.config.cookieExpires;
    }

    if (this.config.debugMode) {
      configParams.debug_mode = true;
    }

    // Add custom dimensions
    if (this.config.customDimensions) {
      this.config.customDimensions.forEach(dimension => {
        configParams[`custom_map.dimension${dimension.index}`] = dimension.name;
      });
    }

    window.gtag('config', this.measurementId, configParams);
  }

  /**
   * Setup enhanced measurement
   */
  private setupEnhancedMeasurement(config: GA4EnhancedMeasurement): void {
    if (!window.gtag) return;

    // Configure enhanced measurement
    window.gtag('config', this.measurementId, {
      enhanced_measurement: {
        scrolls: config.scrolls ?? true,
        outbound_clicks: config.outboundClicks ?? true,
        site_search: config.siteSearch ?? true,
        video_engagement: config.videoEngagement ?? true,
        file_downloads: config.fileDownloads ?? true,
      },
    });
  }

  /**
   * Send batch of events to Google Analytics
   */
  async sendBatch(batch: BatchPayload): Promise<SendResult> {
    const result: SendResult = {
      success: false,
      providerId: 'google-analytics',
      eventsProcessed: 0,
      metricsProcessed: 0,
      errors: [],
      retryable: false,
      timestamp: new Date(),
    };

    if (!this.isInitialized || !window.gtag) {
      result.errors.push('Google Analytics not initialized');
      return result;
    }

    try {
      // Process events
      for (const event of batch.events) {
        await this.sendEvent(event);
        result.eventsProcessed++;
      }

      // Process metrics (convert to events)
      for (const metric of batch.metrics) {
        await this.sendMetricAsEvent(metric);
        result.metricsProcessed++;
      }

      result.success = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      result.retryable = true;
      
      logger.error('Failed to send batch to Google Analytics', 'google-analytics', { error });
    }

    return result;
  }

  /**
   * Send individual event to Google Analytics
   */
  private async sendEvent(event: AnalyticsEvent): Promise<void> {
    if (!window.gtag) return;

    // Convert internal event to GA4 format
    const ga4Event = this.convertToGA4Event(event);

    // Send event
    window.gtag('event', ga4Event.event_name, ga4Event.event_parameters);

    // Set user properties if provided
    if (ga4Event.user_properties && Object.keys(ga4Event.user_properties).length > 0) {
      window.gtag('set', 'user_properties', ga4Event.user_properties);
    }

    // Set user ID if provided
    if (ga4Event.user_id) {
      window.gtag('set', { user_id: ga4Event.user_id });
    }
  }

  /**
   * Send metric as event
   */
  private async sendMetricAsEvent(metric: any): Promise<void> {
    if (!window.gtag) return;

    const eventName = `custom_metric_${metric.name}`;
    const eventParameters: Record<string, any> = {
      metric_name: metric.name,
      metric_value: metric.value,
      metric_type: metric.type,
      metric_unit: metric.unit,
      ...metric.tags,
    };

    window.gtag('event', eventName, eventParameters);
  }

  /**
   * Convert internal event to GA4 format
   */
  private convertToGA4Event(event: AnalyticsEvent): GA4Event {
    const ga4Event: GA4Event = {
      event_name: this.mapEventName(event.name),
      event_parameters: {
        event_category: event.category,
        event_label: event.label,
        value: event.value,
        ...this.convertProperties(event.properties),
      },
    };

    // Add user ID
    if (event.userId) {
      ga4Event.user_id = event.userId;
    }

    // Add user properties from context
    if (event.context.user) {
      ga4Event.user_properties = {
        user_role: event.context.user.role,
        user_department: event.context.user.department,
      };
    }

    // Add page information
    if (event.context.page) {
      ga4Event.event_parameters.page_location = event.context.page.url;
      ga4Event.event_parameters.page_title = event.context.page.title;
      ga4Event.event_parameters.page_referrer = event.context.page.referrer;
    }

    // Add session information
    if (event.context.session) {
      ga4Event.event_parameters.session_id = event.context.session.id;
    }

    // Add device information
    if (event.context.device) {
      ga4Event.event_parameters.device_category = event.context.device.type;
      ga4Event.event_parameters.operating_system = event.context.device.os;
      ga4Event.event_parameters.browser = event.context.device.browser;
    }

    // Add custom dimensions
    if (this.config?.customDimensions) {
      this.config.customDimensions.forEach(dimension => {
        const value = event.properties[dimension.name];
        if (value !== undefined) {
          ga4Event.event_parameters[`dimension${dimension.index}`] = value;
        }
      });
    }

    return ga4Event;
  }

  /**
   * Map internal event names to GA4 event names
   */
  private mapEventName(eventName: string): string {
    const eventMap: Record<string, string> = {
      'page_view': 'page_view',
      'button_click': 'select_content',
      'link_click': 'click',
      'form_submit': 'form_submit',
      'error': 'exception',
      'login': 'login',
      'logout': 'logout',
      'search': 'search',
      'file_download': 'file_download',
      'video_play': 'video_play',
      'video_complete': 'video_complete',
      'scroll': 'scroll',
      'engagement': 'user_engagement',
    };

    return eventMap[eventName] || eventName;
  }

  /**
   * Convert properties to GA4 format
   */
  private convertProperties(properties: Record<string, any>): Record<string, any> {
    const converted: Record<string, any> = {};

    for (const [key, value] of Object.entries(properties)) {
      // Convert key to GA4 format (lowercase with underscores)
      const ga4Key = key.toLowerCase().replace(/[^a-z0-9]/g, '_');
      
      // Ensure value is valid for GA4
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        converted[ga4Key] = value;
      } else if (value !== null && value !== undefined) {
        converted[ga4Key] = String(value);
      }
    }

    return converted;
  }

  /**
   * Track page view
   */
  trackPageView(url: string, title: string, properties: Record<string, any> = {}): void {
    if (!window.gtag) return;

    window.gtag('event', 'page_view', {
      page_location: url,
      page_title: title,
      ...this.convertProperties(properties),
    });
  }

  /**
   * Track ecommerce event
   */
  trackEcommerce(eventName: string, ecommerceData: GA4EcommerceEvent): void {
    if (!window.gtag) return;

    const eventParameters: Record<string, any> = {
      currency: ecommerceData.currency || 'USD',
      value: ecommerceData.value,
      transaction_id: ecommerceData.transaction_id,
      items: ecommerceData.items,
    };

    // Add optional parameters
    if (ecommerceData.coupon) eventParameters.coupon = ecommerceData.coupon;
    if (ecommerceData.shipping) eventParameters.shipping = ecommerceData.shipping;
    if (ecommerceData.tax) eventParameters.tax = ecommerceData.tax;
    if (ecommerceData.payment_type) eventParameters.payment_type = ecommerceData.payment_type;

    window.gtag('event', eventName, eventParameters);
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: Record<string, any>): void {
    if (!window.gtag) return;

    const userProperties: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(properties)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        userProperties[key] = value;
      }
    }

    window.gtag('set', 'user_properties', userProperties);
  }

  /**
   * Set user ID
   */
  setUserId(userId: string): void {
    if (!window.gtag) return;

    window.gtag('set', { user_id: userId });
  }

  /**
   * Track conversion
   */
  trackConversion(conversionId: string, value?: number, currency?: string): void {
    if (!window.gtag) return;

    const conversionData: Record<string, any> = {};
    
    if (value !== undefined) conversionData.value = value;
    if (currency) conversionData.currency = currency;

    window.gtag('event', 'conversion', {
      send_to: conversionId,
      ...conversionData,
    });
  }

  /**
   * Enable/disable debug mode
   */
  setDebugMode(enabled: boolean): void {
    if (!window.gtag) return;

    window.gtag('config', this.measurementId, {
      debug_mode: enabled,
    });
  }

  /**
   * Get configuration
   */
  getConfig(): GA4Config | null {
    return this.config;
  }

  /**
   * Check if initialized
   */
  isReady(): boolean {
    return this.isInitialized && !!window.gtag;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.config = null;
    this.isInitialized = false;
    this.measurementId = '';
  }
}

// Export singleton instance
export const googleAnalytics = new GoogleAnalyticsIntegration();

// Export utility functions
export const initializeGA4 = (config: GA4Config) => googleAnalytics.initialize(config);
export const trackGA4PageView = (url: string, title: string, properties?: Record<string, any>) =>
  googleAnalytics.trackPageView(url, title, properties);
export const trackGA4Ecommerce = (eventName: string, data: GA4EcommerceEvent) =>
  googleAnalytics.trackEcommerce(eventName, data);
export const setGA4UserProperties = (properties: Record<string, any>) =>
  googleAnalytics.setUserProperties(properties);
export const setGA4UserId = (userId: string) => googleAnalytics.setUserId(userId);
export const trackGA4Conversion = (conversionId: string, value?: number, currency?: string) =>
  googleAnalytics.trackConversion(conversionId, value, currency);
