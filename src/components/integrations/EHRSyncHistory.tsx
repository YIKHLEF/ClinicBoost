/**
 * EHR Sync History Component
 * 
 * Displays detailed synchronization history, statistics, and logs
 * for all EHR/PMS providers with filtering and export capabilities.
 */

import React, { useState, useMemo } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  Database,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Download,
  Filter,
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Users,
  Activity,
  FileText,
  Heart,
} from 'lucide-react';
import {
  type EHRProvider,
  type SyncResult,
  type EHRDataType,
} from '../../lib/integrations/ehr-pms';

interface EHRSyncHistoryProps {
  providers: EHRProvider[];
  syncHistory: Map<string, SyncResult[]>;
  onRefresh: () => void;
}

interface FilterOptions {
  provider: string;
  dataType: string;
  status: 'all' | 'success' | 'warning' | 'error';
  dateRange: 'today' | 'week' | 'month' | 'all';
}

const EHRSyncHistory: React.FC<EHRSyncHistoryProps> = ({
  providers,
  syncHistory,
  onRefresh,
}) => {
  const [filters, setFilters] = useState<FilterOptions>({
    provider: 'all',
    dataType: 'all',
    status: 'all',
    dateRange: 'week',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Flatten and filter sync history
  const filteredHistory = useMemo(() => {
    let allHistory: Array<SyncResult & { providerId: string; providerName: string }> = [];
    
    // Flatten all sync history
    Array.from(syncHistory.entries()).forEach(([providerId, results]) => {
      const provider = providers.find(p => p.id === providerId);
      if (provider) {
        allHistory.push(...results.map(result => ({
          ...result,
          providerId,
          providerName: provider.name,
        })));
      }
    });

    // Apply filters
    let filtered = allHistory;

    // Provider filter
    if (filters.provider !== 'all') {
      filtered = filtered.filter(item => item.providerId === filters.provider);
    }

    // Data type filter
    if (filters.dataType !== 'all') {
      filtered = filtered.filter(item => item.dataType === filters.dataType);
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(item => {
        if (filters.status === 'success') {
          return item.success && item.errors.length === 0;
        } else if (filters.status === 'warning') {
          return item.success && item.errors.length > 0;
        } else if (filters.status === 'error') {
          return !item.success;
        }
        return true;
      });
    }

    // Date range filter
    const now = new Date();
    if (filters.dateRange !== 'all') {
      const cutoffDate = new Date();
      switch (filters.dateRange) {
        case 'today':
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setDate(now.getDate() - 30);
          break;
      }
      filtered = filtered.filter(item => item.timestamp >= cutoffDate);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.providerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.dataType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.errors.some(error => error.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [syncHistory, providers, filters, searchQuery]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalSyncs = filteredHistory.length;
    const successfulSyncs = filteredHistory.filter(h => h.success && h.errors.length === 0).length;
    const warningSyncs = filteredHistory.filter(h => h.success && h.errors.length > 0).length;
    const failedSyncs = filteredHistory.filter(h => !h.success).length;
    
    const totalRecords = filteredHistory.reduce((sum, h) => 
      sum + h.recordsProcessed, 0
    );
    
    const totalErrors = filteredHistory.reduce((sum, h) => sum + h.errors.length, 0);
    const totalConflicts = filteredHistory.reduce((sum, h) => sum + h.conflicts.length, 0);
    const avgDuration = filteredHistory.length > 0 ? 
      filteredHistory.reduce((sum, h) => sum + h.duration, 0) / filteredHistory.length : 0;

    return {
      totalSyncs,
      successfulSyncs,
      warningSyncs,
      failedSyncs,
      totalRecords,
      totalErrors,
      totalConflicts,
      avgDuration,
      successRate: totalSyncs > 0 ? Math.round((successfulSyncs / totalSyncs) * 100) : 0,
    };
  }, [filteredHistory]);

  const getStatusIcon = (result: SyncResult) => {
    if (result.success && result.errors.length === 0) {
      return <CheckCircle className="text-green-500" size={16} />;
    } else if (result.success && result.errors.length > 0) {
      return <AlertTriangle className="text-yellow-500" size={16} />;
    } else {
      return <XCircle className="text-red-500" size={16} />;
    }
  };

  const getStatusText = (result: SyncResult) => {
    if (result.success && result.errors.length === 0) {
      return 'Success';
    } else if (result.success && result.errors.length > 0) {
      return 'Warning';
    } else {
      return 'Failed';
    }
  };

  const getStatusColor = (result: SyncResult) => {
    if (result.success && result.errors.length === 0) {
      return 'text-green-600 bg-green-100 dark:bg-green-900/20';
    } else if (result.success && result.errors.length > 0) {
      return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
    } else {
      return 'text-red-600 bg-red-100 dark:bg-red-900/20';
    }
  };

  const getDataTypeIcon = (dataType: EHRDataType) => {
    switch (dataType) {
      case 'patients':
        return <Users className="text-blue-600" size={16} />;
      case 'appointments':
        return <Clock className="text-green-600" size={16} />;
      case 'medical_records':
        return <FileText className="text-purple-600" size={16} />;
      case 'prescriptions':
        return <Heart className="text-red-600" size={16} />;
      case 'lab_results':
        return <Activity className="text-orange-600" size={16} />;
      default:
        return <Database className="text-gray-600" size={16} />;
    }
  };

  const formatDuration = (duration: number) => {
    const seconds = Math.floor(duration / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const exportHistory = () => {
    const data = {
      exportDate: new Date().toISOString(),
      filters,
      stats,
      history: filteredHistory,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ehr-sync-history-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const dataTypes = ['patients', 'appointments', 'medical_records', 'prescriptions', 'lab_results', 'billing'];

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Syncs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalSyncs}
              </p>
            </div>
            <Activity className="text-blue-600" size={24} />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Success Rate</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.successRate}%
              </p>
            </div>
            <TrendingUp className="text-green-600" size={24} />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Records Processed</p>
              <p className="text-2xl font-bold text-purple-600">
                {stats.totalRecords}
              </p>
            </div>
            <Users className="text-purple-600" size={24} />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Duration</p>
              <p className="text-2xl font-bold text-indigo-600">
                {formatDuration(stats.avgDuration)}
              </p>
            </div>
            <Clock className="text-indigo-600" size={24} />
          </div>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Sync History
            </h3>
            
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                <Filter size={16} className="mr-2" />
                Filters
              </Button>
              
              <Button variant="outline" onClick={exportHistory}>
                <Download size={16} className="mr-2" />
                Export
              </Button>
              
              <Button variant="outline" onClick={onRefresh}>
                <RefreshCw size={16} className="mr-2" />
                Refresh
              </Button>
            </div>
          </div>
          
          {/* Search */}
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search sync history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Provider
                </label>
                <select
                  value={filters.provider}
                  onChange={(e) => setFilters(prev => ({ ...prev, provider: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">All Providers</option>
                  {providers.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Data Type
                </label>
                <select
                  value={filters.dataType}
                  onChange={(e) => setFilters(prev => ({ ...prev, dataType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">All Data Types</option>
                  {dataTypes.map(type => (
                    <option key={type} value={type}>
                      {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">All Status</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date Range
                </label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="today">Today</option>
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                  <option value="all">All Time</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* History List */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredHistory.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Sync History
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                No synchronization history found for the selected filters.
              </p>
            </div>
          ) : (
            filteredHistory.map((result, index) => (
              <div key={index} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(result)}
                    <div className="flex items-center space-x-2">
                      {getDataTypeIcon(result.dataType)}
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {result.providerName}
                          </h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(result)}`}>
                            {getStatusText(result)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                          {result.dataType.replace('_', ' ')}: {result.recordsProcessed} processed, {result.recordsCreated} created, {result.recordsUpdated} updated
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm text-gray-900 dark:text-white">
                      {result.timestamp.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Duration: {formatDuration(result.duration)}
                    </p>
                    {result.errors.length > 0 && (
                      <p className="text-sm text-red-600">
                        {result.errors.length} error(s)
                      </p>
                    )}
                    {result.conflicts.length > 0 && (
                      <p className="text-sm text-orange-600">
                        {result.conflicts.length} conflict(s)
                      </p>
                    )}
                  </div>
                </div>

                {/* Error Details */}
                {result.errors.length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <h5 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                      Errors:
                    </h5>
                    <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                      {result.errors.map((error, errorIndex) => (
                        <li key={errorIndex}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Conflict Details */}
                {result.conflicts.length > 0 && (
                  <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <h5 className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">
                      Conflicts:
                    </h5>
                    <div className="text-sm text-orange-700 dark:text-orange-300">
                      {result.conflicts.length} record(s) had conflicts that need resolution
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default EHRSyncHistory;
