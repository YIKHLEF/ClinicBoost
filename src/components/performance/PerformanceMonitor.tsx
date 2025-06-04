import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import {
  Activity,
  Zap,
  Image,
  Database,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download,
  Settings,
  Monitor,
  Cpu,
  HardDrive,
  Wifi,
  Eye,
  BarChart3,
} from 'lucide-react';
import { getMemoizationStats, clearAllCaches } from '../../lib/memoization';
import { imageOptimizer } from '../../lib/image-optimization';

interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte

  // Memory metrics
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;

  // Network metrics
  connectionType: string;
  effectiveType: string;
  downlink: number;
  rtt: number;

  // Custom metrics
  renderTime: number;
  componentCount: number;
  rerenderCount: number;
  cacheHitRate: number;
  imageOptimizationSavings: number;
}

interface ComponentPerformance {
  name: string;
  renderCount: number;
  averageRenderTime: number;
  lastRenderTime: number;
  memoryUsage: number;
}

export const PerformanceMonitor: React.FC = () => {
  const { addToast } = useToast();
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [componentMetrics, setComponentMetrics] = useState<ComponentPerformance[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);

  // Collect performance metrics
  const collectMetrics = useCallback(async () => {
    try {
      const metrics: PerformanceMetrics = {
        // Core Web Vitals (mock values for demo)
        lcp: 0,
        fid: 0,
        cls: 0,
        fcp: 0,
        ttfb: 0,

        // Memory metrics
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0,

        // Network metrics
        connectionType: 'unknown',
        effectiveType: 'unknown',
        downlink: 0,
        rtt: 0,

        // Custom metrics
        renderTime: 0,
        componentCount: 0,
        rerenderCount: 0,
        cacheHitRate: 0,
        imageOptimizationSavings: 0,
      };

      // Collect Core Web Vitals
      if ('performance' in window) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          metrics.ttfb = navigation.responseStart - navigation.requestStart;
          metrics.fcp = navigation.loadEventEnd - navigation.navigationStart;
        }

        // Get LCP
        const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
        if (lcpEntries.length > 0) {
          metrics.lcp = lcpEntries[lcpEntries.length - 1].startTime;
        }

        // Get FID (approximation)
        const fidEntries = performance.getEntriesByType('first-input');
        if (fidEntries.length > 0) {
          metrics.fid = (fidEntries[0] as any).processingStart - fidEntries[0].startTime;
        }

        // Get CLS (approximation)
        const clsEntries = performance.getEntriesByType('layout-shift');
        metrics.cls = clsEntries.reduce((sum, entry) => {
          if (!(entry as any).hadRecentInput) {
            return sum + (entry as any).value;
          }
          return sum;
        }, 0);
      }

      // Collect memory metrics
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        metrics.usedJSHeapSize = memory.usedJSHeapSize;
        metrics.totalJSHeapSize = memory.totalJSHeapSize;
        metrics.jsHeapSizeLimit = memory.jsHeapSizeLimit;
      }

      // Collect network metrics
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        metrics.connectionType = connection.type || 'unknown';
        metrics.effectiveType = connection.effectiveType || 'unknown';
        metrics.downlink = connection.downlink || 0;
        metrics.rtt = connection.rtt || 0;
      }

      // Collect memoization stats
      const memoStats = getMemoizationStats();
      const totalHits = memoStats.global.hits + memoStats.selector.hits + memoStats.api.hits;
      const totalMisses = memoStats.global.misses + memoStats.selector.misses + memoStats.api.misses;
      metrics.cacheHitRate = totalHits / (totalHits + totalMisses) || 0;

      // Collect image optimization stats
      const imageStats = imageOptimizer.getCacheStats();
      metrics.imageOptimizationSavings = imageStats.size;

      setMetrics(metrics);
    } catch (error) {
      console.error('Failed to collect performance metrics:', error);
    }
  }, []);

  // Start/stop monitoring
  const toggleMonitoring = useCallback(() => {
    setIsMonitoring(prev => !prev);
  }, []);

  // Clear all caches
  const handleClearCaches = useCallback(() => {
    clearAllCaches();
    imageOptimizer.clearCache();
    
    addToast({
      type: 'success',
      title: 'Caches Cleared',
      message: 'All performance caches have been cleared successfully.',
    });
  }, [addToast]);

  // Export performance data
  const handleExportData = useCallback(() => {
    if (!metrics) return;

    const data = {
      timestamp: new Date().toISOString(),
      metrics,
      componentMetrics,
      memoizationStats: getMemoizationStats(),
      imageStats: imageOptimizer.getCacheStats(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [metrics, componentMetrics]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(collectMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, collectMetrics]);

  // Initial load
  useEffect(() => {
    collectMetrics();
  }, [collectMetrics]);

  // Performance observer for real-time metrics
  useEffect(() => {
    if (!isMonitoring) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      // Process performance entries
      console.log('Performance entries:', entries);
    });

    observer.observe({ entryTypes: ['measure', 'navigation', 'paint', 'largest-contentful-paint'] });

    return () => observer.disconnect();
  }, [isMonitoring]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getScoreColor = (score: number, thresholds: { good: number; poor: number }): string => {
    if (score <= thresholds.good) return 'text-green-600';
    if (score <= thresholds.poor) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Performance Monitor
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time performance metrics and optimization insights
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button
            variant={isMonitoring ? 'primary' : 'outline'}
            onClick={toggleMonitoring}
          >
            <Activity size={16} className="mr-2" />
            {isMonitoring ? 'Stop' : 'Start'} Monitoring
          </Button>
          
          <Button variant="outline" onClick={collectMetrics}>
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
          
          <Button variant="outline" onClick={handleExportData}>
            <Download size={16} className="mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Core Web Vitals */}
      <Card>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Core Web Vitals
          </h2>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="p-4 bg-blue-100 dark:bg-blue-900/20 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                <Zap className="text-blue-600" size={24} />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white">LCP</h3>
              <p className={`text-2xl font-bold ${getScoreColor(metrics.lcp, { good: 2500, poor: 4000 })}`}>
                {formatTime(metrics.lcp)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Largest Contentful Paint</p>
            </div>

            <div className="text-center">
              <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                <Clock className="text-green-600" size={24} />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white">FID</h3>
              <p className={`text-2xl font-bold ${getScoreColor(metrics.fid, { good: 100, poor: 300 })}`}>
                {formatTime(metrics.fid)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">First Input Delay</p>
            </div>

            <div className="text-center">
              <div className="p-4 bg-purple-100 dark:bg-purple-900/20 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                <BarChart3 className="text-purple-600" size={24} />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white">CLS</h3>
              <p className={`text-2xl font-bold ${getScoreColor(metrics.cls, { good: 0.1, poor: 0.25 })}`}>
                {metrics.cls.toFixed(3)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Cumulative Layout Shift</p>
            </div>
          </div>
        </div>
      </Card>

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Memory Usage</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatBytes(metrics.usedJSHeapSize)}
              </p>
              <p className="text-xs text-gray-500">
                of {formatBytes(metrics.totalJSHeapSize)}
              </p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full">
              <Cpu className="text-orange-600" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Cache Hit Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {(metrics.cacheHitRate * 100).toFixed(1)}%
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
              <Database className="text-green-600" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Network RTT</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics.rtt}ms
              </p>
              <p className="text-xs text-gray-500">
                {metrics.effectiveType}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
              <Wifi className="text-blue-600" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Image Cache</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatBytes(metrics.imageOptimizationSavings)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
              <Image className="text-purple-600" size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Performance Actions */}
      <Card>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Performance Actions
          </h2>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={handleClearCaches}
              className="flex items-center justify-center"
            >
              <HardDrive size={16} className="mr-2" />
              Clear All Caches
            </Button>
            
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="flex items-center justify-center"
            >
              <RefreshCw size={16} className="mr-2" />
              Force Reload
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(registrations => {
                    registrations.forEach(registration => registration.unregister());
                  });
                }
              }}
              className="flex items-center justify-center"
            >
              <Settings size={16} className="mr-2" />
              Clear Service Worker
            </Button>
          </div>
        </div>
      </Card>

      {/* Settings */}
      <Card>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Monitor Settings
          </h2>
        </div>
        
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="mr-2"
                />
                Auto-refresh metrics
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">
                Interval:
              </label>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              >
                <option value={1000}>1s</option>
                <option value={5000}>5s</option>
                <option value={10000}>10s</option>
                <option value={30000}>30s</option>
              </select>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
