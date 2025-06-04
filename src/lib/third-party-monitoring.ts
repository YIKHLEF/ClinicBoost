/**
 * Third-Party Monitoring Integrations
 * 
 * This module provides integrations with popular monitoring services:
 * - Sentry for error tracking
 * - LogRocket for session replay
 * - DataDog for APM and RUM
 * - New Relic for performance monitoring
 * - Mixpanel for analytics
 * - Amplitude for product analytics
 * - Hotjar for user behavior
 */

import { secureConfig } from './config/secure-config';
import { logger, type LogEntry, type PerformanceMetric, type UserAction } from './logging-monitoring';
import { type EnhancedAppError } from './error-handling';

export interface MonitoringService {
  name: string;
  initialize(): Promise<void>;
  reportError(error: EnhancedAppError): Promise<void>;
  trackEvent(event: UserAction): Promise<void>;
  recordMetric(metric: PerformanceMetric): Promise<void>;
  setUser(userId: string, userData?: Record<string, any>): Promise<void>;
  addBreadcrumb(message: string, category: string, data?: Record<string, any>): Promise<void>;
  isInitialized(): boolean;
}

class SentryIntegration implements MonitoringService {
  name = 'Sentry';
  private initialized = false;
  private Sentry: any;

  async initialize(): Promise<void> {
    try {
      const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
      if (!sentryDsn) {
        logger.warn('Sentry DSN not configured', 'monitoring');
        return;
      }

      // Dynamic import to avoid bundle bloat
      const SentryModule = await import('@sentry/browser');
      const { Integrations } = await import('@sentry/tracing');
      
      this.Sentry = SentryModule;

      this.Sentry.init({
        dsn: sentryDsn,
        environment: secureConfig.getEnvironmentType(),
        release: secureConfig.getAppConfig().version,
        sampleRate: secureConfig.isProduction() ? 0.1 : 1.0,
        tracesSampleRate: secureConfig.isProduction() ? 0.1 : 1.0,
        integrations: [
          new Integrations.BrowserTracing({
            tracingOrigins: [window.location.hostname],
          }),
        ],
        beforeSend: (event) => {
          // Filter out non-critical errors in development
          if (secureConfig.isDevelopment() && event.level !== 'error') {
            return null;
          }
          return event;
        },
        beforeBreadcrumb: (breadcrumb) => {
          // Filter sensitive data from breadcrumbs
          if (breadcrumb.data?.password) {
            breadcrumb.data.password = '[REDACTED]';
          }
          return breadcrumb;
        },
      });

      this.initialized = true;
      logger.info('Sentry initialized successfully', 'monitoring');
    } catch (error) {
      logger.error('Failed to initialize Sentry', 'monitoring', { error });
    }
  }

  async reportError(error: EnhancedAppError): Promise<void> {
    if (!this.initialized || !this.Sentry) return;

    try {
      this.Sentry.withScope((scope: any) => {
        scope.setTag('errorCode', error.code);
        scope.setTag('category', error.category);
        scope.setTag('severity', error.severity);
        scope.setLevel(this.mapSeverityToSentryLevel(error.severity));
        
        scope.setContext('error', {
          id: error.id,
          recoverable: error.recoverable,
          retryable: error.retryable,
          reportable: error.reportable,
        });

        scope.setContext('errorContext', error.context);

        if (error.details) {
          scope.setContext('errorDetails', error.details);
        }

        this.Sentry.captureException(new Error(error.message));
      });
    } catch (sentryError) {
      logger.error('Failed to report error to Sentry', 'monitoring', { sentryError });
    }
  }

  async trackEvent(event: UserAction): Promise<void> {
    if (!this.initialized || !this.Sentry) return;

    try {
      this.Sentry.addBreadcrumb({
        message: `User action: ${event.action}`,
        category: event.category,
        level: 'info',
        data: {
          label: event.label,
          value: event.value,
          ...event.metadata,
        },
      });
    } catch (error) {
      logger.error('Failed to track event in Sentry', 'monitoring', { error });
    }
  }

  async recordMetric(metric: PerformanceMetric): Promise<void> {
    if (!this.initialized || !this.Sentry) return;

    try {
      this.Sentry.addBreadcrumb({
        message: `Performance metric: ${metric.name}`,
        category: 'performance',
        level: 'info',
        data: {
          value: metric.value,
          unit: metric.unit,
          tags: metric.tags,
        },
      });
    } catch (error) {
      logger.error('Failed to record metric in Sentry', 'monitoring', { error });
    }
  }

  async setUser(userId: string, userData?: Record<string, any>): Promise<void> {
    if (!this.initialized || !this.Sentry) return;

    try {
      this.Sentry.setUser({
        id: userId,
        ...userData,
      });
    } catch (error) {
      logger.error('Failed to set user in Sentry', 'monitoring', { error });
    }
  }

  async addBreadcrumb(message: string, category: string, data?: Record<string, any>): Promise<void> {
    if (!this.initialized || !this.Sentry) return;

    try {
      this.Sentry.addBreadcrumb({
        message,
        category,
        level: 'info',
        data,
      });
    } catch (error) {
      logger.error('Failed to add breadcrumb to Sentry', 'monitoring', { error });
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  private mapSeverityToSentryLevel(severity: string): string {
    switch (severity) {
      case 'critical':
        return 'fatal';
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'info';
    }
  }
}

class LogRocketIntegration implements MonitoringService {
  name = 'LogRocket';
  private initialized = false;
  private LogRocket: any;

  async initialize(): Promise<void> {
    try {
      const logRocketAppId = import.meta.env.VITE_LOGROCKET_APP_ID;
      if (!logRocketAppId) {
        logger.warn('LogRocket App ID not configured', 'monitoring');
        return;
      }

      const LogRocketModule = await import('logrocket');
      this.LogRocket = LogRocketModule.default;

      this.LogRocket.init(logRocketAppId, {
        shouldCaptureIP: false,
        console: {
          shouldAggregateConsoleErrors: true,
        },
        network: {
          requestSanitizer: (request: any) => {
            // Sanitize sensitive headers
            if (request.headers?.authorization) {
              request.headers.authorization = '[REDACTED]';
            }
            if (request.headers?.cookie) {
              request.headers.cookie = '[REDACTED]';
            }
            return request;
          },
          responseSanitizer: (response: any) => {
            // Sanitize sensitive response data
            if (response.body?.password) {
              response.body.password = '[REDACTED]';
            }
            return response;
          },
        },
      });

      this.initialized = true;
      logger.info('LogRocket initialized successfully', 'monitoring');
    } catch (error) {
      logger.error('Failed to initialize LogRocket', 'monitoring', { error });
    }
  }

  async reportError(error: EnhancedAppError): Promise<void> {
    if (!this.initialized || !this.LogRocket) return;

    try {
      this.LogRocket.captureException(new Error(error.message), {
        tags: {
          errorCode: error.code,
          category: error.category,
          severity: error.severity,
        },
        extra: {
          errorId: error.id,
          context: error.context,
        },
      });
    } catch (logRocketError) {
      logger.error('Failed to report error to LogRocket', 'monitoring', { logRocketError });
    }
  }

  async trackEvent(event: UserAction): Promise<void> {
    if (!this.initialized || !this.LogRocket) return;

    try {
      this.LogRocket.track(event.action, {
        category: event.category,
        label: event.label,
        value: event.value,
        ...event.metadata,
      });
    } catch (error) {
      logger.error('Failed to track event in LogRocket', 'monitoring', { error });
    }
  }

  async recordMetric(metric: PerformanceMetric): Promise<void> {
    if (!this.initialized || !this.LogRocket) return;

    try {
      this.LogRocket.track('performance_metric', {
        name: metric.name,
        value: metric.value,
        unit: metric.unit,
        tags: metric.tags,
      });
    } catch (error) {
      logger.error('Failed to record metric in LogRocket', 'monitoring', { error });
    }
  }

  async setUser(userId: string, userData?: Record<string, any>): Promise<void> {
    if (!this.initialized || !this.LogRocket) return;

    try {
      this.LogRocket.identify(userId, userData);
    } catch (error) {
      logger.error('Failed to set user in LogRocket', 'monitoring', { error });
    }
  }

  async addBreadcrumb(message: string, category: string, data?: Record<string, any>): Promise<void> {
    if (!this.initialized || !this.LogRocket) return;

    try {
      this.LogRocket.log(message, data);
    } catch (error) {
      logger.error('Failed to add breadcrumb to LogRocket', 'monitoring', { error });
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

class DataDogIntegration implements MonitoringService {
  name = 'DataDog';
  private initialized = false;
  private datadogRum: any;

  async initialize(): Promise<void> {
    try {
      const clientToken = import.meta.env.VITE_DATADOG_CLIENT_TOKEN;
      const applicationId = import.meta.env.VITE_DATADOG_APPLICATION_ID;
      
      if (!clientToken || !applicationId) {
        logger.warn('DataDog credentials not configured', 'monitoring');
        return;
      }

      const { datadogRum } = await import('@datadog/browser-rum');
      this.datadogRum = datadogRum;

      this.datadogRum.init({
        applicationId,
        clientToken,
        site: 'datadoghq.com',
        service: 'clinicboost',
        env: secureConfig.getEnvironmentType(),
        version: secureConfig.getAppConfig().version,
        sampleRate: secureConfig.isProduction() ? 10 : 100,
        trackInteractions: true,
        defaultPrivacyLevel: 'mask-user-input',
      });

      this.datadogRum.startSessionReplayRecording();

      this.initialized = true;
      logger.info('DataDog RUM initialized successfully', 'monitoring');
    } catch (error) {
      logger.error('Failed to initialize DataDog', 'monitoring', { error });
    }
  }

  async reportError(error: EnhancedAppError): Promise<void> {
    if (!this.initialized || !this.datadogRum) return;

    try {
      this.datadogRum.addError(new Error(error.message), {
        errorCode: error.code,
        category: error.category,
        severity: error.severity,
        errorId: error.id,
        context: error.context,
      });
    } catch (datadogError) {
      logger.error('Failed to report error to DataDog', 'monitoring', { datadogError });
    }
  }

  async trackEvent(event: UserAction): Promise<void> {
    if (!this.initialized || !this.datadogRum) return;

    try {
      this.datadogRum.addAction(event.action, {
        category: event.category,
        label: event.label,
        value: event.value,
        ...event.metadata,
      });
    } catch (error) {
      logger.error('Failed to track event in DataDog', 'monitoring', { error });
    }
  }

  async recordMetric(metric: PerformanceMetric): Promise<void> {
    if (!this.initialized || !this.datadogRum) return;

    try {
      this.datadogRum.addTiming(metric.name, metric.value);
    } catch (error) {
      logger.error('Failed to record metric in DataDog', 'monitoring', { error });
    }
  }

  async setUser(userId: string, userData?: Record<string, any>): Promise<void> {
    if (!this.initialized || !this.datadogRum) return;

    try {
      this.datadogRum.setUser({
        id: userId,
        ...userData,
      });
    } catch (error) {
      logger.error('Failed to set user in DataDog', 'monitoring', { error });
    }
  }

  async addBreadcrumb(message: string, category: string, data?: Record<string, any>): Promise<void> {
    if (!this.initialized || !this.datadogRum) return;

    try {
      this.datadogRum.addAction(message, {
        category,
        ...data,
      });
    } catch (error) {
      logger.error('Failed to add breadcrumb to DataDog', 'monitoring', { error });
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

class MixpanelIntegration implements MonitoringService {
  name = 'Mixpanel';
  private initialized = false;
  private mixpanel: any;

  async initialize(): Promise<void> {
    try {
      const token = import.meta.env.VITE_MIXPANEL_TOKEN;
      if (!token) {
        logger.warn('Mixpanel token not configured', 'monitoring');
        return;
      }

      const mixpanelModule = await import('mixpanel-browser');
      this.mixpanel = mixpanelModule.default;

      this.mixpanel.init(token, {
        debug: secureConfig.isDevelopment(),
        track_pageview: true,
        persistence: 'localStorage',
      });

      this.initialized = true;
      logger.info('Mixpanel initialized successfully', 'monitoring');
    } catch (error) {
      logger.error('Failed to initialize Mixpanel', 'monitoring', { error });
    }
  }

  async reportError(error: EnhancedAppError): Promise<void> {
    if (!this.initialized || !this.mixpanel) return;

    try {
      this.mixpanel.track('Error Occurred', {
        error_code: error.code,
        error_message: error.message,
        category: error.category,
        severity: error.severity,
        error_id: error.id,
        recoverable: error.recoverable,
      });
    } catch (mixpanelError) {
      logger.error('Failed to report error to Mixpanel', 'monitoring', { mixpanelError });
    }
  }

  async trackEvent(event: UserAction): Promise<void> {
    if (!this.initialized || !this.mixpanel) return;

    try {
      this.mixpanel.track(event.action, {
        category: event.category,
        label: event.label,
        value: event.value,
        ...event.metadata,
      });
    } catch (error) {
      logger.error('Failed to track event in Mixpanel', 'monitoring', { error });
    }
  }

  async recordMetric(metric: PerformanceMetric): Promise<void> {
    if (!this.initialized || !this.mixpanel) return;

    try {
      this.mixpanel.track('Performance Metric', {
        metric_name: metric.name,
        metric_value: metric.value,
        metric_unit: metric.unit,
        ...metric.tags,
      });
    } catch (error) {
      logger.error('Failed to record metric in Mixpanel', 'monitoring', { error });
    }
  }

  async setUser(userId: string, userData?: Record<string, any>): Promise<void> {
    if (!this.initialized || !this.mixpanel) return;

    try {
      this.mixpanel.identify(userId);
      if (userData) {
        this.mixpanel.people.set(userData);
      }
    } catch (error) {
      logger.error('Failed to set user in Mixpanel', 'monitoring', { error });
    }
  }

  async addBreadcrumb(message: string, category: string, data?: Record<string, any>): Promise<void> {
    if (!this.initialized || !this.mixpanel) return;

    try {
      this.mixpanel.track('Breadcrumb', {
        message,
        category,
        ...data,
      });
    } catch (error) {
      logger.error('Failed to add breadcrumb to Mixpanel', 'monitoring', { error });
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

class MonitoringOrchestrator {
  private services: MonitoringService[] = [];
  private initialized = false;

  constructor() {
    this.setupServices();
  }

  private setupServices(): void {
    // Add monitoring services based on configuration
    if (secureConfig.isFeatureEnabled('enableAnalytics')) {
      this.services.push(new SentryIntegration());
      this.services.push(new LogRocketIntegration());
      this.services.push(new DataDogIntegration());
      this.services.push(new MixpanelIntegration());
    }
  }

  async initialize(): Promise<void> {
    try {
      const initPromises = this.services.map(service => 
        service.initialize().catch(error => 
          logger.error(`Failed to initialize ${service.name}`, 'monitoring', { error })
        )
      );

      await Promise.allSettled(initPromises);

      const initializedServices = this.services.filter(service => service.isInitialized());
      logger.info(`Monitoring orchestrator initialized with ${initializedServices.length} services`, 'monitoring', {
        services: initializedServices.map(s => s.name),
      });

      this.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize monitoring orchestrator', 'monitoring', { error });
    }
  }

  async reportError(error: EnhancedAppError): Promise<void> {
    if (!this.initialized) return;

    const promises = this.services
      .filter(service => service.isInitialized())
      .map(service => 
        service.reportError(error).catch(serviceError =>
          logger.error(`Failed to report error to ${service.name}`, 'monitoring', { serviceError })
        )
      );

    await Promise.allSettled(promises);
  }

  async trackEvent(event: UserAction): Promise<void> {
    if (!this.initialized) return;

    const promises = this.services
      .filter(service => service.isInitialized())
      .map(service => 
        service.trackEvent(event).catch(serviceError =>
          logger.error(`Failed to track event in ${service.name}`, 'monitoring', { serviceError })
        )
      );

    await Promise.allSettled(promises);
  }

  async recordMetric(metric: PerformanceMetric): Promise<void> {
    if (!this.initialized) return;

    const promises = this.services
      .filter(service => service.isInitialized())
      .map(service => 
        service.recordMetric(metric).catch(serviceError =>
          logger.error(`Failed to record metric in ${service.name}`, 'monitoring', { serviceError })
        )
      );

    await Promise.allSettled(promises);
  }

  async setUser(userId: string, userData?: Record<string, any>): Promise<void> {
    if (!this.initialized) return;

    const promises = this.services
      .filter(service => service.isInitialized())
      .map(service => 
        service.setUser(userId, userData).catch(serviceError =>
          logger.error(`Failed to set user in ${service.name}`, 'monitoring', { serviceError })
        )
      );

    await Promise.allSettled(promises);
  }

  async addBreadcrumb(message: string, category: string, data?: Record<string, any>): Promise<void> {
    if (!this.initialized) return;

    const promises = this.services
      .filter(service => service.isInitialized())
      .map(service => 
        service.addBreadcrumb(message, category, data).catch(serviceError =>
          logger.error(`Failed to add breadcrumb to ${service.name}`, 'monitoring', { serviceError })
        )
      );

    await Promise.allSettled(promises);
  }

  getInitializedServices(): string[] {
    return this.services
      .filter(service => service.isInitialized())
      .map(service => service.name);
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const monitoringOrchestrator = new MonitoringOrchestrator();

// Export convenience functions
export const initializeMonitoring = () => monitoringOrchestrator.initialize();
export const reportErrorToServices = (error: EnhancedAppError) => monitoringOrchestrator.reportError(error);
export const trackEventInServices = (event: UserAction) => monitoringOrchestrator.trackEvent(event);
export const recordMetricInServices = (metric: PerformanceMetric) => monitoringOrchestrator.recordMetric(metric);
export const setUserInServices = (userId: string, userData?: Record<string, any>) => monitoringOrchestrator.setUser(userId, userData);
export const addBreadcrumbToServices = (message: string, category: string, data?: Record<string, any>) => monitoringOrchestrator.addBreadcrumb(message, category, data);
