import React from 'react';
import { Database, Wifi, WifiOff, RefreshCw, Settings, HardDrive } from 'lucide-react';
import { useOffline } from '../contexts/OfflineContext';
import { SyncDashboard } from '../components/offline/SyncDashboard';
import { OfflineIndicator } from '../components/offline/OfflineIndicator';
import useTranslation from '../hooks/useTranslation';

const OfflineSettings: React.FC = () => {
  const { t } = useTranslation();
  const {
    isOnline,
    storageStats,
    enableAutoSync,
    disableAutoSync,
    clearOfflineData,
    triggerSync,
    networkStatus,
  } = useOffline();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('settings.offline.title', 'Offline & Sync Settings')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('settings.offline.description', 'Manage offline data storage and synchronization')}
          </p>
        </div>
        <OfflineIndicator showDetails={true} />
      </div>

      {/* Network Status Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          {isOnline ? (
            <Wifi className="h-6 w-6 text-green-500" />
          ) : (
            <WifiOff className="h-6 w-6 text-red-500" />
          )}
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('settings.offline.networkStatus', 'Network Status')}
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('settings.offline.connectionStatus', 'Connection')}
            </div>
            <div className={`text-lg font-semibold ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
              {isOnline ? t('common.online', 'Online') : t('common.offline', 'Offline')}
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('settings.offline.connectionType', 'Connection Type')}
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {networkStatus.connectionType}
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('settings.offline.effectiveType', 'Speed')}
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {networkStatus.effectiveType.toUpperCase()}
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('settings.offline.latency', 'Latency')}
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {networkStatus.rtt}ms
            </div>
          </div>
        </div>
      </div>

      {/* Storage Overview */}
      {storageStats && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <HardDrive className="h-6 w-6 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('settings.offline.storageOverview', 'Storage Overview')}
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {storageStats.totalItems}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('settings.offline.totalItems', 'Total Items')}
              </div>
            </div>
            
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                {storageStats.unsyncedItems}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('settings.offline.unsyncedItems', 'Unsynced Items')}
              </div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {storageStats.syncQueueSize}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('settings.offline.queueSize', 'Queue Size')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="h-6 w-6 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('settings.offline.quickActions', 'Quick Actions')}
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={triggerSync}
            disabled={!isOnline}
            className="flex items-center justify-center gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className="h-5 w-5" />
            {t('settings.offline.syncNow', 'Sync Now')}
          </button>
          
          <button
            onClick={clearOfflineData}
            className="flex items-center justify-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <Database className="h-5 w-5" />
            {t('settings.offline.clearData', 'Clear Offline Data')}
          </button>
        </div>
      </div>

      {/* Auto-Sync Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('settings.offline.autoSync', 'Auto-Sync Settings')}
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {t('settings.offline.enableAutoSync', 'Enable Auto-Sync')}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('settings.offline.autoSyncDescription', 'Automatically sync data when online')}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={enableAutoSync}
                className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
              >
                {t('common.enable', 'Enable')}
              </button>
              <button
                onClick={disableAutoSync}
                className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
              >
                {t('common.disable', 'Disable')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Sync Dashboard */}
      <SyncDashboard />
    </div>
  );
};

export default OfflineSettings;
