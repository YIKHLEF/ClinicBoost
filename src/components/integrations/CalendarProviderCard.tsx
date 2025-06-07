/**
 * Calendar Provider Card Component
 * 
 * Individual card component for managing calendar provider settings,
 * status, and synchronization controls.
 */

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';
import {
  Calendar,
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
} from 'lucide-react';
import {
  type CalendarProvider,
  type SyncResult,
} from '../../lib/integrations/calendar-sync';

interface CalendarProviderCardProps {
  provider: CalendarProvider;
  syncHistory: SyncResult[];
  onToggle: (enabled: boolean) => void;
  onSync: () => void;
  onConfigure: () => void;
  isSyncing: boolean;
}

const CalendarProviderCard: React.FC<CalendarProviderCardProps> = ({
  provider,
  syncHistory,
  onToggle,
  onSync,
  onConfigure,
  isSyncing,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'google':
        return '🗓️';
      case 'outlook':
        return '📅';
      case 'icloud':
        return '☁️';
      case 'caldav':
        return '🔗';
      default:
        return '📋';
    }
  };

  const getStatusColor = () => {
    if (!provider.enabled) return 'text-gray-400';
    
    if (syncHistory.length === 0) return 'text-yellow-500';
    
    const lastSync = syncHistory[0];
    if (lastSync.success && lastSync.errors.length === 0) {
      return 'text-green-500';
    } else if (lastSync.success && lastSync.errors.length > 0) {
      return 'text-yellow-500';
    } else {
      return 'text-red-500';
    }
  };

  const getStatusIcon = () => {
    if (!provider.enabled) {
      return <XCircle className="text-gray-400" size={20} />;
    }
    
    if (syncHistory.length === 0) {
      return <AlertTriangle className="text-yellow-500" size={20} />;
    }
    
    const lastSync = syncHistory[0];
    if (lastSync.success && lastSync.errors.length === 0) {
      return <CheckCircle className="text-green-500" size={20} />;
    } else if (lastSync.success && lastSync.errors.length > 0) {
      return <AlertTriangle className="text-yellow-500" size={20} />;
    } else {
      return <XCircle className="text-red-500" size={20} />;
    }
  };

  const getStatusText = () => {
    if (!provider.enabled) return 'Disabled';
    
    if (syncHistory.length === 0) return 'Not synced';
    
    const lastSync = syncHistory[0];
    if (lastSync.success && lastSync.errors.length === 0) {
      return 'Synced successfully';
    } else if (lastSync.success && lastSync.errors.length > 0) {
      return `Synced with ${lastSync.errors.length} warnings`;
    } else {
      return 'Sync failed';
    }
  };

  const getSyncDirectionIcon = () => {
    switch (provider.settings.syncDirection) {
      case 'bidirectional':
        return <ArrowUpDown size={16} className="text-blue-600" />;
      case 'clinic-to-external':
        return <ArrowRight size={16} className="text-green-600" />;
      case 'external-to-clinic':
        return <ArrowLeft size={16} className="text-purple-600" />;
      default:
        return <ArrowUpDown size={16} className="text-gray-400" />;
    }
  };

  const getSyncDirectionText = () => {
    switch (provider.settings.syncDirection) {
      case 'bidirectional':
        return 'Two-way sync';
      case 'clinic-to-external':
        return 'Clinic → External';
      case 'external-to-clinic':
        return 'External → Clinic';
      default:
        return 'Unknown';
    }
  };

  const getLastSyncTime = () => {
    if (syncHistory.length === 0) return 'Never';
    
    const lastSync = syncHistory[0];
    const now = new Date();
    const diff = now.getTime() - lastSync.lastSyncTime.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getTotalEvents = () => {
    return syncHistory.reduce((total, sync) => 
      total + sync.eventsCreated + sync.eventsUpdated, 0
    );
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
              {getTotalEvents()}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Events Synced
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

        {/* Settings Preview */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Auto-create events</span>
            <span className={provider.settings.autoCreateEvents ? 'text-green-600' : 'text-gray-400'}>
              {provider.settings.autoCreateEvents ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Sync reminders</span>
            <span className={provider.settings.syncReminders ? 'text-green-600' : 'text-gray-400'}>
              {provider.settings.syncReminders ? 'Enabled' : 'Disabled'}
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
                      <span className="text-gray-900 dark:text-white">
                        {sync.eventsCreated}C, {sync.eventsUpdated}U, {sync.eventsDeleted}D
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {sync.lastSyncTime.toLocaleTimeString()}
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
        <div className="flex space-x-2">
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
            onClick={onConfigure}
          >
            <Settings size={14} className="mr-1" />
            Configure
          </Button>
        </div>

        {/* Provider-specific features */}
        {provider.type === 'google' && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <Shield size={16} className="text-blue-600" />
              <span className="text-sm text-blue-800 dark:text-blue-200">
                Google Calendar integration with OAuth 2.0
              </span>
            </div>
          </div>
        )}

        {provider.type === 'outlook' && (
          <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <Zap size={16} className="text-purple-600" />
              <span className="text-sm text-purple-800 dark:text-purple-200">
                Microsoft Graph API integration
              </span>
            </div>
          </div>
        )}

        {provider.type === 'caldav' && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <ExternalLink size={16} className="text-green-600" />
              <span className="text-sm text-green-800 dark:text-green-200">
                CalDAV protocol support
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default CalendarProviderCard;
