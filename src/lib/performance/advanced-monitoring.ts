/**
 * Advanced Performance Monitoring & Optimization
 * 
 * This module provides comprehensive performance monitoring including:
 * - Real User Monitoring (RUM) implementation
 * - Custom business metrics tracking
 * - Performance budget monitoring
 * - Real-time performance alerts
 * - Automated performance regression detection
 * - Performance dashboard with actionable insights
 */

import { errorReporting } from '../monitoring/error-reporting';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags: Record<string, string>;
  context?: Record<string, any>;
}

export interface PerformanceBudget {
  metric: string;
  threshold: number;
  unit: string;
  severity: 'warning' | 'error';
  enabled: boolean;
}

export interface PerformanceAlert {
  id: string;
  metric: string;
  value: number;
  threshold: number;
  severity: 'warning' | 'error';
  timestamp: number;
  resolved: boolean;
  context: Record<string, any>;
}

export interface RUMConfig {
  enabled: boolean;
  sampleRate: number;
  trackUserInteractions: boolean;
  trackResourceTiming: boolean;
  trackLongTasks: boolean;
  trackLayoutShifts: boolean;
  trackCustomMetrics: boolean;
}

export interface BusinessMetric {
  name: string;
  value: number;
  unit: string;
  category: 'user-engagement' | 'conversion' | 'performance' | 'error';
  timestamp: number;
  userId?: string;
  sessionId?: string;
}

class AdvancedPerformanceMonitoring {
  private metrics = new Map<string, PerformanceMetric[]>();
  private budgets = new Map<string, PerformanceBudget>();
  private alerts = new Map<string, PerformanceAlert>();
  private businessMetrics = new Map<string, BusinessMetric[]>();
  private rumConfig: RUMConfig;
  private performanceObserver?: PerformanceObserver;
  private longTaskObserver?: PerformanceObserver;
  private layoutShiftObserver?: PerformanceObserver;
  private sessionId: string;
  private userId?: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.rumConfig = this.loadRUMConfig();
    this.setupDefaultBudgets();
    this.setupPerformanceObservers();
    this.setupBusinessMetrics();
    this.startMonitoring();
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load RUM configuration
   */
  private loadRUMConfig(): RUMConfig {
    const saved = localStorage.getItem('rum-config');
    const defaults: RUMConfig = {
      enabled: true,
      sampleRate: 1.0, // 100% sampling for clinic app
      trackUserInteractions: true,
      trackResourceTiming: true,
      trackLongTasks: true,
      trackLayoutShifts: true,
      trackCustomMetrics: true,
    };

    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  }

  /**
   * Setup default performance budgets
   */
  private setupDefaultBudgets(): void {
    const defaultBudgets: PerformanceBudget[] = [
      // Core Web Vitals
      { metric: 'LCP', threshold: 2500, unit: 'ms', severity: 'error', enabled: true },
      { metric: 'FID', threshold: 100, unit: 'ms', severity: 'error', enabled: true },
      { metric: 'CLS', threshold: 0.1, unit: 'score', severity: 'error', enabled: true },
      { metric: 'TTFB', threshold: 600, unit: 'ms', severity: 'warning', enabled: true },
      { metric: 'FCP', threshold: 1800, unit: 'ms', severity: 'warning', enabled: true },

      // Custom metrics
      { metric: 'page-load-time', threshold: 3000, unit: 'ms', severity: 'warning', enabled: true },
      { metric: 'api-response-time', threshold: 1000, unit: 'ms', severity: 'warning', enabled: true },
      { metric: 'memory-usage', threshold: 100, unit: 'MB', severity: 'warning', enabled: true },
      { metric: 'bundle-size', threshold: 1000, unit: 'KB', severity: 'warning', enabled: true },

      // Business metrics
      { metric: 'patient-search-time', threshold: 2000, unit: 'ms', severity: 'warning', enabled: true },
      { metric: 'appointment-booking-time', threshold: 5000, unit: 'ms', severity: 'warning', enabled: true },
      { metric: 'form-submission-time', threshold: 3000, unit: 'ms', severity: 'warning', enabled: true },
    ];

    defaultBudgets.forEach(budget => {
      this.budgets.set(budget.metric, budget);
    });
  }

  /**
   * Setup performance observers
   */
  private setupPerformanceObservers(): void {
    if (!this.rumConfig.enabled) return;

    // Navigation and paint timing
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => this.processPerformanceEntry(entry));
      });

      try {
        this.performanceObserver.observe({
          entryTypes: ['navigation', 'paint', 'largest-contentful-paint', 'first-input']
        });
      } catch (e) {
        console.warn('Some performance entry types not supported:', e);
      }
    }

    // Long tasks
    if (this.rumConfig.trackLongTasks && 'PerformanceObserver' in window) {
      this.longTaskObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => this.processLongTask(entry));
      });

      try {
        this.longTaskObserver.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        console.warn('Long task observer not supported:', e);
      }
    }

    // Layout shifts
    if (this.rumConfig.trackLayoutShifts && 'PerformanceObserver' in window) {
      this.layoutShiftObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => this.processLayoutShift(entry));
      });

      try {
        this.layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.warn('Layout shift observer not supported:', e);
      }
    }
  }

  /**
   * Setup business metrics tracking
   */
  private setupBusinessMetrics(): void {
    // Track user interactions
    if (this.rumConfig.trackUserInteractions) {
      this.setupUserInteractionTracking();
    }

    // Track custom clinic workflows
    this.setupClinicWorkflowTracking();
  }

  /**
   * Setup user interaction tracking
   */
  private setupUserInteractionTracking(): void {
    // Track clicks on important elements
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      this.trackUserInteraction('click', target);
    });

    // Track form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      this.trackFormSubmission(form);
    });

    // Track navigation
    window.addEventListener('popstate', () => {
      this.trackNavigation('browser-back');
    });
  }

  /**
   * Setup clinic workflow tracking
   */
  private setupClinicWorkflowTracking(): void {
    // Track patient search performance
    this.trackWorkflow('patient-search', '[data-testid="patient-search"]');
    
    // Track appointment booking performance
    this.trackWorkflow('appointment-booking', '[data-testid="book-appointment"]');
    
    // Track report generation performance
    this.trackWorkflow('report-generation', '[data-testid="generate-report"]');
  }

  /**
   * Track workflow performance
   */
  private trackWorkflow(workflowName: string, selector: string): void {
    const element = document.querySelector(selector);
    if (!element) return;

    element.addEventListener('click', () => {
      const startTime = performance.now();
      
      // Track completion (simplified - would need more sophisticated detection)
      const checkCompletion = () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.recordBusinessMetric({
          name: `${workflowName}-duration`,
          value: duration,
          unit: 'ms',
          category: 'performance',
          timestamp: Date.now(),
          sessionId: this.sessionId,
          userId: this.userId,
        });
      };

      // Check for completion after reasonable delay
      setTimeout(checkCompletion, 100);
    });
  }

  /**
   * Process performance entry
   */
  private processPerformanceEntry(entry: PerformanceEntry): void {
    const metric: PerformanceMetric = {
      name: entry.name,
      value: entry.duration || entry.startTime,
      unit: 'ms',
      timestamp: Date.now(),
      tags: {
        type: entry.entryType,
        sessionId: this.sessionId,
      },
      context: {
        userId: this.userId,
        userAgent: navigator.userAgent,
        url: window.location.href,
      },
    };

    this.recordMetric(metric);
    this.checkBudget(metric);
  }

  /**
   * Process long task
   */
  private processLongTask(entry: PerformanceEntry): void {
    const metric: PerformanceMetric = {
      name: 'long-task',
      value: entry.duration,
      unit: 'ms',
      timestamp: Date.now(),
      tags: {
        type: 'longtask',
        sessionId: this.sessionId,
      },
      context: {
        startTime: entry.startTime,
        attribution: (entry as any).attribution,
      },
    };

    this.recordMetric(metric);
    
    // Long tasks are always concerning
    this.createAlert({
      metric: 'long-task',
      value: entry.duration,
      threshold: 50, // 50ms threshold for long tasks
      severity: 'warning',
      context: metric.context || {},
    });
  }

  /**
   * Process layout shift
   */
  private processLayoutShift(entry: any): void {
    if (entry.hadRecentInput) return; // Ignore user-initiated shifts

    const metric: PerformanceMetric = {
      name: 'layout-shift',
      value: entry.value,
      unit: 'score',
      timestamp: Date.now(),
      tags: {
        type: 'layout-shift',
        sessionId: this.sessionId,
      },
      context: {
        sources: entry.sources,
        hadRecentInput: entry.hadRecentInput,
      },
    };

    this.recordMetric(metric);
    this.checkBudget(metric);
  }

  /**
   * Track user interaction
   */
  private trackUserInteraction(type: string, target: HTMLElement): void {
    const metric: BusinessMetric = {
      name: `user-interaction-${type}`,
      value: 1,
      unit: 'count',
      category: 'user-engagement',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    // Add context about the target
    const context = {
      tagName: target.tagName,
      className: target.className,
      id: target.id,
      textContent: target.textContent?.substring(0, 50),
    };

    this.recordBusinessMetric(metric, context);
  }

  /**
   * Track form submission
   */
  private trackFormSubmission(form: HTMLFormElement): void {
    const formId = form.id || form.className || 'unknown-form';
    const startTime = performance.now();

    const metric: BusinessMetric = {
      name: 'form-submission',
      value: startTime,
      unit: 'ms',
      category: 'conversion',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.recordBusinessMetric(metric, {
      formId,
      fieldCount: form.elements.length,
    });
  }

  /**
   * Track navigation
   */
  private trackNavigation(type: string): void {
    const metric: BusinessMetric = {
      name: `navigation-${type}`,
      value: 1,
      unit: 'count',
      category: 'user-engagement',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.recordBusinessMetric(metric, {
      url: window.location.href,
      referrer: document.referrer,
    });
  }

  /**
   * Record performance metric
   */
  recordMetric(metric: PerformanceMetric): void {
    if (!this.shouldSample()) return;

    const metricName = metric.name;
    if (!this.metrics.has(metricName)) {
      this.metrics.set(metricName, []);
    }

    const metricArray = this.metrics.get(metricName)!;
    metricArray.push(metric);

    // Limit stored metrics to prevent memory issues
    if (metricArray.length > 1000) {
      metricArray.shift();
    }

    // Send to external monitoring services
    this.sendMetricToServices(metric);
  }

  /**
   * Record business metric
   */
  recordBusinessMetric(metric: BusinessMetric, context?: Record<string, any>): void {
    if (!this.shouldSample()) return;

    const metricName = metric.name;
    if (!this.businessMetrics.has(metricName)) {
      this.businessMetrics.set(metricName, []);
    }

    const metricArray = this.businessMetrics.get(metricName)!;
    metricArray.push(metric);

    // Limit stored metrics
    if (metricArray.length > 1000) {
      metricArray.shift();
    }

    // Send to analytics services
    this.sendBusinessMetricToServices(metric, context);
  }

  /**
   * Check if metric violates budget
   */
  private checkBudget(metric: PerformanceMetric): void {
    const budget = this.budgets.get(metric.name);
    if (!budget || !budget.enabled) return;

    if (metric.value > budget.threshold) {
      this.createAlert({
        metric: metric.name,
        value: metric.value,
        threshold: budget.threshold,
        severity: budget.severity,
        context: metric.context || {},
      });
    }
  }

  /**
   * Create performance alert
   */
  private createAlert(alertData: Omit<PerformanceAlert, 'id' | 'timestamp' | 'resolved'>): void {
    const alert: PerformanceAlert = {
      id: this.generateAlertId(),
      timestamp: Date.now(),
      resolved: false,
      ...alertData,
    };

    this.alerts.set(alert.id, alert);

    // Report to error reporting system
    errorReporting.reportPerformanceIssue(
      alert.metric,
      alert.value,
      alert.threshold,
      alert.context
    );

    // Trigger real-time notifications
    this.triggerAlertNotification(alert);
  }

  /**
   * Generate alert ID
   */
  private generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Trigger alert notification
   */
  private triggerAlertNotification(alert: PerformanceAlert): void {
    // Dispatch custom event for real-time alerts
    const event = new CustomEvent('performance-alert', {
      detail: alert,
    });
    document.dispatchEvent(event);

    // Console warning for development
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Performance Alert: ${alert.metric} (${alert.value}${alert.context.unit || ''}) exceeded threshold (${alert.threshold})`, alert);
    }
  }

  /**
   * Should sample this metric
   */
  private shouldSample(): boolean {
    return Math.random() < this.rumConfig.sampleRate;
  }

  /**
   * Send metric to external services
   */
  private async sendMetricToServices(metric: PerformanceMetric): Promise<void> {
    // Send to DataDog, New Relic, etc.
    // This is a placeholder for actual service integration
    if (process.env.NODE_ENV === 'production') {
      try {
        // Example: DataDog integration
        // await fetch('/api/metrics', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(metric),
        // });
      } catch (error) {
        console.error('Failed to send metric to external service:', error);
      }
    }
  }

  /**
   * Send business metric to analytics services
   */
  private async sendBusinessMetricToServices(metric: BusinessMetric, context?: Record<string, any>): Promise<void> {
    // Send to Google Analytics, Mixpanel, etc.
    // This is a placeholder for actual service integration
    if (process.env.NODE_ENV === 'production') {
      try {
        // Example: Google Analytics integration
        // gtag('event', metric.name, {
        //   value: metric.value,
        //   category: metric.category,
        //   ...context,
        // });
      } catch (error) {
        console.error('Failed to send business metric to analytics service:', error);
      }
    }
  }

  /**
   * Start monitoring
   */
  private startMonitoring(): void {
    // Monitor Core Web Vitals
    this.monitorCoreWebVitals();

    // Monitor resource timing
    if (this.rumConfig.trackResourceTiming) {
      this.monitorResourceTiming();
    }

    // Monitor memory usage
    this.monitorMemoryUsage();

    // Monitor network conditions
    this.monitorNetworkConditions();
  }

  /**
   * Monitor Core Web Vitals
   */
  private monitorCoreWebVitals(): void {
    // Use web-vitals library if available
    if (typeof window !== 'undefined') {
      import('web-vitals').then((webVitals) => {
        const { getCLS, getFID, getFCP, getLCP, getTTFB } = webVitals;

        getCLS((metric) => {
          this.recordMetric({
            name: 'CLS',
            value: metric.value,
            unit: 'score',
            timestamp: Date.now(),
            tags: { vital: 'cls', sessionId: this.sessionId },
            context: { id: metric.id, delta: metric.delta },
          });
        });

        getFID((metric) => {
          this.recordMetric({
            name: 'FID',
            value: metric.value,
            unit: 'ms',
            timestamp: Date.now(),
            tags: { vital: 'fid', sessionId: this.sessionId },
            context: { id: metric.id, delta: metric.delta },
          });
        });

        getFCP((metric) => {
          this.recordMetric({
            name: 'FCP',
            value: metric.value,
            unit: 'ms',
            timestamp: Date.now(),
            tags: { vital: 'fcp', sessionId: this.sessionId },
            context: { id: metric.id, delta: metric.delta },
          });
        });

        getLCP((metric) => {
          this.recordMetric({
            name: 'LCP',
            value: metric.value,
            unit: 'ms',
            timestamp: Date.now(),
            tags: { vital: 'lcp', sessionId: this.sessionId },
            context: { id: metric.id, delta: metric.delta },
          });
        });

        getTTFB((metric) => {
          this.recordMetric({
            name: 'TTFB',
            value: metric.value,
            unit: 'ms',
            timestamp: Date.now(),
            tags: { vital: 'ttfb', sessionId: this.sessionId },
            context: { id: metric.id, delta: metric.delta },
          });
        });
      }).catch(() => {
        console.warn('web-vitals library not available');
      });
    }
  }

  /**
   * Monitor resource timing
   */
  private monitorResourceTiming(): void {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const resourceEntry = entry as PerformanceResourceTiming;

        this.recordMetric({
          name: 'resource-timing',
          value: resourceEntry.responseEnd - resourceEntry.requestStart,
          unit: 'ms',
          timestamp: Date.now(),
          tags: {
            resource: resourceEntry.name,
            type: resourceEntry.initiatorType,
            sessionId: this.sessionId,
          },
          context: {
            transferSize: resourceEntry.transferSize,
            encodedBodySize: resourceEntry.encodedBodySize,
            decodedBodySize: resourceEntry.decodedBodySize,
          },
        });
      });
    });

    try {
      observer.observe({ entryTypes: ['resource'] });
    } catch (e) {
      console.warn('Resource timing observer not supported:', e);
    }
  }

  /**
   * Monitor memory usage
   */
  private monitorMemoryUsage(): void {
    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;

        this.recordMetric({
          name: 'memory-usage',
          value: memory.usedJSHeapSize / (1024 * 1024), // Convert to MB
          unit: 'MB',
          timestamp: Date.now(),
          tags: { type: 'heap', sessionId: this.sessionId },
          context: {
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit,
          },
        });
      }
    };

    // Check memory every 30 seconds
    setInterval(checkMemory, 30000);
    checkMemory(); // Initial check
  }

  /**
   * Monitor network conditions
   */
  private monitorNetworkConditions(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;

      const recordNetworkMetric = () => {
        this.recordMetric({
          name: 'network-conditions',
          value: connection.downlink,
          unit: 'mbps',
          timestamp: Date.now(),
          tags: {
            effectiveType: connection.effectiveType,
            type: connection.type,
            sessionId: this.sessionId,
          },
          context: {
            rtt: connection.rtt,
            saveData: connection.saveData,
          },
        });
      };

      // Record initial network conditions
      recordNetworkMetric();

      // Listen for network changes
      connection.addEventListener('change', recordNetworkMetric);
    }
  }

  /**
   * Public API methods
   */

  /**
   * Set user ID for tracking
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Track custom metric
   */
  trackCustomMetric(name: string, value: number, unit: string, tags: Record<string, string> = {}): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags: { ...tags, sessionId: this.sessionId, custom: 'true' },
      context: { userId: this.userId },
    };

    this.recordMetric(metric);
  }

  /**
   * Track business event
   */
  trackBusinessEvent(name: string, category: BusinessMetric['category'], value = 1, unit = 'count'): void {
    const metric: BusinessMetric = {
      name,
      value,
      unit,
      category,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.recordBusinessMetric(metric);
  }

  /**
   * Add performance budget
   */
  addBudget(metric: string, threshold: number, unit: string, severity: 'warning' | 'error' = 'warning'): void {
    const budget: PerformanceBudget = {
      metric,
      threshold,
      unit,
      severity,
      enabled: true,
    };

    this.budgets.set(metric, budget);
  }

  /**
   * Remove performance budget
   */
  removeBudget(metric: string): void {
    this.budgets.delete(metric);
  }

  /**
   * Get performance metrics
   */
  getMetrics(metricName?: string): PerformanceMetric[] {
    if (metricName) {
      return this.metrics.get(metricName) || [];
    }

    const allMetrics: PerformanceMetric[] = [];
    this.metrics.forEach(metrics => allMetrics.push(...metrics));
    return allMetrics;
  }

  /**
   * Get business metrics
   */
  getBusinessMetrics(metricName?: string): BusinessMetric[] {
    if (metricName) {
      return this.businessMetrics.get(metricName) || [];
    }

    const allMetrics: BusinessMetric[] = [];
    this.businessMetrics.forEach(metrics => allMetrics.push(...metrics));
    return allMetrics;
  }

  /**
   * Get performance alerts
   */
  getAlerts(resolved = false): PerformanceAlert[] {
    return Array.from(this.alerts.values()).filter(alert => alert.resolved === resolved);
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    coreWebVitals: Record<string, number>;
    customMetrics: Record<string, number>;
    businessMetrics: Record<string, number>;
    alerts: { total: number; unresolved: number };
    budgetViolations: number;
  } {
    const coreWebVitals: Record<string, number> = {};
    const customMetrics: Record<string, number> = {};
    const businessMetrics: Record<string, number> = {};

    // Calculate averages for core web vitals
    ['LCP', 'FID', 'CLS', 'FCP', 'TTFB'].forEach(vital => {
      const metrics = this.getMetrics(vital);
      if (metrics.length > 0) {
        coreWebVitals[vital] = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
      }
    });

    // Calculate averages for custom metrics
    this.metrics.forEach((metrics, name) => {
      if (!['LCP', 'FID', 'CLS', 'FCP', 'TTFB'].includes(name)) {
        customMetrics[name] = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
      }
    });

    // Calculate business metrics
    this.businessMetrics.forEach((metrics, name) => {
      businessMetrics[name] = metrics.reduce((sum, m) => sum + m.value, 0);
    });

    const allAlerts = Array.from(this.alerts.values());
    const unresolvedAlerts = allAlerts.filter(alert => !alert.resolved);

    return {
      coreWebVitals,
      customMetrics,
      businessMetrics,
      alerts: {
        total: allAlerts.length,
        unresolved: unresolvedAlerts.length,
      },
      budgetViolations: unresolvedAlerts.length,
    };
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): {
    performance: PerformanceMetric[];
    business: BusinessMetric[];
    alerts: PerformanceAlert[];
    session: string;
    timestamp: number;
  } {
    return {
      performance: this.getMetrics(),
      business: this.getBusinessMetrics(),
      alerts: Array.from(this.alerts.values()),
      session: this.sessionId,
      timestamp: Date.now(),
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
    this.businessMetrics.clear();
    this.alerts.clear();
  }

  /**
   * Update RUM configuration
   */
  updateRUMConfig(config: Partial<RUMConfig>): void {
    this.rumConfig = { ...this.rumConfig, ...config };
    localStorage.setItem('rum-config', JSON.stringify(this.rumConfig));

    // Restart observers if needed
    if (config.enabled !== undefined) {
      if (config.enabled) {
        this.setupPerformanceObservers();
      } else {
        this.stopMonitoring();
      }
    }
  }

  /**
   * Stop monitoring
   */
  private stopMonitoring(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    if (this.longTaskObserver) {
      this.longTaskObserver.disconnect();
    }
    if (this.layoutShiftObserver) {
      this.layoutShiftObserver.disconnect();
    }
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.stopMonitoring();
    this.clearMetrics();
  }
}

// Export singleton instance
export const advancedPerformanceMonitoring = new AdvancedPerformanceMonitoring();

// Export utility functions
export const trackCustomMetric = (name: string, value: number, unit: string, tags?: Record<string, string>) =>
  advancedPerformanceMonitoring.trackCustomMetric(name, value, unit, tags);

export const trackBusinessEvent = (name: string, category: BusinessMetric['category'], value?: number, unit?: string) =>
  advancedPerformanceMonitoring.trackBusinessEvent(name, category, value, unit);

export const addPerformanceBudget = (metric: string, threshold: number, unit: string, severity?: 'warning' | 'error') =>
  advancedPerformanceMonitoring.addBudget(metric, threshold, unit, severity);

export const getPerformanceSummary = () =>
  advancedPerformanceMonitoring.getPerformanceSummary();

export const exportPerformanceMetrics = () =>
  advancedPerformanceMonitoring.exportMetrics();

export const setUserId = (userId: string) =>
  advancedPerformanceMonitoring.setUserId(userId);
