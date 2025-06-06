/**
 * Advanced Performance Dashboard
 * 
 * Comprehensive dashboard for monitoring:
 * - Real-time performance metrics
 * - Performance alerts and regressions
 * - Mobile optimization status
 * - Cache performance
 * - Network conditions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Progress } from '../ui/Progress';
import { 
  Activity, 
  Wifi, 
  Battery, 
  HardDrive, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  TrendingDown,
  Smartphone,
  Monitor,
  Zap
} from 'lucide-react';

import { advancedPerformanceMonitoring } from '../../lib/performance/advanced-monitoring';
import { realTimeAlerts, getActiveAlerts, getAlertHistory } from '../../lib/performance/real-time-alerts';
import { regressionDetector, getRegressionHistory, getBaselines } from '../../lib/performance/regression-detection';
import { performanceOptimizer } from '../../lib/mobile/performance-optimizer';
import { mobileCacheManager, getCacheStats } from '../../lib/performance/mobile-cache-strategies';

interface PerformanceMetrics {
  coreWebVitals: {
    LCP: number;
    FID: number;
    CLS: number;
    FCP: number;
    TTFB: number;
  };
  customMetrics: Record<string, number>;
  businessMetrics: Record<string, number>;
  alerts: {
    total: number;
    unresolved: number;
  };
  budgetViolations: number;
}

// Simple tabs implementation
interface TabsProps {
  defaultValue: string;
  children: React.ReactNode;
  className?: string;
}

const Tabs: React.FC<TabsProps> = ({ defaultValue, children, className }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <div className={className}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { activeTab, setActiveTab });
        }
        return child;
      })}
    </div>
  );
};

const TabsList: React.FC<{ children: React.ReactNode; activeTab?: string; setActiveTab?: (tab: string) => void }> = ({
  children, activeTab, setActiveTab
}) => (
  <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
    {React.Children.map(children, child => {
      if (React.isValidElement(child)) {
        return React.cloneElement(child, { activeTab, setActiveTab });
      }
      return child;
    })}
  </div>
);

const TabsTrigger: React.FC<{
  value: string;
  children: React.ReactNode;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}> = ({ value, children, activeTab, setActiveTab }) => (
  <button
    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
      activeTab === value
        ? 'bg-white text-blue-600 shadow-sm'
        : 'text-gray-600 hover:text-gray-900'
    }`}
    onClick={() => setActiveTab?.(value)}
  >
    {children}
  </button>
);

const TabsContent: React.FC<{
  value: string;
  children: React.ReactNode;
  activeTab?: string;
}> = ({ value, children, activeTab }) => {
  if (activeTab !== value) return null;
  return <div>{children}</div>;
};

export const AdvancedPerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [regressions, setRegressions] = useState<any[]>([]);
  const [baselines, setBaselines] = useState<any[]>([]);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [mobileMetrics, setMobileMetrics] = useState<any>(null);
  const [isMonitoring, setIsMonitoring] = useState(true);

  /**
   * Load performance data
   */
  const loadPerformanceData = useCallback(async () => {
    try {
      // Get core metrics
      const performanceMetrics = advancedPerformanceMonitoring.getPerformanceReport();
      setMetrics(performanceMetrics);

      // Get alerts
      const alerts = getActiveAlerts();
      setActiveAlerts(alerts);

      // Get regressions
      const regressionHistory = getRegressionHistory(10);
      setRegressions(regressionHistory);

      // Get baselines
      const currentBaselines = getBaselines();
      setBaselines(currentBaselines);

      // Get cache stats
      const stats = getCacheStats();
      setCacheStats(stats);

      // Get mobile metrics
      const mobilePerf = performanceOptimizer.getMetrics();
      setMobileMetrics(mobilePerf);

    } catch (error) {
      console.error('Failed to load performance data:', error);
    }
  }, []);

  /**
   * Handle alert resolution
   */
  const handleResolveAlert = useCallback((alertId: string) => {
    realTimeAlerts.resolveAlert(alertId, 'dashboard-user');
    loadPerformanceData();
  }, [loadPerformanceData]);

  /**
   * Toggle monitoring
   */
  const toggleMonitoring = useCallback(() => {
    setIsMonitoring(prev => !prev);
    // Implementation would start/stop monitoring
  }, []);

  // Load data on mount and set up refresh interval
  useEffect(() => {
    loadPerformanceData();
    
    const interval = setInterval(loadPerformanceData, 5000); // Refresh every 5 seconds
    
    return () => clearInterval(interval);
  }, [loadPerformanceData]);

  // Listen for real-time events
  useEffect(() => {
    const handlePerformanceAlert = (event: CustomEvent) => {
      setActiveAlerts(prev => [...prev, event.detail]);
    };

    const handleRegressionDetected = (event: CustomEvent) => {
      setRegressions(prev => [event.detail, ...prev.slice(0, 9)]);
    };

    document.addEventListener('performance-alert-created', handlePerformanceAlert as EventListener);
    document.addEventListener('performance-regression-detected', handleRegressionDetected as EventListener);

    return () => {
      document.removeEventListener('performance-alert-created', handlePerformanceAlert as EventListener);
      document.removeEventListener('performance-regression-detected', handleRegressionDetected as EventListener);
    };
  }, []);

  /**
   * Get severity color
   */
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  /**
   * Format metric value
   */
  const formatMetric = (value: number, unit: string) => {
    if (unit === 'ms') {
      return `${Math.round(value)}ms`;
    } else if (unit === 'score') {
      return (value * 100).toFixed(1);
    } else if (unit === '%') {
      return `${(value * 100).toFixed(1)}%`;
    }
    return value.toFixed(2);
  };

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Performance Dashboard</h2>
          <p className="text-gray-600">Real-time performance monitoring and optimization</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant={isMonitoring ? "default" : "secondary"}>
            {isMonitoring ? "Monitoring Active" : "Monitoring Paused"}
          </Badge>
          <Button onClick={toggleMonitoring} variant="outline">
            {isMonitoring ? "Pause" : "Resume"} Monitoring
          </Button>
        </div>
      </div>

      {/* Alert Summary */}
      {activeAlerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center text-red-800">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Active Performance Alerts ({activeAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeAlerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge className={getSeverityColor(alert.severity)}>
                      {alert.severity.toUpperCase()}
                    </Badge>
                    <span className="font-medium">{alert.metric}</span>
                    <span className="text-gray-600">
                      {formatMetric(alert.value, alert.context?.unit || '')} 
                      (threshold: {formatMetric(alert.threshold, alert.context?.unit || '')})
                    </span>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleResolveAlert(alert.id)}
                  >
                    Resolve
                  </Button>
                </div>
              ))}
              {activeAlerts.length > 3 && (
                <p className="text-sm text-gray-600">
                  +{activeAlerts.length - 3} more alerts
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vitals">Core Web Vitals</TabsTrigger>
          <TabsTrigger value="mobile">Mobile Performance</TabsTrigger>
          <TabsTrigger value="cache">Cache Performance</TabsTrigger>
          <TabsTrigger value="regressions">Regressions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round((metrics.coreWebVitals.LCP < 2500 ? 100 : 50) * 
                    (metrics.coreWebVitals.FID < 100 ? 1 : 0.5) * 
                    (metrics.coreWebVitals.CLS < 0.1 ? 1 : 0.5))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Based on Core Web Vitals
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {metrics.alerts.unresolved}
                </div>
                <p className="text-xs text-muted-foreground">
                  {metrics.alerts.total} total alerts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Budget Violations</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {metrics.budgetViolations}
                </div>
                <p className="text-xs text-muted-foreground">
                  Performance budget issues
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {cacheStats ? `${(cacheStats.hitRate * 100).toFixed(1)}%` : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Cache efficiency
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Core Web Vitals Tab */}
        <TabsContent value="vitals" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(metrics.coreWebVitals).map(([metric, value]) => {
              const thresholds = {
                LCP: { good: 2500, poor: 4000 },
                FID: { good: 100, poor: 300 },
                CLS: { good: 0.1, poor: 0.25 },
                FCP: { good: 1800, poor: 3000 },
                TTFB: { good: 800, poor: 1800 }
              };
              
              const threshold = thresholds[metric as keyof typeof thresholds];
              const status = value <= threshold.good ? 'good' : 
                           value <= threshold.poor ? 'needs-improvement' : 'poor';
              
              return (
                <Card key={metric}>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">{metric}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-2">
                      {formatMetric(value, metric === 'CLS' ? 'score' : 'ms')}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>Good</span>
                        <span>Poor</span>
                      </div>
                      <Progress 
                        value={Math.min((value / threshold.poor) * 100, 100)}
                        className={`h-2 ${
                          status === 'good' ? 'bg-green-100' :
                          status === 'needs-improvement' ? 'bg-yellow-100' : 'bg-red-100'
                        }`}
                      />
                      <Badge variant={
                        status === 'good' ? 'default' :
                        status === 'needs-improvement' ? 'secondary' : 'destructive'
                      }>
                        {status.replace('-', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Mobile Performance Tab */}
        <TabsContent value="mobile" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Smartphone className="h-5 w-5 mr-2" />
                  Mobile Optimization Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {mobileMetrics && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Load Time</span>
                      <Badge variant={mobileMetrics.loadTime < 3000 ? "default" : "destructive"}>
                        {Math.round(mobileMetrics.loadTime)}ms
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Memory Usage</span>
                      <Badge variant={mobileMetrics.memoryUsage < 0.8 ? "default" : "destructive"}>
                        {(mobileMetrics.memoryUsage * 100).toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Battery Impact</span>
                      <Badge variant={mobileMetrics.batteryImpact < 0.5 ? "default" : "destructive"}>
                        {mobileMetrics.batteryImpact ? 'High' : 'Low'}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wifi className="h-5 w-5 mr-2" />
                  Network Conditions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {mobileMetrics?.networkUsage && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Connection Type</span>
                      <Badge>{mobileMetrics.networkUsage.effectiveType || 'Unknown'}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Downlink</span>
                      <span>{mobileMetrics.networkUsage.downlink || 0} Mbps</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>RTT</span>
                      <span>{mobileMetrics.networkUsage.rtt || 0}ms</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Data Saver</span>
                      <Badge variant={mobileMetrics.networkUsage.saveData ? "destructive" : "default"}>
                        {mobileMetrics.networkUsage.saveData ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Cache Performance Tab */}
        <TabsContent value="cache" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Cache Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                {cacheStats && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Hit Rate</span>
                      <span className="font-medium">{(cacheStats.hitRate * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Entries</span>
                      <span className="font-medium">{cacheStats.totalEntries}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Size</span>
                      <span className="font-medium">{(cacheStats.totalSize / 1024 / 1024).toFixed(1)} MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Evictions</span>
                      <span className="font-medium">{cacheStats.evictionCount}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Regressions Tab */}
        <TabsContent value="regressions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Performance Regressions</CardTitle>
            </CardHeader>
            <CardContent>
              {regressions.length > 0 ? (
                <div className="space-y-3">
                  {regressions.map((regression, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <TrendingDown className="h-4 w-4 text-red-500" />
                        <div>
                          <span className="font-medium">{regression.metric}</span>
                          <p className="text-sm text-gray-600">
                            {regression.percentageChange > 0 ? '+' : ''}{regression.percentageChange.toFixed(1)}% 
                            change from baseline
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getSeverityColor(regression.severity)}>
                          {regression.severity.toUpperCase()}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(regression.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No performance regressions detected</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
