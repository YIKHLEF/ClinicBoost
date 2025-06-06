/**
 * Comprehensive Accessibility & Performance Dashboard
 * 
 * This component provides a unified dashboard for monitoring and managing
 * accessibility features and performance metrics in the clinic management system.
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  Activity, 
  Accessibility, 
  Eye, 
  Keyboard, 
  Monitor, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  Settings,
  Download,
  RefreshCw
} from 'lucide-react';

// Import accessibility and performance modules
import { advancedKeyboardNavigation } from '../../lib/accessibility/advanced-keyboard-navigation';
import { screenReaderOptimization } from '../../lib/accessibility/screen-reader-optimization';
import { enhancedHighContrast } from '../../lib/accessibility/enhanced-high-contrast';
import { advancedFocusManagement } from '../../lib/accessibility/advanced-focus-management';
import { advancedPerformanceMonitoring, getPerformanceSummary } from '../../lib/performance/advanced-monitoring';

interface AccessibilityStatus {
  keyboardNavigation: boolean;
  screenReaderOptimization: boolean;
  highContrastMode: boolean;
  focusManagement: boolean;
  ariaCompliance: number;
}

interface PerformanceStatus {
  coreWebVitals: {
    lcp: number;
    fid: number;
    cls: number;
    fcp: number;
    ttfb: number;
  };
  budgetViolations: number;
  activeAlerts: number;
  overallScore: number;
}

export const AccessibilityPerformanceDashboard: React.FC = () => {
  const [accessibilityStatus, setAccessibilityStatus] = useState<AccessibilityStatus>({
    keyboardNavigation: true,
    screenReaderOptimization: true,
    highContrastMode: false,
    focusManagement: true,
    ariaCompliance: 95,
  });

  const [performanceStatus, setPerformanceStatus] = useState<PerformanceStatus>({
    coreWebVitals: {
      lcp: 0,
      fid: 0,
      cls: 0,
      fcp: 0,
      ttfb: 0,
    },
    budgetViolations: 0,
    activeAlerts: 0,
    overallScore: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadDashboardData();
    
    // Set up real-time updates
    const interval = setInterval(loadDashboardData, 30000); // Update every 30 seconds
    
    // Listen for performance alerts
    document.addEventListener('performance-alert', handlePerformanceAlert);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('performance-alert', handlePerformanceAlert);
    };
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    
    try {
      // Load accessibility status
      const highContrastSettings = enhancedHighContrast.getSettings();
      const activeModals = advancedFocusManagement.getActiveModals();
      const activeToasts = advancedFocusManagement.getActiveToasts();
      
      setAccessibilityStatus({
        keyboardNavigation: true, // Always enabled
        screenReaderOptimization: true, // Always enabled
        highContrastMode: highContrastSettings.enabled,
        focusManagement: activeModals.length > 0 || activeToasts.size > 0,
        ariaCompliance: calculateAriaCompliance(),
      });

      // Load performance status
      const performanceSummary = getPerformanceSummary();
      const alerts = advancedPerformanceMonitoring.getAlerts(false); // Unresolved alerts
      
      setPerformanceStatus({
        coreWebVitals: {
          lcp: performanceSummary.coreWebVitals.LCP || 0,
          fid: performanceSummary.coreWebVitals.FID || 0,
          cls: performanceSummary.coreWebVitals.CLS || 0,
          fcp: performanceSummary.coreWebVitals.FCP || 0,
          ttfb: performanceSummary.coreWebVitals.TTFB || 0,
        },
        budgetViolations: performanceSummary.budgetViolations,
        activeAlerts: alerts.length,
        overallScore: calculateOverallPerformanceScore(performanceSummary.coreWebVitals),
      });

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePerformanceAlert = (event: any) => {
    const alert = event.detail;
    console.log('Performance alert received:', alert);
    
    // Update alert count
    setPerformanceStatus(prev => ({
      ...prev,
      activeAlerts: prev.activeAlerts + 1,
    }));
  };

  const calculateAriaCompliance = (): number => {
    // Simple ARIA compliance calculation
    const elements = document.querySelectorAll('*');
    let compliantElements = 0;
    let totalInteractiveElements = 0;

    elements.forEach(element => {
      if (element.matches('button, a, input, select, textarea, [role], [tabindex]')) {
        totalInteractiveElements++;
        
        // Check for basic ARIA compliance
        if (
          element.hasAttribute('aria-label') ||
          element.hasAttribute('aria-labelledby') ||
          element.hasAttribute('aria-describedby') ||
          element.textContent?.trim()
        ) {
          compliantElements++;
        }
      }
    });

    return totalInteractiveElements > 0 ? Math.round((compliantElements / totalInteractiveElements) * 100) : 100;
  };

  const calculateOverallPerformanceScore = (vitals: Record<string, number>): number => {
    const scores = {
      lcp: vitals.LCP <= 2500 ? 100 : vitals.LCP <= 4000 ? 50 : 0,
      fid: vitals.FID <= 100 ? 100 : vitals.FID <= 300 ? 50 : 0,
      cls: vitals.CLS <= 0.1 ? 100 : vitals.CLS <= 0.25 ? 50 : 0,
      fcp: vitals.FCP <= 1800 ? 100 : vitals.FCP <= 3000 ? 50 : 0,
      ttfb: vitals.TTFB <= 600 ? 100 : vitals.TTFB <= 1000 ? 50 : 0,
    };

    const validScores = Object.values(scores).filter(score => score > 0);
    return validScores.length > 0 ? Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length) : 0;
  };

  const toggleHighContrast = () => {
    enhancedHighContrast.toggleHighContrast();
    setAccessibilityStatus(prev => ({
      ...prev,
      highContrastMode: !prev.highContrastMode,
    }));
  };

  const exportMetrics = () => {
    const data = advancedPerformanceMonitoring.exportMetrics();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (value: number, thresholds: { good: number; fair: number }) => {
    if (value <= thresholds.good) return 'text-green-600';
    if (value <= thresholds.fair) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Accessibility & Performance Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor and manage accessibility features and performance metrics
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboardData}
            disabled={isLoading}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={exportMetrics}
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Last updated: {lastUpdated.toLocaleTimeString()}
      </div>

      {/* Accessibility Status */}
      <Card>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <Accessibility className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Accessibility Status
            </h2>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Keyboard Navigation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Keyboard className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Keyboard Navigation</span>
              </div>
              <Badge variant={accessibilityStatus.keyboardNavigation ? 'success' : 'destructive'}>
                {accessibilityStatus.keyboardNavigation ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            {/* Screen Reader */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Eye className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Screen Reader</span>
              </div>
              <Badge variant={accessibilityStatus.screenReaderOptimization ? 'success' : 'destructive'}>
                {accessibilityStatus.screenReaderOptimization ? 'Optimized' : 'Basic'}
              </Badge>
            </div>

            {/* High Contrast */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Monitor className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">High Contrast</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleHighContrast}
                className="h-6 px-2 text-xs"
              >
                {accessibilityStatus.highContrastMode ? 'Disable' : 'Enable'}
              </Button>
            </div>

            {/* ARIA Compliance */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">ARIA Compliance</span>
              </div>
              <span className={`text-sm font-medium ${getScoreColor(accessibilityStatus.ariaCompliance)}`}>
                {accessibilityStatus.ariaCompliance}%
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Performance Status */}
      <Card>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-600" />
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Performance Status
              </h2>
            </div>
            
            <div className="flex items-center space-x-4">
              {performanceStatus.activeAlerts > 0 && (
                <div className="flex items-center space-x-1 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">{performanceStatus.activeAlerts} alerts</span>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-gray-500" />
                <span className={`text-sm font-medium ${getScoreColor(performanceStatus.overallScore)}`}>
                  Score: {performanceStatus.overallScore}/100
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {/* Core Web Vitals */}
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {Math.round(performanceStatus.coreWebVitals.lcp)}ms
              </div>
              <div className="text-sm text-gray-500">LCP</div>
              <div className={`text-xs ${getStatusColor(performanceStatus.coreWebVitals.lcp, { good: 2500, fair: 4000 })}`}>
                {performanceStatus.coreWebVitals.lcp <= 2500 ? 'Good' : 
                 performanceStatus.coreWebVitals.lcp <= 4000 ? 'Needs Improvement' : 'Poor'}
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {Math.round(performanceStatus.coreWebVitals.fid)}ms
              </div>
              <div className="text-sm text-gray-500">FID</div>
              <div className={`text-xs ${getStatusColor(performanceStatus.coreWebVitals.fid, { good: 100, fair: 300 })}`}>
                {performanceStatus.coreWebVitals.fid <= 100 ? 'Good' : 
                 performanceStatus.coreWebVitals.fid <= 300 ? 'Needs Improvement' : 'Poor'}
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {performanceStatus.coreWebVitals.cls.toFixed(3)}
              </div>
              <div className="text-sm text-gray-500">CLS</div>
              <div className={`text-xs ${getStatusColor(performanceStatus.coreWebVitals.cls, { good: 0.1, fair: 0.25 })}`}>
                {performanceStatus.coreWebVitals.cls <= 0.1 ? 'Good' : 
                 performanceStatus.coreWebVitals.cls <= 0.25 ? 'Needs Improvement' : 'Poor'}
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {Math.round(performanceStatus.coreWebVitals.fcp)}ms
              </div>
              <div className="text-sm text-gray-500">FCP</div>
              <div className={`text-xs ${getStatusColor(performanceStatus.coreWebVitals.fcp, { good: 1800, fair: 3000 })}`}>
                {performanceStatus.coreWebVitals.fcp <= 1800 ? 'Good' : 
                 performanceStatus.coreWebVitals.fcp <= 3000 ? 'Needs Improvement' : 'Poor'}
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {Math.round(performanceStatus.coreWebVitals.ttfb)}ms
              </div>
              <div className="text-sm text-gray-500">TTFB</div>
              <div className={`text-xs ${getStatusColor(performanceStatus.coreWebVitals.ttfb, { good: 600, fair: 1000 })}`}>
                {performanceStatus.coreWebVitals.ttfb <= 600 ? 'Good' : 
                 performanceStatus.coreWebVitals.ttfb <= 1000 ? 'Needs Improvement' : 'Poor'}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
