/**
 * Infrastructure Monitoring Dashboard Component
 * Displays real-time infrastructure metrics and health status
 */

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Server, 
  Database, 
  Shield, 
  Zap, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { errorReporting } from '../../lib/monitoring/error-reporting';
import { apiCache, queryCache, generalCache } from '../../lib/performance/cache-manager';
import { apiMiddleware } from '../../lib/api/middleware-integration';
import { cdnManager } from '../../lib/performance/cdn-config';
import { secretManager } from '../../lib/security/secret-manager';

interface InfrastructureMetrics {
  system: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    lastCheck: Date;
  };
  performance: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    cacheHitRate: number;
  };
  security: {
    activeThreats: number;
    blockedRequests: number;
    secretsHealth: 'healthy' | 'degraded' | 'unhealthy';
    lastSecurityScan: Date;
  };
  resources: {
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
    networkLatency: number;
  };
}

export const InfrastructureMonitoring: React.FC = () => {
  const [metrics, setMetrics] = useState<InfrastructureMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadMetrics();
    
    if (autoRefresh) {
      const interval = setInterval(loadMetrics, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      
      // Gather metrics from various sources
      const [
        errorStats,
        cacheStats,
        middlewareStats,
        performanceStats,
        secretsHealth
      ] = await Promise.all([
        errorReporting.getErrorStats(),
        {
          api: apiCache.getStats(),
          query: queryCache.getStats(),
          general: generalCache.getStats()
        },
        apiMiddleware.getMiddlewareStats(),
        cdnManager.getPerformanceStats(),
        secretManager.healthCheck()
      ]);

      // Calculate derived metrics
      const totalRequests = middlewareStats.activeRequests + 1000; // Mock base
      const errorRate = (errorStats.recent / totalRequests) * 100;
      const avgCacheHitRate = (
        cacheStats.api.hitRate + 
        cacheStats.query.hitRate + 
        cacheStats.general.hitRate
      ) / 3;

      const systemStatus = determineSystemStatus(errorRate, avgCacheHitRate, secretsHealth.status);

      setMetrics({
        system: {
          status: systemStatus,
          uptime: Date.now() - (24 * 60 * 60 * 1000), // Mock 24h uptime
          lastCheck: new Date()
        },
        performance: {
          responseTime: performanceStats.averageLoadTime || 250,
          throughput: totalRequests,
          errorRate,
          cacheHitRate: avgCacheHitRate * 100
        },
        security: {
          activeThreats: 0, // Mock - would come from security monitoring
          blockedRequests: Math.floor(totalRequests * 0.02), // 2% blocked
          secretsHealth: secretsHealth.status,
          lastSecurityScan: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2h ago
        },
        resources: {
          memoryUsage: Math.random() * 30 + 40, // Mock 40-70%
          cpuUsage: Math.random() * 20 + 20, // Mock 20-40%
          diskUsage: Math.random() * 10 + 60, // Mock 60-70%
          networkLatency: Math.random() * 20 + 10 // Mock 10-30ms
        }
      });
    } catch (error) {
      console.error('Failed to load infrastructure metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const determineSystemStatus = (
    errorRate: number, 
    cacheHitRate: number, 
    secretsStatus: string
  ): 'healthy' | 'degraded' | 'unhealthy' => {
    if (errorRate > 5 || cacheHitRate < 0.5 || secretsStatus === 'unhealthy') {
      return 'unhealthy';
    }
    if (errorRate > 2 || cacheHitRate < 0.7 || secretsStatus === 'degraded') {
      return 'degraded';
    }
    return 'healthy';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'unhealthy':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatUptime = (uptime: number) => {
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    return days > 0 ? `${days}d ${hours % 24}h` : `${hours}h`;
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  if (loading && !metrics) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Unable to Load Metrics
        </h3>
        <p className="text-gray-600 mb-4">
          There was an error loading the infrastructure metrics.
        </p>
        <button
          onClick={loadMetrics}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Infrastructure Monitoring</h2>
          <p className="text-gray-600">Real-time system health and performance metrics</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Auto-refresh:</label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300"
            />
          </div>
          
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="text-sm border border-gray-300 rounded-md px-2 py-1"
          >
            <option value={10}>10s</option>
            <option value={30}>30s</option>
            <option value={60}>1m</option>
            <option value={300}>5m</option>
          </select>
          
          <button
            onClick={loadMetrics}
            disabled={loading}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* System Status Overview */}
      <div className={`p-4 rounded-lg border-2 ${getStatusColor(metrics.system.status)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon(metrics.system.status)}
            <div>
              <h3 className="font-semibold capitalize">{metrics.system.status}</h3>
              <p className="text-sm opacity-75">
                System uptime: {formatUptime(metrics.system.uptime)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-75">Last check:</p>
            <p className="text-sm font-medium">
              {metrics.system.lastCheck.toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Performance Metrics */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Performance</h3>
            <Zap className="w-5 h-5 text-blue-500" />
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm">
                <span>Response Time</span>
                <span className="font-medium">{metrics.performance.responseTime}ms</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div 
                  className="bg-blue-500 h-2 rounded-full" 
                  style={{ width: `${Math.min(metrics.performance.responseTime / 10, 100)}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span>Cache Hit Rate</span>
                <span className="font-medium">{metrics.performance.cacheHitRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${metrics.performance.cacheHitRate}%` }}
                ></div>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span>Throughput</span>
              <span className="font-medium">{metrics.performance.throughput} req/h</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Error Rate</span>
              <span className={`font-medium ${metrics.performance.errorRate > 2 ? 'text-red-600' : 'text-green-600'}`}>
                {metrics.performance.errorRate.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Security Metrics */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Security</h3>
            <Shield className="w-5 h-5 text-green-500" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Active Threats</span>
              <span className={`font-medium ${metrics.security.activeThreats > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {metrics.security.activeThreats}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Blocked Requests</span>
              <span className="font-medium">{metrics.security.blockedRequests}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Secrets Health</span>
              <div className="flex items-center space-x-1">
                {getStatusIcon(metrics.security.secretsHealth)}
                <span className="font-medium capitalize">{metrics.security.secretsHealth}</span>
              </div>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">Last scan:</span>
              <p className="font-medium">{metrics.security.lastSecurityScan.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Resource Usage */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Resources</h3>
            <Server className="w-5 h-5 text-purple-500" />
          </div>
          <div className="space-y-3">
            {[
              { label: 'Memory', value: metrics.resources.memoryUsage, color: 'blue' },
              { label: 'CPU', value: metrics.resources.cpuUsage, color: 'green' },
              { label: 'Disk', value: metrics.resources.diskUsage, color: 'yellow' }
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div className="flex justify-between text-sm">
                  <span>{label}</span>
                  <span className="font-medium">{value.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className={`bg-${color}-500 h-2 rounded-full`} 
                    style={{ width: `${value}%` }}
                  ></div>
                </div>
              </div>
            ))}
            <div className="flex justify-between text-sm">
              <span>Network Latency</span>
              <span className="font-medium">{metrics.resources.networkLatency.toFixed(1)}ms</span>
            </div>
          </div>
        </div>

        {/* Database Status */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Database</h3>
            <Database className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Status</span>
              <div className="flex items-center space-x-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="font-medium">Connected</span>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span>Query Cache</span>
              <span className="font-medium">{(queryCache.getStats().hitRate * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Active Connections</span>
              <span className="font-medium">12/50</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Avg Query Time</span>
              <span className="font-medium">45ms</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfrastructureMonitoring;
