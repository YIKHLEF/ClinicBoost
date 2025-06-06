import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getPatients, getPatient, createPatient, updatePatient, deletePatient } from '../lib/api/patients';
import { offlinePatientService } from '../lib/offline/offline-patient-service';
import { subscribeToTable } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { useCurrentClinicId } from '../contexts/ClinicContext';
import { useOffline } from '../contexts/OfflineContext';
import type { Database } from '../lib/database.types';

type Patient = Database['public']['Tables']['patients']['Row'];
type PatientInsert = Database['public']['Tables']['patients']['Insert'];
type PatientUpdate = Database['public']['Tables']['patients']['Update'];

export const usePatients = (options?: { realtime?: boolean }) => {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const clinicId = useCurrentClinicId();
  const { isOnline } = useOffline();

  const query = useQuery({
    queryKey: ['patients', clinicId],
    queryFn: () => offlinePatientService.getPatients(clinicId || undefined),
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity, // 5 minutes online, never stale offline
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!clinicId, // Only fetch when clinic is selected
    networkMode: 'offlineFirst', // Enable offline-first behavior
  });

  // Real-time subscription
  useEffect(() => {
    if (!options?.realtime) return;

    const unsubscribe = subscribeToTable(
      'patients',
      (payload) => {
        console.log('Patient change detected:', payload);

        // Invalidate and refetch patients data
        queryClient.invalidateQueries({ queryKey: ['patients', clinicId] });

        // Show notification for changes
        if (payload.eventType === 'INSERT') {
          addToast({
            type: 'info',
            title: 'New Patient Added',
            message: `${payload.new.first_name} ${payload.new.last_name} has been added.`,
          });
        } else if (payload.eventType === 'UPDATE') {
          addToast({
            type: 'info',
            title: 'Patient Updated',
            message: `${payload.new.first_name} ${payload.new.last_name} has been updated.`,
          });
        }
      }
    );

    return unsubscribe;
  }, [options?.realtime, queryClient, addToast]);

  return query;
};

export const usePatient = (id: string) => {
  const { isOnline } = useOffline();

  return useQuery({
    queryKey: ['patients', id],
    queryFn: () => offlinePatientService.getPatient(id),
    enabled: !!id,
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
    networkMode: 'offlineFirst',
  });
};

export const useCreatePatient = () => {
  const queryClient = useQueryClient();
  const clinicId = useCurrentClinicId();
  const { addToast } = useToast();
  const { isOnline } = useOffline();

  return useMutation({
    mutationFn: (patient: PatientInsert) => offlinePatientService.createPatient({
      ...patient,
      clinic_id: clinicId
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patients', clinicId] });

      if (!isOnline) {
        addToast({
          type: 'info',
          title: 'Patient Created Offline',
          message: 'Patient will be synced when connection is restored.',
        });
      }
    },
    networkMode: 'offlineFirst',
  });
};

export const useUpdatePatient = () => {
  const queryClient = useQueryClient();
  const clinicId = useCurrentClinicId();
  const { addToast } = useToast();
  const { isOnline } = useOffline();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & PatientUpdate) =>
      offlinePatientService.updatePatient(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patients', clinicId] });
      queryClient.invalidateQueries({ queryKey: ['patients', data.id] });

      if (!isOnline) {
        addToast({
          type: 'info',
          title: 'Patient Updated Offline',
          message: 'Changes will be synced when connection is restored.',
        });
      }
    },
    networkMode: 'offlineFirst',
  });
};

export const useDeletePatient = () => {
  const queryClient = useQueryClient();
  const clinicId = useCurrentClinicId();
  const { addToast } = useToast();
  const { isOnline } = useOffline();

  return useMutation({
    mutationFn: (id: string) => offlinePatientService.deletePatient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients', clinicId] });

      if (!isOnline) {
        addToast({
          type: 'info',
          title: 'Patient Deleted Offline',
          message: 'Deletion will be synced when connection is restored.',
        });
      }
    },
    networkMode: 'offlineFirst',
  });
};

// New hook for offline patient search
export const useOfflinePatientSearch = (searchTerm: string) => {
  const clinicId = useCurrentClinicId();

  return useQuery({
    queryKey: ['patients', 'search', clinicId, searchTerm],
    queryFn: () => offlinePatientService.searchPatientsOffline(clinicId || '', searchTerm),
    enabled: !!clinicId && searchTerm.length > 0,
    staleTime: 30 * 1000, // 30 seconds
  });
};

// Hook for getting offline patient statistics
export const useOfflinePatientStats = () => {
  const clinicId = useCurrentClinicId();

  return useQuery({
    queryKey: ['patients', 'offline-stats', clinicId],
    queryFn: () => offlinePatientService.getOfflineStats(clinicId || undefined),
    enabled: !!clinicId,
    refetchInterval: 60 * 1000, // Refresh every minute
  });
};