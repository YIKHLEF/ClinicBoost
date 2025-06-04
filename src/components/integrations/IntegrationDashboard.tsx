import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import {
  Calendar,
  Database,
  BarChart3,
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Download,
  Upload,
  Clock,
  Users,
  Activity,
  Zap,
  Shield,
  Globe,
} from 'lucide-react';
import {
  calendarSync,
  getCalendarProviders,
  type CalendarProvider,
  type SyncResult as CalendarSyncResult,
} from '../../lib/integrations/calendar-sync';
import {
  ehrPMS,
  getEHRProviders,
  type EHRProvider,
  type SyncResult as EHRSyncResult,
} from '../../lib/integrations/ehr-pms';
import {
  analyticsCore,
  getAnalyticsProviders,
  type AnalyticsProvider,
} from '../../lib/integrations/analytics-core';

interface IntegrationStats {
  calendar: {
    providers: number;
    enabled: number;
    lastSync?: Date;
    totalEvents: number;
  };
  ehr: {
    providers: number;
    enabled: number;
    lastSync?: Date;
    totalRecords: number;
  };
  analytics: {
    providers: number;
    enabled: number;
    eventsQueued: number;
    metricsQueued: number;
  };
}

export const IntegrationDashboard: React.FC = () => {
  const { addToast } = useToast();
  const [stats, setStats] = useState<IntegrationStats | null>(null);
  const [calendarProviders, setCalendarProviders] = useState<CalendarProvider[]>([]);
  const [ehrProviders, setEHRProviders] = useState<EHRProvider[]>([]);
  const [analyticsProviders, setAnalyticsProviders] = useState<AnalyticsProvider[]>([]);
  const [selectedTab, setSelectedTab] = useState<'calendar' | 'ehr' | 'analytics'>('calendar');
  const [isLoading, setIsLoading] = useState(true);
  const [syncingProviders, setSyncingProviders] = useState<Set<string>>(new Set());

  // Load integration data
  const loadIntegrationData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Load providers
      const calendarData = getCalendarProviders();
      const ehrData = getEHRProviders();
      const analyticsData = getAnalyticsProviders();

      setCalendarProviders(calendarData);
      setEHRProviders(ehrData);
      setAnalyticsProviders(analyticsData);

      // Calculate stats
      const calendarEnabled = calendarData.filter(p => p.enabled).length;
      const ehrEnabled = ehrData.filter(p => p.enabled).length;
      const analyticsEnabled = analyticsData.filter(p => p.enabled).length;

      const queueStatus = analyticsCore.getQueueStatus();

      const integrationStats: IntegrationStats = {
        calendar: {
          providers: calendarData.length,
          enabled: calendarEnabled,
          lastSync: calendarData.find(p => p.enabled)?.lastSync,
          totalEvents: 0, // Would be calculated from actual data
        },
        ehr: {
          providers: ehrData.length,
          enabled: ehrEnabled,
          lastSync: ehrData.find(p => p.enabled)?.lastSync,
          totalRecords: 0, // Would be calculated from actual data
        },
        analytics: {
          providers: analyticsData.length,
          enabled: analyticsEnabled,
          eventsQueued: queueStatus.events,
          metricsQueued: queueStatus.metrics,
        },
      };

      setStats(integrationStats);
    } catch (error) {
      console.error('Failed to load integration data:', error);
      addToast({
        type: 'error',
        title: 'Failed to load integrations',
        message: 'Unable to retrieve integration data.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  // Load data on mount
  useEffect(() => {
    loadIntegrationData();
  }, [loadIntegrationData]);

  // Handle provider sync
  const handleProviderSync = useCallback(async (providerId: string, type: 'calendar' | 'ehr') => {
    try {
      setSyncingProviders(prev => new Set(prev).add(providerId));

      if (type === 'calendar') {
        await calendarSync.syncProvider(providerId);
        addToast({
          type: 'success',
          title: 'Calendar Sync Complete',
          message: 'Calendar events synchronized successfully.',
        });
      } else if (type === 'ehr') {
        await ehrPMS.syncProvider(providerId);
        addToast({
          type: 'success',
          title: 'EHR Sync Complete',
          message: 'EHR data synchronized successfully.',
        });
      }

      // Reload data
      await loadIntegrationData();
    } catch (error) {
      console.error(`Failed to sync ${type} provider:`, error);
      addToast({
        type: 'error',
        title: 'Sync Failed',
        message: `Failed to synchronize ${type} data.`,
      });
    } finally {
      setSyncingProviders(prev => {
        const newSet = new Set(prev);
        newSet.delete(providerId);
        return newSet;
      });
    }
  }, [addToast, loadIntegrationData]);

  // Handle provider toggle
  const handleProviderToggle = useCallback(async (providerId: string, enabled: boolean, type: 'calendar' | 'ehr') => {
    try {
      if (type === 'calendar') {
        await calendarSync.toggleProvider(providerId, enabled);
      } else if (type === 'ehr') {
        await ehrPMS.toggleProvider(providerId, enabled);
      }

      addToast({
        type: 'success',
        title: `Provider ${enabled ? 'Enabled' : 'Disabled'}`,
        message: `${type} provider has been ${enabled ? 'enabled' : 'disabled'}.`,
      });

      // Reload data
      await loadIntegrationData();
    } catch (error) {
      console.error(`Failed to toggle ${type} provider:`, error);
      addToast({
        type: 'error',
        title: 'Toggle Failed',
        message: `Failed to ${enabled ? 'enable' : 'disable'} ${type} provider.`,
      });
    }
  }, [addToast, loadIntegrationData]);

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="text-green-600" size={16} />;
      case 'disconnected':
        return <XCircle className="text-gray-400" size={16} />;
      case 'error':
        return <XCircle className="text-red-600" size={16} />;
      case 'syncing':
      case 'initializing':
        return <RefreshCw className="text-blue-600 animate-spin" size={16} />;
      default:
        return <AlertTriangle className="text-yellow-600" size={16} />;
    }
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'connected':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'disconnected':
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
      case 'error':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'syncing':
      case 'initializing':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      default:
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
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
            Integration Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage calendar sync, EHR/PMS integration, and analytics connections
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button variant="outline" onClick={loadIntegrationData}>
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
          
          <Button>
            <Plus size={16} className="mr-2" />
            Add Integration
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Calendar Sync</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.calendar.enabled}/{stats.calendar.providers}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {stats.calendar.totalEvents} events synced
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                <Calendar className="text-blue-600" size={24} />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">EHR/PMS</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.ehr.enabled}/{stats.ehr.providers}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {stats.ehr.totalRecords} records synced
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Analytics</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.analytics.enabled}/{stats.analytics.providers}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {stats.analytics.eventsQueued} events queued
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                <BarChart3 className="text-purple-600" size={24} />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'calendar', name: 'Calendar Sync', icon: Calendar },
            { id: 'ehr', name: 'EHR/PMS', icon: Database },
            { id: 'analytics', name: 'Analytics', icon: BarChart3 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon size={16} className="mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Calendar Providers */}
      {selectedTab === 'calendar' && (
        <Card>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Calendar Providers
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Sync appointments with external calendar systems
            </p>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {calendarProviders.map((provider) => (
                <div
                  key={provider.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded">
                      <Calendar size={20} />
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {provider.name}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        {getStatusIcon(provider.enabled ? 'connected' : 'disconnected')}
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(provider.enabled ? 'connected' : 'disconnected')}`}>
                          {provider.enabled ? 'Connected' : 'Disconnected'}
                        </span>
                      </div>
                      {provider.lastSync && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Last sync: {provider.lastSync.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleProviderSync(provider.id, 'calendar')}
                      disabled={!provider.enabled || syncingProviders.has(provider.id)}
                    >
                      {syncingProviders.has(provider.id) ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <RefreshCw size={14} />
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleProviderToggle(provider.id, !provider.enabled, 'calendar')}
                    >
                      {provider.enabled ? <Pause size={14} /> : <Play size={14} />}
                    </Button>
                    
                    <Button variant="outline" size="sm">
                      <Settings size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* EHR Providers */}
      {selectedTab === 'ehr' && (
        <Card>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              EHR/PMS Providers
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Integrate with Electronic Health Records and Practice Management Systems
            </p>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {ehrProviders.map((provider) => (
                <div
                  key={provider.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded">
                      <Database size={20} />
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {provider.name}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        {getStatusIcon(provider.status)}
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(provider.status)}`}>
                          {provider.status}
                        </span>
                      </div>
                      {provider.lastSync && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Last sync: {provider.lastSync.toLocaleString()}
                        </p>
                      )}
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Data types: {provider.settings.dataTypes.join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleProviderSync(provider.id, 'ehr')}
                      disabled={!provider.enabled || syncingProviders.has(provider.id)}
                    >
                      {syncingProviders.has(provider.id) ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <RefreshCw size={14} />
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleProviderToggle(provider.id, !provider.enabled, 'ehr')}
                    >
                      {provider.enabled ? <Pause size={14} /> : <Play size={14} />}
                    </Button>
                    
                    <Button variant="outline" size="sm">
                      <Settings size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Analytics Providers */}
      {selectedTab === 'analytics' && (
        <Card>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Analytics Providers
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Connect with third-party analytics and tracking services
            </p>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {analyticsProviders.map((provider) => (
                <div
                  key={provider.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded">
                      <BarChart3 size={20} />
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {provider.name}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        {getStatusIcon(provider.status)}
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(provider.status)}`}>
                          {provider.status}
                        </span>
                      </div>
                      {provider.lastSync && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Last sync: {provider.lastSync.toLocaleString()}
                        </p>
                      )}
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Data streams: {provider.settings.dataStreams.filter(s => s.enabled).length}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!provider.enabled}
                    >
                      <Activity size={14} />
                    </Button>
                    
                    <Button variant="outline" size="sm">
                      <Settings size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Quick Actions
          </h2>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="flex items-center justify-center h-20 flex-col space-y-2"
              onClick={() => {
                // Trigger sync for all enabled providers
                calendarProviders
                  .filter(p => p.enabled)
                  .forEach(p => handleProviderSync(p.id, 'calendar'));
                ehrProviders
                  .filter(p => p.enabled)
                  .forEach(p => handleProviderSync(p.id, 'ehr'));
              }}
            >
              <RefreshCw size={20} />
              <span className="text-sm">Sync All</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex items-center justify-center h-20 flex-col space-y-2"
            >
              <Download size={20} />
              <span className="text-sm">Export Data</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex items-center justify-center h-20 flex-col space-y-2"
            >
              <Upload size={20} />
              <span className="text-sm">Import Data</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex items-center justify-center h-20 flex-col space-y-2"
            >
              <Shield size={20} />
              <span className="text-sm">Security Settings</span>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
