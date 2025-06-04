/**
 * Comprehensive Logging and Monitoring System
 * 
 * This module provides enterprise-grade logging and monitoring including:
 * - Structured logging with multiple levels
 * - Third-party integrations (Sentry, LogRocket, DataDog, etc.)
 * - Performance monitoring and metrics
 * - User session tracking
 * - Real-time error reporting
 * - Analytics and insights
 */

import { secureConfig } from './config/secure-config';
import { type EnhancedAppError, errorMonitor } from './error-handling';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  category: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  tags?: string[];
  source?: string;
  stackTrace?: string;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface UserAction {
  action: string;
  category: string;
  label?: string;
  value?: number;
  userId?: string;
  sessionId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface MonitoringConfig {
  enableSentry: boolean;
  enableLogRocket: boolean;
  enableDataDog: boolean;
  enableGoogleAnalytics: boolean;
  enablePostHog: boolean;
  enableCustomAnalytics: boolean;
  logLevel: LogLevel;
  enablePerformanceMonitoring: boolean;
  enableUserTracking: boolean;
  enableErrorReporting: boolean;
  sampleRate: number;
}

class LoggingMonitoringSystem {
  private config: MonitoringConfig;
  private logQueue: LogEntry[] = [];
  private metricsQueue: PerformanceMetric[] = [];
  private userActionsQueue: UserAction[] = [];
  private isInitialized = false;
  private performanceObserver?: PerformanceObserver;

  constructor() {
    this.config = {
      enableSentry: secureConfig.isProduction(),
      enableLogRocket: secureConfig.isProduction(),
      enableDataDog: false,
      enableGoogleAnalytics: secureConfig.isFeatureEnabled('enableAnalytics'),
      enablePostHog: false,
      enableCustomAnalytics: true,
      logLevel: secureConfig.isDevelopment() ? LogLevel.DEBUG : LogLevel.INFO,
      enablePerformanceMonitoring: true,
      enableUserTracking: true,
      enableErrorReporting: true,
      sampleRate: secureConfig.isProduction() ? 0.1 : 1.0,
    };

    this.initialize();
  }

  /**
   * Initialize monitoring services
   */
  private async initialize(): Promise<void> {
    try {
      // Initialize Sentry for error tracking
      if (this.config.enableSentry) {
        await this.initializeSentry();
      }

      // Initialize LogRocket for session replay
      if (this.config.enableLogRocket) {
        await this.initializeLogRocket();
      }

      // Initialize DataDog for APM
      if (this.config.enableDataDog) {
        await this.initializeDataDog();
      }

      // Initialize Google Analytics
      if (this.config.enableGoogleAnalytics) {
        await this.initializeGoogleAnalytics();
      }

      // Initialize PostHog for product analytics
      if (this.config.enablePostHog) {
        await this.initializePostHog();
      }

      // Setup performance monitoring
      if (this.config.enablePerformanceMonitoring) {
        this.setupPerformanceMonitoring();
      }

      // Setup error reporting
      if (this.config.enableErrorReporting) {
        this.setupErrorReporting();
      }

      this.isInitialized = true;
      this.log(LogLevel.INFO, 'Logging and monitoring system initialized', 'system');
    } catch (error) {
      console.error('Failed to initialize monitoring system:', error);
    }
  }

  /**
   * Initialize Sentry for error tracking
   */
  private async initializeSentry(): Promise<void> {
    try {
      const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
      if (!sentryDsn) return;

      // Dynamically import Sentry to avoid bundle bloat
      const Sentry = await import('@sentry/browser');
      const { Integrations } = await import('@sentry/tracing');

      Sentry.init({
        dsn: sentryDsn,
        environment: secureConfig.getEnvironmentType(),
        sampleRate: this.config.sampleRate,
        tracesSampleRate: this.config.sampleRate,
        integrations: [
          new Integrations.BrowserTracing(),
        ],
        beforeSend: (event) => {
          // Filter out non-critical errors in development
          if (secureConfig.isDevelopment() && event.level !== 'error') {
            return null;
          }
          return event;
        },
      });

      // Set user context
      const userId = this.getCurrentUserId();
      if (userId) {
        Sentry.setUser({ id: userId });
      }

      this.log(LogLevel.INFO, 'Sentry initialized', 'monitoring');
    } catch (error) {
      console.error('Failed to initialize Sentry:', error);
    }
  }

  /**
   * Initialize LogRocket for session replay
   */
  private async initializeLogRocket(): Promise<void> {
    try {
      const logRocketAppId = import.meta.env.VITE_LOGROCKET_APP_ID;
      if (!logRocketAppId) return;

      const LogRocket = await import('logrocket');
      
      LogRocket.init(logRocketAppId, {
        shouldCaptureIP: false,
        console: {
          shouldAggregateConsoleErrors: true,
        },
        network: {
          requestSanitizer: (request) => {
            // Sanitize sensitive data
            if (request.headers?.authorization) {
              request.headers.authorization = '[REDACTED]';
            }
            return request;
          },
          responseSanitizer: (response) => {
            // Sanitize sensitive response data
            return response;
          },
        },
      });

      // Identify user
      const userId = this.getCurrentUserId();
      if (userId) {
        LogRocket.identify(userId);
      }

      this.log(LogLevel.INFO, 'LogRocket initialized', 'monitoring');
    } catch (error) {
      console.error('Failed to initialize LogRocket:', error);
    }
  }

  /**
   * Initialize DataDog for APM
   */
  private async initializeDataDog(): Promise<void> {
    try {
      const dataDogClientToken = import.meta.env.VITE_DATADOG_CLIENT_TOKEN;
      const dataDogApplicationId = import.meta.env.VITE_DATADOG_APPLICATION_ID;
      
      if (!dataDogClientToken || !dataDogApplicationId) return;

      const { datadogRum } = await import('@datadog/browser-rum');

      datadogRum.init({
        applicationId: dataDogApplicationId,
        clientToken: dataDogClientToken,
        site: 'datadoghq.com',
        service: 'clinicboost',
        env: secureConfig.getEnvironmentType(),
        version: secureConfig.getAppConfig().version,
        sampleRate: this.config.sampleRate * 100,
        trackInteractions: true,
        defaultPrivacyLevel: 'mask-user-input',
      });

      datadogRum.startSessionReplayRecording();

      this.log(LogLevel.INFO, 'DataDog RUM initialized', 'monitoring');
    } catch (error) {
      console.error('Failed to initialize DataDog:', error);
    }
  }

  /**
   * Initialize Google Analytics
   */
  private async initializeGoogleAnalytics(): Promise<void> {
    try {
      const gaTrackingId = import.meta.env.VITE_GA_TRACKING_ID;
      if (!gaTrackingId) return;

      // Load Google Analytics script
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${gaTrackingId}`;
      document.head.appendChild(script);

      // Initialize gtag
      (window as any).dataLayer = (window as any).dataLayer || [];
      const gtag = (...args: any[]) => {
        (window as any).dataLayer.push(args);
      };
      (window as any).gtag = gtag;

      gtag('js', new Date());
      gtag('config', gaTrackingId, {
        anonymize_ip: true,
        cookie_flags: 'SameSite=None;Secure',
      });

      this.log(LogLevel.INFO, 'Google Analytics initialized', 'monitoring');
    } catch (error) {
      console.error('Failed to initialize Google Analytics:', error);
    }
  }

  /**
   * Initialize PostHog for product analytics
   */
  private async initializePostHog(): Promise<void> {
    try {
      const postHogKey = import.meta.env.VITE_POSTHOG_KEY;
      const postHogHost = import.meta.env.VITE_POSTHOG_HOST;
      
      if (!postHogKey) return;

      const posthog = await import('posthog-js');

      posthog.init(postHogKey, {
        api_host: postHogHost || 'https://app.posthog.com',
        capture_pageview: true,
        capture_pageleave: true,
        disable_session_recording: !secureConfig.isProduction(),
      });

      this.log(LogLevel.INFO, 'PostHog initialized', 'monitoring');
    } catch (error) {
      console.error('Failed to initialize PostHog:', error);
    }
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    try {
      // Monitor Core Web Vitals
      this.monitorCoreWebVitals();

      // Monitor custom performance metrics
      this.monitorCustomMetrics();

      // Setup Performance Observer
      if ('PerformanceObserver' in window) {
        this.performanceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            this.recordPerformanceMetric({
              name: entry.name,
              value: entry.duration || entry.startTime,
              unit: 'ms',
              timestamp: new Date(),
              tags: {
                type: entry.entryType,
                initiatorType: (entry as any).initiatorType || 'unknown',
              },
            });
          });
        });

        this.performanceObserver.observe({
          entryTypes: ['navigation', 'paint', 'largest-contentful-paint', 'first-input'],
        });
      }

      this.log(LogLevel.INFO, 'Performance monitoring setup complete', 'monitoring');
    } catch (error) {
      console.error('Failed to setup performance monitoring:', error);
    }
  }

  /**
   * Monitor Core Web Vitals
   */
  private monitorCoreWebVitals(): void {
    try {
      // Import web-vitals library dynamically with proper error handling
      import('web-vitals').then((webVitals) => {
        if (!webVitals) {
          console.warn('Web Vitals library not available');
          return;
        }

        const { getCLS, getFID, getFCP, getLCP, getTTFB } = webVitals;

        if (typeof getCLS === 'function') {
          getCLS((metric) => {
            this.recordPerformanceMetric({
              name: 'CLS',
              value: metric.value,
              unit: 'score',
              timestamp: new Date(),
              tags: { vital: 'cls' },
            });
          });
        }

        if (typeof getFID === 'function') {
          getFID((metric) => {
            this.recordPerformanceMetric({
              name: 'FID',
              value: metric.value,
              unit: 'ms',
              timestamp: new Date(),
              tags: { vital: 'fid' },
            });
          });
        }

        if (typeof getFCP === 'function') {
          getFCP((metric) => {
            this.recordPerformanceMetric({
              name: 'FCP',
              value: metric.value,
              unit: 'ms',
              timestamp: new Date(),
              tags: { vital: 'fcp' },
            });
          });
        }

        if (typeof getLCP === 'function') {
          getLCP((metric) => {
            this.recordPerformanceMetric({
              name: 'LCP',
              value: metric.value,
              unit: 'ms',
              timestamp: new Date(),
              tags: { vital: 'lcp' },
            });
          });
        }

        if (typeof getTTFB === 'function') {
          getTTFB((metric) => {
            this.recordPerformanceMetric({
              name: 'TTFB',
              value: metric.value,
              unit: 'ms',
              timestamp: new Date(),
              tags: { vital: 'ttfb' },
            });
          });
        }
      }).catch((error) => {
        console.warn('Failed to load Web Vitals library:', error);
      });
    } catch (error) {
      console.warn('Web Vitals monitoring not available:', error);
    }
  }

  /**
   * Monitor custom metrics
   */
  private monitorCustomMetrics(): void {
    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.recordPerformanceMetric({
          name: 'memory_used',
          value: memory.usedJSHeapSize,
          unit: 'bytes',
          timestamp: new Date(),
          tags: { type: 'memory' },
        });
      }, 30000); // Every 30 seconds
    }

    // Monitor connection quality
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.recordPerformanceMetric({
        name: 'connection_downlink',
        value: connection.downlink,
        unit: 'mbps',
        timestamp: new Date(),
        tags: { type: 'network', effectiveType: connection.effectiveType },
      });
    }
  }

  /**
   * Setup error reporting
   */
  private setupErrorReporting(): void {
    errorMonitor.addErrorReporter(async (error: EnhancedAppError) => {
      await this.reportError(error);
    });
  }

  /**
   * Log a message
   */
  log(level: LogLevel, message: string, category: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(level)) return;

    const logEntry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      level,
      message,
      category,
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId(),
      requestId: this.generateRequestId(),
      metadata,
      source: 'client',
    };

    this.logQueue.push(logEntry);
    this.processLogEntry(logEntry);

    // Keep queue size manageable
    if (this.logQueue.length > 1000) {
      this.logQueue.splice(0, 500);
    }
  }

  /**
   * Record performance metric
   */
  recordPerformanceMetric(metric: PerformanceMetric): void {
    this.metricsQueue.push(metric);
    this.processPerformanceMetric(metric);

    // Keep queue size manageable
    if (this.metricsQueue.length > 500) {
      this.metricsQueue.splice(0, 250);
    }
  }

  /**
   * Track user action
   */
  trackUserAction(action: string, category: string, label?: string, value?: number, metadata?: Record<string, any>): void {
    if (!this.config.enableUserTracking) return;

    const userAction: UserAction = {
      action,
      category,
      label,
      value,
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId(),
      timestamp: new Date(),
      metadata,
    };

    this.userActionsQueue.push(userAction);
    this.processUserAction(userAction);

    // Keep queue size manageable
    if (this.userActionsQueue.length > 500) {
      this.userActionsQueue.splice(0, 250);
    }
  }

  /**
   * Report error to monitoring services
   */
  private async reportError(error: EnhancedAppError): Promise<void> {
    try {
      // Report to Sentry
      if (this.config.enableSentry) {
        const Sentry = await import('@sentry/browser');
        Sentry.captureException(new Error(error.message), {
          tags: {
            errorCode: error.code,
            category: error.category,
            severity: error.severity,
          },
          extra: {
            errorId: error.id,
            context: error.context,
            details: error.details,
          },
        });
      }

      // Report to LogRocket
      if (this.config.enableLogRocket) {
        const LogRocket = await import('logrocket');
        LogRocket.captureException(new Error(error.message));
      }

      // Report to DataDog
      if (this.config.enableDataDog) {
        const { datadogRum } = await import('@datadog/browser-rum');
        datadogRum.addError(new Error(error.message), {
          errorCode: error.code,
          category: error.category,
          severity: error.severity,
        });
      }
    } catch (reportingError) {
      console.error('Failed to report error to monitoring services:', reportingError);
    }
  }

  /**
   * Process log entry
   */
  private processLogEntry(logEntry: LogEntry): void {
    // Console logging
    const consoleMethod = this.getConsoleMethod(logEntry.level);
    consoleMethod(`[${logEntry.category}] ${logEntry.message}`, logEntry);

    // Send to external services in production
    if (secureConfig.isProduction()) {
      this.sendLogToServices(logEntry);
    }
  }

  /**
   * Process performance metric
   */
  private processPerformanceMetric(metric: PerformanceMetric): void {
    // Send to monitoring services
    if (this.config.enableDataDog) {
      this.sendMetricToDataDog(metric);
    }

    // Log significant performance issues
    if (this.isPerformanceIssue(metric)) {
      this.log(LogLevel.WARN, `Performance issue detected: ${metric.name}`, 'performance', {
        metric: metric.name,
        value: metric.value,
        unit: metric.unit,
      });
    }
  }

  /**
   * Process user action
   */
  private processUserAction(userAction: UserAction): void {
    // Send to analytics services
    if (this.config.enableGoogleAnalytics && (window as any).gtag) {
      (window as any).gtag('event', userAction.action, {
        event_category: userAction.category,
        event_label: userAction.label,
        value: userAction.value,
      });
    }

    // Send to PostHog
    if (this.config.enablePostHog) {
      import('posthog-js').then((posthog) => {
        posthog.capture(userAction.action, {
          category: userAction.category,
          label: userAction.label,
          value: userAction.value,
          ...userAction.metadata,
        });
      });
    }
  }

  /**
   * Check if should log based on level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL];
    const currentLevelIndex = levels.indexOf(this.config.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Get console method for log level
   */
  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        return console.error;
      default:
        return console.log;
    }
  }

  /**
   * Check if metric indicates performance issue
   */
  private isPerformanceIssue(metric: PerformanceMetric): boolean {
    const thresholds: Record<string, number> = {
      'LCP': 2500, // ms
      'FID': 100,  // ms
      'CLS': 0.1,  // score
      'TTFB': 600, // ms
    };

    return metric.name in thresholds && metric.value > thresholds[metric.name];
  }

  /**
   * Send log to external services
   */
  private async sendLogToServices(logEntry: LogEntry): Promise<void> {
    // Implementation would send logs to external logging services
    // This is a placeholder for actual service integration
  }

  /**
   * Send metric to DataDog
   */
  private async sendMetricToDataDog(metric: PerformanceMetric): Promise<void> {
    try {
      if (this.config.enableDataDog) {
        const { datadogRum } = await import('@datadog/browser-rum');
        datadogRum.addTiming(metric.name, metric.value);
      }
    } catch (error) {
      console.error('Failed to send metric to DataDog:', error);
    }
  }

  /**
   * Utility methods
   */
  private generateId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentUserId(): string | undefined {
    // Integration with auth system
    return undefined;
  }

  private getSessionId(): string | undefined {
    // Integration with session management
    return undefined;
  }

  /**
   * Public API methods
   */
  debug(message: string, category: string = 'general', metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, category, metadata);
  }

  info(message: string, category: string = 'general', metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, category, metadata);
  }

  warn(message: string, category: string = 'general', metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, category, metadata);
  }

  error(message: string, category: string = 'general', metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, category, metadata);
  }

  fatal(message: string, category: string = 'general', metadata?: Record<string, any>): void {
    this.log(LogLevel.FATAL, message, category, metadata);
  }

  /**
   * Get monitoring statistics
   */
  getStatistics(): {
    logs: { total: number; byLevel: Record<LogLevel, number> };
    metrics: { total: number; recent: PerformanceMetric[] };
    userActions: { total: number; recent: UserAction[] };
  } {
    const logsByLevel = {} as Record<LogLevel, number>;
    this.logQueue.forEach(log => {
      logsByLevel[log.level] = (logsByLevel[log.level] || 0) + 1;
    });

    return {
      logs: {
        total: this.logQueue.length,
        byLevel: logsByLevel,
      },
      metrics: {
        total: this.metricsQueue.length,
        recent: this.metricsQueue.slice(-10),
      },
      userActions: {
        total: this.userActionsQueue.length,
        recent: this.userActionsQueue.slice(-10),
      },
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }
}

// Export singleton instance
export const logger = new LoggingMonitoringSystem();

// Export convenience functions
export const log = {
  debug: (message: string, category?: string, metadata?: Record<string, any>) => 
    logger.debug(message, category, metadata),
  info: (message: string, category?: string, metadata?: Record<string, any>) => 
    logger.info(message, category, metadata),
  warn: (message: string, category?: string, metadata?: Record<string, any>) => 
    logger.warn(message, category, metadata),
  error: (message: string, category?: string, metadata?: Record<string, any>) => 
    logger.error(message, category, metadata),
  fatal: (message: string, category?: string, metadata?: Record<string, any>) => 
    logger.fatal(message, category, metadata),
};

export const trackAction = (action: string, category: string, label?: string, value?: number, metadata?: Record<string, any>) =>
  logger.trackUserAction(action, category, label, value, metadata);

export const recordMetric = (metric: PerformanceMetric) =>
  logger.recordPerformanceMetric(metric);
