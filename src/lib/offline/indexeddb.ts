/**
 * IndexedDB wrapper for offline data storage
 * Provides a simple interface for storing and retrieving data offline
 */

export interface StoredData<T = any> {
  id: string;
  data: T;
  timestamp: number;
  version: number;
  synced: boolean;
  lastModified: number;
}

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'ClinicBoostDB';
  private readonly version = 1;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores for different data types
        this.createObjectStores(db);
      };
    });
  }

  private createObjectStores(db: IDBDatabase): void {
    // Patients store
    if (!db.objectStoreNames.contains('patients')) {
      const patientsStore = db.createObjectStore('patients', { keyPath: 'id' });
      patientsStore.createIndex('clinicId', 'clinicId', { unique: false });
      patientsStore.createIndex('synced', 'synced', { unique: false });
    }

    // Appointments store
    if (!db.objectStoreNames.contains('appointments')) {
      const appointmentsStore = db.createObjectStore('appointments', { keyPath: 'id' });
      appointmentsStore.createIndex('clinicId', 'clinicId', { unique: false });
      appointmentsStore.createIndex('patientId', 'patientId', { unique: false });
      appointmentsStore.createIndex('synced', 'synced', { unique: false });
    }

    // Treatments store
    if (!db.objectStoreNames.contains('treatments')) {
      const treatmentsStore = db.createObjectStore('treatments', { keyPath: 'id' });
      treatmentsStore.createIndex('clinicId', 'clinicId', { unique: false });
      treatmentsStore.createIndex('patientId', 'patientId', { unique: false });
      treatmentsStore.createIndex('synced', 'synced', { unique: false });
    }

    // Clinics store
    if (!db.objectStoreNames.contains('clinics')) {
      const clinicsStore = db.createObjectStore('clinics', { keyPath: 'id' });
      clinicsStore.createIndex('synced', 'synced', { unique: false });
    }

    // Sync queue store
    if (!db.objectStoreNames.contains('syncQueue')) {
      const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
      syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      syncStore.createIndex('table', 'table', { unique: false });
    }

    // Settings store
    if (!db.objectStoreNames.contains('settings')) {
      db.createObjectStore('settings', { keyPath: 'key' });
    }
  }

  async get<T>(storeName: string, id: string): Promise<StoredData<T> | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async getAll<T>(storeName: string, indexName?: string, indexValue?: any): Promise<StoredData<T>[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      let request: IDBRequest;
      if (indexName && indexValue !== undefined) {
        const index = store.index(indexName);
        request = index.getAll(indexValue);
      } else {
        request = store.getAll();
      }

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async put<T>(storeName: string, data: StoredData<T>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async delete(storeName: string, id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clear(storeName: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async addToSyncQueue(operation: SyncOperation): Promise<void> {
    return this.put('syncQueue', {
      id: operation.id,
      data: operation,
      timestamp: operation.timestamp,
      version: 1,
      synced: false,
      lastModified: Date.now(),
    });
  }

  async getSyncQueue(): Promise<SyncOperation[]> {
    const stored = await this.getAll<SyncOperation>('syncQueue');
    return stored.map(item => item.data);
  }

  async removeSyncOperation(id: string): Promise<void> {
    return this.delete('syncQueue', id);
  }

  async getUnsyncedData<T>(storeName: string): Promise<StoredData<T>[]> {
    return this.getAll<T>(storeName, 'synced', false);
  }

  async markAsSynced(storeName: string, id: string): Promise<void> {
    const data = await this.get(storeName, id);
    if (data) {
      data.synced = true;
      data.lastModified = Date.now();
      await this.put(storeName, data);
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Calculate storage size for a specific store
   */
  async getStoreSize(storeName: string): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const allData = await this.getAll(storeName);
    let totalSize = 0;

    for (const item of allData) {
      totalSize += this.calculateObjectSize(item);
    }

    return totalSize;
  }

  /**
   * Calculate total storage size across all stores
   */
  async getTotalStorageSize(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const stores = ['patients', 'appointments', 'treatments', 'clinics', 'syncQueue', 'settings'];
    let totalSize = 0;

    for (const storeName of stores) {
      try {
        const storeSize = await this.getStoreSize(storeName);
        totalSize += storeSize;
      } catch (error) {
        // Store might not exist, continue with others
        console.warn(`Failed to calculate size for store ${storeName}:`, error);
      }
    }

    return totalSize;
  }

  /**
   * Calculate the size of an object in bytes
   */
  private calculateObjectSize(obj: any): number {
    if (obj === null || obj === undefined) return 0;

    if (typeof obj === 'string') {
      return obj.length * 2; // UTF-16 characters
    }

    if (typeof obj === 'number') {
      return 8; // 64-bit number
    }

    if (typeof obj === 'boolean') {
      return 4; // Boolean value
    }

    if (obj instanceof Date) {
      return 8; // Date object
    }

    if (Array.isArray(obj)) {
      let size = 0;
      for (const item of obj) {
        size += this.calculateObjectSize(item);
      }
      return size + (obj.length * 8); // Array overhead
    }

    if (typeof obj === 'object') {
      let size = 0;
      for (const [key, value] of Object.entries(obj)) {
        size += key.length * 2; // Key size (UTF-16)
        size += this.calculateObjectSize(value); // Value size
        size += 16; // Property overhead
      }
      return size + 32; // Object overhead
    }

    return 0;
  }

  /**
   * Get storage statistics for a specific store
   */
  async getStoreStats(storeName: string): Promise<{
    itemCount: number;
    storageSize: number;
    unsyncedCount: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const allData = await this.getAll(storeName);
    const unsyncedData = allData.filter(item => !item.synced);
    const storageSize = await this.getStoreSize(storeName);

    return {
      itemCount: allData.length,
      storageSize,
      unsyncedCount: unsyncedData.length,
    };
  }
}

export const indexedDBManager = new IndexedDBManager();
