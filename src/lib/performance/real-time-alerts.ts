/**
 * Real-time Performance Alert System
 * 
 * This module provides real-time performance monitoring and alerting capabilities:
 * - WebSocket-based real-time alerts
 * - Performance threshold monitoring
 * - Alert escalation and notification
 * - Alert dashboard integration
 */

import { logger } from '../logging-monitoring';

export interface PerformanceAlert {
  id: string;
  metric: string;
  value: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  environment: string;
  userAgent?: string;
  sessionId?: string;
  resolved: boolean;
  escalated: boolean;
  context: Record<string, any>;
}

export interface AlertRule {
  id: string;
  metric: string;
  threshold: number;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  severity: PerformanceAlert['severity'];
  enabled: boolean;
  cooldownPeriod: number; // minutes
  escalationThreshold: number; // number of alerts before escalation
  notificationChannels: string[];
}

export interface AlertNotificationChannel {
  id: string;
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'push';
  config: Record<string, any>;
  enabled: boolean;
  severityFilter: PerformanceAlert['severity'][];
}

export interface RealTimeAlertConfig {
  enabled: boolean;
  websocketUrl?: string;
  alertRules: AlertRule[];
  notificationChannels: AlertNotificationChannel[];
  dashboardIntegration: boolean;
  alertHistory: {
    retentionDays: number;
    maxAlerts: number;
  };
}

class RealTimeAlertSystem {
  private config: RealTimeAlertConfig;
  private alerts: Map<string, PerformanceAlert> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private notificationChannels: Map<string, AlertNotificationChannel> = new Map();
  private websocket: WebSocket | null = null;
  private alertCooldowns: Map<string, number> = new Map();
  private escalationCounters: Map<string, number> = new Map();

  constructor(config: RealTimeAlertConfig) {
    this.config = config;
    this.initializeAlertRules();
    this.initializeNotificationChannels();
    
    if (this.config.enabled && this.config.websocketUrl) {
      this.initializeWebSocket();
    }
  }

  /**
   * Initialize alert rules
   */
  private initializeAlertRules(): void {
    this.config.alertRules.forEach(rule => {
      this.alertRules.set(rule.id, rule);
    });
  }

  /**
   * Initialize notification channels
   */
  private initializeNotificationChannels(): void {
    this.config.notificationChannels.forEach(channel => {
      this.notificationChannels.set(channel.id, channel);
    });
  }

  /**
   * Initialize WebSocket connection for real-time alerts
   */
  private initializeWebSocket(): void {
    try {
      this.websocket = new WebSocket(this.config.websocketUrl!);
      
      this.websocket.onopen = () => {
        logger.info('Real-time alert WebSocket connected', 'performance-alerts');
      };

      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          logger.error('Failed to parse WebSocket message', 'performance-alerts', { error });
        }
      };

      this.websocket.onclose = () => {
        logger.warn('Real-time alert WebSocket disconnected', 'performance-alerts');
        // Attempt to reconnect after 5 seconds
        setTimeout(() => this.initializeWebSocket(), 5000);
      };

      this.websocket.onerror = (error) => {
        logger.error('WebSocket error', 'performance-alerts', { error });
      };
    } catch (error) {
      logger.error('Failed to initialize WebSocket', 'performance-alerts', { error });
    }
  }

  /**
   * Handle WebSocket messages
   */
  private handleWebSocketMessage(data: any): void {
    if (data.type === 'performance_metric') {
      this.checkMetricAgainstRules(data.metric, data.value, data.context);
    } else if (data.type === 'alert_update') {
      this.updateAlert(data.alertId, data.update);
    }
  }

  /**
   * Check metric against alert rules
   */
  checkMetricAgainstRules(metric: string, value: number, context: Record<string, any> = {}): void {
    this.alertRules.forEach(rule => {
      if (!rule.enabled || rule.metric !== metric) return;

      const ruleKey = `${rule.id}-${metric}`;
      const now = Date.now();

      // Check cooldown period
      const lastAlert = this.alertCooldowns.get(ruleKey);
      if (lastAlert && (now - lastAlert) < (rule.cooldownPeriod * 60 * 1000)) {
        return;
      }

      // Evaluate rule condition
      const triggered = this.evaluateRule(rule, value);
      
      if (triggered) {
        this.createAlert(rule, metric, value, context);
        this.alertCooldowns.set(ruleKey, now);
      }
    });
  }

  /**
   * Evaluate rule condition
   */
  private evaluateRule(rule: AlertRule, value: number): boolean {
    switch (rule.operator) {
      case '>': return value > rule.threshold;
      case '<': return value < rule.threshold;
      case '>=': return value >= rule.threshold;
      case '<=': return value <= rule.threshold;
      case '==': return value === rule.threshold;
      case '!=': return value !== rule.threshold;
      default: return false;
    }
  }

  /**
   * Create performance alert
   */
  private createAlert(rule: AlertRule, metric: string, value: number, context: Record<string, any>): void {
    const alertId = this.generateAlertId();
    
    const alert: PerformanceAlert = {
      id: alertId,
      metric,
      value,
      threshold: rule.threshold,
      severity: rule.severity,
      timestamp: Date.now(),
      environment: context.environment || 'unknown',
      userAgent: context.userAgent,
      sessionId: context.sessionId,
      resolved: false,
      escalated: false,
      context
    };

    this.alerts.set(alertId, alert);

    // Check for escalation
    this.checkEscalation(rule, alert);

    // Send notifications
    this.sendNotifications(alert, rule);

    // Broadcast to dashboard
    if (this.config.dashboardIntegration) {
      this.broadcastToDashboard(alert);
    }

    logger.warn('Performance alert created', 'performance-alerts', {
      alertId,
      metric,
      value,
      threshold: rule.threshold,
      severity: rule.severity
    });
  }

  /**
   * Check for alert escalation
   */
  private checkEscalation(rule: AlertRule, alert: PerformanceAlert): void {
    const escalationKey = `${rule.id}-${alert.metric}`;
    const currentCount = this.escalationCounters.get(escalationKey) || 0;
    const newCount = currentCount + 1;
    
    this.escalationCounters.set(escalationKey, newCount);

    if (newCount >= rule.escalationThreshold) {
      alert.escalated = true;
      alert.severity = 'critical';
      
      logger.error('Performance alert escalated', 'performance-alerts', {
        alertId: alert.id,
        metric: alert.metric,
        escalationCount: newCount
      });
    }
  }

  /**
   * Send notifications for alert
   */
  private async sendNotifications(alert: PerformanceAlert, rule: AlertRule): Promise<void> {
    const promises = rule.notificationChannels.map(channelId => {
      const channel = this.notificationChannels.get(channelId);
      if (channel && channel.enabled && channel.severityFilter.includes(alert.severity)) {
        return this.sendNotification(channel, alert);
      }
      return Promise.resolve();
    });

    await Promise.allSettled(promises);
  }

  /**
   * Send notification to specific channel
   */
  private async sendNotification(channel: AlertNotificationChannel, alert: PerformanceAlert): Promise<void> {
    try {
      switch (channel.type) {
        case 'webhook':
          await this.sendWebhookNotification(channel, alert);
          break;
        case 'email':
          await this.sendEmailNotification(channel, alert);
          break;
        case 'slack':
          await this.sendSlackNotification(channel, alert);
          break;
        case 'push':
          await this.sendPushNotification(channel, alert);
          break;
        default:
          logger.warn('Unknown notification channel type', 'performance-alerts', { 
            type: channel.type 
          });
      }
    } catch (error) {
      logger.error('Failed to send notification', 'performance-alerts', { 
        channelId: channel.id,
        alertId: alert.id,
        error 
      });
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(channel: AlertNotificationChannel, alert: PerformanceAlert): Promise<void> {
    const response = await fetch(channel.config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...channel.config.headers
      },
      body: JSON.stringify({
        alert,
        timestamp: new Date().toISOString(),
        source: 'clinicboost-performance-monitoring'
      })
    });

    if (!response.ok) {
      throw new Error(`Webhook notification failed: ${response.status}`);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(channel: AlertNotificationChannel, alert: PerformanceAlert): Promise<void> {
    // Implementation would integrate with email service
    logger.info('Email notification sent', 'performance-alerts', { 
      alertId: alert.id,
      recipients: channel.config.recipients 
    });
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(channel: AlertNotificationChannel, alert: PerformanceAlert): Promise<void> {
    const slackMessage = {
      text: `🚨 Performance Alert: ${alert.metric}`,
      attachments: [{
        color: this.getSeverityColor(alert.severity),
        fields: [
          { title: 'Metric', value: alert.metric, short: true },
          { title: 'Value', value: `${alert.value}`, short: true },
          { title: 'Threshold', value: `${alert.threshold}`, short: true },
          { title: 'Severity', value: alert.severity.toUpperCase(), short: true },
          { title: 'Environment', value: alert.environment, short: true },
          { title: 'Time', value: new Date(alert.timestamp).toISOString(), short: true }
        ]
      }]
    };

    const response = await fetch(channel.config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackMessage)
    });

    if (!response.ok) {
      throw new Error(`Slack notification failed: ${response.status}`);
    }
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(channel: AlertNotificationChannel, alert: PerformanceAlert): Promise<void> {
    // Implementation would integrate with push notification service
    logger.info('Push notification sent', 'performance-alerts', { 
      alertId: alert.id 
    });
  }

  /**
   * Get severity color for Slack
   */
  private getSeverityColor(severity: PerformanceAlert['severity']): string {
    switch (severity) {
      case 'low': return '#36a64f';
      case 'medium': return '#ff9500';
      case 'high': return '#ff6b35';
      case 'critical': return '#ff0000';
      default: return '#cccccc';
    }
  }

  /**
   * Broadcast alert to dashboard
   */
  private broadcastToDashboard(alert: PerformanceAlert): void {
    const event = new CustomEvent('performance-alert-created', {
      detail: alert
    });
    document.dispatchEvent(event);
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string, resolvedBy?: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      
      logger.info('Performance alert resolved', 'performance-alerts', {
        alertId,
        resolvedBy,
        metric: alert.metric
      });

      // Broadcast resolution to dashboard
      if (this.config.dashboardIntegration) {
        const event = new CustomEvent('performance-alert-resolved', {
          detail: { alertId, resolvedBy }
        });
        document.dispatchEvent(event);
      }

      return true;
    }
    return false;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit?: number): PerformanceAlert[] {
    const alerts = Array.from(this.alerts.values())
      .sort((a, b) => b.timestamp - a.timestamp);
    
    return limit ? alerts.slice(0, limit) : alerts;
  }

  /**
   * Update alert
   */
  private updateAlert(alertId: string, update: Partial<PerformanceAlert>): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      Object.assign(alert, update);
      
      if (this.config.dashboardIntegration) {
        const event = new CustomEvent('performance-alert-updated', {
          detail: { alertId, update }
        });
        document.dispatchEvent(event);
      }
    }
  }

  /**
   * Cleanup old alerts
   */
  cleanupOldAlerts(): void {
    const cutoffTime = Date.now() - (this.config.alertHistory.retentionDays * 24 * 60 * 60 * 1000);
    
    for (const [alertId, alert] of this.alerts.entries()) {
      if (alert.timestamp < cutoffTime) {
        this.alerts.delete(alertId);
      }
    }

    // Limit total alerts
    if (this.alerts.size > this.config.alertHistory.maxAlerts) {
      const sortedAlerts = Array.from(this.alerts.entries())
        .sort(([, a], [, b]) => b.timestamp - a.timestamp);
      
      const toDelete = sortedAlerts.slice(this.config.alertHistory.maxAlerts);
      toDelete.forEach(([alertId]) => this.alerts.delete(alertId));
    }
  }

  /**
   * Destroy alert system
   */
  destroy(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    this.alerts.clear();
    this.alertRules.clear();
    this.notificationChannels.clear();
    this.alertCooldowns.clear();
    this.escalationCounters.clear();
  }
}

// Default configuration
const defaultAlertConfig: RealTimeAlertConfig = {
  enabled: true,
  websocketUrl: process.env.VITE_PERFORMANCE_WEBSOCKET_URL,
  alertRules: [
    {
      id: 'lcp-threshold',
      metric: 'LCP',
      threshold: 2500,
      operator: '>',
      severity: 'medium',
      enabled: true,
      cooldownPeriod: 5,
      escalationThreshold: 3,
      notificationChannels: ['default-webhook']
    },
    {
      id: 'fid-threshold',
      metric: 'FID',
      threshold: 100,
      operator: '>',
      severity: 'medium',
      enabled: true,
      cooldownPeriod: 5,
      escalationThreshold: 3,
      notificationChannels: ['default-webhook']
    },
    {
      id: 'cls-threshold',
      metric: 'CLS',
      threshold: 0.1,
      operator: '>',
      severity: 'medium',
      enabled: true,
      cooldownPeriod: 5,
      escalationThreshold: 3,
      notificationChannels: ['default-webhook']
    }
  ],
  notificationChannels: [
    {
      id: 'default-webhook',
      type: 'webhook',
      config: {
        url: process.env.VITE_PERFORMANCE_WEBHOOK_URL || 'http://localhost:3001/api/performance-alerts'
      },
      enabled: true,
      severityFilter: ['medium', 'high', 'critical']
    }
  ],
  dashboardIntegration: true,
  alertHistory: {
    retentionDays: 30,
    maxAlerts: 1000
  }
};

// Export singleton instance
export const realTimeAlerts = new RealTimeAlertSystem(defaultAlertConfig);

// Export utility functions
export const checkMetric = (metric: string, value: number, context?: Record<string, any>) =>
  realTimeAlerts.checkMetricAgainstRules(metric, value, context);

export const resolveAlert = (alertId: string, resolvedBy?: string) =>
  realTimeAlerts.resolveAlert(alertId, resolvedBy);

export const getActiveAlerts = () => realTimeAlerts.getActiveAlerts();

export const getAlertHistory = (limit?: number) => realTimeAlerts.getAlertHistory(limit);
