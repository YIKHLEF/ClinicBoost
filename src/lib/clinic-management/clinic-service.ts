/**
 * Clinic Management Service
 * 
 * This module provides comprehensive clinic management including:
 * - Clinic CRUD operations
 * - Multi-clinic user management
 * - Clinic switching functionality
 * - Resource management
 * - Cross-clinic resource sharing
 */

import { supabase, isDemoMode } from '../supabase';
import { logger } from '../logging-monitoring';
import type { Database } from '../database.types';

type Clinic = Database['public']['Tables']['clinics']['Row'];
type ClinicInsert = Database['public']['Tables']['clinics']['Insert'];
type ClinicUpdate = Database['public']['Tables']['clinics']['Update'];
type ClinicMembership = Database['public']['Tables']['clinic_memberships']['Row'];
type ClinicResource = Database['public']['Tables']['clinic_resources']['Row'];
type ResourceSharing = Database['public']['Tables']['resource_sharing']['Row'];

export interface ClinicWithMembership extends Clinic {
  membership?: ClinicMembership;
  memberCount?: number;
  resourceCount?: number;
}

export interface CreateClinicRequest {
  name: string;
  type: Database['public']['Enums']['clinic_type'];
  description?: string;
  address: string;
  city: string;
  postal_code?: string;
  country?: string;
  phone: string;
  email: string;
  website?: string;
  license_number?: string;
  tax_id?: string;
  working_hours?: Record<string, any>;
  timezone?: string;
}

export interface ClinicSearchFilters {
  name?: string;
  type?: Database['public']['Enums']['clinic_type'];
  city?: string;
  country?: string;
  is_active?: boolean;
  owner_id?: string;
}

export interface ResourceSearchFilters {
  clinic_id?: string;
  type?: Database['public']['Enums']['resource_type'];
  is_available?: boolean;
  is_shareable?: boolean;
  name?: string;
}

export interface ResourceSharingRequest {
  resource_id: string;
  requesting_clinic_id: string;
  start_time: string;
  end_time: string;
  terms?: string;
  notes?: string;
}

class ClinicManagementService {
  /**
   * Get all clinics for the current user
   */
  async getUserClinics(userId: string): Promise<ClinicWithMembership[]> {
    try {
      if (isDemoMode) {
        // Return demo clinic data
        const demoClinic: ClinicWithMembership = {
          id: 'demo-clinic-1',
          name: 'Demo Medical Center',
          type: 'general',
          address: '123 Demo Street',
          city: 'Demo City',
          postal_code: '12345',
          phone: '+1-555-0123',
          email: 'contact@demo-clinic.com',
          website: 'https://demo-clinic.com',
          description: 'A demo clinic for testing purposes',
          is_active: true,
          owner_id: userId,
          created_by: userId,
          updated_by: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          membership: {
            id: 'demo-membership-1',
            clinic_id: 'demo-clinic-1',
            user_id: userId,
            role: 'admin',
            permissions: {},
            is_active: true,
            joined_at: new Date().toISOString(),
            created_by: userId,
            updated_by: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            left_at: null
          },
          memberCount: 5,
          resourceCount: 10
        };

        logger.info('Retrieved demo user clinics', 'clinic-management', {
          userId,
          clinicCount: 1
        });

        return [demoClinic];
      }

      const { data, error } = await supabase
        .from('clinics')
        .select(`
          *,
          clinic_memberships!inner(
            id,
            role,
            permissions,
            is_active,
            joined_at
          )
        `)
        .eq('clinic_memberships.user_id', userId)
        .eq('clinic_memberships.is_active', true)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      // Get member and resource counts for each clinic
      const clinicsWithCounts = await Promise.all(
        data.map(async (clinic) => {
          const [memberCount, resourceCount] = await Promise.all([
            this.getClinicMemberCount(clinic.id),
            this.getClinicResourceCount(clinic.id)
          ]);

          return {
            ...clinic,
            membership: clinic.clinic_memberships[0],
            memberCount,
            resourceCount
          };
        })
      );

      logger.info('Retrieved user clinics', 'clinic-management', {
        userId,
        clinicCount: clinicsWithCounts.length
      });

      return clinicsWithCounts;
    } catch (error) {
      logger.error('Failed to get user clinics', 'clinic-management', { userId, error });
      throw error;
    }
  }

  /**
   * Get clinic by ID
   */
  async getClinic(clinicId: string): Promise<Clinic | null> {
    try {
      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', clinicId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      logger.info('Retrieved clinic', 'clinic-management', { clinicId });
      return data;
    } catch (error) {
      logger.error('Failed to get clinic', 'clinic-management', { clinicId, error });
      throw error;
    }
  }

  /**
   * Create a new clinic
   */
  async createClinic(request: CreateClinicRequest, ownerId: string): Promise<Clinic> {
    try {
      const { data, error } = await supabase
        .from('clinics')
        .insert({
          ...request,
          owner_id: ownerId,
          created_by: ownerId,
          updated_by: ownerId
        })
        .select()
        .single();

      if (error) throw error;

      // Create membership for the owner
      await this.addClinicMember(data.id, ownerId, 'admin');

      logger.info('Created clinic', 'clinic-management', {
        clinicId: data.id,
        name: data.name,
        ownerId
      });

      return data;
    } catch (error) {
      logger.error('Failed to create clinic', 'clinic-management', { request, ownerId, error });
      throw error;
    }
  }

  /**
   * Update clinic
   */
  async updateClinic(clinicId: string, updates: ClinicUpdate, userId: string): Promise<Clinic> {
    try {
      const { data, error } = await supabase
        .from('clinics')
        .update({
          ...updates,
          updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', clinicId)
        .select()
        .single();

      if (error) throw error;

      logger.info('Updated clinic', 'clinic-management', {
        clinicId,
        updates: Object.keys(updates),
        userId
      });

      return data;
    } catch (error) {
      logger.error('Failed to update clinic', 'clinic-management', { clinicId, updates, userId, error });
      throw error;
    }
  }

  /**
   * Delete clinic
   */
  async deleteClinic(clinicId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('clinics')
        .delete()
        .eq('id', clinicId)
        .eq('owner_id', userId);

      if (error) throw error;

      logger.info('Deleted clinic', 'clinic-management', { clinicId, userId });
    } catch (error) {
      logger.error('Failed to delete clinic', 'clinic-management', { clinicId, userId, error });
      throw error;
    }
  }

  /**
   * Add member to clinic
   */
  async addClinicMember(
    clinicId: string,
    userId: string,
    role: Database['public']['Enums']['user_role'],
    permissions: Record<string, any> = {},
    addedBy?: string
  ): Promise<ClinicMembership> {
    try {
      const { data, error } = await supabase
        .from('clinic_memberships')
        .insert({
          clinic_id: clinicId,
          user_id: userId,
          role,
          permissions,
          created_by: addedBy,
          updated_by: addedBy
        })
        .select()
        .single();

      if (error) throw error;

      logger.info('Added clinic member', 'clinic-management', {
        clinicId,
        userId,
        role,
        addedBy
      });

      return data;
    } catch (error) {
      logger.error('Failed to add clinic member', 'clinic-management', {
        clinicId,
        userId,
        role,
        addedBy,
        error
      });
      throw error;
    }
  }

  /**
   * Remove member from clinic
   */
  async removeClinicMember(clinicId: string, userId: string, removedBy: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('clinic_memberships')
        .update({
          is_active: false,
          left_at: new Date().toISOString(),
          updated_by: removedBy
        })
        .eq('clinic_id', clinicId)
        .eq('user_id', userId);

      if (error) throw error;

      logger.info('Removed clinic member', 'clinic-management', {
        clinicId,
        userId,
        removedBy
      });
    } catch (error) {
      logger.error('Failed to remove clinic member', 'clinic-management', {
        clinicId,
        userId,
        removedBy,
        error
      });
      throw error;
    }
  }

  /**
   * Get clinic member count
   */
  private async getClinicMemberCount(clinicId: string): Promise<number> {
    const { count, error } = await supabase
      .from('clinic_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .eq('is_active', true);

    if (error) throw error;
    return count || 0;
  }

  /**
   * Get clinic resource count
   */
  private async getClinicResourceCount(clinicId: string): Promise<number> {
    const { count, error } = await supabase
      .from('clinic_resources')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId);

    if (error) throw error;
    return count || 0;
  }
}

// Export singleton instance
export const clinicService = new ClinicManagementService();

// Export utility functions
export const getUserClinics = (userId: string) => clinicService.getUserClinics(userId);
export const getClinic = (clinicId: string) => clinicService.getClinic(clinicId);
export const createClinic = (request: CreateClinicRequest, ownerId: string) => 
  clinicService.createClinic(request, ownerId);
export const updateClinic = (clinicId: string, updates: ClinicUpdate, userId: string) => 
  clinicService.updateClinic(clinicId, updates, userId);
export const deleteClinic = (clinicId: string, userId: string) => 
  clinicService.deleteClinic(clinicId, userId);
export const addClinicMember = (
  clinicId: string,
  userId: string,
  role: Database['public']['Enums']['user_role'],
  permissions?: Record<string, any>,
  addedBy?: string
) => clinicService.addClinicMember(clinicId, userId, role, permissions, addedBy);
export const removeClinicMember = (clinicId: string, userId: string, removedBy: string) => 
  clinicService.removeClinicMember(clinicId, userId, removedBy);
