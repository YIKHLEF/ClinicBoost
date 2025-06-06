/**
 * Automated Performance Regression Detection
 * 
 * This module provides automated detection of performance regressions by:
 * - Maintaining performance baselines
 * - Statistical analysis of performance trends
 * - Automated regression alerts
 * - Performance comparison across deployments
 */

import { logger } from '../logging-monitoring';
import { realTimeAlerts } from './real-time-alerts';

export interface PerformanceBaseline {
  id: string;
  metric: string;
  value: number;
  standardDeviation: number;
  sampleSize: number;
  timestamp: number;
  environment: string;
  version: string;
  buildId?: string;
  branch?: string;
  metadata: Record<string, any>;
}

export interface RegressionAnalysis {
  metric: string;
  currentValue: number;
  baselineValue: number;
  percentageChange: number;
  standardDeviations: number;
  isRegression: boolean;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  confidence: number;
  timestamp: number;
  environment: string;
  context: Record<string, any>;
}

export interface RegressionDetectionConfig {
  enabled: boolean;
  environments: string[];
  metrics: string[];
  thresholds: {
    minorRegression: number; // % increase
    moderateRegression: number;
    majorRegression: number;
    criticalRegression: number;
  };
  statistical: {
    minimumSamples: number;
    confidenceLevel: number; // 0.95 for 95% confidence
    standardDeviationThreshold: number; // number of std devs
  };
  baseline: {
    updateFrequency: number; // hours
    retentionDays: number;
    autoUpdate: boolean;
  };
  alerting: {
    enabled: boolean;
    severityThreshold: RegressionAnalysis['severity'];
    cooldownPeriod: number; // minutes
  };
}

class PerformanceRegressionDetector {
  private config: RegressionDetectionConfig;
  private baselines: Map<string, PerformanceBaseline> = new Map();
  private recentMetrics: Map<string, number[]> = new Map();
  private lastAnalysis: Map<string, number> = new Map();
  private regressionHistory: RegressionAnalysis[] = [];

  constructor(config: RegressionDetectionConfig) {
    this.config = config;
    this.loadBaselines();
    this.startPeriodicAnalysis();
  }

  /**
   * Load existing baselines from storage
   */
  private async loadBaselines(): Promise<void> {
    try {
      const stored = localStorage.getItem('performance-baselines');
      if (stored) {
        const baselines = JSON.parse(stored);
        baselines.forEach((baseline: PerformanceBaseline) => {
          const key = this.getBaselineKey(baseline.metric, baseline.environment);
          this.baselines.set(key, baseline);
        });
        
        logger.info('Performance baselines loaded', 'regression-detection', {
          count: this.baselines.size
        });
      }
    } catch (error) {
      logger.error('Failed to load performance baselines', 'regression-detection', { error });
    }
  }

  /**
   * Save baselines to storage
   */
  private async saveBaselines(): Promise<void> {
    try {
      const baselines = Array.from(this.baselines.values());
      localStorage.setItem('performance-baselines', JSON.stringify(baselines));
    } catch (error) {
      logger.error('Failed to save performance baselines', 'regression-detection', { error });
    }
  }

  /**
   * Start periodic analysis
   */
  private startPeriodicAnalysis(): void {
    if (!this.config.enabled) return;

    // Run analysis every 5 minutes
    setInterval(() => {
      this.runRegressionAnalysis();
    }, 5 * 60 * 1000);

    // Update baselines periodically
    if (this.config.baseline.autoUpdate) {
      setInterval(() => {
        this.updateBaselines();
      }, this.config.baseline.updateFrequency * 60 * 60 * 1000);
    }
  }

  /**
   * Record performance metric for analysis
   */
  recordMetric(
    metric: string,
    value: number,
    environment: string = 'production',
    context: Record<string, any> = {}
  ): void {
    if (!this.config.enabled || !this.config.metrics.includes(metric)) {
      return;
    }

    const key = `${metric}-${environment}`;
    
    // Store recent metrics for trend analysis
    if (!this.recentMetrics.has(key)) {
      this.recentMetrics.set(key, []);
    }
    
    const metrics = this.recentMetrics.get(key)!;
    metrics.push(value);
    
    // Keep only recent metrics (last 100 samples)
    if (metrics.length > 100) {
      metrics.shift();
    }

    // Check for immediate regression
    this.checkForRegression(metric, value, environment, context);
  }

  /**
   * Check for immediate regression
   */
  private checkForRegression(
    metric: string,
    value: number,
    environment: string,
    context: Record<string, any>
  ): void {
    const baselineKey = this.getBaselineKey(metric, environment);
    const baseline = this.baselines.get(baselineKey);
    
    if (!baseline) {
      // No baseline yet, record this as potential baseline
      this.recordPotentialBaseline(metric, value, environment, context);
      return;
    }

    const analysis = this.analyzeRegression(metric, value, baseline, environment, context);
    
    if (analysis.isRegression) {
      this.handleRegression(analysis);
    }
  }

  /**
   * Analyze potential regression
   */
  private analyzeRegression(
    metric: string,
    currentValue: number,
    baseline: PerformanceBaseline,
    environment: string,
    context: Record<string, any>
  ): RegressionAnalysis {
    const percentageChange = ((currentValue - baseline.value) / baseline.value) * 100;
    const standardDeviations = Math.abs(currentValue - baseline.value) / baseline.standardDeviation;
    
    // Determine if this is a regression (performance degradation)
    const isRegression = this.isPerformanceRegression(metric, percentageChange, standardDeviations);
    
    // Determine severity
    const severity = this.calculateSeverity(percentageChange);
    
    // Calculate confidence based on statistical significance
    const confidence = this.calculateConfidence(standardDeviations, baseline.sampleSize);

    return {
      metric,
      currentValue,
      baselineValue: baseline.value,
      percentageChange,
      standardDeviations,
      isRegression,
      severity,
      confidence,
      timestamp: Date.now(),
      environment,
      context
    };
  }

  /**
   * Determine if change represents a performance regression
   */
  private isPerformanceRegression(metric: string, percentageChange: number, standardDeviations: number): boolean {
    // For metrics where higher is worse (like load times, FCP, LCP, FID)
    const higherIsWorse = ['LCP', 'FCP', 'FID', 'TTFB', 'loadTime', 'responseTime'].includes(metric);
    
    // For metrics where lower is worse (like FPS, cache hit rate)
    const lowerIsWorse = ['FPS', 'cacheHitRate', 'successRate'].includes(metric);
    
    const significantChange = standardDeviations >= this.config.statistical.standardDeviationThreshold;
    const minThreshold = this.config.thresholds.minorRegression;
    
    if (higherIsWorse) {
      return significantChange && percentageChange > minThreshold;
    } else if (lowerIsWorse) {
      return significantChange && percentageChange < -minThreshold;
    }
    
    // Default: assume higher is worse
    return significantChange && percentageChange > minThreshold;
  }

  /**
   * Calculate regression severity
   */
  private calculateSeverity(percentageChange: number): RegressionAnalysis['severity'] {
    const absChange = Math.abs(percentageChange);
    
    if (absChange >= this.config.thresholds.criticalRegression) {
      return 'critical';
    } else if (absChange >= this.config.thresholds.majorRegression) {
      return 'major';
    } else if (absChange >= this.config.thresholds.moderateRegression) {
      return 'moderate';
    } else {
      return 'minor';
    }
  }

  /**
   * Calculate confidence level
   */
  private calculateConfidence(standardDeviations: number, sampleSize: number): number {
    // Simple confidence calculation based on standard deviations and sample size
    const baseConfidence = Math.min(standardDeviations / 3, 1); // Max confidence at 3 std devs
    const sampleConfidence = Math.min(sampleSize / this.config.statistical.minimumSamples, 1);
    
    return Math.min(baseConfidence * sampleConfidence, 0.99);
  }

  /**
   * Handle detected regression
   */
  private handleRegression(analysis: RegressionAnalysis): void {
    // Check cooldown period
    const cooldownKey = `${analysis.metric}-${analysis.environment}`;
    const lastAlert = this.lastAnalysis.get(cooldownKey);
    const now = Date.now();
    
    if (lastAlert && (now - lastAlert) < (this.config.alerting.cooldownPeriod * 60 * 1000)) {
      return;
    }

    // Store regression analysis
    this.regressionHistory.push(analysis);
    this.lastAnalysis.set(cooldownKey, now);

    logger.warn('Performance regression detected', 'regression-detection', {
      metric: analysis.metric,
      percentageChange: analysis.percentageChange,
      severity: analysis.severity,
      confidence: analysis.confidence,
      environment: analysis.environment
    });

    // Send alert if enabled and meets severity threshold
    if (this.config.alerting.enabled && this.meetsSeverityThreshold(analysis.severity)) {
      this.sendRegressionAlert(analysis);
    }

    // Dispatch event for dashboard
    const event = new CustomEvent('performance-regression-detected', {
      detail: analysis
    });
    document.dispatchEvent(event);
  }

  /**
   * Check if severity meets threshold
   */
  private meetsSeverityThreshold(severity: RegressionAnalysis['severity']): boolean {
    const severityLevels = ['minor', 'moderate', 'major', 'critical'];
    const currentLevel = severityLevels.indexOf(severity);
    const thresholdLevel = severityLevels.indexOf(this.config.alerting.severityThreshold);
    
    return currentLevel >= thresholdLevel;
  }

  /**
   * Send regression alert
   */
  private sendRegressionAlert(analysis: RegressionAnalysis): void {
    realTimeAlerts.checkMetricAgainstRules(
      `regression-${analysis.metric}`,
      analysis.percentageChange,
      {
        type: 'regression',
        baseline: analysis.baselineValue,
        current: analysis.currentValue,
        severity: analysis.severity,
        confidence: analysis.confidence,
        environment: analysis.environment,
        ...analysis.context
      }
    );
  }

  /**
   * Record potential baseline
   */
  private recordPotentialBaseline(
    metric: string,
    value: number,
    environment: string,
    context: Record<string, any>
  ): void {
    const key = `${metric}-${environment}`;
    
    if (!this.recentMetrics.has(key)) {
      this.recentMetrics.set(key, []);
    }
    
    const metrics = this.recentMetrics.get(key)!;
    
    // Create baseline when we have enough samples
    if (metrics.length >= this.config.statistical.minimumSamples) {
      this.createBaseline(metric, metrics, environment, context);
    }
  }

  /**
   * Create performance baseline
   */
  private createBaseline(
    metric: string,
    values: number[],
    environment: string,
    context: Record<string, any>
  ): void {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);

    const baseline: PerformanceBaseline = {
      id: this.generateBaselineId(),
      metric,
      value: mean,
      standardDeviation,
      sampleSize: values.length,
      timestamp: Date.now(),
      environment,
      version: context.version || 'unknown',
      buildId: context.buildId,
      branch: context.branch,
      metadata: context
    };

    const key = this.getBaselineKey(metric, environment);
    this.baselines.set(key, baseline);
    this.saveBaselines();

    logger.info('Performance baseline created', 'regression-detection', {
      metric,
      environment,
      value: mean,
      standardDeviation,
      sampleSize: values.length
    });
  }

  /**
   * Update baselines with recent data
   */
  private updateBaselines(): void {
    this.recentMetrics.forEach((values, key) => {
      if (values.length >= this.config.statistical.minimumSamples) {
        const [metric, environment] = key.split('-');
        this.createBaseline(metric, values, environment, {});
        
        // Clear recent metrics after baseline update
        this.recentMetrics.set(key, []);
      }
    });
  }

  /**
   * Run comprehensive regression analysis
   */
  private runRegressionAnalysis(): void {
    // Analyze trends for each metric
    this.recentMetrics.forEach((values, key) => {
      if (values.length >= 10) { // Minimum for trend analysis
        const [metric, environment] = key.split('-');
        this.analyzeTrend(metric, values, environment);
      }
    });
  }

  /**
   * Analyze performance trend
   */
  private analyzeTrend(metric: string, values: number[], environment: string): void {
    if (values.length < 10) return;

    // Simple linear regression to detect trends
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    // Check if trend indicates degradation
    const isNegativeTrend = this.isNegativeTrend(metric, slope);
    
    if (isNegativeTrend && Math.abs(slope) > 0.1) { // Significant trend
      logger.warn('Performance trend degradation detected', 'regression-detection', {
        metric,
        environment,
        slope,
        recentValues: values.slice(-5)
      });
    }
  }

  /**
   * Determine if trend represents degradation
   */
  private isNegativeTrend(metric: string, slope: number): boolean {
    // For metrics where higher is worse
    const higherIsWorse = ['LCP', 'FCP', 'FID', 'TTFB', 'loadTime', 'responseTime'].includes(metric);
    
    if (higherIsWorse) {
      return slope > 0; // Increasing trend is bad
    } else {
      return slope < 0; // Decreasing trend is bad
    }
  }

  /**
   * Get baseline key
   */
  private getBaselineKey(metric: string, environment: string): string {
    return `${metric}-${environment}`;
  }

  /**
   * Generate baseline ID
   */
  private generateBaselineId(): string {
    return `baseline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get regression history
   */
  getRegressionHistory(limit?: number): RegressionAnalysis[] {
    const sorted = this.regressionHistory
      .sort((a, b) => b.timestamp - a.timestamp);
    
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Get current baselines
   */
  getBaselines(): PerformanceBaseline[] {
    return Array.from(this.baselines.values());
  }

  /**
   * Force baseline update
   */
  forceBaselineUpdate(metric: string, environment: string): void {
    const key = `${metric}-${environment}`;
    const values = this.recentMetrics.get(key);
    
    if (values && values.length >= this.config.statistical.minimumSamples) {
      this.createBaseline(metric, values, environment, {});
    }
  }

  /**
   * Clear regression history
   */
  clearHistory(): void {
    this.regressionHistory = [];
  }
}

// Default configuration
const defaultRegressionConfig: RegressionDetectionConfig = {
  enabled: true,
  environments: ['production', 'staging'],
  metrics: ['LCP', 'FCP', 'FID', 'CLS', 'TTFB', 'loadTime', 'cacheHitRate'],
  thresholds: {
    minorRegression: 10,      // 10% increase
    moderateRegression: 25,   // 25% increase
    majorRegression: 50,      // 50% increase
    criticalRegression: 100   // 100% increase
  },
  statistical: {
    minimumSamples: 30,
    confidenceLevel: 0.95,
    standardDeviationThreshold: 2
  },
  baseline: {
    updateFrequency: 24, // hours
    retentionDays: 90,
    autoUpdate: true
  },
  alerting: {
    enabled: true,
    severityThreshold: 'moderate',
    cooldownPeriod: 30 // minutes
  }
};

// Export singleton instance
export const regressionDetector = new PerformanceRegressionDetector(defaultRegressionConfig);

// Export utility functions
export const recordMetric = (metric: string, value: number, environment?: string, context?: Record<string, any>) =>
  regressionDetector.recordMetric(metric, value, environment, context);

export const getRegressionHistory = (limit?: number) => regressionDetector.getRegressionHistory(limit);

export const getBaselines = () => regressionDetector.getBaselines();

export const forceBaselineUpdate = (metric: string, environment: string) =>
  regressionDetector.forceBaselineUpdate(metric, environment);
