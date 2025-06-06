import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { offlineStorageService } from '../lib/offline/storage-service';
import { syncService, type SyncResult } from '../lib/offline/sync-service';
import { logger } from '../lib/logging-monitoring';
import { useToast } from '../components/ui/Toast';
import type { SyncConflict } from '../components/offline/SyncConflictResolver';

interface OfflineContextType {
  // Network status
  isOnline: boolean;
  isOffline: boolean;
  networkStatus: ReturnType<typeof useNetworkStatus>;
  
  // Sync status
  isSyncing: boolean;
  lastSyncTime: number | null;
  pendingOperations: number;
  syncErrors: Array<{ operation: any; error: string }>;
  syncConflicts: SyncConflict[];

  // Storage stats
  storageStats: {
    totalItems: number;
    unsyncedItems: number;
    syncQueueSize: number;
    storageSize: number;
  } | null;

  // Actions
  triggerSync: () => Promise<SyncResult>;
  clearOfflineData: () => Promise<void>;
  enableAutoSync: () => void;
  disableAutoSync: () => void;
  refreshStorageStats: () => Promise<void>;
  resolveSyncConflict: (conflictId: string, resolution: 'local' | 'server' | 'merge', mergedData?: any) => Promise<void>;
  resolveAllSyncConflicts: (resolution: 'local' | 'server') => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};

interface OfflineProviderProps {
  children: ReactNode;
  autoSyncInterval?: number;
}

export const OfflineProvider: React.FC<OfflineProviderProps> = ({ 
  children, 
  autoSyncInterval = 30000 
}) => {
  const networkStatus = useNetworkStatus();
  const { addToast } = useToast();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [pendingOperations, setPendingOperations] = useState(0);
  const [syncErrors, setSyncErrors] = useState<Array<{ operation: any; error: string }>>([]);
  const [syncConflicts, setSyncConflicts] = useState<SyncConflict[]>([]);
  const [storageStats, setStorageStats] = useState<OfflineContextType['storageStats']>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);

  // Initialize offline storage
  useEffect(() => {
    const initializeOfflineStorage = async () => {
      try {
        await offlineStorageService.init();
        await refreshStorageStats();
        logger.info('Offline storage initialized', 'offline-context');
      } catch (error) {
        logger.error('Failed to initialize offline storage', 'offline-context', { error });
        addToast({
          type: 'error',
          title: 'Offline Storage Error',
          message: 'Failed to initialize offline storage. Some features may not work properly.',
        });
      }
    };

    initializeOfflineStorage();
  }, [addToast]);

  // Set up auto-sync
  useEffect(() => {
    if (autoSyncEnabled && networkStatus.isOnline) {
      syncService.startAutoSync(autoSyncInterval);
    } else {
      syncService.stopAutoSync();
    }

    return () => {
      syncService.stopAutoSync();
    };
  }, [autoSyncEnabled, networkStatus.isOnline, autoSyncInterval]);

  // Handle network status changes
  useEffect(() => {
    if (networkStatus.isOnline && !isSyncing) {
      // Coming back online - trigger sync
      triggerSync();
    }
  }, [networkStatus.isOnline]);

  // Refresh storage stats periodically
  useEffect(() => {
    const interval = setInterval(refreshStorageStats, 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  const refreshStorageStats = async () => {
    try {
      const stats = await offlineStorageService.getStorageStats();
      setStorageStats(stats);
      setPendingOperations(stats.syncQueueSize);
    } catch (error) {
      logger.error('Failed to refresh storage stats', 'offline-context', { error });
    }
  };

  const triggerSync = async (): Promise<SyncResult> => {
    if (isSyncing) {
      logger.warn('Sync already in progress', 'offline-context');
      return { success: false, syncedCount: 0, failedCount: 0, errors: [] };
    }

    if (!networkStatus.isOnline) {
      addToast({
        type: 'warning',
        title: 'No Internet Connection',
        message: 'Cannot sync while offline. Changes will be synced when connection is restored.',
      });
      return { success: false, syncedCount: 0, failedCount: 0, errors: [] };
    }

    setIsSyncing(true);
    setSyncErrors([]);

    try {
      const result = await syncService.syncAll();
      setLastSyncTime(Date.now());
      
      if (result.success) {
        addToast({
          type: 'success',
          title: 'Sync Complete',
          message: `Successfully synced ${result.syncedCount} items.`,
        });
      } else if (result.errors.length > 0) {
        setSyncErrors(result.errors);
        addToast({
          type: 'error',
          title: 'Sync Errors',
          message: `${result.failedCount} items failed to sync. Check sync status for details.`,
        });
      }

      await refreshStorageStats();
      return result;
    } catch (error) {
      logger.error('Sync failed', 'offline-context', { error });
      addToast({
        type: 'error',
        title: 'Sync Failed',
        message: 'Failed to sync data. Please try again later.',
      });
      return { success: false, syncedCount: 0, failedCount: 1, errors: [] };
    } finally {
      setIsSyncing(false);
    }
  };

  const clearOfflineData = async (): Promise<void> => {
    try {
      const stores = ['patients', 'appointments', 'treatments', 'clinics'];
      for (const store of stores) {
        await offlineStorageService.clear(store);
      }
      
      await refreshStorageStats();
      
      addToast({
        type: 'success',
        title: 'Offline Data Cleared',
        message: 'All offline data has been cleared successfully.',
      });
      
      logger.info('Offline data cleared', 'offline-context');
    } catch (error) {
      logger.error('Failed to clear offline data', 'offline-context', { error });
      addToast({
        type: 'error',
        title: 'Clear Data Failed',
        message: 'Failed to clear offline data. Please try again.',
      });
    }
  };

  const enableAutoSync = () => {
    setAutoSyncEnabled(true);
    logger.info('Auto-sync enabled', 'offline-context');
  };

  const disableAutoSync = () => {
    setAutoSyncEnabled(false);
    syncService.stopAutoSync();
    logger.info('Auto-sync disabled', 'offline-context');
  };

  const resolveSyncConflict = async (
    conflictId: string,
    resolution: 'local' | 'server' | 'merge',
    mergedData?: any
  ): Promise<void> => {
    try {
      // Find the conflict
      const conflict = syncConflicts.find(c => c.id === conflictId);
      if (!conflict) {
        throw new Error('Conflict not found');
      }

      // Apply resolution
      let resolvedData: any;
      switch (resolution) {
        case 'local':
          resolvedData = conflict.localData;
          break;
        case 'server':
          resolvedData = conflict.serverData;
          break;
        case 'merge':
          resolvedData = mergedData || { ...conflict.serverData, ...conflict.localData };
          break;
      }

      // Update the record in offline storage
      await offlineStorageService.store(conflict.table, conflict.recordId, resolvedData, true);

      // Remove the conflict from the list
      setSyncConflicts(prev => prev.filter(c => c.id !== conflictId));

      logger.info('Sync conflict resolved', 'offline-context', {
        conflictId,
        resolution,
        table: conflict.table,
        recordId: conflict.recordId
      });

      addToast({
        type: 'success',
        title: 'Conflict Resolved',
        message: 'The sync conflict has been resolved successfully.',
      });
    } catch (error) {
      logger.error('Failed to resolve sync conflict', 'offline-context', { error, conflictId });
      addToast({
        type: 'error',
        title: 'Resolution Failed',
        message: 'Failed to resolve the conflict. Please try again.',
      });
      throw error;
    }
  };

  const resolveAllSyncConflicts = async (resolution: 'local' | 'server'): Promise<void> => {
    try {
      const conflictPromises = syncConflicts.map(conflict =>
        resolveSyncConflict(conflict.id, resolution)
      );

      await Promise.all(conflictPromises);

      addToast({
        type: 'success',
        title: 'All Conflicts Resolved',
        message: 'All sync conflicts have been resolved successfully.',
      });
    } catch (error) {
      logger.error('Failed to resolve all conflicts', 'offline-context', { error });
      addToast({
        type: 'error',
        title: 'Resolution Failed',
        message: 'Failed to resolve all conflicts. Please try again.',
      });
      throw error;
    }
  };

  const value: OfflineContextType = {
    // Network status
    isOnline: networkStatus.isOnline,
    isOffline: !networkStatus.isOnline,
    networkStatus,

    // Sync status
    isSyncing,
    lastSyncTime,
    pendingOperations,
    syncErrors,
    syncConflicts,

    // Storage stats
    storageStats,

    // Actions
    triggerSync,
    clearOfflineData,
    enableAutoSync,
    disableAutoSync,
    refreshStorageStats,
    resolveSyncConflict,
    resolveAllSyncConflicts,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};

export default OfflineProvider;
