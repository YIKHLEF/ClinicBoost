import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import {
  AlertTriangle,
  Bug,
  Activity,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download,
  Filter,
  Search,
  Calendar,
  Clock,
  User,
  Globe,
  Zap,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
} from 'lucide-react';
import { errorMonitor, type EnhancedAppError, ErrorSeverity, ErrorCategory } from '../../lib/error-handling';
import { logger } from '../../lib/logging-monitoring';

interface ErrorStats {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  recentErrors: EnhancedAppError[];
  errorTrends: {
    hourly: number[];
    daily: number[];
  };
  topErrors: Array<{
    code: string;
    count: number;
    lastOccurrence: Date;
  }>;
}

export const ErrorMonitoringDashboard: React.FC = () => {
  const { addToast } = useToast();
  const [stats, setStats] = useState<ErrorStats | null>(null);
  const [selectedError, setSelectedError] = useState<EnhancedAppError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000);
  const [filterSeverity, setFilterSeverity] = useState<ErrorSeverity | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<ErrorCategory | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [timeRange, setTimeRange] = useState('24h');

  // Load error statistics
  const loadErrorStats = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get error statistics from error monitor
      const errorStats = errorMonitor.getErrorStatistics();
      
      // Get stored errors for historical data
      const storedErrors = errorMonitor.getStoredErrors();
      
      // Calculate trends (mock data for demo)
      const hourlyTrends = Array.from({ length: 24 }, (_, i) => 
        Math.floor(Math.random() * 10)
      );
      const dailyTrends = Array.from({ length: 7 }, (_, i) => 
        Math.floor(Math.random() * 50)
      );

      // Calculate top errors
      const errorCounts = new Map<string, number>();
      const errorLastSeen = new Map<string, Date>();
      
      [...errorStats.recentErrors, ...storedErrors].forEach(error => {
        errorCounts.set(error.code, (errorCounts.get(error.code) || 0) + 1);
        const lastSeen = errorLastSeen.get(error.code);
        if (!lastSeen || error.timestamp > lastSeen) {
          errorLastSeen.set(error.code, error.timestamp);
        }
      });

      const topErrors = Array.from(errorCounts.entries())
        .map(([code, count]) => ({
          code,
          count,
          lastOccurrence: errorLastSeen.get(code) || new Date(),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const enhancedStats: ErrorStats = {
        ...errorStats,
        errorTrends: {
          hourly: hourlyTrends,
          daily: dailyTrends,
        },
        topErrors,
      };

      setStats(enhancedStats);
      
      logger.debug('Error statistics loaded', 'monitoring', {
        totalErrors: enhancedStats.totalErrors,
        categories: Object.keys(enhancedStats.errorsByCategory).length,
      });
    } catch (error) {
      logger.error('Failed to load error statistics', 'monitoring', { error });
      addToast({
        type: 'error',
        title: 'Failed to load error data',
        message: 'Unable to retrieve error monitoring data.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  // Auto-refresh effect
  useEffect(() => {
    loadErrorStats();
    
    if (autoRefresh) {
      const interval = setInterval(loadErrorStats, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [loadErrorStats, autoRefresh, refreshInterval]);

  // Clear all errors
  const handleClearErrors = useCallback(() => {
    errorMonitor.clearErrors();
    localStorage.removeItem('app_errors');
    loadErrorStats();
    
    addToast({
      type: 'success',
      title: 'Errors Cleared',
      message: 'All error data has been cleared successfully.',
    });
  }, [loadErrorStats, addToast]);

  // Export error data
  const handleExportErrors = useCallback(() => {
    if (!stats) return;

    const exportData = {
      timestamp: new Date().toISOString(),
      statistics: stats,
      storedErrors: errorMonitor.getStoredErrors(),
      systemInfo: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [stats]);

  // Filter errors
  const filteredErrors = stats?.recentErrors.filter(error => {
    if (filterSeverity !== 'all' && error.severity !== filterSeverity) return false;
    if (filterCategory !== 'all' && error.category !== filterCategory) return false;
    if (searchTerm && !error.message.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !error.code.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  }) || [];

  const getSeverityIcon = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return <XCircle className="text-red-600" size={16} />;
      case ErrorSeverity.HIGH:
        return <AlertCircle className="text-orange-600" size={16} />;
      case ErrorSeverity.MEDIUM:
        return <AlertTriangle className="text-yellow-600" size={16} />;
      case ErrorSeverity.LOW:
        return <Info className="text-blue-600" size={16} />;
      default:
        return <CheckCircle className="text-gray-600" size={16} />;
    }
  };

  const getSeverityColor = (severity: ErrorSeverity): string => {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case ErrorSeverity.HIGH:
        return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
      case ErrorSeverity.MEDIUM:
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case ErrorSeverity.LOW:
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getCategoryIcon = (category: ErrorCategory) => {
    switch (category) {
      case ErrorCategory.NETWORK:
        return <Globe size={16} />;
      case ErrorCategory.AUTHENTICATION:
        return <Shield size={16} />;
      case ErrorCategory.SYSTEM:
        return <Zap size={16} />;
      case ErrorCategory.VALIDATION:
        return <CheckCircle size={16} />;
      default:
        return <Bug size={16} />;
    }
  };

  if (isLoading) {
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
            Error Monitoring Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time error tracking and analysis
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button
            variant={autoRefresh ? 'primary' : 'outline'}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity size={16} className="mr-2" />
            {autoRefresh ? 'Auto-refresh On' : 'Auto-refresh Off'}
          </Button>
          
          <Button variant="outline" onClick={loadErrorStats}>
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
          
          <Button variant="outline" onClick={handleExportErrors}>
            <Download size={16} className="mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Error Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Errors</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.totalErrors || 0}
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
              <Bug className="text-red-600" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Critical Errors</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.errorsBySeverity[ErrorSeverity.CRITICAL] || 0}
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
              <XCircle className="text-red-600" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">High Priority</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.errorsBySeverity[ErrorSeverity.HIGH] || 0}
              </p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full">
              <AlertCircle className="text-orange-600" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Error Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats ? ((stats.totalErrors / 100) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
              <TrendingUp className="text-blue-600" size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Error Filters
          </h2>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Severity
              </label>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value as ErrorSeverity | 'all')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              >
                <option value="all">All Severities</option>
                <option value={ErrorSeverity.CRITICAL}>Critical</option>
                <option value={ErrorSeverity.HIGH}>High</option>
                <option value={ErrorSeverity.MEDIUM}>Medium</option>
                <option value={ErrorSeverity.LOW}>Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as ErrorCategory | 'all')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              >
                <option value="all">All Categories</option>
                <option value={ErrorCategory.NETWORK}>Network</option>
                <option value={ErrorCategory.AUTHENTICATION}>Authentication</option>
                <option value={ErrorCategory.VALIDATION}>Validation</option>
                <option value={ErrorCategory.SYSTEM}>System</option>
                <option value={ErrorCategory.DATABASE}>Database</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search errors..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Time Range
              </label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Recent Errors */}
      <Card>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Recent Errors ({filteredErrors.length})
            </h2>
            
            <Button variant="outline" size="sm" onClick={handleClearErrors}>
              Clear All
            </Button>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {filteredErrors.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  No errors found
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {stats?.totalErrors === 0 
                    ? 'Great! No errors have been recorded.'
                    : 'No errors match the current filters.'
                  }
                </p>
              </div>
            ) : (
              filteredErrors.map((error) => (
                <div
                  key={error.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  onClick={() => setSelectedError(error)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getSeverityIcon(error.severity)}
                      {getCategoryIcon(error.category)}
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {error.code}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(error.severity)}`}>
                            {error.severity}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {error.message}
                        </p>
                        
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center">
                            <Clock size={12} className="mr-1" />
                            {error.timestamp.toLocaleString()}
                          </span>
                          
                          {error.context.userId && (
                            <span className="flex items-center">
                              <User size={12} className="mr-1" />
                              {error.context.userId}
                            </span>
                          )}
                          
                          <span className="flex items-center">
                            <Globe size={12} className="mr-1" />
                            {error.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>

      {/* Error Detail Modal */}
      {selectedError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Error Details
                </h2>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedError(null)}
                >
                  ×
                </Button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Error ID:</span>
                      <span className="ml-2 font-mono">{selectedError.id}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Code:</span>
                      <span className="ml-2 font-mono">{selectedError.code}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Severity:</span>
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getSeverityColor(selectedError.severity)}`}>
                        {selectedError.severity}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Category:</span>
                      <span className="ml-2">{selectedError.category}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    Message
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-3 rounded">
                    {selectedError.message}
                  </p>
                </div>

                {selectedError.context.stackTrace && (
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                      Stack Trace
                    </h3>
                    <pre className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-3 rounded overflow-x-auto">
                      {selectedError.context.stackTrace}
                    </pre>
                  </div>
                )}

                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    Context
                  </h3>
                  <pre className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedError.context, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings */}
      <Card>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Monitoring Settings
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
                Enable auto-refresh
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">
                Refresh interval:
              </label>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              >
                <option value={10000}>10s</option>
                <option value={30000}>30s</option>
                <option value={60000}>1m</option>
                <option value={300000}>5m</option>
              </select>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
