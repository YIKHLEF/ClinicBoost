import { QueryClient } from '@tanstack/react-query';
import { offlineStorageService } from './offline/storage-service';
import { syncService } from './offline/sync-service';
import { logger } from './logging-monitoring';

// Custom retry function that considers network status
const retryFunction = (failureCount: number, error: any) => {
  // Don't retry if we're offline
  if (!navigator.onLine) {
    return false;
  }

  // Don't retry on 4xx errors (client errors)
  if (error?.status >= 400 && error?.status < 500) {
    return false;
  }

  // Retry up to 3 times with exponential backoff
  return failureCount < 3;
};

// Custom query function that falls back to offline storage
const createOfflineQueryFn = <T>(
  onlineQueryFn: () => Promise<T>,
  storeName: string,
  id?: string,
  clinicId?: string
) => {
  return async (): Promise<T> => {
    try {
      // Try online first if we have a connection
      if (navigator.onLine) {
        const result = await onlineQueryFn();

        // Store successful result offline for future use
        if (result) {
          if (Array.isArray(result)) {
            // Handle array results (e.g., getPatients)
            for (const item of result) {
              if (item && typeof item === 'object' && 'id' in item) {
                await offlineStorageService.store(storeName, item.id as string, item, true);
              }
            }
          } else if (typeof result === 'object' && result && 'id' in result) {
            // Handle single object results
            await offlineStorageService.store(storeName, result.id as string, result, true);
          }
        }

        return result;
      }
    } catch (error) {
      logger.warn('Online query failed, falling back to offline storage', 'react-query', {
        storeName,
        id,
        error
      });
    }

    // Fall back to offline storage
    if (id) {
      const offlineData = await offlineStorageService.retrieve<T>(storeName, id);
      if (offlineData) {
        return offlineData;
      }
    } else if (clinicId) {
      const offlineData = await offlineStorageService.retrieveAll<any>(storeName, clinicId);
      return offlineData as T;
    } else {
      const offlineData = await offlineStorageService.retrieveAll<any>(storeName);
      return offlineData as T;
    }

    throw new Error('No data available offline');
  };
};

// Custom mutation function that queues operations when offline
const createOfflineMutationFn = <T, V>(
  onlineMutationFn: (variables: V) => Promise<T>,
  storeName: string,
  operationType: 'create' | 'update' | 'delete'
) => {
  return async (variables: V): Promise<T> => {
    try {
      // Try online first if we have a connection
      if (navigator.onLine) {
        const result = await onlineMutationFn(variables);

        // Store successful result offline
        if (result && typeof result === 'object' && 'id' in result) {
          await offlineStorageService.store(storeName, result.id as string, result, true);
        }

        return result;
      }
    } catch (error) {
      logger.warn('Online mutation failed, queuing for offline sync', 'react-query', {
        storeName,
        operationType,
        error
      });
    }

    // Queue operation for later sync
    const operationId = await offlineStorageService.addToSyncQueue(
      operationType,
      storeName,
      variables
    );

    // For offline operations, we need to handle optimistic updates
    if (operationType === 'create' && variables && typeof variables === 'object') {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const tempData = { ...variables, id: tempId };

      // Store temporarily with unsynced flag
      await offlineStorageService.store(storeName, tempId, tempData, false);

      return tempData as T;
    }

    if (operationType === 'update' && variables && typeof variables === 'object' && 'id' in variables) {
      // Update local storage optimistically
      await offlineStorageService.store(storeName, variables.id as string, variables, false);
      return variables as T;
    }

    if (operationType === 'delete' && variables && typeof variables === 'object' && 'id' in variables) {
      // Remove from local storage optimistically
      await offlineStorageService.remove(storeName, variables.id as string);
      return variables as T;
    }

    throw new Error('Operation queued for sync');
  };
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: retryFunction,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      networkMode: 'offlineFirst', // Enable offline-first behavior
    },
    mutations: {
      retry: retryFunction,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      networkMode: 'offlineFirst',
    },
  },
});

// Initialize offline storage and sync service
queryClient.setMutationDefaults(['sync'], {
  mutationFn: async () => {
    return syncService.syncAll();
  },
});

// Set up automatic sync when coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    logger.info('Network connection restored, triggering sync', 'react-query');
    queryClient.invalidateQueries();
    syncService.syncAll();
  });

  window.addEventListener('offline', () => {
    logger.info('Network connection lost, switching to offline mode', 'react-query');
  });
}

export { createOfflineQueryFn, createOfflineMutationFn };