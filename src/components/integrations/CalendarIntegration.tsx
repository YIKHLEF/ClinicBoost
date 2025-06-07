/**
 * Calendar Integration Management Interface
 * 
 * Provides comprehensive UI for managing calendar providers, sync settings,
 * and monitoring synchronization status with external calendar systems.
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import {
  Calendar,
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
  Clock,
  Users,
  Activity,
  Sync,
  ExternalLink,
  Shield,
  Zap,
} from 'lucide-react';
import {
  calendarSync,
  getCalendarProviders,
  configureCalendarProvider,
  syncCalendarProvider,
  triggerCalendarSync,
  type CalendarProvider,
  type CalendarProviderSettings,
  type SyncResult,
  type CalendarConflict,
} from '../../lib/integrations/calendar-sync';
import CalendarProviderCard from './CalendarProviderCard';
import CalendarSyncHistory from './CalendarSyncHistory';
import CalendarConflictResolver from './CalendarConflictResolver';
import CalendarProviderConfig from './CalendarProviderConfig';

interface CalendarStats {
  totalProviders: number;
  enabledProviders: number;
  totalEvents: number;
  lastSyncTime?: Date;
  pendingConflicts: number;
  syncErrors: number;
}

const CalendarIntegration: React.FC = () => {
  const { addToast } = useToast();
  
  const [providers, setProviders] = useState<CalendarProvider[]>([]);
  const [stats, setStats] = useState<CalendarStats | null>(null);
  const [syncHistory, setSyncHistory] = useState<Map<string, SyncResult[]>>(new Map());
  const [conflicts, setConflicts] = useState<CalendarConflict[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'providers' | 'history' | 'conflicts'>('overview');

  useEffect(() => {
    loadCalendarData();
  }, []);

  const loadCalendarData = async () => {
    try {
      setIsLoading(true);
      
      // Load providers
      const calendarProviders = getCalendarProviders();
      setProviders(calendarProviders);
      
      // Calculate stats
      const enabledProviders = calendarProviders.filter(p => p.enabled);
      const stats: CalendarStats = {
        totalProviders: calendarProviders.length,
        enabledProviders: enabledProviders.length,
        totalEvents: 0, // This would come from actual sync data
        pendingConflicts: 0,
        syncErrors: 0,
      };
      
      setStats(stats);
      
      // Load sync history and conflicts would go here
      // For now, we'll use mock data
      loadMockSyncData();
      
    } catch (error) {
      console.error('Failed to load calendar data:', error);
      addToast({
        type: 'error',
        title: 'Load Failed',
        message: 'Failed to load calendar integration data.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadMockSyncData = () => {
    // Mock sync history
    const mockHistory = new Map<string, SyncResult[]>();
    providers.forEach(provider => {
      if (provider.enabled) {
        mockHistory.set(provider.id, [
          {
            success: true,
            eventsCreated: 5,
            eventsUpdated: 3,
            eventsDeleted: 1,
            conflicts: [],
            errors: [],
            lastSyncTime: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
          },
        ]);
      }
    });
    setSyncHistory(mockHistory);

    // Mock conflicts
    setConflicts([]);
  };

  const handleProviderToggle = async (providerId: string, enabled: boolean) => {
    try {
      const provider = providers.find(p => p.id === providerId);
      if (!provider) return;

      // Update provider status
      const updatedProvider = { ...provider, enabled };
      const updatedProviders = providers.map(p => 
        p.id === providerId ? updatedProvider : p
      );
      setProviders(updatedProviders);

      addToast({
        type: 'success',
        title: enabled ? 'Provider Enabled' : 'Provider Disabled',
        message: `${provider.name} has been ${enabled ? 'enabled' : 'disabled'}.`,
      });

      // Reload stats
      await loadCalendarData();
    } catch (error) {
      console.error('Failed to toggle provider:', error);
      addToast({
        type: 'error',
        title: 'Toggle Failed',
        message: 'Failed to update provider status.',
      });
    }
  };

  const handleProviderSync = async (providerId: string) => {
    try {
      setIsSyncing(true);
      
      const result = await syncCalendarProvider(providerId);
      const provider = providers.find(p => p.id === providerId);
      
      if (result.success) {
        addToast({
          type: 'success',
          title: 'Sync Completed',
          message: `${provider?.name} sync completed successfully.`,
        });
      } else {
        addToast({
          type: 'warning',
          title: 'Sync Issues',
          message: `${provider?.name} sync completed with ${result.errors.length} errors.`,
        });
      }

      // Update sync history
      const currentHistory = syncHistory.get(providerId) || [];
      const updatedHistory = [result, ...currentHistory.slice(0, 9)]; // Keep last 10
      setSyncHistory(prev => new Map(prev.set(providerId, updatedHistory)));
      
      // Update conflicts if any
      if (result.conflicts.length > 0) {
        setConflicts(prev => [...prev, ...result.conflicts]);
      }

    } catch (error) {
      console.error('Sync failed:', error);
      addToast({
        type: 'error',
        title: 'Sync Failed',
        message: 'Calendar synchronization failed.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncAll = async () => {
    try {
      setIsSyncing(true);
      
      const results = await triggerCalendarSync();
      const successCount = results.flat().filter(r => r.success).length;
      const totalCount = results.flat().length;
      
      addToast({
        type: successCount === totalCount ? 'success' : 'warning',
        title: 'Sync Completed',
        message: `${successCount}/${totalCount} providers synced successfully.`,
      });

      await loadCalendarData();
    } catch (error) {
      console.error('Sync all failed:', error);
      addToast({
        type: 'error',
        title: 'Sync Failed',
        message: 'Failed to sync calendar providers.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusIcon = (provider: CalendarProvider) => {
    if (!provider.enabled) {
      return <XCircle className="text-gray-400" size={20} />;
    }
    
    const history = syncHistory.get(provider.id);
    if (!history || history.length === 0) {
      return <AlertTriangle className="text-yellow-500" size={20} />;
    }
    
    const lastSync = history[0];
    if (lastSync.success && lastSync.errors.length === 0) {
      return <CheckCircle className="text-green-500" size={20} />;
    } else if (lastSync.success && lastSync.errors.length > 0) {
      return <AlertTriangle className="text-yellow-500" size={20} />;
    } else {
      return <XCircle className="text-red-500" size={20} />;
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'providers', label: 'Providers', icon: Calendar },
    { id: 'history', label: 'Sync History', icon: Clock },
    { id: 'conflicts', label: 'Conflicts', icon: AlertTriangle, badge: conflicts.length },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-4" size={32} />
          <p className="text-gray-600 dark:text-gray-400">Loading calendar integration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Calendar Integration
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage calendar synchronization with external providers
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button variant="outline" onClick={loadCalendarData} disabled={isLoading}>
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
          
          <Button onClick={handleSyncAll} disabled={isSyncing}>
            {isSyncing ? (
              <RefreshCw size={16} className="mr-2 animate-spin" />
            ) : (
              <Sync size={16} className="mr-2" />
            )}
            Sync All
          </Button>
          
          <Button onClick={() => setShowAddProvider(true)}>
            <Plus size={16} className="mr-2" />
            Add Provider
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Providers</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalProviders}
                </p>
              </div>
              <Calendar className="text-blue-600" size={24} />
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Providers</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.enabledProviders}
                </p>
              </div>
              <CheckCircle className="text-green-600" size={24} />
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Synced Events</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.totalEvents}
                </p>
              </div>
              <Users className="text-purple-600" size={24} />
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending Conflicts</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.pendingConflicts}
                </p>
              </div>
              <AlertTriangle className="text-orange-600" size={24} />
            </div>
          </Card>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Provider Status Overview */}
          <Card>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Provider Status
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {providers.map((provider) => (
                  <div key={provider.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(provider)}
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {provider.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {provider.enabled ? 'Active' : 'Disabled'}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleProviderSync(provider.id)}
                      disabled={!provider.enabled || isSyncing}
                    >
                      <Sync size={14} className="mr-1" />
                      Sync
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Recent Activity */}
          <Card>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Recent Activity
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {Array.from(syncHistory.entries()).slice(0, 5).map(([providerId, history]) => {
                  const provider = providers.find(p => p.id === providerId);
                  const lastSync = history[0];
                  
                  return (
                    <div key={providerId} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Calendar size={16} className="text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {provider?.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {lastSync.eventsCreated} created, {lastSync.eventsUpdated} updated
                          </p>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {lastSync.lastSyncTime.toLocaleTimeString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'providers' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {providers.map((provider) => (
            <CalendarProviderCard
              key={provider.id}
              provider={provider}
              syncHistory={syncHistory.get(provider.id) || []}
              onToggle={(enabled) => handleProviderToggle(provider.id, enabled)}
              onSync={() => handleProviderSync(provider.id)}
              onConfigure={() => {
                setSelectedProvider(provider.id);
                setShowConfigModal(true);
              }}
              isSyncing={isSyncing}
            />
          ))}
        </div>
      )}

      {activeTab === 'history' && (
        <CalendarSyncHistory
          providers={providers}
          syncHistory={syncHistory}
          onRefresh={loadCalendarData}
        />
      )}

      {activeTab === 'conflicts' && (
        <CalendarConflictResolver
          conflicts={conflicts}
          onResolveConflict={(conflictId, resolution) => {
            // Handle conflict resolution
            setConflicts(prev => prev.filter(c => c.id !== conflictId));
          }}
        />
      )}

      {/* Configuration Modal */}
      <CalendarProviderConfig
        provider={selectedProvider ? providers.find(p => p.id === selectedProvider) || null : null}
        isOpen={showConfigModal}
        onClose={() => {
          setShowConfigModal(false);
          setSelectedProvider(null);
        }}
        onSave={(updatedProvider) => {
          setProviders(prev => prev.map(p =>
            p.id === updatedProvider.id ? updatedProvider : p
          ));
          loadCalendarData();
        }}
      />
    </div>
  );
};

export default CalendarIntegration;
