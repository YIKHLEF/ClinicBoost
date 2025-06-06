import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentClinicId } from '../contexts/ClinicContext';
import { 
  resourceService,
  type ResourceWithSharing,
  type CreateResourceRequest,
  type ResourceSearchFilters,
  type SharingRequestFilters,
  type CreateSharingRequest
} from '../lib/clinic-management/resource-service';
import type { Database } from '../lib/database.types';

type ClinicResourceUpdate = Database['public']['Tables']['clinic_resources']['Update'];

export const useClinicResources = (filters?: ResourceSearchFilters) => {
  const clinicId = useCurrentClinicId();
  
  return useQuery({
    queryKey: ['clinic-resources', clinicId, filters],
    queryFn: () => resourceService.getClinicResources(clinicId || '', filters),
    enabled: !!clinicId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useShareableResources = (filters?: ResourceSearchFilters) => {
  const clinicId = useCurrentClinicId();
  
  return useQuery({
    queryKey: ['shareable-resources', clinicId, filters],
    queryFn: () => resourceService.getShareableResources(clinicId || '', filters),
    enabled: !!clinicId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateResource = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const clinicId = useCurrentClinicId();
  
  return useMutation({
    mutationFn: (request: CreateResourceRequest) => 
      resourceService.createResource(request, user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-resources', clinicId] });
    },
  });
};

export const useUpdateResource = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const clinicId = useCurrentClinicId();
  
  return useMutation({
    mutationFn: ({ resourceId, updates }: { resourceId: string; updates: ClinicResourceUpdate }) =>
      resourceService.updateResource(resourceId, updates, user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-resources', clinicId] });
      queryClient.invalidateQueries({ queryKey: ['shareable-resources'] });
    },
  });
};

export const useDeleteResource = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const clinicId = useCurrentClinicId();
  
  return useMutation({
    mutationFn: (resourceId: string) => 
      resourceService.deleteResource(resourceId, user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-resources', clinicId] });
      queryClient.invalidateQueries({ queryKey: ['shareable-resources'] });
    },
  });
};

export const useCreateSharingRequest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const clinicId = useCurrentClinicId();
  
  return useMutation({
    mutationFn: (request: CreateSharingRequest) =>
      resourceService.createSharingRequest(request, user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharing-requests', clinicId] });
      queryClient.invalidateQueries({ queryKey: ['clinic-resources', clinicId] });
    },
  });
};

export const useApproveSharingRequest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const clinicId = useCurrentClinicId();
  
  return useMutation({
    mutationFn: ({ sharingId, cost }: { sharingId: string; cost?: number }) =>
      resourceService.approveSharingRequest(sharingId, user?.id || '', cost),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharing-requests', clinicId] });
      queryClient.invalidateQueries({ queryKey: ['clinic-resources', clinicId] });
    },
  });
};

export const useDeclineSharingRequest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const clinicId = useCurrentClinicId();
  
  return useMutation({
    mutationFn: (sharingId: string) =>
      resourceService.declineSharingRequest(sharingId, user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharing-requests', clinicId] });
      queryClient.invalidateQueries({ queryKey: ['clinic-resources', clinicId] });
    },
  });
};

export const useClinicSharingRequests = (filters?: SharingRequestFilters) => {
  const clinicId = useCurrentClinicId();
  
  return useQuery({
    queryKey: ['sharing-requests', clinicId, filters],
    queryFn: () => resourceService.getClinicSharingRequests(clinicId || '', filters),
    enabled: !!clinicId,
    staleTime: 5 * 60 * 1000,
  });
};
