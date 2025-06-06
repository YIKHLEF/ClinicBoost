import { indexedDBManager, type StoredData, type SyncOperation } from './indexeddb';
import { logger } from '../logging-monitoring';
import type { Database } from '../database.types';

type Patient = Database['public']['Tables']['patients']['Row'];
type Appointment = Database['public']['Tables']['appointments']['Row'];
type Treatment = Database['public']['Tables']['treatments']['Row'];
type Clinic = Database['public']['Tables']['clinics']['Row'];

export interface OfflineStorageConfig {
  maxRetries: number;
  retryDelay: number;
  maxAge: number; // in milliseconds
}

class OfflineStorageService {
  private config: OfflineStorageConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await indexedDBManager.init();
      this.initialized = true;
      logger.info('Offline storage initialized', 'offline-storage');
    } catch (error) {
      logger.error('Failed to initialize offline storage', 'offline-storage', { error });
      throw error;
    }
  }

  private generateId(): string {
    return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createStoredData<T>(id: string, data: T, synced = false): StoredData<T> {
    return {
      id,
      data,
      timestamp: Date.now(),
      version: 1,
      synced,
      lastModified: Date.now(),
    };
  }

  // Generic CRUD operations
  async store<T>(storeName: string, id: string, data: T, synced = false): Promise<void> {
    await this.init();
    const storedData = this.createStoredData(id, data, synced);
    await indexedDBManager.put(storeName, storedData);
    
    logger.debug('Data stored offline', 'offline-storage', { storeName, id, synced });
  }

  async retrieve<T>(storeName: string, id: string): Promise<T | null> {
    await this.init();
    const stored = await indexedDBManager.get<T>(storeName, id);
    return stored?.data || null;
  }

  async retrieveAll<T>(storeName: string, clinicId?: string): Promise<T[]> {
    await this.init();
    let stored: StoredData<T>[];
    
    if (clinicId) {
      stored = await indexedDBManager.getAll<T>(storeName, 'clinicId', clinicId);
    } else {
      stored = await indexedDBManager.getAll<T>(storeName);
    }
    
    return stored.map(item => item.data);
  }

  async remove(storeName: string, id: string): Promise<void> {
    await this.init();
    await indexedDBManager.delete(storeName, id);
    
    logger.debug('Data removed from offline storage', 'offline-storage', { storeName, id });
  }

  async clear(storeName: string): Promise<void> {
    await this.init();
    await indexedDBManager.clear(storeName);
    
    logger.info('Offline storage cleared', 'offline-storage', { storeName });
  }

  // Specific entity operations
  async storePatient(patient: Patient, synced = false): Promise<void> {
    await this.store('patients', patient.id, patient, synced);
  }

  async getPatient(id: string): Promise<Patient | null> {
    return this.retrieve<Patient>('patients', id);
  }

  async getPatients(clinicId?: string): Promise<Patient[]> {
    return this.retrieveAll<Patient>('patients', clinicId);
  }

  async storeAppointment(appointment: Appointment, synced = false): Promise<void> {
    await this.store('appointments', appointment.id, appointment, synced);
  }

  async getAppointment(id: string): Promise<Appointment | null> {
    return this.retrieve<Appointment>('appointments', id);
  }

  async getAppointments(clinicId?: string): Promise<Appointment[]> {
    return this.retrieveAll<Appointment>('appointments', clinicId);
  }

  async storeTreatment(treatment: Treatment, synced = false): Promise<void> {
    await this.store('treatments', treatment.id, treatment, synced);
  }

  async getTreatment(id: string): Promise<Treatment | null> {
    return this.retrieve<Treatment>('treatments', id);
  }

  async getTreatments(clinicId?: string): Promise<Treatment[]> {
    return this.retrieveAll<Treatment>('treatments', clinicId);
  }

  async storeClinic(clinic: Clinic, synced = false): Promise<void> {
    await this.store('clinics', clinic.id, clinic, synced);
  }

  async getClinic(id: string): Promise<Clinic | null> {
    return this.retrieve<Clinic>('clinics', id);
  }

  async getClinics(): Promise<Clinic[]> {
    return this.retrieveAll<Clinic>('clinics');
  }

  // Sync queue operations
  async addToSyncQueue(
    type: 'create' | 'update' | 'delete',
    table: string,
    data: any,
    id?: string
  ): Promise<string> {
    await this.init();
    
    const operationId = id || this.generateId();
    const operation: SyncOperation = {
      id: operationId,
      type,
      table,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };

    await indexedDBManager.addToSyncQueue(operation);
    
    logger.debug('Operation added to sync queue', 'offline-storage', { 
      operationId, 
      type, 
      table 
    });
    
    return operationId;
  }

  async getSyncQueue(): Promise<SyncOperation[]> {
    await this.init();
    return indexedDBManager.getSyncQueue();
  }

  async removeSyncOperation(id: string): Promise<void> {
    await this.init();
    await indexedDBManager.removeSyncOperation(id);
    
    logger.debug('Operation removed from sync queue', 'offline-storage', { id });
  }

  async updateSyncOperation(id: string, updates: Partial<SyncOperation>): Promise<void> {
    await this.init();
    
    const stored = await indexedDBManager.get<SyncOperation>('syncQueue', id);
    if (stored) {
      const updatedOperation = { ...stored.data, ...updates };
      stored.data = updatedOperation;
      stored.lastModified = Date.now();
      await indexedDBManager.put('syncQueue', stored);
    }
  }

  // Utility methods
  async getUnsyncedData<T>(storeName: string): Promise<StoredData<T>[]> {
    await this.init();
    return indexedDBManager.getUnsyncedData<T>(storeName);
  }

  async markAsSynced(storeName: string, id: string): Promise<void> {
    await this.init();
    await indexedDBManager.markAsSynced(storeName, id);
    
    logger.debug('Data marked as synced', 'offline-storage', { storeName, id });
  }

  async cleanupOldData(): Promise<void> {
    await this.init();
    
    const cutoffTime = Date.now() - this.config.maxAge;
    const stores = ['patients', 'appointments', 'treatments', 'clinics'];
    
    for (const storeName of stores) {
      try {
        const allData = await indexedDBManager.getAll(storeName);
        const oldData = allData.filter(item => 
          item.synced && item.timestamp < cutoffTime
        );
        
        for (const item of oldData) {
          await indexedDBManager.delete(storeName, item.id);
        }
        
        logger.info('Cleaned up old data', 'offline-storage', { 
          storeName, 
          removedCount: oldData.length 
        });
      } catch (error) {
        logger.error('Failed to cleanup old data', 'offline-storage', { 
          storeName, 
          error 
        });
      }
    }
  }

  async getStorageStats(): Promise<{
    totalItems: number;
    unsyncedItems: number;
    syncQueueSize: number;
    storageSize: number;
  }> {
    await this.init();
    
    const stores = ['patients', 'appointments', 'treatments', 'clinics'];
    let totalItems = 0;
    let unsyncedItems = 0;
    
    for (const storeName of stores) {
      const allData = await indexedDBManager.getAll(storeName);
      totalItems += allData.length;
      unsyncedItems += allData.filter(item => !item.synced).length;
    }
    
    const syncQueue = await this.getSyncQueue();
    
    return {
      totalItems,
      unsyncedItems,
      syncQueueSize: syncQueue.length,
      storageSize: 0, // TODO: Calculate actual storage size
    };
  }
}

export const offlineStorageService = new OfflineStorageService();
