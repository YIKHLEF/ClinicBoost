import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTreatments, getTreatment, createTreatment, updateTreatment, deleteTreatment } from '../lib/api/treatments';
import type { Database } from '../lib/database.types';

type Treatment = Database['public']['Tables']['treatments']['Row'];
type TreatmentInsert = Database['public']['Tables']['treatments']['Insert'];
type TreatmentUpdate = Database['public']['Tables']['treatments']['Update'];

export const useTreatments = (patientId?: string) => {
  return useQuery({
    queryKey: ['treatments', patientId],
    queryFn: () => getTreatments(),
    select: data => patientId ? data.filter(t => t.patient_id === patientId) : data,
  });
};

export const useTreatment = (id: string) => {
  return useQuery({
    queryKey: ['treatments', id],
    queryFn: () => getTreatment(id),
    enabled: !!id,
  });
};

export const useCreateTreatment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createTreatment,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['treatments'] });
      queryClient.invalidateQueries({ queryKey: ['treatments', data.patient_id] });
    },
  });
};

export const useUpdateTreatment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateTreatment,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['treatments'] });
      queryClient.invalidateQueries({ queryKey: ['treatments', data.id] });
      queryClient.invalidateQueries({ queryKey: ['treatments', data.patient_id] });
    },
  });
};

export const useDeleteTreatment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteTreatment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatments'] });
    },
  });
};