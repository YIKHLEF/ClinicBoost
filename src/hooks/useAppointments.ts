import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAppointments, getAppointment, createAppointment, updateAppointment, deleteAppointment } from '../lib/api/appointments';
import { offlineAppointmentService } from '../lib/offline/offline-appointment-service';
import { useCurrentClinicId } from '../contexts/ClinicContext';
import { useOffline } from '../contexts/OfflineContext';
import { useToast } from '../components/ui/Toast';
import type { Database } from '../lib/database.types';

type Appointment = Database['public']['Tables']['appointments']['Row'];
type AppointmentInsert = Database['public']['Tables']['appointments']['Insert'];
type AppointmentUpdate = Database['public']['Tables']['appointments']['Update'];

export const useAppointments = (patientId?: string) => {
  const clinicId = useCurrentClinicId();
  const { isOnline } = useOffline();

  return useQuery({
    queryKey: ['appointments', clinicId, patientId],
    queryFn: () => offlineAppointmentService.getAppointments(clinicId || undefined),
    select: data => patientId ? data.filter(a => a.patient_id === patientId) : data,
    enabled: !!clinicId, // Only fetch when clinic is selected
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity, // 5 minutes online, never stale offline
    networkMode: 'offlineFirst',
  });
};

export const useAppointment = (id: string) => {
  const { isOnline } = useOffline();

  return useQuery({
    queryKey: ['appointments', id],
    queryFn: () => offlineAppointmentService.getAppointment(id),
    enabled: !!id,
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
    networkMode: 'offlineFirst',
  });
};

export const useCreateAppointment = () => {
  const queryClient = useQueryClient();
  const clinicId = useCurrentClinicId();
  const { addToast } = useToast();
  const { isOnline } = useOffline();

  return useMutation({
    mutationFn: (appointment: AppointmentInsert) => offlineAppointmentService.createAppointment({
      ...appointment,
      clinic_id: clinicId
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['appointments', clinicId] });
      queryClient.invalidateQueries({ queryKey: ['appointments', clinicId, data.patient_id] });

      if (!isOnline) {
        addToast({
          type: 'info',
          title: 'Appointment Created Offline',
          message: 'Appointment will be synced when connection is restored.',
        });
      }
    },
    networkMode: 'offlineFirst',
  });
};

export const useUpdateAppointment = () => {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { isOnline } = useOffline();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & AppointmentUpdate) =>
      offlineAppointmentService.updateAppointment(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments', data.id] });
      queryClient.invalidateQueries({ queryKey: ['appointments', data.patient_id] });

      if (!isOnline) {
        addToast({
          type: 'info',
          title: 'Appointment Updated Offline',
          message: 'Changes will be synced when connection is restored.',
        });
      }
    },
    networkMode: 'offlineFirst',
  });
};

export const useDeleteAppointment = () => {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { isOnline } = useOffline();

  return useMutation({
    mutationFn: (id: string) => offlineAppointmentService.deleteAppointment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });

      if (!isOnline) {
        addToast({
          type: 'info',
          title: 'Appointment Deleted Offline',
          message: 'Deletion will be synced when connection is restored.',
        });
      }
    },
    networkMode: 'offlineFirst',
  });
};

// New hooks for offline-specific functionality
export const useOfflineAppointmentSearch = (searchTerm: string) => {
  const clinicId = useCurrentClinicId();

  return useQuery({
    queryKey: ['appointments', 'search', clinicId, searchTerm],
    queryFn: () => offlineAppointmentService.searchAppointmentsOffline(clinicId || '', searchTerm),
    enabled: !!clinicId && searchTerm.length > 0,
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useOfflineAppointmentStats = () => {
  const clinicId = useCurrentClinicId();

  return useQuery({
    queryKey: ['appointments', 'offline-stats', clinicId],
    queryFn: () => offlineAppointmentService.getOfflineStats(clinicId || undefined),
    enabled: !!clinicId,
    refetchInterval: 60 * 1000, // Refresh every minute
  });
};