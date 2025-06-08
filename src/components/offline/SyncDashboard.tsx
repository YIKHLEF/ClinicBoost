import React, { useState } from 'react';
import { 
  RefreshCw, 
  Database, 
  Trash2, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  HardDrive,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useOffline } from '../../contexts/OfflineContext';
import { cn } from '../../lib/utils';

interface SyncDashboardProps {
  className?: string;
}

export const SyncDashboard: React.FC<SyncDashboardProps> = ({ className }) => {
  const {
    isOnline,
    isSyncing,
    lastSyncTime,
    pendingOperations,
    syncErrors,
    storageStats,
    triggerSync,
    clearOfflineData,
    enableAutoSync,
    disableAutoSync,
    networkStatus,
  } = useOffline();

  const [showErrors, setShowErrors] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleClearData = async () => {
    if (window.confirm('Are you sure you want to clear all offline data? This action cannot be undone.')) {
      setIsClearing(true);
      try {
        await clearOfflineData();
      } finally {
        setIsClearing(false);
      }
    }
  };

  const formatLastSync = () => {
    if (!lastSyncTime) return 'Never';
    return new Date(lastSyncTime).toLocaleString();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Sync & Offline Status
        </h2>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="h-5 w-5 text-green-500" />
          ) : (
            <WifiOff className="h-5 w-5 text-red-500" />
          )}
          <span className={cn(
            'text-sm font-medium',
            isOnline ? 'text-green-600' : 'text-red-600'
          )}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Network Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              isOnline ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
            )}>
              {isOnline ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                Connection
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {networkStatus.connectionType} • {networkStatus.effectiveType}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              isSyncing ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
            )}>
              <RefreshCw className={cn('h-5 w-5', isSyncing && 'animate-spin')} />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                Sync Status
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {isSyncing ? 'Syncing...' : 'Idle'}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              pendingOperations > 0 ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
            )}>
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                Pending
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {pendingOperations} operation{pendingOperations !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Storage Stats */}
      {storageStats && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Offline Storage
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {storageStats.totalItems}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Total Items
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {storageStats.unsyncedItems}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Unsynced
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {storageStats.syncQueueSize}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Queue Size
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatBytes(storageStats.storageSize)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Storage Used
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Last Sync */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Last Sync
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatLastSync()}
            </p>
          </div>
          <button
            onClick={triggerSync}
            disabled={isSyncing || !isOnline}
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
              isSyncing || !isOnline
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            )}
          >
            <RefreshCw className={cn('h-4 w-4', isSyncing && 'animate-spin')} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* Sync Errors */}
      {syncErrors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Sync Errors ({syncErrors.length})
              </h3>
            </div>
            <button
              onClick={() => setShowErrors(!showErrors)}
              className="text-xs text-red-600 hover:text-red-800"
            >
              {showErrors ? 'Hide' : 'Show'} Details
            </button>
          </div>
          
          {showErrors && (
            <div className="space-y-2">
              {syncErrors.map((error, index) => (
                <div key={index} className="text-xs text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 p-2 rounded">
                  <div className="font-medium">
                    {error.operation.type} {error.operation.table}
                  </div>
                  <div className="opacity-75">{error.error}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleClearData}
          disabled={isClearing}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
            'bg-red-100 text-red-700 hover:bg-red-200',
            isClearing && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Trash2 className="h-4 w-4" />
          {isClearing ? 'Clearing...' : 'Clear Offline Data'}
        </button>
      </div>
    </div>
  );
};

export default SyncDashboard;
