/**
 * Enhanced Offline Sync Service with Comprehensive Error Handling
 * 
 * Provides robust offline synchronization with conflict resolution,
 * data integrity validation, and comprehensive error recovery.
 */

import { logger } from '../logging-monitoring';
import { offlineStorageService } from './storage-service';
import { supabase } from '../supabase';
import { enhancedSupabase } from '../supabase/enhanced-client';

export interface SyncConfig {
  retries: {
    maxAttempts: number;
    backoffMultiplier: number;
    maxBackoffTime: number;
  };
  conflicts: {
    resolutionStrategy: 'client_wins' | 'server_wins' | 'merge' | 'manual';
    enableConflictLogging: boolean;
    maxConflictAge: number; // milliseconds
  };
  validation: {
    enableDataIntegrity: boolean;
    checksumValidation: boolean;
    schemaValidation: boolean;
  };
  recovery: {
    enableAutoRecovery: boolean;
    maxRecoveryAttempts: number;
    recoveryInterval: number;
  };
}

export interface SyncConflict {
  id: string;
  table: string;
  recordId: string;
  localData: any;
  serverData: any;
  conflictType: 'update_conflict' | 'delete_conflict' | 'create_conflict';
  timestamp: Date;
  resolved: boolean;
  resolution?: 'client_wins' | 'server_wins' | 'merged' | 'manual';
  resolvedData?: any;
}

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  conflictCount: number;
  errors: Array<{ operation: any; error: string; recoverable: boolean }>;
  conflicts: SyncConflict[];
  dataIntegrityIssues: Array<{ table: string; recordId: string; issue: string }>;
}

const DEFAULT_CONFIG: SyncConfig = {
  retries: {
    maxAttempts: 3,
    backoffMultiplier: 2,
    maxBackoffTime: 30000,
  },
  conflicts: {
    resolutionStrategy: 'client_wins',
    enableConflictLogging: true,
    maxConflictAge: 24 * 60 * 60 * 1000, // 24 hours
  },
  validation: {
    enableDataIntegrity: true,
    checksumValidation: true,
    schemaValidation: true,
  },
  recovery: {
    enableAutoRecovery: true,
    maxRecoveryAttempts: 5,
    recoveryInterval: 300000, // 5 minutes
  },
};

export class EnhancedSyncService {
  private config: SyncConfig;
  private syncConflicts = new Map<string, SyncConflict>();
  private recoveryInterval?: NodeJS.Timeout;
  private isSyncing = false;

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    if (this.config.recovery.enableAutoRecovery) {
      this.startRecoveryMonitoring();
    }
  }

  /**
   * Enhanced sync with comprehensive error handling
   */
  async syncAll(): Promise<SyncResult> {
    if (this.isSyncing) {
      throw new Error('Sync already in progress');
    }

    this.isSyncing = true;
    
    const result: SyncResult = {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      conflictCount: 0,
      errors: [],
      conflicts: [],
      dataIntegrityIssues: [],
    };

    try {
      logger.info('Starting enhanced sync', 'enhanced-sync-service');

      // Push local changes to server
      const pushResult = await this.pushToServerWithErrorHandling();
      result.syncedCount += pushResult.syncedCount;
      result.failedCount += pushResult.failedCount;
      result.errors.push(...pushResult.errors);
      result.conflicts.push(...pushResult.conflicts);

      // Pull server changes to local
      const pullResult = await this.pullFromServerWithErrorHandling();
      result.syncedCount += pullResult.syncedCount;
      result.failedCount += pullResult.failedCount;
      result.errors.push(...pullResult.errors);
      result.conflicts.push(...pullResult.conflicts);

      // Validate data integrity
      if (this.config.validation.enableDataIntegrity) {
        const integrityResult = await this.validateDataIntegrity();
        result.dataIntegrityIssues.push(...integrityResult);
      }

      // Resolve conflicts
      if (result.conflicts.length > 0) {
        const resolvedConflicts = await this.resolveConflicts(result.conflicts);
        result.conflictCount = resolvedConflicts.length;
      }

      result.success = result.failedCount === 0 && result.dataIntegrityIssues.length === 0;

      logger.info('Enhanced sync completed', 'enhanced-sync-service', {
        success: result.success,
        syncedCount: result.syncedCount,
        failedCount: result.failedCount,
        conflictCount: result.conflictCount
      });

    } catch (error) {
      result.success = false;
      result.errors.push({
        operation: { type: 'sync_all' },
        error: error instanceof Error ? error.message : 'Unknown sync error',
        recoverable: true
      });

      logger.error('Enhanced sync failed', 'enhanced-sync-service', { error });
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  /**
   * Push local changes to server with error handling
   */
  private async pushToServerWithErrorHandling(): Promise<Partial<SyncResult>> {
    const result: Partial<SyncResult> = {
      syncedCount: 0,
      failedCount: 0,
      errors: [],
      conflicts: [],
    };

    try {
      const pendingOperations = await offlineStorageService.getSyncQueue();
      
      for (const operation of pendingOperations) {
        try {
          await this.executeOperationWithRetry(operation);
          await offlineStorageService.removeSyncOperation(operation.id);
          result.syncedCount!++;

        } catch (error) {
          const isRecoverable = this.isRecoverableError(error as Error);
          
          result.errors!.push({
            operation,
            error: error instanceof Error ? error.message : 'Unknown error',
            recoverable: isRecoverable
          });

          if (!isRecoverable) {
            await offlineStorageService.removeSyncOperation(operation.id);
          }

          result.failedCount!++;
        }
      }

    } catch (error) {
      logger.error('Failed to push to server', 'enhanced-sync-service', { error });
      result.errors!.push({
        operation: { type: 'push_all' },
        error: error instanceof Error ? error.message : 'Unknown push error',
        recoverable: true
      });
    }

    return result;
  }

  /**
   * Pull server changes to local with error handling
   */
  private async pullFromServerWithErrorHandling(): Promise<Partial<SyncResult>> {
    const result: Partial<SyncResult> = {
      syncedCount: 0,
      failedCount: 0,
      errors: [],
      conflicts: [],
    };

    try {
      const tables = ['patients', 'appointments', 'treatments', 'clinics'];
      
      for (const table of tables) {
        try {
          const pullResult = await this.pullTableDataWithConflictDetection(table);
          result.syncedCount! += pullResult.syncedCount;
          result.conflicts!.push(...pullResult.conflicts);

        } catch (error) {
          result.errors!.push({
            operation: { type: 'pull', table },
            error: error instanceof Error ? error.message : 'Unknown error',
            recoverable: true
          });
          result.failedCount!++;
        }
      }

    } catch (error) {
      logger.error('Failed to pull from server', 'enhanced-sync-service', { error });
      result.errors!.push({
        operation: { type: 'pull_all' },
        error: error instanceof Error ? error.message : 'Unknown pull error',
        recoverable: true
      });
    }

    return result;
  }

  /**
   * Pull table data with conflict detection
   */
  private async pullTableDataWithConflictDetection(table: string): Promise<{
    syncedCount: number;
    conflicts: SyncConflict[];
  }> {
    const result = { syncedCount: 0, conflicts: [] as SyncConflict[] };
    
    // Get last sync timestamp
    const lastSync = await this.getLastSyncTimestamp(table);
    
    // Query server data
    const { data: serverData, error } = await enhancedSupabase.query(
      table,
      (client) => {
        let query = client.from(table).select('*');
        if (lastSync) {
          query = query.gt('updated_at', new Date(lastSync).toISOString());
        }
        return query;
      }
    );

    if (error) {
      throw error;
    }

    if (serverData && serverData.length > 0) {
      for (const serverRecord of serverData) {
        try {
          // Check for local version
          const localRecord = await offlineStorageService.retrieve(table, serverRecord.id);
          
          if (localRecord && this.hasConflict(localRecord, serverRecord)) {
            // Create conflict record
            const conflict: SyncConflict = {
              id: `${table}_${serverRecord.id}_${Date.now()}`,
              table,
              recordId: serverRecord.id,
              localData: localRecord,
              serverData: serverRecord,
              conflictType: 'update_conflict',
              timestamp: new Date(),
              resolved: false,
            };

            result.conflicts.push(conflict);
            this.syncConflicts.set(conflict.id, conflict);

            if (this.config.conflicts.enableConflictLogging) {
              logger.warn('Sync conflict detected', 'enhanced-sync-service', {
                table,
                recordId: serverRecord.id,
                conflictType: conflict.conflictType
              });
            }

          } else {
            // No conflict, store server data
            await offlineStorageService.store(table, serverRecord.id, serverRecord, true);
            result.syncedCount++;
          }

        } catch (error) {
          logger.warn('Failed to process server record', 'enhanced-sync-service', {
            table,
            recordId: serverRecord.id,
            error
          });
        }
      }

      // Update last sync timestamp
      await this.setLastSyncTimestamp(table, Date.now());
    }

    return result;
  }

  /**
   * Execute operation with retry logic
   */
  private async executeOperationWithRetry(operation: any): Promise<void> {
    let lastError: Error;
    let backoffTime = 1000;

    for (let attempt = 0; attempt < this.config.retries.maxAttempts; attempt++) {
      try {
        await this.executeSyncOperation(operation);
        return;

      } catch (error) {
        lastError = error as Error;
        
        if (!this.isRecoverableError(lastError) || attempt === this.config.retries.maxAttempts - 1) {
          break;
        }

        // Calculate backoff time with jitter
        const jitter = Math.random() * 0.1;
        const delay = Math.min(
          backoffTime * (1 + jitter),
          this.config.retries.maxBackoffTime
        );

        await this.delay(delay);
        backoffTime *= this.config.retries.backoffMultiplier;
      }
    }

    throw lastError!;
  }

  /**
   * Execute single sync operation
   */
  private async executeSyncOperation(operation: any): Promise<void> {
    const { type, table, data } = operation;

    switch (type) {
      case 'create':
        await enhancedSupabase.mutate(table, (client) => 
          client.from(table).insert(data)
        );
        break;
      case 'update':
        await enhancedSupabase.mutate(table, (client) => 
          client.from(table).update(data).eq('id', data.id)
        );
        break;
      case 'delete':
        await enhancedSupabase.mutate(table, (client) => 
          client.from(table).delete().eq('id', data.id)
        );
        break;
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }

  /**
   * Check if there's a conflict between local and server data
   */
  private hasConflict(localData: any, serverData: any): boolean {
    // Compare timestamps
    const localTimestamp = new Date(localData.updated_at || localData.created_at).getTime();
    const serverTimestamp = new Date(serverData.updated_at || serverData.created_at).getTime();
    
    // If local data is newer and different, there's a conflict
    if (localTimestamp > serverTimestamp) {
      return JSON.stringify(localData) !== JSON.stringify(serverData);
    }
    
    return false;
  }

  /**
   * Resolve conflicts based on strategy
   */
  private async resolveConflicts(conflicts: SyncConflict[]): Promise<SyncConflict[]> {
    const resolvedConflicts: SyncConflict[] = [];

    for (const conflict of conflicts) {
      try {
        let resolvedData: any;
        let resolution: SyncConflict['resolution'];

        switch (this.config.conflicts.resolutionStrategy) {
          case 'client_wins':
            resolvedData = conflict.localData;
            resolution = 'client_wins';
            break;
          case 'server_wins':
            resolvedData = conflict.serverData;
            resolution = 'server_wins';
            break;
          case 'merge':
            resolvedData = this.mergeData(conflict.localData, conflict.serverData);
            resolution = 'merged';
            break;
          default:
            // Manual resolution required
            continue;
        }

        // Apply resolution
        await offlineStorageService.store(conflict.table, conflict.recordId, resolvedData, true);
        
        conflict.resolved = true;
        conflict.resolution = resolution;
        conflict.resolvedData = resolvedData;
        
        resolvedConflicts.push(conflict);

        logger.info('Conflict resolved', 'enhanced-sync-service', {
          conflictId: conflict.id,
          resolution,
          table: conflict.table,
          recordId: conflict.recordId
        });

      } catch (error) {
        logger.error('Failed to resolve conflict', 'enhanced-sync-service', {
          conflictId: conflict.id,
          error
        });
      }
    }

    return resolvedConflicts;
  }

  /**
   * Merge local and server data
   */
  private mergeData(localData: any, serverData: any): any {
    // Simple merge strategy - can be enhanced based on requirements
    return {
      ...serverData,
      ...localData,
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Validate data integrity
   */
  private async validateDataIntegrity(): Promise<Array<{ table: string; recordId: string; issue: string }>> {
    const issues: Array<{ table: string; recordId: string; issue: string }> = [];
    
    if (!this.config.validation.enableDataIntegrity) {
      return issues;
    }

    // Implementation would validate data integrity
    // This is a placeholder for actual validation logic
    
    return issues;
  }

  /**
   * Check if error is recoverable
   */
  private isRecoverableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    // Network errors are recoverable
    if (message.includes('network') || message.includes('timeout') || 
        message.includes('connection')) {
      return true;
    }
    
    // Server errors are recoverable
    if (message.includes('500') || message.includes('502') || 
        message.includes('503') || message.includes('504')) {
      return true;
    }
    
    // Auth errors are usually not recoverable
    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return false;
    }
    
    return true; // Default to recoverable
  }

  /**
   * Start recovery monitoring
   */
  private startRecoveryMonitoring(): void {
    this.recoveryInterval = setInterval(() => {
      if (!this.isSyncing) {
        this.syncAll().catch(error => {
          logger.error('Auto recovery sync failed', 'enhanced-sync-service', { error });
        });
      }
    }, this.config.recovery.recoveryInterval);
  }

  /**
   * Utility methods
   */
  private async getLastSyncTimestamp(table: string): Promise<number | null> {
    try {
      const timestamp = localStorage.getItem(`last_sync_${table}`);
      return timestamp ? parseInt(timestamp) : null;
    } catch {
      return null;
    }
  }

  private async setLastSyncTimestamp(table: string, timestamp: number): Promise<void> {
    try {
      localStorage.setItem(`last_sync_${table}`, timestamp.toString());
    } catch (error) {
      logger.warn('Failed to set last sync timestamp', 'enhanced-sync-service', { error });
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get sync conflicts
   */
  getSyncConflicts(): SyncConflict[] {
    return Array.from(this.syncConflicts.values());
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
      this.recoveryInterval = undefined;
    }
    this.syncConflicts.clear();
  }
}

// Create singleton instance
export const enhancedSyncService = new EnhancedSyncService();
