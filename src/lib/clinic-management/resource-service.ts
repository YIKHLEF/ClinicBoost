/**
 * Resource Management and Sharing Service
 * 
 * This module provides comprehensive resource management including:
 * - Clinic resource CRUD operations
 * - Cross-clinic resource sharing
 * - Resource availability management
 * - Sharing request workflow
 */

import { supabase } from '../supabase';
import { logger } from '../logging-monitoring';
import type { Database } from '../database.types';

type ClinicResource = Database['public']['Tables']['clinic_resources']['Row'];
type ClinicResourceInsert = Database['public']['Tables']['clinic_resources']['Insert'];
type ClinicResourceUpdate = Database['public']['Tables']['clinic_resources']['Update'];
type ResourceSharing = Database['public']['Tables']['resource_sharing']['Row'];
type ResourceSharingInsert = Database['public']['Tables']['resource_sharing']['Insert'];
type ResourceSharingUpdate = Database['public']['Tables']['resource_sharing']['Update'];

export interface ResourceWithSharing extends ClinicResource {
  clinic?: {
    id: string;
    name: string;
    city: string;
  };
  sharing_requests?: ResourceSharing[];
  current_sharing?: ResourceSharing;
}

export interface CreateResourceRequest {
  clinic_id: string;
  name: string;
  type: Database['public']['Enums']['resource_type'];
  description?: string;
  specifications?: Record<string, any>;
  location?: string;
  capacity?: number;
  cost_per_hour?: number;
  cost_per_use?: number;
  availability_schedule?: Record<string, any>;
  maintenance_schedule?: Record<string, any>;
  is_shareable?: boolean;
  sharing_terms?: string;
}

export interface ResourceSearchFilters {
  clinic_id?: string;
  type?: Database['public']['Enums']['resource_type'];
  is_available?: boolean;
  is_shareable?: boolean;
  name?: string;
  location?: string;
}

export interface SharingRequestFilters {
  requesting_clinic_id?: string;
  providing_clinic_id?: string;
  status?: Database['public']['Enums']['sharing_status'];
  resource_type?: Database['public']['Enums']['resource_type'];
  start_date?: string;
  end_date?: string;
}

export interface CreateSharingRequest {
  resource_id: string;
  requesting_clinic_id: string;
  start_time: string;
  end_time: string;
  terms?: string;
  notes?: string;
}

class ResourceManagementService {
  /**
   * Get clinic resources
   */
  async getClinicResources(
    clinicId: string,
    filters: ResourceSearchFilters = {}
  ): Promise<ResourceWithSharing[]> {
    try {
      let query = supabase
        .from('clinic_resources')
        .select(`
          *,
          clinic:clinics(id, name, city)
        `)
        .eq('clinic_id', clinicId);

      // Apply filters
      if (filters.type) query = query.eq('type', filters.type);
      if (filters.is_available !== undefined) query = query.eq('is_available', filters.is_available);
      if (filters.is_shareable !== undefined) query = query.eq('is_shareable', filters.is_shareable);
      if (filters.name) query = query.ilike('name', `%${filters.name}%`);
      if (filters.location) query = query.ilike('location', `%${filters.location}%`);

      const { data, error } = await query.order('name');

      if (error) throw error;

      // Get sharing information for each resource
      const resourcesWithSharing = await Promise.all(
        data.map(async (resource) => {
          const sharingRequests = await this.getResourceSharingRequests(resource.id);
          const currentSharing = sharingRequests.find(
            req => req.status === 'in_use' || req.status === 'approved'
          );

          return {
            ...resource,
            sharing_requests: sharingRequests,
            current_sharing: currentSharing
          };
        })
      );

      logger.info('Retrieved clinic resources', 'resource-management', {
        clinicId,
        resourceCount: resourcesWithSharing.length,
        filters
      });

      return resourcesWithSharing;
    } catch (error) {
      logger.error('Failed to get clinic resources', 'resource-management', {
        clinicId,
        filters,
        error
      });
      throw error;
    }
  }

  /**
   * Get shareable resources from other clinics
   */
  async getShareableResources(
    excludeClinicId: string,
    filters: ResourceSearchFilters = {}
  ): Promise<ResourceWithSharing[]> {
    try {
      let query = supabase
        .from('clinic_resources')
        .select(`
          *,
          clinic:clinics(id, name, city)
        `)
        .neq('clinic_id', excludeClinicId)
        .eq('is_shareable', true)
        .eq('is_available', true);

      // Apply filters
      if (filters.type) query = query.eq('type', filters.type);
      if (filters.name) query = query.ilike('name', `%${filters.name}%`);
      if (filters.location) query = query.ilike('location', `%${filters.location}%`);

      const { data, error } = await query.order('name');

      if (error) throw error;

      logger.info('Retrieved shareable resources', 'resource-management', {
        excludeClinicId,
        resourceCount: data.length,
        filters
      });

      return data;
    } catch (error) {
      logger.error('Failed to get shareable resources', 'resource-management', {
        excludeClinicId,
        filters,
        error
      });
      throw error;
    }
  }

  /**
   * Create a new resource
   */
  async createResource(request: CreateResourceRequest, userId: string): Promise<ClinicResource> {
    try {
      const { data, error } = await supabase
        .from('clinic_resources')
        .insert({
          ...request,
          created_by: userId,
          updated_by: userId
        })
        .select()
        .single();

      if (error) throw error;

      logger.info('Created resource', 'resource-management', {
        resourceId: data.id,
        name: data.name,
        type: data.type,
        clinicId: data.clinic_id,
        userId
      });

      return data;
    } catch (error) {
      logger.error('Failed to create resource', 'resource-management', {
        request,
        userId,
        error
      });
      throw error;
    }
  }

  /**
   * Update resource
   */
  async updateResource(
    resourceId: string,
    updates: ClinicResourceUpdate,
    userId: string
  ): Promise<ClinicResource> {
    try {
      const { data, error } = await supabase
        .from('clinic_resources')
        .update({
          ...updates,
          updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', resourceId)
        .select()
        .single();

      if (error) throw error;

      logger.info('Updated resource', 'resource-management', {
        resourceId,
        updates: Object.keys(updates),
        userId
      });

      return data;
    } catch (error) {
      logger.error('Failed to update resource', 'resource-management', {
        resourceId,
        updates,
        userId,
        error
      });
      throw error;
    }
  }

  /**
   * Delete resource
   */
  async deleteResource(resourceId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('clinic_resources')
        .delete()
        .eq('id', resourceId);

      if (error) throw error;

      logger.info('Deleted resource', 'resource-management', { resourceId, userId });
    } catch (error) {
      logger.error('Failed to delete resource', 'resource-management', {
        resourceId,
        userId,
        error
      });
      throw error;
    }
  }

  /**
   * Create sharing request
   */
  async createSharingRequest(
    request: CreateSharingRequest,
    requestedBy: string
  ): Promise<ResourceSharing> {
    try {
      // Get the providing clinic ID from the resource
      const { data: resource, error: resourceError } = await supabase
        .from('clinic_resources')
        .select('clinic_id')
        .eq('id', request.resource_id)
        .single();

      if (resourceError) throw resourceError;

      const { data, error } = await supabase
        .from('resource_sharing')
        .insert({
          ...request,
          providing_clinic_id: resource.clinic_id,
          requested_by: requestedBy,
          status: 'requested'
        })
        .select()
        .single();

      if (error) throw error;

      logger.info('Created sharing request', 'resource-management', {
        sharingId: data.id,
        resourceId: request.resource_id,
        requestingClinicId: request.requesting_clinic_id,
        providingClinicId: resource.clinic_id,
        requestedBy
      });

      return data;
    } catch (error) {
      logger.error('Failed to create sharing request', 'resource-management', {
        request,
        requestedBy,
        error
      });
      throw error;
    }
  }

  /**
   * Approve sharing request
   */
  async approveSharingRequest(
    sharingId: string,
    approvedBy: string,
    cost?: number
  ): Promise<ResourceSharing> {
    try {
      const { data, error } = await supabase
        .from('resource_sharing')
        .update({
          status: 'approved',
          approved_by: approvedBy,
          approved_at: new Date().toISOString(),
          cost,
          updated_at: new Date().toISOString()
        })
        .eq('id', sharingId)
        .select()
        .single();

      if (error) throw error;

      logger.info('Approved sharing request', 'resource-management', {
        sharingId,
        approvedBy,
        cost
      });

      return data;
    } catch (error) {
      logger.error('Failed to approve sharing request', 'resource-management', {
        sharingId,
        approvedBy,
        cost,
        error
      });
      throw error;
    }
  }

  /**
   * Decline sharing request
   */
  async declineSharingRequest(sharingId: string, declinedBy: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('resource_sharing')
        .update({
          status: 'declined',
          approved_by: declinedBy,
          updated_at: new Date().toISOString()
        })
        .eq('id', sharingId);

      if (error) throw error;

      logger.info('Declined sharing request', 'resource-management', {
        sharingId,
        declinedBy
      });
    } catch (error) {
      logger.error('Failed to decline sharing request', 'resource-management', {
        sharingId,
        declinedBy,
        error
      });
      throw error;
    }
  }

  /**
   * Get resource sharing requests
   */
  private async getResourceSharingRequests(resourceId: string): Promise<ResourceSharing[]> {
    const { data, error } = await supabase
      .from('resource_sharing')
      .select('*')
      .eq('resource_id', resourceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get sharing requests for a clinic
   */
  async getClinicSharingRequests(
    clinicId: string,
    filters: SharingRequestFilters = {}
  ): Promise<ResourceSharing[]> {
    try {
      let query = supabase
        .from('resource_sharing')
        .select(`
          *,
          resource:clinic_resources(id, name, type, clinic_id),
          requesting_clinic:clinics!requesting_clinic_id(id, name),
          providing_clinic:clinics!providing_clinic_id(id, name)
        `)
        .or(`requesting_clinic_id.eq.${clinicId},providing_clinic_id.eq.${clinicId}`);

      // Apply filters
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.start_date) query = query.gte('start_time', filters.start_date);
      if (filters.end_date) query = query.lte('end_time', filters.end_date);

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      logger.info('Retrieved clinic sharing requests', 'resource-management', {
        clinicId,
        requestCount: data.length,
        filters
      });

      return data;
    } catch (error) {
      logger.error('Failed to get clinic sharing requests', 'resource-management', {
        clinicId,
        filters,
        error
      });
      throw error;
    }
  }
}

// Export singleton instance
export const resourceService = new ResourceManagementService();

// Export utility functions
export const getClinicResources = (clinicId: string, filters?: ResourceSearchFilters) =>
  resourceService.getClinicResources(clinicId, filters);
export const getShareableResources = (excludeClinicId: string, filters?: ResourceSearchFilters) =>
  resourceService.getShareableResources(excludeClinicId, filters);
export const createResource = (request: CreateResourceRequest, userId: string) =>
  resourceService.createResource(request, userId);
export const updateResource = (resourceId: string, updates: ClinicResourceUpdate, userId: string) =>
  resourceService.updateResource(resourceId, updates, userId);
export const deleteResource = (resourceId: string, userId: string) =>
  resourceService.deleteResource(resourceId, userId);
export const createSharingRequest = (request: CreateSharingRequest, requestedBy: string) =>
  resourceService.createSharingRequest(request, requestedBy);
export const approveSharingRequest = (sharingId: string, approvedBy: string, cost?: number) =>
  resourceService.approveSharingRequest(sharingId, approvedBy, cost);
export const declineSharingRequest = (sharingId: string, declinedBy: string) =>
  resourceService.declineSharingRequest(sharingId, declinedBy);
export const getClinicSharingRequests = (clinicId: string, filters?: SharingRequestFilters) =>
  resourceService.getClinicSharingRequests(clinicId, filters);
