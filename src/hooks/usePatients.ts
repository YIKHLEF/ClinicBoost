import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getPatients, getPatient, createPatient, updatePatient, deletePatient } from '../lib/api/patients';
import { subscribeToTable } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { useCurrentClinicId } from '../contexts/ClinicContext';
import type { Database } from '../lib/database.types';

type Patient = Database['public']['Tables']['patients']['Row'];
type PatientInsert = Database['public']['Tables']['patients']['Insert'];
type PatientUpdate = Database['public']['Tables']['patients']['Update'];

export const usePatients = (options?: { realtime?: boolean }) => {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const clinicId = useCurrentClinicId();

  const query = useQuery({
    queryKey: ['patients', clinicId],
    queryFn: () => getPatients(clinicId || undefined),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!clinicId, // Only fetch when clinic is selected
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
  return useQuery({
    queryKey: ['patients', id],
    queryFn: () => getPatient(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreatePatient = () => {
  const queryClient = useQueryClient();
  const clinicId = useCurrentClinicId();

  return useMutation({
    mutationFn: (patient: PatientInsert) => createPatient({
      ...patient,
      clinic_id: clinicId
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients', clinicId] });
    },
  });
};

export const useUpdatePatient = () => {
  const queryClient = useQueryClient();
  const clinicId = useCurrentClinicId();

  return useMutation({
    mutationFn: updatePatient,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patients', clinicId] });
      queryClient.invalidateQueries({ queryKey: ['patients', data.id] });
    },
  });
};

export const useDeletePatient = () => {
  const queryClient = useQueryClient();
  const clinicId = useCurrentClinicId();

  return useMutation({
    mutationFn: deletePatient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients', clinicId] });
    },
  });
};