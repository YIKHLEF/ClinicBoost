import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { 
  clinicService, 
  type ClinicWithMembership, 
  type CreateClinicRequest 
} from '../lib/clinic-management/clinic-service';
import type { Database } from '../lib/database.types';

type Clinic = Database['public']['Tables']['clinics']['Row'];
type ClinicUpdate = Database['public']['Tables']['clinics']['Update'];

export const useUserClinics = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-clinics', user?.id],
    queryFn: () => clinicService.getUserClinics(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useClinic = (clinicId: string) => {
  return useQuery({
    queryKey: ['clinic', clinicId],
    queryFn: () => clinicService.getClinic(clinicId),
    enabled: !!clinicId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateClinic = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: (request: CreateClinicRequest) => 
      clinicService.createClinic(request, user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-clinics', user?.id] });
    },
  });
};

export const useUpdateClinic = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: ({ clinicId, updates }: { clinicId: string; updates: ClinicUpdate }) =>
      clinicService.updateClinic(clinicId, updates, user?.id || ''),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-clinics', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['clinic', data.id] });
    },
  });
};

export const useDeleteClinic = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: (clinicId: string) => 
      clinicService.deleteClinic(clinicId, user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-clinics', user?.id] });
    },
  });
};

export const useAddClinicMember = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: ({ 
      clinicId, 
      userId, 
      role, 
      permissions 
    }: { 
      clinicId: string; 
      userId: string; 
      role: Database['public']['Enums']['user_role'];
      permissions?: Record<string, any>;
    }) => clinicService.addClinicMember(clinicId, userId, role, permissions, user?.id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-clinics', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['clinic', variables.clinicId] });
    },
  });
};

export const useRemoveClinicMember = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: ({ clinicId, userId }: { clinicId: string; userId: string }) =>
      clinicService.removeClinicMember(clinicId, userId, user?.id || ''),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-clinics', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['clinic', variables.clinicId] });
    },
  });
};
