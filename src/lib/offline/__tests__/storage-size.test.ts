/**
 * Tests for storage size calculation functionality
 */

import { indexedDBManager } from '../indexeddb';
import { offlineStorageService } from '../storage-service';

// Mock IndexedDB for testing
const mockIndexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
};

const mockIDBDatabase = {
  createObjectStore: jest.fn(),
  transaction: jest.fn(),
  close: jest.fn(),
  objectStoreNames: {
    contains: jest.fn(() => false),
  },
};

const mockTransaction = {
  objectStore: jest.fn(),
  oncomplete: null,
  onerror: null,
};

const mockObjectStore = {
  put: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  createIndex: jest.fn(),
  index: jest.fn(),
};

// Setup global mocks
global.indexedDB = mockIndexedDB as any;
global.IDBDatabase = mockIDBDatabase as any;
global.IDBTransaction = mockTransaction as any;
global.IDBObjectStore = mockObjectStore as any;

describe('Storage Size Calculation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock responses
    mockIndexedDB.open.mockImplementation(() => ({
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: mockIDBDatabase,
    }));

    mockIDBDatabase.transaction.mockReturnValue(mockTransaction);
    mockTransaction.objectStore.mockReturnValue(mockObjectStore);
  });

  describe('IndexedDBManager storage size calculation', () => {
    test('should calculate object size correctly for primitives', () => {
      const manager = indexedDBManager as any;
      
      // Test string
      expect(manager.calculateObjectSize('hello')).toBe(10); // 5 chars * 2 bytes
      
      // Test number
      expect(manager.calculateObjectSize(42)).toBe(8);
      
      // Test boolean
      expect(manager.calculateObjectSize(true)).toBe(4);
      
      // Test null/undefined
      expect(manager.calculateObjectSize(null)).toBe(0);
      expect(manager.calculateObjectSize(undefined)).toBe(0);
    });

    test('should calculate object size correctly for complex objects', () => {
      const manager = indexedDBManager as any;
      
      // Test array
      const array = [1, 2, 3];
      const arraySize = manager.calculateObjectSize(array);
      expect(arraySize).toBe(3 * 8 + 3 * 8); // 3 numbers + array overhead
      
      // Test object
      const obj = { name: 'test', age: 25 };
      const objSize = manager.calculateObjectSize(obj);
      expect(objSize).toBeGreaterThan(0);
      expect(objSize).toBe(
        'name'.length * 2 + // key size
        'test'.length * 2 + // value size
        16 + // property overhead
        'age'.length * 2 + // key size
        8 + // number value size
        16 + // property overhead
        32 // object overhead
      );
    });

    test('should calculate object size correctly for Date objects', () => {
      const manager = indexedDBManager as any;
      const date = new Date();
      expect(manager.calculateObjectSize(date)).toBe(8);
    });

    test('should handle nested objects correctly', () => {
      const manager = indexedDBManager as any;
      
      const nestedObj = {
        user: {
          name: 'John',
          details: {
            age: 30,
            active: true
          }
        },
        items: [1, 2, 3]
      };
      
      const size = manager.calculateObjectSize(nestedObj);
      expect(size).toBeGreaterThan(0);
    });
  });

  describe('Storage statistics', () => {
    test('should return storage stats with calculated size', async () => {
      // Mock data for testing
      const mockPatients = [
        {
          id: '1',
          data: { name: 'John Doe', age: 30 },
          timestamp: Date.now(),
          version: 1,
          synced: true,
          lastModified: Date.now(),
        },
        {
          id: '2',
          data: { name: 'Jane Smith', age: 25 },
          timestamp: Date.now(),
          version: 1,
          synced: false,
          lastModified: Date.now(),
        },
      ];

      const mockAppointments = [
        {
          id: '1',
          data: { patientId: '1', date: '2024-01-15' },
          timestamp: Date.now(),
          version: 1,
          synced: true,
          lastModified: Date.now(),
        },
      ];

      // Setup mock responses
      mockObjectStore.getAll.mockImplementation(() => ({
        onsuccess: null,
        onerror: null,
        result: [],
      }));

      // Mock the init method to avoid actual IndexedDB operations
      jest.spyOn(indexedDBManager, 'init').mockResolvedValue();
      jest.spyOn(indexedDBManager, 'getAll').mockImplementation(async (storeName) => {
        switch (storeName) {
          case 'patients':
            return mockPatients;
          case 'appointments':
            return mockAppointments;
          default:
            return [];
        }
      });

      jest.spyOn(indexedDBManager, 'getTotalStorageSize').mockResolvedValue(1024);

      const stats = await offlineStorageService.getStorageStats();

      expect(stats).toEqual({
        totalItems: 3, // 2 patients + 1 appointment
        unsyncedItems: 1, // 1 unsynced patient
        syncQueueSize: 0,
        storageSize: 1024,
      });
    });

    test('should format storage size correctly', () => {
      expect(offlineStorageService.formatStorageSize(0)).toBe('0 B');
      expect(offlineStorageService.formatStorageSize(512)).toBe('512.0 B');
      expect(offlineStorageService.formatStorageSize(1024)).toBe('1.0 KB');
      expect(offlineStorageService.formatStorageSize(1048576)).toBe('1.0 MB');
      expect(offlineStorageService.formatStorageSize(1073741824)).toBe('1.0 GB');
    });

    test('should get detailed storage stats', async () => {
      // Mock the methods
      jest.spyOn(indexedDBManager, 'init').mockResolvedValue();
      jest.spyOn(indexedDBManager, 'getStoreStats').mockImplementation(async (storeName) => ({
        itemCount: storeName === 'patients' ? 2 : 1,
        storageSize: storeName === 'patients' ? 512 : 256,
        unsyncedCount: storeName === 'patients' ? 1 : 0,
      }));
      jest.spyOn(indexedDBManager, 'getStoreSize').mockResolvedValue(128);
      jest.spyOn(offlineStorageService, 'getSyncQueue').mockResolvedValue([]);

      const detailedStats = await offlineStorageService.getDetailedStorageStats();

      expect(detailedStats.totalStats.totalItems).toBe(5); // 2+1+1+1 for each store
      expect(detailedStats.totalStats.storageSize).toBeGreaterThan(0);
      expect(detailedStats.storeStats).toHaveProperty('patients');
      expect(detailedStats.storeStats).toHaveProperty('appointments');
      expect(detailedStats.storeStats).toHaveProperty('treatments');
      expect(detailedStats.storeStats).toHaveProperty('clinics');
    });
  });

  describe('Storage quota estimation', () => {
    test('should return null when storage API is not available', async () => {
      // Mock navigator without storage API
      const originalNavigator = global.navigator;
      (global as any).navigator = {};

      const percentage = await offlineStorageService.getStorageUsagePercentage();
      expect(percentage).toBeNull();

      global.navigator = originalNavigator;
    });

    test('should calculate storage percentage when API is available', async () => {
      // Mock navigator with storage API
      const mockEstimate = {
        quota: 1000000,
        usage: 250000,
      };

      const originalNavigator = global.navigator;
      (global as any).navigator = {
        storage: {
          estimate: jest.fn().mockResolvedValue(mockEstimate),
        },
      };

      const percentage = await offlineStorageService.getStorageUsagePercentage();
      expect(percentage).toBe(25); // 250000 / 1000000 * 100

      global.navigator = originalNavigator;
    });
  });
});
