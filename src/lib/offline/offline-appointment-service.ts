import { offlineStorageService } from './storage-service';
import { getAppointments, getAppointment, createAppointment, updateAppointment, deleteAppointment } from '../api/appointments';
import { logger } from '../logging-monitoring';
import type { Database } from '../database.types';

type Appointment = Database['public']['Tables']['appointments']['Row'];
type AppointmentInsert = Database['public']['Tables']['appointments']['Insert'];
type AppointmentUpdate = Database['public']['Tables']['appointments']['Update'];

class OfflineAppointmentService {
  private generateTempId(): string {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getAppointments(clinicId?: string): Promise<Appointment[]> {
    try {
      // Try online first if we have a connection
      if (navigator.onLine) {
        const onlineAppointments = await getAppointments(clinicId);
        
        // Store successful result offline for future use
        for (const appointment of onlineAppointments) {
          await offlineStorageService.storeAppointment(appointment, true);
        }
        
        logger.debug('Fetched appointments online', 'offline-appointment-service', { 
          count: onlineAppointments.length,
          clinicId 
        });
        
        return onlineAppointments;
      }
    } catch (error) {
      logger.warn('Online appointment fetch failed, falling back to offline storage', 'offline-appointment-service', { 
        clinicId, 
        error 
      });
    }
    
    // Fall back to offline storage
    const offlineAppointments = await offlineStorageService.getAppointments(clinicId);
    
    logger.debug('Fetched appointments offline', 'offline-appointment-service', { 
      count: offlineAppointments.length,
      clinicId 
    });
    
    return offlineAppointments;
  }

  async getAppointment(id: string): Promise<Appointment | null> {
    try {
      // Try online first if we have a connection
      if (navigator.onLine) {
        const onlineAppointment = await getAppointment(id);
        
        if (onlineAppointment) {
          // Store successful result offline
          await offlineStorageService.storeAppointment(onlineAppointment, true);
          
          logger.debug('Fetched appointment online', 'offline-appointment-service', { id });
          return onlineAppointment;
        }
      }
    } catch (error) {
      logger.warn('Online appointment fetch failed, falling back to offline storage', 'offline-appointment-service', { 
        id, 
        error 
      });
    }
    
    // Fall back to offline storage
    const offlineAppointment = await offlineStorageService.getAppointment(id);
    
    if (offlineAppointment) {
      logger.debug('Fetched appointment offline', 'offline-appointment-service', { id });
    }
    
    return offlineAppointment;
  }

  async createAppointment(appointmentData: AppointmentInsert): Promise<Appointment> {
    try {
      // Try online first if we have a connection
      if (navigator.onLine) {
        const createdAppointment = await createAppointment(appointmentData);
        
        // Store successful result offline
        await offlineStorageService.storeAppointment(createdAppointment, true);
        
        logger.info('Created appointment online', 'offline-appointment-service', { 
          id: createdAppointment.id 
        });
        
        return createdAppointment;
      }
    } catch (error) {
      logger.warn('Online appointment creation failed, creating offline', 'offline-appointment-service', { 
        error 
      });
    }
    
    // Create offline with temporary ID
    const tempId = this.generateTempId();
    const tempAppointment: Appointment = {
      ...appointmentData,
      id: tempId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: appointmentData.status || 'scheduled',
    } as Appointment;
    
    // Store temporarily with unsynced flag
    await offlineStorageService.storeAppointment(tempAppointment, false);
    
    // Queue operation for later sync
    await offlineStorageService.addToSyncQueue(
      'create',
      'appointments',
      appointmentData,
      tempId
    );
    
    logger.info('Created appointment offline', 'offline-appointment-service', { 
      tempId,
      queuedForSync: true 
    });
    
    return tempAppointment;
  }

  async updateAppointment(id: string, appointmentData: AppointmentUpdate): Promise<Appointment> {
    try {
      // Try online first if we have a connection
      if (navigator.onLine) {
        const updatedAppointment = await updateAppointment(id, appointmentData);
        
        // Store successful result offline
        await offlineStorageService.storeAppointment(updatedAppointment, true);
        
        logger.info('Updated appointment online', 'offline-appointment-service', { id });
        
        return updatedAppointment;
      }
    } catch (error) {
      logger.warn('Online appointment update failed, updating offline', 'offline-appointment-service', { 
        id, 
        error 
      });
    }
    
    // Get current appointment data
    const currentAppointment = await offlineStorageService.getAppointment(id);
    if (!currentAppointment) {
      throw new Error('Appointment not found for offline update');
    }
    
    // Update offline
    const updatedAppointment: Appointment = {
      ...currentAppointment,
      ...appointmentData,
      updated_at: new Date().toISOString(),
    };
    
    // Store with unsynced flag
    await offlineStorageService.storeAppointment(updatedAppointment, false);
    
    // Queue operation for later sync
    await offlineStorageService.addToSyncQueue(
      'update',
      'appointments',
      { id, ...appointmentData }
    );
    
    logger.info('Updated appointment offline', 'offline-appointment-service', { 
      id,
      queuedForSync: true 
    });
    
    return updatedAppointment;
  }

  async deleteAppointment(id: string): Promise<void> {
    try {
      // Try online first if we have a connection
      if (navigator.onLine) {
        await deleteAppointment(id);
        
        // Remove from offline storage
        await offlineStorageService.remove('appointments', id);
        
        logger.info('Deleted appointment online', 'offline-appointment-service', { id });
        
        return;
      }
    } catch (error) {
      logger.warn('Online appointment deletion failed, deleting offline', 'offline-appointment-service', { 
        id, 
        error 
      });
    }
    
    // Remove from offline storage optimistically
    await offlineStorageService.remove('appointments', id);
    
    // Queue operation for later sync
    await offlineStorageService.addToSyncQueue(
      'delete',
      'appointments',
      { id }
    );
    
    logger.info('Deleted appointment offline', 'offline-appointment-service', { 
      id,
      queuedForSync: true 
    });
  }

  async getAppointmentsByPatient(patientId: string): Promise<Appointment[]> {
    const allAppointments = await this.getAppointments();
    return allAppointments.filter(appointment => appointment.patient_id === patientId);
  }

  async getAppointmentsByDateRange(
    startDate: string,
    endDate: string,
    clinicId?: string
  ): Promise<Appointment[]> {
    const allAppointments = await this.getAppointments(clinicId);
    
    return allAppointments.filter(appointment => {
      const appointmentDate = new Date(appointment.appointment_date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      return appointmentDate >= start && appointmentDate <= end;
    });
  }

  async searchAppointmentsOffline(
    clinicId: string,
    searchTerm: string
  ): Promise<Appointment[]> {
    const allAppointments = await offlineStorageService.getAppointments(clinicId);
    
    if (!searchTerm.trim()) {
      return allAppointments;
    }
    
    const term = searchTerm.toLowerCase();
    
    return allAppointments.filter(appointment => 
      appointment.notes?.toLowerCase().includes(term) ||
      appointment.status?.toLowerCase().includes(term)
    );
  }

  async getUnsyncedAppointments(): Promise<Appointment[]> {
    const unsyncedData = await offlineStorageService.getUnsyncedData<Appointment>('appointments');
    return unsyncedData.map(item => item.data);
  }

  async markAppointmentAsSynced(id: string): Promise<void> {
    await offlineStorageService.markAsSynced('appointments', id);
    logger.debug('Marked appointment as synced', 'offline-appointment-service', { id });
  }

  async getOfflineStats(clinicId?: string): Promise<{
    totalAppointments: number;
    unsyncedAppointments: number;
    tempAppointments: number;
    appointmentsByStatus: Record<string, number>;
  }> {
    const allAppointments = await offlineStorageService.getAppointments(clinicId);
    const unsyncedData = await offlineStorageService.getUnsyncedData<Appointment>('appointments');
    
    const tempAppointments = allAppointments.filter(a => a.id.startsWith('temp_'));
    
    const appointmentsByStatus = allAppointments.reduce((acc, appointment) => {
      const status = appointment.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalAppointments: allAppointments.length,
      unsyncedAppointments: unsyncedData.length,
      tempAppointments: tempAppointments.length,
      appointmentsByStatus,
    };
  }
}

export const offlineAppointmentService = new OfflineAppointmentService();
