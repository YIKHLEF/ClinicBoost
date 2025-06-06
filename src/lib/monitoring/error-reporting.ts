/**
 * Enhanced Error Reporting and Alerting System for ClinicBoost
 * Provides centralized error tracking, alerting, and performance monitoring
 */

import { secureConfig } from '../config/secure-config';
import { logger } from '../logging-monitoring';

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error categories
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  DATABASE = 'database',
  NETWORK = 'network',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  SECURITY = 'security',
  PERFORMANCE = 'performance'
}

// Error context interface
interface ErrorContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  userAgent?: string;
  ip?: string;
  url?: string;
  method?: string;
  timestamp: Date;
  environment: string;
  version: string;
  additionalData?: Record<string, any>;
}

// Error report interface
interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  context: ErrorContext;
  fingerprint: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  resolved: boolean;
}

// Alert configuration
interface AlertConfig {
  enabled: boolean;
  threshold: number;
  timeWindow: number; // in minutes
  channels: AlertChannel[];
  severity: ErrorSeverity[];
  categories: ErrorCategory[];
}

// Alert channels
interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  config: Record<string, any>;
  enabled: boolean;
}

export class ErrorReportingService {
  private errorStore = new Map<string, ErrorReport>();
  private alertConfig: AlertConfig;
  private alertCounts = new Map<string, { count: number; resetTime: number }>();

  constructor() {
    this.alertConfig = {
      enabled: secureConfig.getEnvironmentType() !== 'development',
      threshold: parseInt(import.meta.env.VITE_ERROR_THRESHOLD || '10'),
      timeWindow: 15, // 15 minutes
      channels: this.initializeAlertChannels(),
      severity: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL],
      categories: Object.values(ErrorCategory)
    };

    // Clean up old errors periodically
    setInterval(() => this.cleanup(), 3600000); // Every hour
  }

  /**
   * Report an error
   */
  async reportError(
    error: Error | string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    category: ErrorCategory = ErrorCategory.SYSTEM,
    context?: Partial<ErrorContext>
  ): Promise<string> {
    try {
      const errorMessage = typeof error === 'string' ? error : error.message;
      const stack = typeof error === 'object' ? error.stack : undefined;
      
      const fullContext: ErrorContext = {
        timestamp: new Date(),
        environment: secureConfig.getEnvironmentType(),
        version: secureConfig.getAppConfig().app.version,
        ...context
      };

      const fingerprint = this.generateFingerprint(errorMessage, stack, category);
      const errorId = this.generateErrorId();

      let errorReport = this.errorStore.get(fingerprint);
      
      if (errorReport) {
        // Update existing error
        errorReport.count++;
        errorReport.lastSeen = new Date();
        errorReport.context = fullContext; // Update with latest context
      } else {
        // Create new error report
        errorReport = {
          id: errorId,
          message: errorMessage,
          stack,
          severity,
          category,
          context: fullContext,
          fingerprint,
          count: 1,
          firstSeen: new Date(),
          lastSeen: new Date(),
          resolved: false
        };
        this.errorStore.set(fingerprint, errorReport);
      }

      // Log the error
      logger.error('Error reported', 'error-reporting', {
        id: errorReport.id,
        message: errorMessage,
        severity,
        category,
        count: errorReport.count,
        context: fullContext
      });

      // Send to external services
      await this.sendToExternalServices(errorReport);

      // Check if alert should be triggered
      await this.checkAndTriggerAlert(errorReport);

      return errorReport.id;
    } catch (reportingError) {
      logger.error('Error reporting failed', 'error-reporting', { 
        error: reportingError,
        originalError: error 
      });
      return 'error-reporting-failed';
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    bySeverity: Record<ErrorSeverity, number>;
    byCategory: Record<ErrorCategory, number>;
    recent: number; // Last 24 hours
  } {
    const stats = {
      total: 0,
      bySeverity: {} as Record<ErrorSeverity, number>,
      byCategory: {} as Record<ErrorCategory, number>,
      recent: 0
    };

    // Initialize counters
    Object.values(ErrorSeverity).forEach(severity => {
      stats.bySeverity[severity] = 0;
    });
    Object.values(ErrorCategory).forEach(category => {
      stats.byCategory[category] = 0;
    });

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const error of this.errorStore.values()) {
      stats.total += error.count;
      stats.bySeverity[error.severity] += error.count;
      stats.byCategory[error.category] += error.count;
      
      if (error.lastSeen > oneDayAgo) {
        stats.recent += error.count;
      }
    }

    return stats;
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 50): ErrorReport[] {
    return Array.from(this.errorStore.values())
      .sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime())
      .slice(0, limit);
  }

  /**
   * Mark error as resolved
   */
  resolveError(fingerprint: string): boolean {
    const error = this.errorStore.get(fingerprint);
    if (error) {
      error.resolved = true;
      logger.info('Error marked as resolved', 'error-reporting', { 
        id: error.id,
        fingerprint 
      });
      return true;
    }
    return false;
  }

  /**
   * Performance monitoring
   */
  async reportPerformanceIssue(
    metric: string,
    value: number,
    threshold: number,
    context?: Record<string, any>
  ): Promise<void> {
    if (value > threshold) {
      await this.reportError(
        `Performance issue: ${metric} (${value}) exceeded threshold (${threshold})`,
        ErrorSeverity.MEDIUM,
        ErrorCategory.PERFORMANCE,
        {
          additionalData: {
            metric,
            value,
            threshold,
            ...context
          }
        }
      );
    }
  }

  /**
   * User session recording integration
   */
  attachSessionData(errorId: string, sessionData: {
    sessionId: string;
    userId?: string;
    actions: any[];
    duration: number;
  }): void {
    // Find error by ID and attach session data
    for (const error of this.errorStore.values()) {
      if (error.id === errorId) {
        error.context.additionalData = {
          ...error.context.additionalData,
          sessionData
        };
        break;
      }
    }
  }

  /**
   * Create monitoring dashboard data
   */
  getDashboardData(): {
    errorTrends: Array<{ date: string; count: number; severity: ErrorSeverity }>;
    topErrors: Array<{ message: string; count: number; severity: ErrorSeverity }>;
    categoryBreakdown: Record<ErrorCategory, number>;
    severityBreakdown: Record<ErrorSeverity, number>;
    recentAlerts: Array<{ timestamp: Date; message: string; severity: ErrorSeverity }>;
  } {
    const errors = Array.from(this.errorStore.values());
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Error trends (last 7 days)
    const errorTrends: Array<{ date: string; count: number; severity: ErrorSeverity }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];

      Object.values(ErrorSeverity).forEach(severity => {
        const count = errors.filter(error =>
          error.lastSeen.toISOString().split('T')[0] === dateStr &&
          error.severity === severity
        ).reduce((sum, error) => sum + error.count, 0);

        if (count > 0) {
          errorTrends.push({ date: dateStr, count, severity });
        }
      });
    }

    // Top errors by count
    const topErrors = errors
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(error => ({
        message: error.message.substring(0, 100),
        count: error.count,
        severity: error.severity
      }));

    // Category breakdown
    const categoryBreakdown: Record<ErrorCategory, number> = {} as any;
    Object.values(ErrorCategory).forEach(category => {
      categoryBreakdown[category] = errors
        .filter(error => error.category === category)
        .reduce((sum, error) => sum + error.count, 0);
    });

    // Severity breakdown
    const severityBreakdown: Record<ErrorSeverity, number> = {} as any;
    Object.values(ErrorSeverity).forEach(severity => {
      severityBreakdown[severity] = errors
        .filter(error => error.severity === severity)
        .reduce((sum, error) => sum + error.count, 0);
    });

    // Recent alerts (last 24 hours)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentAlerts = errors
      .filter(error => error.lastSeen > oneDayAgo &&
                      [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL].includes(error.severity))
      .sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime())
      .slice(0, 20)
      .map(error => ({
        timestamp: error.lastSeen,
        message: error.message,
        severity: error.severity
      }));

    return {
      errorTrends,
      topErrors,
      categoryBreakdown,
      severityBreakdown,
      recentAlerts
    };
  }

  /**
   * Private methods
   */
  private generateFingerprint(message: string, stack?: string, category?: ErrorCategory): string {
    const content = `${message}:${stack?.split('\n')[0] || ''}:${category}`;
    return btoa(content).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private async sendToExternalServices(error: ErrorReport): Promise<void> {
    const promises: Promise<void>[] = [];

    // Send to Sentry
    if (import.meta.env.VITE_SENTRY_DSN) {
      promises.push(this.sendToSentry(error));
    }

    // Send to DataDog
    if (import.meta.env.VITE_DATADOG_CLIENT_TOKEN) {
      promises.push(this.sendToDataDog(error));
    }

    // Send to LogRocket
    if (import.meta.env.VITE_LOGROCKET_APP_ID) {
      promises.push(this.sendToLogRocket(error));
    }

    await Promise.allSettled(promises);
  }

  private async sendToSentry(error: ErrorReport): Promise<void> {
    try {
      const Sentry = await import('@sentry/browser');
      Sentry.captureException(new Error(error.message), {
        tags: {
          severity: error.severity,
          category: error.category,
          fingerprint: error.fingerprint
        },
        extra: {
          context: error.context,
          count: error.count,
          firstSeen: error.firstSeen,
          lastSeen: error.lastSeen
        }
      });
    } catch (err) {
      logger.error('Failed to send to Sentry', 'error-reporting', { error: err });
    }
  }

  private async sendToDataDog(error: ErrorReport): Promise<void> {
    try {
      const { datadogRum } = await import('@datadog/browser-rum');
      datadogRum.addError(new Error(error.message), {
        severity: error.severity,
        category: error.category,
        context: error.context
      });
    } catch (err) {
      logger.error('Failed to send to DataDog', 'error-reporting', { error: err });
    }
  }

  private async sendToLogRocket(error: ErrorReport): Promise<void> {
    try {
      const LogRocket = await import('logrocket');
      LogRocket.captureException(new Error(error.message));
    } catch (err) {
      logger.error('Failed to send to LogRocket', 'error-reporting', { error: err });
    }
  }

  private async checkAndTriggerAlert(error: ErrorReport): Promise<void> {
    if (!this.alertConfig.enabled) return;

    // Check if error meets alert criteria
    if (!this.alertConfig.severity.includes(error.severity)) return;
    if (!this.alertConfig.categories.includes(error.category)) return;

    const alertKey = `${error.category}:${error.severity}`;
    const now = Date.now();
    const windowMs = this.alertConfig.timeWindow * 60 * 1000;

    let alertCount = this.alertCounts.get(alertKey);
    if (!alertCount || alertCount.resetTime < now) {
      alertCount = { count: 0, resetTime: now + windowMs };
    }

    alertCount.count++;
    this.alertCounts.set(alertKey, alertCount);

    // Trigger alert if threshold exceeded
    if (alertCount.count >= this.alertConfig.threshold) {
      await this.sendAlert(error, alertCount.count);
      // Reset counter after sending alert
      alertCount.count = 0;
      alertCount.resetTime = now + windowMs;
    }
  }

  private async sendAlert(error: ErrorReport, count: number): Promise<void> {
    const alertData = {
      title: `ClinicBoost Error Alert - ${error.severity.toUpperCase()}`,
      message: `${count} errors in ${this.alertConfig.timeWindow} minutes`,
      error: {
        message: error.message,
        category: error.category,
        severity: error.severity,
        count: error.count,
        environment: error.context.environment
      },
      timestamp: new Date().toISOString()
    };

    const promises = this.alertConfig.channels
      .filter(channel => channel.enabled)
      .map(channel => this.sendToChannel(channel, alertData));

    await Promise.allSettled(promises);
  }

  private async sendToChannel(channel: AlertChannel, data: any): Promise<void> {
    try {
      switch (channel.type) {
        case 'slack':
          await this.sendSlackAlert(channel.config, data);
          break;
        case 'email':
          await this.sendEmailAlert(channel.config, data);
          break;
        case 'webhook':
          await this.sendWebhookAlert(channel.config, data);
          break;
        case 'sms':
          await this.sendSMSAlert(channel.config, data);
          break;
      }
    } catch (error) {
      logger.error(`Failed to send alert via ${channel.type}`, 'error-reporting', { error });
    }
  }

  private async sendSlackAlert(config: any, data: any): Promise<void> {
    const webhookUrl = config.webhookUrl || import.meta.env.VITE_SLACK_WEBHOOK_URL;
    if (!webhookUrl) return;

    const payload = {
      text: data.title,
      attachments: [{
        color: this.getSeverityColor(data.error.severity),
        fields: [
          { title: 'Message', value: data.error.message, short: false },
          { title: 'Category', value: data.error.category, short: true },
          { title: 'Severity', value: data.error.severity, short: true },
          { title: 'Count', value: data.error.count.toString(), short: true },
          { title: 'Environment', value: data.error.environment, short: true }
        ],
        timestamp: Math.floor(Date.now() / 1000)
      }]
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  private async sendEmailAlert(config: any, data: any): Promise<void> {
    // Email implementation would go here
    logger.info('Email alert would be sent', 'error-reporting', { data });
  }

  private async sendWebhookAlert(config: any, data: any): Promise<void> {
    await fetch(config.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }

  private async sendSMSAlert(config: any, data: any): Promise<void> {
    // SMS implementation would go here
    logger.info('SMS alert would be sent', 'error-reporting', { data });
  }

  private getSeverityColor(severity: ErrorSeverity): string {
    const colors = {
      [ErrorSeverity.LOW]: '#36a64f',
      [ErrorSeverity.MEDIUM]: '#ff9500',
      [ErrorSeverity.HIGH]: '#ff4500',
      [ErrorSeverity.CRITICAL]: '#ff0000'
    };
    return colors[severity];
  }

  private initializeAlertChannels(): AlertChannel[] {
    const channels: AlertChannel[] = [];

    if (import.meta.env.VITE_SLACK_WEBHOOK_URL) {
      channels.push({
        type: 'slack',
        config: { webhookUrl: import.meta.env.VITE_SLACK_WEBHOOK_URL },
        enabled: true
      });
    }

    if (import.meta.env.VITE_ALERT_EMAIL) {
      channels.push({
        type: 'email',
        config: { email: import.meta.env.VITE_ALERT_EMAIL },
        enabled: true
      });
    }

    return channels;
  }

  private cleanup(): void {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    let cleaned = 0;

    for (const [fingerprint, error] of this.errorStore.entries()) {
      if (error.lastSeen < oneWeekAgo && error.resolved) {
        this.errorStore.delete(fingerprint);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info('Error cleanup completed', 'error-reporting', { cleaned });
    }
  }
}

// Export singleton instance
export const errorReporting = new ErrorReportingService();

// Convenience functions
export const reportError = errorReporting.reportError.bind(errorReporting);
export const reportPerformanceIssue = errorReporting.reportPerformanceIssue.bind(errorReporting);
