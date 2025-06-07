/**
 * EHR Provider Card Component
 * 
 * Individual card component for managing EHR/PMS provider settings,
 * status, data synchronization controls, and FHIR compliance.
 */

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';
import {
  Database,
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Edit,
  ExternalLink,
  Clock,
  Users,
  Sync,
  ArrowUpDown,
  ArrowRight,
  ArrowLeft,
  Shield,
  Zap,
  Heart,
  Stethoscope,
  FileText,
  Activity,
} from 'lucide-react';
import {
  type EHRProvider,
  type SyncResult,
  type EHRDataType,
} from '../../lib/integrations/ehr-pms';

interface EHRProviderCardProps {
  provider: EHRProvider;
  syncHistory: SyncResult[];
  onToggle: (enabled: boolean) => void;
  onSync: () => void;
  onTestConnection: () => void;
  onConfigure: () => void;
  isSyncing: boolean;
}

const EHRProviderCard: React.FC<EHRProviderCardProps> = ({
  provider,
  syncHistory,
  onToggle,
  onSync,
  onTestConnection,
  onConfigure,
  isSyncing,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'epic':
        return '🏥';
      case 'cerner':
        return '🩺';
      case 'athena':
        return '⚕️';
      case 'allscripts':
        return '📋';
      case 'eclinicalworks':
        return '💊';
      case 'fhir':
        return '🔗';
      default:
        return '🏥';
    }
  };

  const getStatusColor = () => {
    if (!provider.enabled) return 'text-gray-400';
    
    switch (provider.status) {
      case 'connected':
        return 'text-green-500';
      case 'syncing':
        return 'text-blue-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = () => {
    if (!provider.enabled) {
      return <XCircle className="text-gray-400" size={20} />;
    }
    
    switch (provider.status) {
      case 'connected':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'syncing':
        return <RefreshCw className="text-blue-500 animate-spin" size={20} />;
      case 'error':
        return <XCircle className="text-red-500" size={20} />;
      default:
        return <AlertTriangle className="text-yellow-500" size={20} />;
    }
  };

  const getStatusText = () => {
    if (!provider.enabled) return 'Disabled';
    
    switch (provider.status) {
      case 'connected':
        return 'Connected';
      case 'syncing':
        return 'Syncing...';
      case 'error':
        return 'Connection Error';
      default:
        return 'Disconnected';
    }
  };

  const getSyncDirectionIcon = () => {
    switch (provider.settings.syncDirection) {
      case 'bidirectional':
        return <ArrowUpDown size={16} className="text-blue-600" />;
      case 'ehr-to-clinic':
        return <ArrowLeft size={16} className="text-purple-600" />;
      case 'clinic-to-ehr':
        return <ArrowRight size={16} className="text-green-600" />;
      default:
        return <ArrowUpDown size={16} className="text-gray-400" />;
    }
  };

  const getSyncDirectionText = () => {
    switch (provider.settings.syncDirection) {
      case 'bidirectional':
        return 'Two-way sync';
      case 'ehr-to-clinic':
        return 'EHR → Clinic';
      case 'clinic-to-ehr':
        return 'Clinic → EHR';
      default:
        return 'Unknown';
    }
  };

  const getLastSyncTime = () => {
    if (syncHistory.length === 0) return 'Never';
    
    const lastSync = syncHistory[0];
    const now = new Date();
    const diff = now.getTime() - lastSync.timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getTotalRecords = () => {
    return syncHistory.reduce((total, sync) => 
      total + sync.recordsCreated + sync.recordsUpdated, 0
    );
  };

  const getDataTypeIcon = (dataType: EHRDataType) => {
    switch (dataType) {
      case 'patients':
        return <Users size={14} className="text-blue-600" />;
      case 'appointments':
        return <Clock size={14} className="text-green-600" />;
      case 'medical_records':
        return <FileText size={14} className="text-purple-600" />;
      case 'prescriptions':
        return <Heart size={14} className="text-red-600" />;
      case 'lab_results':
        return <Activity size={14} className="text-orange-600" />;
      default:
        return <Database size={14} className="text-gray-600" />;
    }
  };

  const getProviderFeatures = (type: string) => {
    switch (type) {
      case 'epic':
        return ['FHIR R4', 'MyChart Portal', 'Real-time Sync'];
      case 'cerner':
        return ['FHIR R4', 'PowerChart', 'HL7 Messages'];
      case 'athena':
        return ['REST API', 'Billing Integration', 'Patient Portal'];
      case 'allscripts':
        return ['FHIR R4', 'Clinical Data', 'Practice Management'];
      case 'eclinicalworks':
        return ['FHIR R4', 'EHR Integration', 'Patient Records'];
      default:
        return ['Standard Integration'];
    }
  };

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{getProviderIcon(provider.type)}</div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {provider.name}
              </h3>
              <div className="flex items-center space-x-2">
                {getStatusIcon()}
                <span className={`text-sm ${getStatusColor()}`}>
                  {getStatusText()}
                </span>
              </div>
            </div>
          </div>
          
          <Switch
            checked={provider.enabled}
            onCheckedChange={onToggle}
            disabled={isSyncing}
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Sync Direction */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            {getSyncDirectionIcon()}
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {getSyncDirectionText()}
            </span>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Every {provider.settings.syncFrequency}min
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {getTotalRecords()}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Records Synced
            </div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {getLastSyncTime()}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Last Sync
            </div>
          </div>
        </div>

        {/* Data Types */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Synchronized Data Types
          </h4>
          <div className="flex flex-wrap gap-2">
            {provider.settings.dataTypes.map((dataType) => (
              <div
                key={dataType}
                className="flex items-center space-x-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-full text-xs"
              >
                {getDataTypeIcon(dataType)}
                <span className="capitalize">{dataType.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Settings Preview */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Auto-sync</span>
            <span className={provider.settings.autoSync ? 'text-green-600' : 'text-gray-400'}>
              {provider.settings.autoSync ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Encryption</span>
            <span className={provider.settings.encryption ? 'text-green-600' : 'text-gray-400'}>
              {provider.settings.encryption ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Conflict resolution</span>
            <span className="text-gray-600 dark:text-gray-400 capitalize">
              {provider.settings.conflictResolution.replace('-', ' ')}
            </span>
          </div>
        </div>

        {/* Recent Sync Results */}
        {syncHistory.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {showDetails ? 'Hide' : 'Show'} recent syncs
            </button>
            
            {showDetails && (
              <div className="mt-2 space-y-2">
                {syncHistory.slice(0, 3).map((sync, index) => (
                  <div key={index} className="text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-900 dark:text-white capitalize">
                        {sync.dataType}: {sync.recordsCreated}C, {sync.recordsUpdated}U
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {sync.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    {sync.errors.length > 0 && (
                      <div className="text-red-600 text-xs mt-1">
                        {sync.errors.length} error(s)
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-2 mb-4">
          <Button
            size="sm"
            onClick={onSync}
            disabled={!provider.enabled || isSyncing}
            className="flex-1"
          >
            {isSyncing ? (
              <RefreshCw size={14} className="mr-1 animate-spin" />
            ) : (
              <Sync size={14} className="mr-1" />
            )}
            Sync Now
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={onTestConnection}
            disabled={!provider.enabled}
          >
            <Shield size={14} className="mr-1" />
            Test
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={onConfigure}
          >
            <Settings size={14} className="mr-1" />
            Config
          </Button>
        </div>

        {/* Provider Features */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Features
          </h4>
          <div className="flex flex-wrap gap-1">
            {getProviderFeatures(provider.type).map((feature, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs border border-gray-200 dark:border-gray-600"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>

        {/* Provider-specific info */}
        {provider.type === 'epic' && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <Shield size={16} className="text-blue-600" />
              <span className="text-sm text-blue-800 dark:text-blue-200">
                Epic MyChart FHIR R4 integration with OAuth 2.0
              </span>
            </div>
          </div>
        )}

        {provider.type === 'cerner' && (
          <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <Stethoscope size={16} className="text-purple-600" />
              <span className="text-sm text-purple-800 dark:text-purple-200">
                Cerner PowerChart FHIR R4 integration
              </span>
            </div>
          </div>
        )}

        {provider.type === 'athena' && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <Heart size={16} className="text-green-600" />
              <span className="text-sm text-green-800 dark:text-green-200">
                athenahealth API with billing integration
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default EHRProviderCard;
