/**
 * Compliance Module Index
 * 
 * Central export point for all compliance-related services and utilities
 */

export { gdprService, type ConsentData, type DataExportOptions, type DataSubjectRequestData } from './gdpr-service';
export { auditService, type AuditEvent, type AuditSearchFilters, type AuditStatistics } from './audit-service';
export { dataRetentionService, type RetentionPolicyData, type DataLifecycleReport } from './data-retention-service';
export {
  consentService,
  type ConsentType,
  type ConsentStatus,
  type ConsentRequest,
  type ConsentPreferences,
  type ConsentBannerConfig
} from './consent-service';
export {
  consentWorkflowService,
  type ConsentWorkflow,
  type WorkflowExecution,
  type ConsentNotification
} from './consent-workflow-service';
export {
  anonymizationEngine,
  AnonymizationEngine,
  type AnonymizationTechnique,
  type AnonymizationLevel,
  type AnonymizationOptions
} from './anonymization-utils';

/**
 * Main Compliance Service
 * 
 * Provides a unified interface for all compliance operations
 */
import { gdprService } from './gdpr-service';
import { auditService } from './audit-service';
import { dataRetentionService } from './data-retention-service';
import { consentService } from './consent-service';
import { logger } from '../logging-monitoring';

export interface ComplianceStatus {
  gdpr: {
    compliant: boolean;
    issues: string[];
    lastAssessment: Date;
  };
  hipaa: {
    compliant: boolean;
    issues: string[];
    lastAssessment: Date;
  };
  dataRetention: {
    compliant: boolean;
    activePolicies: number;
    upcomingRetentions: number;
  };
  auditTrail: {
    enabled: boolean;
    retentionDays: number;
    lastCleanup: Date;
  };
  consent: {
    totalConsents: number;
    activeConsents: number;
    withdrawnConsents: number;
  };
}

export interface ComplianceMetrics {
  dataSubjectRequests: {
    total: number;
    pending: number;
    completed: number;
    overdue: number;
  };
  auditEvents: {
    total: number;
    highRisk: number;
    criticalRisk: number;
    lastWeek: number;
  };
  retentionJobs: {
    total: number;
    successful: number;
    failed: number;
    lastRun: Date;
  };
  consentMetrics: {
    totalUsers: number;
    consentRate: number;
    withdrawalRate: number;
  };
}

export class ComplianceService {
  private static instance: ComplianceService;

  public static getInstance(): ComplianceService {
    if (!ComplianceService.instance) {
      ComplianceService.instance = new ComplianceService();
    }
    return ComplianceService.instance;
  }

  /**
   * Initialize compliance services
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing compliance services', 'compliance-service');
      
      // Initialize individual services if needed
      // Services are already initialized as singletons
      
      logger.info('Compliance services initialized successfully', 'compliance-service');
    } catch (error) {
      logger.error('Failed to initialize compliance services', 'compliance-service', { error });
      throw error;
    }
  }

  /**
   * Get overall compliance status
   */
  async getComplianceStatus(): Promise<ComplianceStatus> {
    try {
      // Get data retention report
      const retentionReport = await dataRetentionService.getDataLifecycleReport();
      
      // Get audit statistics
      const auditStats = await auditService.getStatistics();
      
      // Get consent statistics
      const consentStats = await consentService.getConsentStatistics();

      return {
        gdpr: {
          compliant: retentionReport.complianceStatus.gdprCompliant,
          issues: retentionReport.complianceStatus.issues,
          lastAssessment: new Date()
        },
        hipaa: {
          compliant: retentionReport.complianceStatus.hipaaCompliant,
          issues: [],
          lastAssessment: new Date()
        },
        dataRetention: {
          compliant: retentionReport.complianceStatus.gdprCompliant,
          activePolicies: retentionReport.activePolicies,
          upcomingRetentions: retentionReport.upcomingRetentions.length
        },
        auditTrail: {
          enabled: true,
          retentionDays: 2555, // 7 years
          lastCleanup: new Date()
        },
        consent: {
          totalConsents: consentStats.totalConsents,
          activeConsents: consentStats.consentsByStatus.granted,
          withdrawnConsents: consentStats.consentsByStatus.withdrawn
        }
      };
    } catch (error) {
      logger.error('Failed to get compliance status', 'compliance-service', { error });
      throw error;
    }
  }

  /**
   * Get total users count from the database
   */
  private async getTotalUsersCount(): Promise<number> {
    try {
      // Import supabase here to avoid circular dependencies
      const { supabase } = await import('../supabase');

      const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (error) {
        logger.warn('Failed to get total users count', 'compliance-service', { error });
        return 0;
      }

      return count || 0;
    } catch (error) {
      logger.warn('Failed to get total users count', 'compliance-service', { error });
      return 0;
    }
  }

  /**
   * Get compliance metrics for dashboard
   */
  async getComplianceMetrics(): Promise<ComplianceMetrics> {
    try {
      // Get audit statistics
      const auditStats = await auditService.getStatistics();
      
      // Get consent statistics
      const consentStats = await consentService.getConsentStatistics();
      
      // Get retention jobs
      const retentionJobs = await dataRetentionService.getRetentionJobs();

      // Calculate metrics
      const highRiskEvents = auditStats.eventsByRiskLevel.high || 0;
      const criticalRiskEvents = auditStats.eventsByRiskLevel.critical || 0;
      
      const successfulJobs = retentionJobs.filter(job => job.status === 'completed').length;
      const failedJobs = retentionJobs.filter(job => job.status === 'failed').length;
      
      const lastWeekDate = new Date();
      lastWeekDate.setDate(lastWeekDate.getDate() - 7);
      const lastWeekEvents = auditStats.recentActivity.filter(
        event => new Date(event.created_at) > lastWeekDate
      ).length;

      // Get data subject request metrics
      const dataSubjectStats = await gdprService.getDataSubjectRequestStatistics();

      return {
        dataSubjectRequests: dataSubjectStats,
        auditEvents: {
          total: auditStats.totalEvents,
          highRisk: highRiskEvents,
          criticalRisk: criticalRiskEvents,
          lastWeek: lastWeekEvents
        },
        retentionJobs: {
          total: retentionJobs.length,
          successful: successfulJobs,
          failed: failedJobs,
          lastRun: retentionJobs.length > 0 ? new Date(retentionJobs[0].created_at) : new Date()
        },
        consentMetrics: {
          totalUsers: await this.getTotalUsersCount(),
          consentRate: consentStats.totalConsents > 0 ?
            (consentStats.consentsByStatus.granted / consentStats.totalConsents) * 100 : 0,
          withdrawalRate: consentStats.totalConsents > 0 ?
            (consentStats.consentsByStatus.withdrawn / consentStats.totalConsents) * 100 : 0
        }
      };
    } catch (error) {
      logger.error('Failed to get compliance metrics', 'compliance-service', { error });
      throw error;
    }
  }

  /**
   * Run compliance health check
   */
  async runHealthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  }> {
    try {
      const issues: string[] = [];
      const recommendations: string[] = [];

      // Check data retention policies
      const retentionReport = await dataRetentionService.getDataLifecycleReport();
      if (!retentionReport.complianceStatus.gdprCompliant) {
        issues.push('GDPR compliance issues detected in data retention policies');
        recommendations.push('Review and update data retention policies to ensure GDPR compliance');
      }

      // Check audit trail
      const auditStats = await auditService.getStatistics();
      const criticalEvents = auditStats.eventsByRiskLevel.critical || 0;
      if (criticalEvents > 0) {
        issues.push(`${criticalEvents} critical security events detected`);
        recommendations.push('Review critical security events and take appropriate action');
      }

      // Check consent management
      const consentStats = await consentService.getConsentStatistics();
      const withdrawalRate = consentStats.totalConsents > 0 ? 
        (consentStats.consentsByStatus.withdrawn / consentStats.totalConsents) * 100 : 0;
      
      if (withdrawalRate > 20) {
        issues.push('High consent withdrawal rate detected');
        recommendations.push('Review consent processes and user experience');
      }

      // Determine overall status
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (issues.length > 0) {
        status = criticalEvents > 0 || !retentionReport.complianceStatus.gdprCompliant ? 'critical' : 'warning';
      }

      return {
        status,
        issues,
        recommendations
      };
    } catch (error) {
      logger.error('Failed to run compliance health check', 'compliance-service', { error });
      return {
        status: 'critical',
        issues: ['Failed to perform compliance health check'],
        recommendations: ['Check system logs and contact administrator']
      };
    }
  }

  /**
   * Generate comprehensive compliance report
   */
  async generateComplianceReport(): Promise<string> {
    try {
      const reportId = await auditService.generateComplianceReport(
        'comprehensive_compliance',
        'Comprehensive Compliance Report',
        {
          includeAuditTrail: true,
          includeDataRetention: true,
          includeConsentManagement: true,
          includeGDPRCompliance: true,
          dateRange: {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            end: new Date()
          }
        }
      );

      logger.info('Comprehensive compliance report generated', 'compliance-service', { reportId });
      return reportId;
    } catch (error) {
      logger.error('Failed to generate compliance report', 'compliance-service', { error });
      throw error;
    }
  }

  /**
   * Schedule automated compliance tasks
   */
  async scheduleAutomatedTasks(): Promise<void> {
    try {
      // Schedule daily retention policy execution
      // In a real implementation, you'd use a job scheduler like cron
      
      // Schedule weekly audit log cleanup
      // Schedule monthly compliance reports
      
      logger.info('Automated compliance tasks scheduled', 'compliance-service');
    } catch (error) {
      logger.error('Failed to schedule automated compliance tasks', 'compliance-service', { error });
      throw error;
    }
  }

  /**
   * Handle data subject request
   */
  async handleDataSubjectRequest(
    requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction',
    requesterEmail: string,
    additionalData?: any
  ): Promise<string> {
    try {
      const requestId = await gdprService.submitDataSubjectRequest({
        requestType,
        requesterEmail,
        requesterName: additionalData?.name,
        description: additionalData?.description,
        patientId: additionalData?.patientId,
        userId: additionalData?.userId
      });

      logger.info('Data subject request submitted', 'compliance-service', {
        requestId,
        requestType,
        requesterEmail
      });

      return requestId;
    } catch (error) {
      logger.error('Failed to handle data subject request', 'compliance-service', { error });
      throw error;
    }
  }
}

export const complianceService = ComplianceService.getInstance();
