/**
 * EHR/PMS Integration Management Interface
 * 
 * Provides comprehensive UI for managing EHR/PMS providers, FHIR R4 compliance,
 * data synchronization, and monitoring integration status with healthcare systems.
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import {
  Database,
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
  RotateCcw,
  ExternalLink,
  Shield,
  Zap,
  FileText,
  Heart,
  Stethoscope,
} from 'lucide-react';
import {
  ehrPMS,
  getEHRProviders,
  configureEHRProvider,
  syncEHRProvider,
  triggerEHRSync,
  testEHRConnection,
  type EHRProvider,
  type EHRProviderSettings,
  type SyncResult,
  type DataConflict,
  type EHRDataType,
} from '../../lib/integrations/ehr-pms';
import EHRProviderCard from './EHRProviderCard';
import EHRSyncHistory from './EHRSyncHistory';
import EHRConflictResolver from './EHRConflictResolver';
import EHRDataMapping from './EHRDataMapping';
import FHIRComplianceMonitor from './FHIRComplianceMonitor';

interface EHRStats {
  totalProviders: number;
  enabledProviders: number;
  totalRecords: number;
  lastSyncTime?: Date;
  pendingConflicts: number;
  syncErrors: number;
  fhirCompliance: number;
}

const EHRIntegration: React.FC = () => {
  const { addToast } = useToast();
  
  const [providers, setProviders] = useState<EHRProvider[]>([]);
  const [stats, setStats] = useState<EHRStats | null>(null);
  const [syncHistory, setSyncHistory] = useState<Map<string, SyncResult[]>>(new Map());
  const [conflicts, setConflicts] = useState<DataConflict[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'providers' | 'history' | 'conflicts' | 'mapping' | 'fhir'>('overview');

  useEffect(() => {
    loadEHRData();
  }, []);

  const loadEHRData = async () => {
    try {
      setIsLoading(true);
      
      // Load providers
      const ehrProviders = getEHRProviders();
      setProviders(ehrProviders);
      
      // Calculate stats
      const enabledProviders = ehrProviders.filter(p => p.enabled);
      const stats: EHRStats = {
        totalProviders: ehrProviders.length,
        enabledProviders: enabledProviders.length,
        totalRecords: 0, // This would come from actual sync data
        pendingConflicts: 0,
        syncErrors: 0,
        fhirCompliance: 95, // Mock compliance score
      };
      
      setStats(stats);
      
      // Load sync history and conflicts would go here
      // For now, we'll use mock data
      loadMockSyncData();
      
    } catch (error) {
      console.error('Failed to load EHR data:', error);
      addToast({
        type: 'error',
        title: 'Load Failed',
        message: 'Failed to load EHR integration data.',
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
            dataType: 'patients' as EHRDataType,
            recordsProcessed: 150,
            recordsCreated: 12,
            recordsUpdated: 8,
            recordsSkipped: 2,
            conflicts: [],
            errors: [],
            duration: 45000,
            timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
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
      const updatedProvider = { ...provider, enabled, status: enabled ? 'connected' : 'disconnected' as any };
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
      await loadEHRData();
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
      
      const results = await syncEHRProvider(providerId);
      const provider = providers.find(p => p.id === providerId);
      
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;
      
      if (successCount === totalCount) {
        addToast({
          type: 'success',
          title: 'Sync Completed',
          message: `${provider?.name} sync completed successfully.`,
        });
      } else {
        addToast({
          type: 'warning',
          title: 'Sync Issues',
          message: `${provider?.name} sync completed with ${totalCount - successCount} errors.`,
        });
      }

      // Update sync history
      const currentHistory = syncHistory.get(providerId) || [];
      const updatedHistory = [...results, ...currentHistory.slice(0, 9)]; // Keep last 10
      setSyncHistory(prev => new Map(prev.set(providerId, updatedHistory)));
      
      // Update conflicts if any
      const newConflicts = results.flatMap(r => r.conflicts);
      if (newConflicts.length > 0) {
        setConflicts(prev => [...prev, ...newConflicts]);
      }

    } catch (error) {
      console.error('Sync failed:', error);
      addToast({
        type: 'error',
        title: 'Sync Failed',
        message: 'EHR synchronization failed.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncAll = async () => {
    try {
      setIsSyncing(true);
      
      const results = await triggerEHRSync();
      const successCount = results.flat().filter(r => r.success).length;
      const totalCount = results.flat().length;
      
      addToast({
        type: successCount === totalCount ? 'success' : 'warning',
        title: 'Sync Completed',
        message: `${successCount}/${totalCount} data types synced successfully.`,
      });

      await loadEHRData();
    } catch (error) {
      console.error('Sync all failed:', error);
      addToast({
        type: 'error',
        title: 'Sync Failed',
        message: 'Failed to sync EHR providers.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTestConnection = async (providerId: string) => {
    try {
      const result = await testEHRConnection(providerId);
      const provider = providers.find(p => p.id === providerId);
      
      addToast({
        type: result ? 'success' : 'error',
        title: result ? 'Connection Successful' : 'Connection Failed',
        message: `${provider?.name} connection ${result ? 'test passed' : 'test failed'}.`,
      });
    } catch (error) {
      console.error('Connection test failed:', error);
      addToast({
        type: 'error',
        title: 'Test Failed',
        message: 'Connection test failed.',
      });
    }
  };

  const getStatusIcon = (provider: EHRProvider) => {
    switch (provider.status) {
      case 'connected':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'syncing':
        return <RefreshCw className="text-blue-500 animate-spin" size={20} />;
      case 'error':
        return <XCircle className="text-red-500" size={20} />;
      default:
        return <XCircle className="text-gray-400" size={20} />;
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'providers', label: 'Providers', icon: Database },
    { id: 'history', label: 'Sync History', icon: Clock },
    { id: 'conflicts', label: 'Conflicts', icon: AlertTriangle, badge: conflicts.length },
    { id: 'mapping', label: 'Data Mapping', icon: FileText },
    { id: 'fhir', label: 'FHIR Compliance', icon: Shield },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-4" size={32} />
          <p className="text-gray-600 dark:text-gray-400">Loading EHR integration...</p>
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
            EHR/PMS Integration
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage healthcare system integrations and FHIR R4 compliance
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button variant="outline" onClick={loadEHRData} disabled={isLoading}>
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
          
          <Button onClick={handleSyncAll} disabled={isSyncing}>
            {isSyncing ? (
              <RefreshCw size={16} className="mr-2 animate-spin" />
            ) : (
              <RotateCcw size={16} className="mr-2" />
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
              <Database className="text-blue-600" size={24} />
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Synced Records</p>
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
                <p className="text-sm text-gray-600 dark:text-gray-400">FHIR Compliance</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {stats.fhirCompliance}%
                </p>
              </div>
              <Shield className="text-indigo-600" size={24} />
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
                          {provider.enabled ? provider.status : 'Disabled'}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleProviderSync(provider.id)}
                      disabled={!provider.enabled || isSyncing}
                    >
                      <RotateCcw size={14} className="mr-1" />
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
                        <Database size={16} className="text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {provider?.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {lastSync.recordsCreated} created, {lastSync.recordsUpdated} updated
                          </p>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {lastSync.timestamp.toLocaleTimeString()}
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
            <EHRProviderCard
              key={provider.id}
              provider={provider}
              syncHistory={syncHistory.get(provider.id) || []}
              onToggle={(enabled) => handleProviderToggle(provider.id, enabled)}
              onSync={() => handleProviderSync(provider.id)}
              onTestConnection={() => handleTestConnection(provider.id)}
              onConfigure={() => setSelectedProvider(provider.id)}
              isSyncing={isSyncing}
            />
          ))}
        </div>
      )}

      {activeTab === 'history' && (
        <EHRSyncHistory
          providers={providers}
          syncHistory={syncHistory}
          onRefresh={loadEHRData}
        />
      )}

      {activeTab === 'conflicts' && (
        <EHRConflictResolver
          conflicts={conflicts}
          onResolveConflict={(conflictId, resolution) => {
            // Handle conflict resolution
            setConflicts(prev => prev.filter(c => c.id !== conflictId));
          }}
        />
      )}

      {activeTab === 'mapping' && (
        <EHRDataMapping
          providers={providers}
          onUpdateMapping={(providerId, mapping) => {
            // Handle data mapping updates
            console.log('Update mapping for', providerId, mapping);
          }}
        />
      )}

      {activeTab === 'fhir' && (
        <FHIRComplianceMonitor
          providers={providers}
          complianceScore={stats?.fhirCompliance || 0}
          onRunCompliance={() => {
            // Handle FHIR compliance check
            console.log('Running FHIR compliance check');
          }}
        />
      )}
    </div>
  );
};

export default EHRIntegration;
