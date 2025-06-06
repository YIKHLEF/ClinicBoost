import { offlineStorageService } from './storage-service';
import { getPatients, getPatient, createPatient, updatePatient, deletePatient } from '../api/patients';
import { logger } from '../logging-monitoring';
import type { Database } from '../database.types';

type Patient = Database['public']['Tables']['patients']['Row'];
type PatientInsert = Database['public']['Tables']['patients']['Insert'];
type PatientUpdate = Database['public']['Tables']['patients']['Update'];

class OfflinePatientService {
  private generateTempId(): string {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getPatients(clinicId?: string): Promise<Patient[]> {
    try {
      // Try online first if we have a connection
      if (navigator.onLine) {
        const onlinePatients = await getPatients(clinicId);
        
        // Store successful result offline for future use
        for (const patient of onlinePatients) {
          await offlineStorageService.storePatient(patient, true);
        }
        
        logger.debug('Fetched patients online', 'offline-patient-service', { 
          count: onlinePatients.length,
          clinicId 
        });
        
        return onlinePatients;
      }
    } catch (error) {
      logger.warn('Online patient fetch failed, falling back to offline storage', 'offline-patient-service', { 
        clinicId, 
        error 
      });
    }
    
    // Fall back to offline storage
    const offlinePatients = await offlineStorageService.getPatients(clinicId);
    
    logger.debug('Fetched patients offline', 'offline-patient-service', { 
      count: offlinePatients.length,
      clinicId 
    });
    
    return offlinePatients;
  }

  async getPatient(id: string): Promise<Patient | null> {
    try {
      // Try online first if we have a connection
      if (navigator.onLine) {
        const onlinePatient = await getPatient(id);
        
        if (onlinePatient) {
          // Store successful result offline
          await offlineStorageService.storePatient(onlinePatient, true);
          
          logger.debug('Fetched patient online', 'offline-patient-service', { id });
          return onlinePatient;
        }
      }
    } catch (error) {
      logger.warn('Online patient fetch failed, falling back to offline storage', 'offline-patient-service', { 
        id, 
        error 
      });
    }
    
    // Fall back to offline storage
    const offlinePatient = await offlineStorageService.getPatient(id);
    
    if (offlinePatient) {
      logger.debug('Fetched patient offline', 'offline-patient-service', { id });
    }
    
    return offlinePatient;
  }

  async createPatient(patientData: PatientInsert): Promise<Patient> {
    try {
      // Try online first if we have a connection
      if (navigator.onLine) {
        const createdPatient = await createPatient(patientData);
        
        // Store successful result offline
        await offlineStorageService.storePatient(createdPatient, true);
        
        logger.info('Created patient online', 'offline-patient-service', { 
          id: createdPatient.id 
        });
        
        return createdPatient;
      }
    } catch (error) {
      logger.warn('Online patient creation failed, creating offline', 'offline-patient-service', { 
        error 
      });
    }
    
    // Create offline with temporary ID
    const tempId = this.generateTempId();
    const tempPatient: Patient = {
      ...patientData,
      id: tempId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: patientData.status || 'active',
      risk_level: patientData.risk_level || 'low',
    } as Patient;
    
    // Store temporarily with unsynced flag
    await offlineStorageService.storePatient(tempPatient, false);
    
    // Queue operation for later sync
    await offlineStorageService.addToSyncQueue(
      'create',
      'patients',
      patientData,
      tempId
    );
    
    logger.info('Created patient offline', 'offline-patient-service', { 
      tempId,
      queuedForSync: true 
    });
    
    return tempPatient;
  }

  async updatePatient(id: string, patientData: PatientUpdate): Promise<Patient> {
    try {
      // Try online first if we have a connection
      if (navigator.onLine) {
        const updatedPatient = await updatePatient(id, patientData);
        
        // Store successful result offline
        await offlineStorageService.storePatient(updatedPatient, true);
        
        logger.info('Updated patient online', 'offline-patient-service', { id });
        
        return updatedPatient;
      }
    } catch (error) {
      logger.warn('Online patient update failed, updating offline', 'offline-patient-service', { 
        id, 
        error 
      });
    }
    
    // Get current patient data
    const currentPatient = await offlineStorageService.getPatient(id);
    if (!currentPatient) {
      throw new Error('Patient not found for offline update');
    }
    
    // Update offline
    const updatedPatient: Patient = {
      ...currentPatient,
      ...patientData,
      updated_at: new Date().toISOString(),
    };
    
    // Store with unsynced flag
    await offlineStorageService.storePatient(updatedPatient, false);
    
    // Queue operation for later sync
    await offlineStorageService.addToSyncQueue(
      'update',
      'patients',
      { id, ...patientData }
    );
    
    logger.info('Updated patient offline', 'offline-patient-service', { 
      id,
      queuedForSync: true 
    });
    
    return updatedPatient;
  }

  async deletePatient(id: string): Promise<void> {
    try {
      // Try online first if we have a connection
      if (navigator.onLine) {
        await deletePatient(id);
        
        // Remove from offline storage
        await offlineStorageService.remove('patients', id);
        
        logger.info('Deleted patient online', 'offline-patient-service', { id });
        
        return;
      }
    } catch (error) {
      logger.warn('Online patient deletion failed, deleting offline', 'offline-patient-service', { 
        id, 
        error 
      });
    }
    
    // Remove from offline storage optimistically
    await offlineStorageService.remove('patients', id);
    
    // Queue operation for later sync
    await offlineStorageService.addToSyncQueue(
      'delete',
      'patients',
      { id }
    );
    
    logger.info('Deleted patient offline', 'offline-patient-service', { 
      id,
      queuedForSync: true 
    });
  }

  async searchPatientsOffline(
    clinicId: string,
    searchTerm: string
  ): Promise<Patient[]> {
    const allPatients = await offlineStorageService.getPatients(clinicId);
    
    if (!searchTerm.trim()) {
      return allPatients;
    }
    
    const term = searchTerm.toLowerCase();
    
    return allPatients.filter(patient => 
      patient.first_name?.toLowerCase().includes(term) ||
      patient.last_name?.toLowerCase().includes(term) ||
      patient.email?.toLowerCase().includes(term) ||
      patient.phone?.toLowerCase().includes(term)
    );
  }

  async getUnsyncedPatients(): Promise<Patient[]> {
    const unsyncedData = await offlineStorageService.getUnsyncedData<Patient>('patients');
    return unsyncedData.map(item => item.data);
  }

  async markPatientAsSynced(id: string): Promise<void> {
    await offlineStorageService.markAsSynced('patients', id);
    logger.debug('Marked patient as synced', 'offline-patient-service', { id });
  }

  async getOfflineStats(clinicId?: string): Promise<{
    totalPatients: number;
    unsyncedPatients: number;
    tempPatients: number;
  }> {
    const allPatients = await offlineStorageService.getPatients(clinicId);
    const unsyncedData = await offlineStorageService.getUnsyncedData<Patient>('patients');
    
    const tempPatients = allPatients.filter(p => p.id.startsWith('temp_'));
    
    return {
      totalPatients: allPatients.length,
      unsyncedPatients: unsyncedData.length,
      tempPatients: tempPatients.length,
    };
  }
}

export const offlinePatientService = new OfflinePatientService();
