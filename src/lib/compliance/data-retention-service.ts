/**
 * Data Retention Service
 * 
 * Manages data retention policies and automated data lifecycle management including:
 * - Retention policy creation and management
 * - Automated data archival and deletion
 * - Compliance with legal requirements
 * - Data lifecycle reporting
 */

import { supabase } from '../supabase';
import { logger } from '../logging-monitoring';
import { auditService } from './audit-service';
import type { Database } from '../database.types';

type DataRetentionPolicy = Database['public']['Tables']['data_retention_policies']['Row'];
type DataRetentionJob = Database['public']['Tables']['data_retention_jobs']['Row'];

export interface RetentionPolicyData {
  name: string;
  description?: string;
  tableName: string;
  retentionPeriodDays: number;
  action: 'archive' | 'anonymize' | 'delete';
  conditions?: Record<string, any>;
  legalBasis?: string;
  isActive?: boolean;
}

export interface RetentionJobResult {
  jobId: string;
  policyId: string;
  recordsProcessed: number;
  recordsAffected: number;
  status: 'completed' | 'failed' | 'partial';
  errorMessage?: string;
}

export interface DataLifecycleReport {
  totalPolicies: number;
  activePolicies: number;
  recentJobs: DataRetentionJob[];
  upcomingRetentions: {
    tableName: string;
    recordCount: number;
    retentionDate: Date;
    action: string;
  }[];
  complianceStatus: {
    gdprCompliant: boolean;
    hipaaCompliant: boolean;
    issues: string[];
  };
}

export class DataRetentionService {
  private static instance: DataRetentionService;

  public static getInstance(): DataRetentionService {
    if (!DataRetentionService.instance) {
      DataRetentionService.instance = new DataRetentionService();
    }
    return DataRetentionService.instance;
  }

  /**
   * Create a new data retention policy
   */
  async createRetentionPolicy(policyData: RetentionPolicyData, createdBy?: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('data_retention_policies')
        .insert({
          name: policyData.name,
          description: policyData.description,
          table_name: policyData.tableName,
          retention_period_days: policyData.retentionPeriodDays,
          action: policyData.action,
          conditions: policyData.conditions || {},
          legal_basis: policyData.legalBasis,
          is_active: policyData.isActive !== false,
          created_by: createdBy
        })
        .select('id')
        .single();

      if (error) throw error;

      // Log the policy creation
      await auditService.logEvent({
        userId: createdBy,
        action: 'create_retention_policy',
        resourceType: 'data_retention_policy',
        resourceId: data.id,
        newData: policyData,
        complianceFlags: ['data_retention', 'gdpr', 'policy_management']
      });

      logger.info('Data retention policy created', 'data-retention-service', {
        policyId: data.id,
        tableName: policyData.tableName,
        retentionDays: policyData.retentionPeriodDays,
        action: policyData.action
      });

      return data.id;
    } catch (error) {
      logger.error('Failed to create retention policy', 'data-retention-service', { error, policyData });
      throw error;
    }
  }

  /**
   * Get all retention policies
   */
  async getRetentionPolicies(activeOnly: boolean = false): Promise<DataRetentionPolicy[]> {
    try {
      let query = supabase
        .from('data_retention_policies')
        .select('*')
        .order('created_at', { ascending: false });

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error('Failed to get retention policies', 'data-retention-service', { error, activeOnly });
      throw error;
    }
  }

  /**
   * Update a retention policy
   */
  async updateRetentionPolicy(
    policyId: string, 
    updates: Partial<RetentionPolicyData>, 
    updatedBy?: string
  ): Promise<boolean> {
    try {
      // Get current policy for audit trail
      const { data: currentPolicy } = await supabase
        .from('data_retention_policies')
        .select('*')
        .eq('id', policyId)
        .single();

      const { error } = await supabase
        .from('data_retention_policies')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', policyId);

      if (error) throw error;

      // Log the policy update
      await auditService.logEvent({
        userId: updatedBy,
        action: 'update_retention_policy',
        resourceType: 'data_retention_policy',
        resourceId: policyId,
        oldData: currentPolicy,
        newData: updates,
        complianceFlags: ['data_retention', 'gdpr', 'policy_management']
      });

      logger.info('Data retention policy updated', 'data-retention-service', { policyId, updates });
      return true;
    } catch (error) {
      logger.error('Failed to update retention policy', 'data-retention-service', { error, policyId, updates });
      throw error;
    }
  }

  /**
   * Delete a retention policy
   */
  async deleteRetentionPolicy(policyId: string, deletedBy?: string): Promise<boolean> {
    try {
      // Get policy for audit trail
      const { data: policy } = await supabase
        .from('data_retention_policies')
        .select('*')
        .eq('id', policyId)
        .single();

      const { error } = await supabase
        .from('data_retention_policies')
        .delete()
        .eq('id', policyId);

      if (error) throw error;

      // Log the policy deletion
      await auditService.logEvent({
        userId: deletedBy,
        action: 'delete_retention_policy',
        resourceType: 'data_retention_policy',
        resourceId: policyId,
        oldData: policy,
        complianceFlags: ['data_retention', 'gdpr', 'policy_management']
      });

      logger.info('Data retention policy deleted', 'data-retention-service', { policyId });
      return true;
    } catch (error) {
      logger.error('Failed to delete retention policy', 'data-retention-service', { error, policyId });
      throw error;
    }
  }

  /**
   * Execute retention policies
   */
  async executeRetentionPolicies(): Promise<RetentionJobResult[]> {
    try {
      const activePolicies = await this.getRetentionPolicies(true);
      const results: RetentionJobResult[] = [];

      for (const policy of activePolicies) {
        try {
          const result = await this.executeRetentionPolicy(policy);
          results.push(result);
        } catch (error) {
          logger.error('Failed to execute retention policy', 'data-retention-service', { 
            error, 
            policyId: policy.id 
          });
          
          results.push({
            jobId: '',
            policyId: policy.id,
            recordsProcessed: 0,
            recordsAffected: 0,
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      logger.info('Retention policies execution completed', 'data-retention-service', { 
        totalPolicies: activePolicies.length,
        successfulJobs: results.filter(r => r.status === 'completed').length,
        failedJobs: results.filter(r => r.status === 'failed').length
      });

      return results;
    } catch (error) {
      logger.error('Failed to execute retention policies', 'data-retention-service', { error });
      throw error;
    }
  }

  /**
   * Execute a specific retention policy
   */
  async executeRetentionPolicy(policy: DataRetentionPolicy): Promise<RetentionJobResult> {
    try {
      // Create retention job record
      const { data: job, error: jobError } = await supabase
        .from('data_retention_jobs')
        .insert({
          policy_id: policy.id,
          status: 'pending',
          started_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (jobError) throw jobError;

      let recordsProcessed = 0;
      let recordsAffected = 0;

      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retention_period_days);

      // Execute retention action based on policy
      switch (policy.action) {
        case 'delete':
          recordsAffected = await this.deleteExpiredRecords(policy, cutoffDate);
          break;
        case 'anonymize':
          recordsAffected = await this.anonymizeExpiredRecords(policy, cutoffDate);
          break;
        case 'archive':
          recordsAffected = await this.archiveExpiredRecords(policy, cutoffDate);
          break;
      }

      recordsProcessed = recordsAffected; // For now, assume all processed records were affected

      // Update job status
      await supabase
        .from('data_retention_jobs')
        .update({
          status: 'completed',
          records_processed: recordsProcessed,
          records_affected: recordsAffected,
          completed_at: new Date().toISOString()
        })
        .eq('id', job.id);

      // Log the retention execution
      await auditService.logEvent({
        action: 'execute_retention_policy',
        resourceType: 'data_retention_job',
        resourceId: job.id,
        newData: {
          policyId: policy.id,
          action: policy.action,
          recordsAffected,
          cutoffDate: cutoffDate.toISOString()
        },
        complianceFlags: ['data_retention', 'gdpr', 'automated_processing'],
        riskLevel: recordsAffected > 100 ? 'high' : 'medium'
      });

      return {
        jobId: job.id,
        policyId: policy.id,
        recordsProcessed,
        recordsAffected,
        status: 'completed'
      };
    } catch (error) {
      logger.error('Failed to execute retention policy', 'data-retention-service', { error, policy });
      throw error;
    }
  }

  /**
   * Get data lifecycle report
   */
  async getDataLifecycleReport(): Promise<DataLifecycleReport> {
    try {
      const policies = await this.getRetentionPolicies();
      const activePolicies = policies.filter(p => p.is_active);

      // Get recent jobs
      const { data: recentJobs } = await supabase
        .from('data_retention_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      // Calculate upcoming retentions (simplified)
      const upcomingRetentions = await this.calculateUpcomingRetentions(activePolicies);

      // Check compliance status
      const complianceStatus = this.assessComplianceStatus(policies);

      return {
        totalPolicies: policies.length,
        activePolicies: activePolicies.length,
        recentJobs: recentJobs || [],
        upcomingRetentions,
        complianceStatus
      };
    } catch (error) {
      logger.error('Failed to generate data lifecycle report', 'data-retention-service', { error });
      throw error;
    }
  }

  /**
   * Get retention jobs
   */
  async getRetentionJobs(policyId?: string): Promise<DataRetentionJob[]> {
    try {
      let query = supabase
        .from('data_retention_jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (policyId) {
        query = query.eq('policy_id', policyId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error('Failed to get retention jobs', 'data-retention-service', { error, policyId });
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async deleteExpiredRecords(policy: DataRetentionPolicy, cutoffDate: Date): Promise<number> {
    // This is a simplified implementation
    // In a real system, you'd need to handle different table structures and relationships
    
    const { data, error } = await supabase
      .from(policy.table_name as any)
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select('id');

    if (error) throw error;
    return data?.length || 0;
  }

  private async anonymizeExpiredRecords(policy: DataRetentionPolicy, cutoffDate: Date): Promise<number> {
    // Implementation depends on table structure
    // For patients, we can use the existing anonymize function
    if (policy.table_name === 'patients') {
      const { data: expiredPatients } = await supabase
        .from('patients')
        .select('id')
        .lt('created_at', cutoffDate.toISOString());

      if (expiredPatients) {
        for (const patient of expiredPatients) {
          await supabase.rpc('anonymize_patient_data', { p_patient_id: patient.id });
        }
        return expiredPatients.length;
      }
    }

    return 0;
  }

  private async archiveExpiredRecords(policy: DataRetentionPolicy, cutoffDate: Date): Promise<number> {
    // Implementation for archiving records
    // This would typically involve moving data to an archive table or storage
    
    // For now, just mark records as archived (if the table has an archived field)
    const { data, error } = await supabase
      .from(policy.table_name as any)
      .update({ archived: true, archived_at: new Date().toISOString() })
      .lt('created_at', cutoffDate.toISOString())
      .select('id');

    if (error) {
      // If the table doesn't have archived fields, just return 0
      return 0;
    }

    return data?.length || 0;
  }

  private async calculateUpcomingRetentions(policies: DataRetentionPolicy[]): Promise<any[]> {
    const upcomingRetentions = [];

    for (const policy of policies) {
      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - policy.retention_period_days + 30); // 30 days warning

        const { count } = await supabase
          .from(policy.table_name as any)
          .select('*', { count: 'exact', head: true })
          .lt('created_at', cutoffDate.toISOString());

        if (count && count > 0) {
          upcomingRetentions.push({
            tableName: policy.table_name,
            recordCount: count,
            retentionDate: cutoffDate,
            action: policy.action
          });
        }
      } catch (error) {
        // Skip tables that don't exist or have access issues
        continue;
      }
    }

    return upcomingRetentions;
  }

  private assessComplianceStatus(policies: DataRetentionPolicy[]): any {
    const issues: string[] = [];
    
    // Check for required policies
    const requiredTables = ['patients', 'users', 'audit_logs'];
    const coveredTables = policies.map(p => p.table_name);
    
    for (const table of requiredTables) {
      if (!coveredTables.includes(table)) {
        issues.push(`Missing retention policy for ${table} table`);
      }
    }

    // Check for reasonable retention periods
    const longRetentionPolicies = policies.filter(p => p.retention_period_days > 2555); // 7 years
    if (longRetentionPolicies.length > 0) {
      issues.push('Some policies have retention periods longer than 7 years');
    }

    return {
      gdprCompliant: issues.length === 0,
      hipaaCompliant: policies.some(p => p.legal_basis?.includes('HIPAA')),
      issues
    };
  }
}

export const dataRetentionService = DataRetentionService.getInstance();
