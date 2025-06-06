/**
 * Enhanced Audit Service
 * 
 * Provides comprehensive audit logging for compliance requirements including:
 * - Detailed activity tracking
 * - Compliance-specific audit trails
 * - Risk assessment and flagging
 * - Audit log search and reporting
 */

import { supabase, isDemoMode } from '../supabase';
import { logger } from '../logging-monitoring';
import type { Database } from '../database.types';

type ComplianceAuditLog = Database['public']['Tables']['compliance_audit_logs']['Row'];

export interface AuditEvent {
  userId?: string;
  sessionId?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  oldData?: any;
  newData?: any;
  ipAddress?: string;
  userAgent?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
    coordinates?: [number, number];
  };
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  complianceFlags?: string[];
}

export interface AuditSearchFilters {
  userId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  riskLevel?: string;
  complianceFlags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  ipAddress?: string;
  limit?: number;
  offset?: number;
}

export interface AuditStatistics {
  totalEvents: number;
  eventsByAction: Record<string, number>;
  eventsByResourceType: Record<string, number>;
  eventsByRiskLevel: Record<string, number>;
  recentActivity: ComplianceAuditLog[];
  complianceFlags: Record<string, number>;
}

export interface ComplianceReport {
  id: string;
  reportType: string;
  title: string;
  description?: string;
  parameters: any;
  generatedBy?: string;
  filePath?: string;
  fileSize?: number;
  status: string;
  errorMessage?: string;
  expiresAt?: string;
  createdAt: string;
}

export class AuditService {
  private static instance: AuditService;

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  /**
   * Log an audit event
   */
  async logEvent(event: AuditEvent): Promise<string> {
    try {
      if (isDemoMode) {
        // In demo mode, just log to console and return a mock ID
        logger.info('Demo mode: Audit event logged', 'audit-service', {
          action: event.action,
          resourceType: event.resourceType,
          resourceId: event.resourceId,
          userId: event.userId
        });
        return 'demo-audit-id';
      }

      // Determine risk level if not provided
      const riskLevel = event.riskLevel || this.assessRiskLevel(event);

      // Add automatic compliance flags
      const complianceFlags = [
        ...(event.complianceFlags || []),
        ...this.getAutomaticComplianceFlags(event)
      ];

      const { data, error } = await supabase.rpc('log_compliance_event', {
        p_user_id: event.userId || null,
        p_action: event.action,
        p_resource_type: event.resourceType,
        p_resource_id: event.resourceId,
        p_old_data: event.oldData ? JSON.stringify(event.oldData) : null,
        p_new_data: event.newData ? JSON.stringify(event.newData) : null,
        p_ip_address: event.ipAddress || null,
        p_user_agent: event.userAgent || null,
        p_compliance_flags: complianceFlags
      });

      if (error) throw error;

      // Log high-risk events immediately
      if (riskLevel === 'high' || riskLevel === 'critical') {
        logger.warn('High-risk audit event logged', 'audit-service', {
          eventId: data,
          action: event.action,
          resourceType: event.resourceType,
          riskLevel,
          complianceFlags
        });
      }

      return data;
    } catch (error) {
      logger.error('Failed to log audit event', 'audit-service', { error, event });
      throw error;
    }
  }

  /**
   * Search audit logs
   */
  async searchLogs(filters: AuditSearchFilters): Promise<{
    logs: ComplianceAuditLog[];
    totalCount: number;
  }> {
    try {
      let query = supabase
        .from('compliance_audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters.action) {
        query = query.eq('action', filters.action);
      }

      if (filters.resourceType) {
        query = query.eq('resource_type', filters.resourceType);
      }

      if (filters.resourceId) {
        query = query.eq('resource_id', filters.resourceId);
      }

      if (filters.riskLevel) {
        query = query.eq('risk_level', filters.riskLevel);
      }

      if (filters.ipAddress) {
        query = query.eq('ip_address', filters.ipAddress);
      }

      if (filters.complianceFlags && filters.complianceFlags.length > 0) {
        query = query.overlaps('compliance_flags', filters.complianceFlags);
      }

      if (filters.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.start.toISOString())
          .lte('created_at', filters.dateRange.end.toISOString());
      }

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        query = query.range(filters.offset, (filters.offset + (filters.limit || 50)) - 1);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        logs: data || [],
        totalCount: count || 0
      };
    } catch (error) {
      logger.error('Failed to search audit logs', 'audit-service', { error, filters });
      throw error;
    }
  }

  /**
   * Get audit statistics
   */
  async getStatistics(dateRange?: { start: Date; end: Date }): Promise<AuditStatistics> {
    try {
      let query = supabase
        .from('compliance_audit_logs')
        .select('*');

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      const logs = data || [];

      // Calculate statistics
      const eventsByAction: Record<string, number> = {};
      const eventsByResourceType: Record<string, number> = {};
      const eventsByRiskLevel: Record<string, number> = {};
      const complianceFlags: Record<string, number> = {};

      logs.forEach(log => {
        // Count by action
        eventsByAction[log.action] = (eventsByAction[log.action] || 0) + 1;

        // Count by resource type
        eventsByResourceType[log.resource_type] = (eventsByResourceType[log.resource_type] || 0) + 1;

        // Count by risk level
        const riskLevel = log.risk_level || 'low';
        eventsByRiskLevel[riskLevel] = (eventsByRiskLevel[riskLevel] || 0) + 1;

        // Count compliance flags
        if (log.compliance_flags) {
          log.compliance_flags.forEach(flag => {
            complianceFlags[flag] = (complianceFlags[flag] || 0) + 1;
          });
        }
      });

      // Get recent activity (last 10 events)
      const recentActivity = logs
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);

      return {
        totalEvents: logs.length,
        eventsByAction,
        eventsByResourceType,
        eventsByRiskLevel,
        recentActivity,
        complianceFlags
      };
    } catch (error) {
      logger.error('Failed to get audit statistics', 'audit-service', { error, dateRange });
      throw error;
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    reportType: string,
    title: string,
    parameters: any,
    generatedBy?: string
  ): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('compliance_reports')
        .insert({
          report_type: reportType,
          title,
          description: `Compliance report: ${title}`,
          parameters,
          generated_by: generatedBy,
          status: 'generating',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        })
        .select('id')
        .single();

      if (error) throw error;

      // Start report generation in background
      this.processComplianceReport(data.id, reportType, parameters);

      logger.info('Compliance report generation started', 'audit-service', {
        reportId: data.id,
        reportType,
        title
      });

      return data.id;
    } catch (error) {
      logger.error('Failed to generate compliance report', 'audit-service', { error, reportType, title });
      throw error;
    }
  }

  /**
   * Get compliance reports
   */
  async getComplianceReports(): Promise<ComplianceReport[]> {
    try {
      const { data, error } = await supabase
        .from('compliance_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to get compliance reports', 'audit-service', { error });
      throw error;
    }
  }

  /**
   * Delete expired audit logs based on retention policies
   */
  async cleanupExpiredLogs(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('compliance_audit_logs')
        .delete()
        .lt('retention_date', new Date().toISOString())
        .select('id');

      if (error) throw error;

      const deletedCount = data?.length || 0;
      
      logger.info('Expired audit logs cleaned up', 'audit-service', { deletedCount });
      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup expired logs', 'audit-service', { error });
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private assessRiskLevel(event: AuditEvent): 'low' | 'medium' | 'high' | 'critical' {
    // High-risk actions
    const highRiskActions = ['delete', 'export', 'anonymize', 'bulk_update'];
    const criticalActions = ['admin_access', 'system_config_change', 'security_breach'];

    if (criticalActions.includes(event.action)) {
      return 'critical';
    }

    if (highRiskActions.includes(event.action)) {
      return 'high';
    }

    // Check for sensitive resource types
    const sensitiveResources = ['patient', 'user', 'payment', 'medical_record'];
    if (sensitiveResources.includes(event.resourceType)) {
      return 'medium';
    }

    return 'low';
  }

  private getAutomaticComplianceFlags(event: AuditEvent): string[] {
    const flags: string[] = [];

    // Add GDPR flag for patient data operations
    if (event.resourceType === 'patient' || event.action.includes('consent')) {
      flags.push('gdpr');
    }

    // Add HIPAA flag for medical data
    if (['medical_record', 'treatment', 'diagnosis'].includes(event.resourceType)) {
      flags.push('hipaa');
    }

    // Add audit flag for all events
    flags.push('audit_trail');

    // Add data protection flag for sensitive operations
    if (['export', 'delete', 'anonymize'].includes(event.action)) {
      flags.push('data_protection');
    }

    return flags;
  }

  private async processComplianceReport(
    reportId: string,
    reportType: string,
    parameters: any
  ): Promise<void> {
    try {
      // Update status to in progress
      await supabase
        .from('compliance_reports')
        .update({ status: 'generating' })
        .eq('id', reportId);

      // Generate report based on type
      let reportData: any;
      switch (reportType) {
        case 'audit_summary':
          reportData = await this.generateAuditSummaryReport(parameters);
          break;
        case 'gdpr_compliance':
          reportData = await this.generateGDPRComplianceReport(parameters);
          break;
        case 'data_access_log':
          reportData = await this.generateDataAccessReport(parameters);
          break;
        default:
          throw new Error(`Unknown report type: ${reportType}`);
      }

      // Save report data (in a real implementation, you'd save to file storage)
      const filePath = `/reports/${reportId}.json`;
      const fileSize = JSON.stringify(reportData).length;

      await supabase
        .from('compliance_reports')
        .update({
          status: 'completed',
          file_path: filePath,
          file_size: fileSize
        })
        .eq('id', reportId);

      logger.info('Compliance report generated successfully', 'audit-service', { reportId, reportType });
    } catch (error) {
      await supabase
        .from('compliance_reports')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', reportId);

      logger.error('Failed to process compliance report', 'audit-service', { error, reportId, reportType });
    }
  }

  private async generateAuditSummaryReport(parameters: any): Promise<any> {
    const statistics = await this.getStatistics(parameters.dateRange);
    return {
      type: 'audit_summary',
      generatedAt: new Date().toISOString(),
      parameters,
      statistics
    };
  }

  private async generateGDPRComplianceReport(parameters: any): Promise<any> {
    // Implementation for GDPR compliance report
    return {
      type: 'gdpr_compliance',
      generatedAt: new Date().toISOString(),
      parameters,
      // Add GDPR-specific metrics
    };
  }

  private async generateDataAccessReport(parameters: any): Promise<any> {
    const { logs } = await this.searchLogs({
      action: 'access',
      dateRange: parameters.dateRange,
      limit: 1000
    });

    return {
      type: 'data_access_log',
      generatedAt: new Date().toISOString(),
      parameters,
      accessLogs: logs
    };
  }
}

export const auditService = AuditService.getInstance();
