import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAppointments, getAppointment, createAppointment, updateAppointment, deleteAppointment } from '../lib/api/appointments';
import { useCurrentClinicId } from '../contexts/ClinicContext';
import type { Database } from '../lib/database.types';

type Appointment = Database['public']['Tables']['appointments']['Row'];
type AppointmentInsert = Database['public']['Tables']['appointments']['Insert'];
type AppointmentUpdate = Database['public']['Tables']['appointments']['Update'];

export const useAppointments = (patientId?: string) => {
  const clinicId = useCurrentClinicId();

  return useQuery({
    queryKey: ['appointments', clinicId, patientId],
    queryFn: () => getAppointments(clinicId || undefined),
    select: data => patientId ? data.filter(a => a.patient_id === patientId) : data,
    enabled: !!clinicId, // Only fetch when clinic is selected
  });
};

export const useAppointment = (id: string) => {
  return useQuery({
    queryKey: ['appointments', id],
    queryFn: () => getAppointment(id),
    enabled: !!id,
  });
};

export const useCreateAppointment = () => {
  const queryClient = useQueryClient();
  const clinicId = useCurrentClinicId();

  return useMutation({
    mutationFn: (appointment: AppointmentInsert) => createAppointment({
      ...appointment,
      clinic_id: clinicId
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['appointments', clinicId] });
      queryClient.invalidateQueries({ queryKey: ['appointments', clinicId, data.patient_id] });
    },
  });
};

export const useUpdateAppointment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateAppointment,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments', data.id] });
      queryClient.invalidateQueries({ queryKey: ['appointments', data.patient_id] });
    },
  });
};

export const useDeleteAppointment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
};