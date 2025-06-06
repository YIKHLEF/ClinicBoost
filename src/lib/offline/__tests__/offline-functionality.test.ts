import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { offlineStorageService } from '../storage-service';
import { offlinePatientService } from '../offline-patient-service';
import { syncService } from '../sync-service';

// Mock IndexedDB
const mockRequest = {
  onerror: null,
  onsuccess: null,
  onupgradeneeded: null,
  result: null,
  error: null,
};

const mockIndexedDB = {
  open: vi.fn(() => mockRequest),
  deleteDatabase: vi.fn(),
};

// Mock global IndexedDB
global.indexedDB = mockIndexedDB as any;

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock patient data
const mockPatient = {
  id: 'test-patient-1',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  clinic_id: 'test-clinic-1',
  status: 'active' as const,
  risk_level: 'low' as const,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('Offline Storage Service', () => {
  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();

    // Reset mock request
    mockRequest.onerror = null;
    mockRequest.onsuccess = null;
    mockRequest.onupgradeneeded = null;
    mockRequest.result = null;
    mockRequest.error = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Patient Storage', () => {
    it('should store patient data offline', async () => {
      // Mock the storage service methods
      const storeSpy = vi.spyOn(offlineStorageService, 'storePatient').mockResolvedValue();
      
      await offlineStorageService.storePatient(mockPatient, false);
      
      expect(storeSpy).toHaveBeenCalledWith(mockPatient, false);
    });

    it('should retrieve patient data offline', async () => {
      // Mock the storage service methods
      const getSpy = vi.spyOn(offlineStorageService, 'getPatient').mockResolvedValue(mockPatient);
      
      const result = await offlineStorageService.getPatient('test-patient-1');
      
      expect(getSpy).toHaveBeenCalledWith('test-patient-1');
      expect(result).toEqual(mockPatient);
    });

    it('should retrieve all patients for a clinic', async () => {
      const mockPatients = [mockPatient];
      const getAllSpy = vi.spyOn(offlineStorageService, 'getPatients').mockResolvedValue(mockPatients);
      
      const result = await offlineStorageService.getPatients('test-clinic-1');
      
      expect(getAllSpy).toHaveBeenCalledWith('test-clinic-1');
      expect(result).toEqual(mockPatients);
    });
  });

  describe('Sync Queue', () => {
    it('should add operations to sync queue', async () => {
      const addToQueueSpy = vi.spyOn(offlineStorageService, 'addToSyncQueue').mockResolvedValue('queue-id-1');
      
      const queueId = await offlineStorageService.addToSyncQueue(
        'create',
        'patients',
        mockPatient
      );
      
      expect(addToQueueSpy).toHaveBeenCalledWith('create', 'patients', mockPatient);
      expect(queueId).toBe('queue-id-1');
    });

    it('should retrieve sync queue', async () => {
      const mockQueue = [
        {
          id: 'queue-1',
          type: 'create' as const,
          table: 'patients',
          data: mockPatient,
          timestamp: Date.now(),
          retryCount: 0,
        },
      ];
      
      const getQueueSpy = vi.spyOn(offlineStorageService, 'getSyncQueue').mockResolvedValue(mockQueue);
      
      const result = await offlineStorageService.getSyncQueue();
      
      expect(getQueueSpy).toHaveBeenCalled();
      expect(result).toEqual(mockQueue);
    });
  });
});

describe('Offline Patient Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Online Operations', () => {
    beforeEach(() => {
      // Mock online state
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
      });
    });

    it('should create patient online when connected', async () => {
      // Mock successful online creation
      const mockCreatePatient = vi.fn().mockResolvedValue(mockPatient);
      vi.doMock('../../api/patients', () => ({
        createPatient: mockCreatePatient,
      }));

      const storeSpy = vi.spyOn(offlineStorageService, 'storePatient').mockResolvedValue();
      
      const result = await offlinePatientService.createPatient({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        clinic_id: 'test-clinic-1',
      });
      
      expect(result).toEqual(mockPatient);
      expect(storeSpy).toHaveBeenCalledWith(mockPatient, true);
    });
  });

  describe('Offline Operations', () => {
    beforeEach(() => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      });
    });

    it('should create patient offline when disconnected', async () => {
      const storeSpy = vi.spyOn(offlineStorageService, 'storePatient').mockResolvedValue();
      const addToQueueSpy = vi.spyOn(offlineStorageService, 'addToSyncQueue').mockResolvedValue('queue-id');
      
      const result = await offlinePatientService.createPatient({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        clinic_id: 'test-clinic-1',
      });
      
      expect(result.id).toMatch(/^temp_/);
      expect(storeSpy).toHaveBeenCalledWith(expect.objectContaining({
        first_name: 'John',
        last_name: 'Doe',
      }), false);
      expect(addToQueueSpy).toHaveBeenCalledWith('create', 'patients', expect.any(Object), expect.any(String));
    });

    it('should retrieve patients from offline storage', async () => {
      const mockPatients = [mockPatient];
      const getSpy = vi.spyOn(offlineStorageService, 'getPatients').mockResolvedValue(mockPatients);
      
      const result = await offlinePatientService.getPatients('test-clinic-1');
      
      expect(getSpy).toHaveBeenCalledWith('test-clinic-1');
      expect(result).toEqual(mockPatients);
    });

    it('should search patients offline', async () => {
      const mockPatients = [mockPatient];
      const getSpy = vi.spyOn(offlineStorageService, 'getPatients').mockResolvedValue(mockPatients);
      
      const result = await offlinePatientService.searchPatientsOffline('test-clinic-1', 'John');
      
      expect(getSpy).toHaveBeenCalledWith('test-clinic-1');
      expect(result).toEqual(mockPatients);
    });
  });
});

describe('Sync Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock online state
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
    });
  });

  it('should process sync queue when online', async () => {
    const mockQueue = [
      {
        id: 'queue-1',
        type: 'create' as const,
        table: 'patients',
        data: mockPatient,
        timestamp: Date.now(),
        retryCount: 0,
      },
    ];
    
    const getQueueSpy = vi.spyOn(offlineStorageService, 'getSyncQueue').mockResolvedValue(mockQueue);
    const removeQueueSpy = vi.spyOn(offlineStorageService, 'removeSyncOperation').mockResolvedValue();
    
    // Mock successful sync
    const syncQueueSpy = vi.spyOn(syncService, 'syncQueue').mockResolvedValue({
      success: true,
      syncedCount: 1,
      failedCount: 0,
      errors: [],
    });
    
    const result = await syncService.syncQueue();
    
    expect(result.success).toBe(true);
    expect(result.syncedCount).toBe(1);
    expect(result.failedCount).toBe(0);
  });

  it('should handle sync errors gracefully', async () => {
    const mockQueue = [
      {
        id: 'queue-1',
        type: 'create' as const,
        table: 'patients',
        data: mockPatient,
        timestamp: Date.now(),
        retryCount: 0,
      },
    ];
    
    const getQueueSpy = vi.spyOn(offlineStorageService, 'getSyncQueue').mockResolvedValue(mockQueue);
    
    // Mock sync failure
    const syncQueueSpy = vi.spyOn(syncService, 'syncQueue').mockResolvedValue({
      success: false,
      syncedCount: 0,
      failedCount: 1,
      errors: [{ operation: mockQueue[0], error: 'Network error' }],
    });
    
    const result = await syncService.syncQueue();
    
    expect(result.success).toBe(false);
    expect(result.failedCount).toBe(1);
    expect(result.errors).toHaveLength(1);
  });
});
