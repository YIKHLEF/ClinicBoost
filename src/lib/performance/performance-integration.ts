/**
 * Performance Monitoring Integration
 * 
 * This module integrates all performance monitoring components:
 * - Advanced monitoring with real-time alerts
 * - Regression detection with automated baselines
 * - Mobile network optimization
 * - Advanced caching strategies
 * - Performance dashboard integration
 */

import { logger } from '../logging-monitoring';
import { advancedPerformanceMonitoring, trackCustomMetric } from './advanced-monitoring';
import { realTimeAlerts } from './real-time-alerts';
import { regressionDetector } from './regression-detection';
import { performanceOptimizer } from '../mobile/performance-optimizer';
import { mobileCacheManager } from './mobile-cache-strategies';

export interface PerformanceIntegrationConfig {
  enabled: boolean;
  modules: {
    advancedMonitoring: boolean;
    realTimeAlerts: boolean;
    regressionDetection: boolean;
    mobileOptimization: boolean;
    advancedCaching: boolean;
  };
  reporting: {
    interval: number; // milliseconds
    enableDashboard: boolean;
    enableExternalReporting: boolean;
  };
  thresholds: {
    criticalPerformance: number;
    regressionSensitivity: number;
    alertCooldown: number;
  };
}

class PerformanceIntegrationManager {
  private config: PerformanceIntegrationConfig;
  private isInitialized = false;
  private reportingInterval: NodeJS.Timeout | null = null;
  private performanceObserver: PerformanceObserver | null = null;

  constructor(config: PerformanceIntegrationConfig) {
    this.config = config;
  }

  /**
   * Initialize integrated performance monitoring
   */
  async initialize(): Promise<void> {
    if (this.isInitialized || !this.config.enabled) {
      return;
    }

    try {
      logger.info('Initializing integrated performance monitoring', 'performance-integration');

      // Initialize core monitoring
      if (this.config.modules.advancedMonitoring) {
        await this.initializeAdvancedMonitoring();
      }

      // Initialize real-time alerts
      if (this.config.modules.realTimeAlerts) {
        await this.initializeRealTimeAlerts();
      }

      // Initialize regression detection
      if (this.config.modules.regressionDetection) {
        await this.initializeRegressionDetection();
      }

      // Initialize mobile optimization
      if (this.config.modules.mobileOptimization) {
        await this.initializeMobileOptimization();
      }

      // Initialize advanced caching
      if (this.config.modules.advancedCaching) {
        await this.initializeAdvancedCaching();
      }

      // Setup integrated reporting
      this.setupIntegratedReporting();

      // Setup performance observers
      this.setupPerformanceObservers();

      // Setup event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      logger.info('Performance monitoring integration initialized successfully', 'performance-integration');

    } catch (error) {
      logger.error('Failed to initialize performance monitoring integration', 'performance-integration', { error });
      throw error;
    }
  }

  /**
   * Initialize advanced monitoring
   */
  private async initializeAdvancedMonitoring(): Promise<void> {
    // Advanced monitoring is already initialized via singleton
    logger.debug('Advanced monitoring initialized', 'performance-integration');
  }

  /**
   * Initialize real-time alerts
   */
  private async initializeRealTimeAlerts(): Promise<void> {
    // Real-time alerts are already initialized via singleton
    logger.debug('Real-time alerts initialized', 'performance-integration');
  }

  /**
   * Initialize regression detection
   */
  private async initializeRegressionDetection(): Promise<void> {
    // Regression detector is already initialized via singleton
    logger.debug('Regression detection initialized', 'performance-integration');
  }

  /**
   * Initialize mobile optimization
   */
  private async initializeMobileOptimization(): Promise<void> {
    // Mobile optimizer is already initialized via singleton
    logger.debug('Mobile optimization initialized', 'performance-integration');
  }

  /**
   * Initialize advanced caching
   */
  private async initializeAdvancedCaching(): Promise<void> {
    // Mobile cache manager is already initialized via singleton
    logger.debug('Advanced caching initialized', 'performance-integration');
  }

  /**
   * Setup integrated reporting
   */
  private setupIntegratedReporting(): void {
    if (!this.config.reporting.enableDashboard) return;

    this.reportingInterval = setInterval(() => {
      this.generateIntegratedReport();
    }, this.config.reporting.interval);
  }

  /**
   * Setup performance observers
   */
  private setupPerformanceObservers(): void {
    if (!('PerformanceObserver' in window)) return;

    this.performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => this.processPerformanceEntry(entry));
    });

    try {
      this.performanceObserver.observe({
        entryTypes: ['navigation', 'paint', 'largest-contentful-paint', 'first-input', 'layout-shift']
      });
    } catch (error) {
      logger.warn('Some performance entry types not supported', 'performance-integration', { error });
    }
  }

  /**
   * Process performance entry
   */
  private processPerformanceEntry(entry: PerformanceEntry): void {
    const context = {
      environment: process.env.NODE_ENV || 'development',
      userAgent: navigator.userAgent,
      timestamp: Date.now()
    };

    // Send to all monitoring systems
    if (entry.entryType === 'largest-contentful-paint') {
      trackCustomMetric('LCP', entry.startTime, 'ms', context);
    } else if (entry.entryType === 'first-input') {
      trackCustomMetric('FID', (entry as any).processingStart - entry.startTime, 'ms', context);
    } else if (entry.entryType === 'layout-shift') {
      if (!(entry as any).hadRecentInput) {
        trackCustomMetric('CLS', (entry as any).value, 'score', context);
      }
    } else if (entry.entryType === 'paint') {
      if (entry.name === 'first-contentful-paint') {
        trackCustomMetric('FCP', entry.startTime, 'ms', context);
      }
    } else if (entry.entryType === 'navigation') {
      const navEntry = entry as PerformanceNavigationTiming;
      trackCustomMetric('TTFB', navEntry.responseStart - navEntry.requestStart, 'ms', context);
      trackCustomMetric('loadTime', navEntry.loadEventEnd - navEntry.navigationStart, 'ms', context);
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for visibility changes to pause/resume monitoring
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseMonitoring();
      } else {
        this.resumeMonitoring();
      }
    });

    // Listen for network changes
    if ('connection' in navigator) {
      (navigator as any).connection.addEventListener('change', () => {
        this.handleNetworkChange();
      });
    }

    // Listen for memory pressure
    if ('memory' in performance) {
      setInterval(() => {
        this.checkMemoryPressure();
      }, 30000);
    }

    // Listen for battery changes
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        battery.addEventListener('levelchange', () => {
          this.handleBatteryChange(battery.level);
        });
      });
    }
  }

  /**
   * Generate integrated performance report
   */
  private generateIntegratedReport(): void {
    try {
      const report = {
        timestamp: Date.now(),
        monitoring: advancedPerformanceMonitoring.getPerformanceReport(),
        alerts: realTimeAlerts.getActiveAlerts(),
        regressions: regressionDetector.getRegressionHistory(5),
        mobile: performanceOptimizer.getMetrics(),
        cache: mobileCacheManager.getStats(),
        system: this.getSystemMetrics()
      };

      // Dispatch event for dashboard
      const event = new CustomEvent('integrated-performance-report', {
        detail: report
      });
      document.dispatchEvent(event);

      // Send to external reporting if enabled
      if (this.config.reporting.enableExternalReporting) {
        this.sendExternalReport(report);
      }

    } catch (error) {
      logger.error('Failed to generate integrated performance report', 'performance-integration', { error });
    }
  }

  /**
   * Get system metrics
   */
  private getSystemMetrics(): any {
    const memory = (performance as any).memory;
    const connection = (navigator as any).connection;

    return {
      memory: memory ? {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        usage: memory.usedJSHeapSize / memory.jsHeapSizeLimit
      } : null,
      network: connection ? {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      } : null,
      timing: {
        now: performance.now(),
        timeOrigin: performance.timeOrigin
      }
    };
  }

  /**
   * Send external report
   */
  private async sendExternalReport(report: any): Promise<void> {
    try {
      const endpoint = process.env.VITE_PERFORMANCE_REPORTING_ENDPOINT;
      if (!endpoint) return;

      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(report)
      });

    } catch (error) {
      logger.error('Failed to send external performance report', 'performance-integration', { error });
    }
  }

  /**
   * Handle network change
   */
  private handleNetworkChange(): void {
    const connection = (navigator as any).connection;
    if (connection) {
      logger.info('Network conditions changed', 'performance-integration', {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt
      });

      // Trigger adaptive optimizations
      this.triggerAdaptiveOptimizations();
    }
  }

  /**
   * Check memory pressure
   */
  private checkMemoryPressure(): void {
    const memory = (performance as any).memory;
    if (memory) {
      const usage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
      
      if (usage > 0.9) {
        logger.warn('High memory pressure detected', 'performance-integration', { usage });
        this.handleHighMemoryPressure();
      }
    }
  }

  /**
   * Handle battery change
   */
  private handleBatteryChange(level: number): void {
    logger.info('Battery level changed', 'performance-integration', { level });
    
    if (level < 0.2) {
      this.enableBatterySavingMode();
    } else if (level > 0.8) {
      this.disableBatterySavingMode();
    }
  }

  /**
   * Trigger adaptive optimizations
   */
  private triggerAdaptiveOptimizations(): void {
    // This would trigger optimizations across all modules
    logger.debug('Triggering adaptive optimizations', 'performance-integration');
  }

  /**
   * Handle high memory pressure
   */
  private handleHighMemoryPressure(): void {
    // Clear caches and reduce memory usage
    mobileCacheManager.clear();
    
    // Trigger garbage collection if available
    if ((window as any).gc) {
      (window as any).gc();
    }
  }

  /**
   * Enable battery saving mode
   */
  private enableBatterySavingMode(): void {
    logger.info('Enabling battery saving mode', 'performance-integration');
    
    // Reduce monitoring frequency
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
      this.reportingInterval = setInterval(() => {
        this.generateIntegratedReport();
      }, this.config.reporting.interval * 2);
    }
  }

  /**
   * Disable battery saving mode
   */
  private disableBatterySavingMode(): void {
    logger.info('Disabling battery saving mode', 'performance-integration');
    
    // Restore normal monitoring frequency
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
      this.reportingInterval = setInterval(() => {
        this.generateIntegratedReport();
      }, this.config.reporting.interval);
    }
  }

  /**
   * Pause monitoring
   */
  private pauseMonitoring(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
    }
  }

  /**
   * Resume monitoring
   */
  private resumeMonitoring(): void {
    this.setupPerformanceObservers();
    this.setupIntegratedReporting();
  }

  /**
   * Get integration status
   */
  getStatus(): any {
    return {
      initialized: this.isInitialized,
      modules: this.config.modules,
      reporting: {
        active: this.reportingInterval !== null,
        interval: this.config.reporting.interval
      }
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
    
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
      this.reportingInterval = null;
    }
    
    this.isInitialized = false;
  }
}

// Default configuration
const defaultIntegrationConfig: PerformanceIntegrationConfig = {
  enabled: true,
  modules: {
    advancedMonitoring: true,
    realTimeAlerts: true,
    regressionDetection: true,
    mobileOptimization: true,
    advancedCaching: true
  },
  reporting: {
    interval: 30000, // 30 seconds
    enableDashboard: true,
    enableExternalReporting: false
  },
  thresholds: {
    criticalPerformance: 5000, // 5 seconds
    regressionSensitivity: 0.2, // 20% change
    alertCooldown: 300000 // 5 minutes
  }
};

// Export singleton instance
export const performanceIntegration = new PerformanceIntegrationManager(defaultIntegrationConfig);

// Auto-initialize when module is loaded
if (typeof window !== 'undefined') {
  performanceIntegration.initialize().catch(error => {
    console.error('Failed to initialize performance integration:', error);
  });
}

// Export utility functions
export const getIntegrationStatus = () => performanceIntegration.getStatus();

export const initializePerformanceMonitoring = () => performanceIntegration.initialize();

export const cleanupPerformanceMonitoring = () => performanceIntegration.cleanup();
