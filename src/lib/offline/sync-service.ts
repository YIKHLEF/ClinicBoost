import { offlineStorageService } from './storage-service';
import { supabase } from '../supabase';
import { logger } from '../logging-monitoring';
import type { SyncOperation } from './indexeddb';

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: Array<{ operation: SyncOperation; error: string }>;
}

export interface ConflictResolution {
  strategy: 'client-wins' | 'server-wins' | 'merge' | 'manual';
  resolver?: (clientData: any, serverData: any) => any;
}

class SyncService {
  private isRunning = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second base delay

  async startAutoSync(intervalMs = 30000): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      if (navigator.onLine && !this.isRunning) {
        await this.syncAll();
      }
    }, intervalMs);

    logger.info('Auto-sync started', 'sync-service', { intervalMs });
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      logger.info('Auto-sync stopped', 'sync-service');
    }
  }

  async syncAll(): Promise<SyncResult> {
    if (this.isRunning) {
      logger.warn('Sync already in progress', 'sync-service');
      return { success: false, syncedCount: 0, failedCount: 0, errors: [] };
    }

    this.isRunning = true;
    logger.info('Starting full sync', 'sync-service');

    try {
      // First, sync pending operations from the queue
      const queueResult = await this.syncQueue();
      
      // Then, pull latest data from server
      const pullResult = await this.pullFromServer();

      const totalResult: SyncResult = {
        success: queueResult.success && pullResult.success,
        syncedCount: queueResult.syncedCount + pullResult.syncedCount,
        failedCount: queueResult.failedCount + pullResult.failedCount,
        errors: [...queueResult.errors, ...pullResult.errors],
      };

      logger.info('Full sync completed', 'sync-service', totalResult);
      return totalResult;
    } catch (error) {
      logger.error('Full sync failed', 'sync-service', { error });
      return { success: false, syncedCount: 0, failedCount: 1, errors: [] };
    } finally {
      this.isRunning = false;
    }
  }

  async syncQueue(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      errors: [],
    };

    try {
      const operations = await offlineStorageService.getSyncQueue();
      logger.info('Processing sync queue', 'sync-service', { operationCount: operations.length });

      for (const operation of operations) {
        try {
          await this.processSyncOperation(operation);
          await offlineStorageService.removeSyncOperation(operation.id);
          result.syncedCount++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push({ operation, error: errorMessage });
          result.failedCount++;

          // Update retry count
          const newRetryCount = operation.retryCount + 1;
          if (newRetryCount < this.maxRetries) {
            await offlineStorageService.updateSyncOperation(operation.id, {
              retryCount: newRetryCount,
              lastError: errorMessage,
            });
          } else {
            // Max retries reached, remove from queue
            await offlineStorageService.removeSyncOperation(operation.id);
            logger.error('Operation failed after max retries', 'sync-service', {
              operationId: operation.id,
              retryCount: newRetryCount,
            });
          }
        }

        // Add delay between operations to avoid overwhelming the server
        await this.delay(100);
      }

      result.success = result.failedCount === 0;
    } catch (error) {
      logger.error('Failed to process sync queue', 'sync-service', { error });
      result.success = false;
    }

    return result;
  }

  private async processSyncOperation(operation: SyncOperation): Promise<void> {
    const { type, table, data } = operation;

    switch (type) {
      case 'create':
        await this.syncCreate(table, data);
        break;
      case 'update':
        await this.syncUpdate(table, data);
        break;
      case 'delete':
        await this.syncDelete(table, data.id);
        break;
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }

  private async syncCreate(table: string, data: any): Promise<void> {
    const { error } = await supabase.from(table).insert(data);
    if (error) throw error;

    // Mark as synced in local storage
    await offlineStorageService.markAsSynced(table, data.id);
  }

  private async syncUpdate(table: string, data: any): Promise<void> {
    const { error } = await supabase
      .from(table)
      .update(data)
      .eq('id', data.id);
    
    if (error) throw error;

    // Mark as synced in local storage
    await offlineStorageService.markAsSynced(table, data.id);
  }

  private async syncDelete(table: string, id: string): Promise<void> {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
    
    if (error) throw error;

    // Remove from local storage
    await offlineStorageService.remove(table, id);
  }

  async pullFromServer(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      errors: [],
    };

    try {
      // Pull data for each table
      const tables = ['patients', 'appointments', 'treatments', 'clinics'];
      
      for (const table of tables) {
        try {
          await this.pullTableData(table);
          result.syncedCount++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push({ 
            operation: { id: '', type: 'update', table, data: {}, timestamp: Date.now(), retryCount: 0 }, 
            error: errorMessage 
          });
          result.failedCount++;
        }
      }

      result.success = result.failedCount === 0;
    } catch (error) {
      logger.error('Failed to pull from server', 'sync-service', { error });
      result.success = false;
    }

    return result;
  }

  private async pullTableData(table: string): Promise<void> {
    // Get the last sync timestamp for this table
    const lastSync = await this.getLastSyncTimestamp(table);
    
    let query = supabase.from(table).select('*');
    
    if (lastSync) {
      query = query.gt('updated_at', new Date(lastSync).toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    if (data && data.length > 0) {
      // Store the pulled data locally
      for (const item of data) {
        await offlineStorageService.store(table, item.id, item, true);
      }

      // Update last sync timestamp
      await this.setLastSyncTimestamp(table, Date.now());
      
      logger.info('Pulled data from server', 'sync-service', { 
        table, 
        itemCount: data.length 
      });
    }
  }

  private async getLastSyncTimestamp(table: string): Promise<number | null> {
    try {
      const setting = await offlineStorageService.retrieve<{ timestamp: number }>('settings', `lastSync_${table}`);
      return setting?.timestamp || null;
    } catch {
      return null;
    }
  }

  private async setLastSyncTimestamp(table: string, timestamp: number): Promise<void> {
    await offlineStorageService.store('settings', `lastSync_${table}`, { timestamp }, true);
  }

  async resolveConflict(
    table: string,
    id: string,
    clientData: any,
    serverData: any,
    resolution: ConflictResolution
  ): Promise<any> {
    switch (resolution.strategy) {
      case 'client-wins':
        return clientData;
      case 'server-wins':
        return serverData;
      case 'merge':
        return { ...serverData, ...clientData };
      case 'manual':
        if (resolution.resolver) {
          return resolution.resolver(clientData, serverData);
        }
        throw new Error('Manual resolution requires a resolver function');
      default:
        throw new Error(`Unknown conflict resolution strategy: ${resolution.strategy}`);
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getSyncStatus(): Promise<{
    isRunning: boolean;
    lastSyncTime: number | null;
    pendingOperations: number;
    autoSyncEnabled: boolean;
  }> {
    const syncQueue = await offlineStorageService.getSyncQueue();
    const lastSyncTime = await this.getLastSyncTimestamp('global');

    return {
      isRunning: this.isRunning,
      lastSyncTime,
      pendingOperations: syncQueue.length,
      autoSyncEnabled: this.syncInterval !== null,
    };
  }
}

export const syncService = new SyncService();
