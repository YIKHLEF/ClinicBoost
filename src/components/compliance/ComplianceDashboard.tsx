import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { complianceService, type ComplianceStatus, type ComplianceMetrics } from '../../lib/compliance';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  FileText,
  Users,
  Database,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Eye,
  Settings,
  Activity
} from 'lucide-react';

export const ComplianceDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus | null>(null);
  const [complianceMetrics, setComplianceMetrics] = useState<ComplianceMetrics | null>(null);
  const [healthCheck, setHealthCheck] = useState<any>(null);

  useEffect(() => {
    loadComplianceData();
  }, []);

  const loadComplianceData = async () => {
    try {
      setLoading(true);
      
      // Load compliance status
      const status = await complianceService.getComplianceStatus();
      setComplianceStatus(status);

      // Load compliance metrics
      const metrics = await complianceService.getComplianceMetrics();
      setComplianceMetrics(metrics);

      // Run health check
      const health = await complianceService.runHealthCheck();
      setHealthCheck(health);
    } catch (error) {
      console.error('Failed to load compliance data:', error);
      showToast('Failed to load compliance data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      const reportId = await complianceService.generateComplianceReport();
      showToast('Compliance report generation started', 'success');
    } catch (error) {
      console.error('Failed to generate compliance report:', error);
      showToast('Failed to generate compliance report', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (compliant: boolean) => {
    return compliant ? (
      <CheckCircle className="h-5 w-5 text-green-600" />
    ) : (
      <AlertTriangle className="h-5 w-5 text-red-600" />
    );
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'critical':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  if (loading && !complianceStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>{t('compliance.loading', 'Loading compliance data...')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t('compliance.title', 'Compliance Dashboard')}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {t('compliance.description', 'Monitor and manage compliance across your organization')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={loadComplianceData}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('compliance.refresh', 'Refresh')}
          </Button>
          <Button
            onClick={handleGenerateReport}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {t('compliance.generateReport', 'Generate Report')}
          </Button>
        </div>
      </div>

      {/* Health Status */}
      {healthCheck && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t('compliance.healthStatus', 'Compliance Health Status')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getHealthStatusColor(healthCheck.status)}`}>
                {healthCheck.status.toUpperCase()}
              </span>
              <span className="text-gray-600 dark:text-gray-300">
                {t('compliance.lastChecked', 'Last checked')}: {new Date().toLocaleString()}
              </span>
            </div>
            
            {healthCheck.issues.length > 0 && (
              <div className="space-y-2 mb-4">
                <h4 className="font-medium text-red-600">{t('compliance.issues', 'Issues')}</h4>
                {healthCheck.issues.map((issue: string, index: number) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                    {issue}
                  </div>
                ))}
              </div>
            )}

            {healthCheck.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-blue-600">{t('compliance.recommendations', 'Recommendations')}</h4>
                {healthCheck.recommendations.map((recommendation: string, index: number) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-blue-600">
                    <CheckCircle className="h-4 w-4" />
                    {recommendation}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Compliance Status Overview */}
      {complianceStatus && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
                {getStatusIcon(complianceStatus.gdpr.compliant)}
                {t('compliance.gdpr', 'GDPR Compliance')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-lg font-semibold ${complianceStatus.gdpr.compliant ? 'text-green-600' : 'text-red-600'}`}>
                {complianceStatus.gdpr.compliant ? t('compliance.compliant', 'Compliant') : t('compliance.nonCompliant', 'Non-compliant')}
              </div>
              {complianceStatus.gdpr.issues.length > 0 && (
                <div className="text-sm text-red-600 mt-1">
                  {complianceStatus.gdpr.issues.length} {t('compliance.issuesFound', 'issues found')}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
                {getStatusIcon(complianceStatus.hipaa.compliant)}
                {t('compliance.hipaa', 'HIPAA Compliance')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-lg font-semibold ${complianceStatus.hipaa.compliant ? 'text-green-600' : 'text-red-600'}`}>
                {complianceStatus.hipaa.compliant ? t('compliance.compliant', 'Compliant') : t('compliance.nonCompliant', 'Non-compliant')}
              </div>
              {complianceStatus.hipaa.issues.length > 0 && (
                <div className="text-sm text-red-600 mt-1">
                  {complianceStatus.hipaa.issues.length} {t('compliance.issuesFound', 'issues found')}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
                <Database className="h-4 w-4" />
                {t('compliance.dataRetention', 'Data Retention')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {complianceStatus.dataRetention.activePolicies} {t('compliance.activePolicies', 'Active Policies')}
              </div>
              <div className="text-sm text-orange-600">
                {complianceStatus.dataRetention.upcomingRetentions} {t('compliance.upcomingRetentions', 'upcoming retentions')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t('compliance.consent', 'Consent Management')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {complianceStatus.consent.activeConsents}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {t('compliance.activeConsents', 'Active consents')}
              </div>
              <div className="text-sm text-red-600">
                {complianceStatus.consent.withdrawnConsents} {t('compliance.withdrawn', 'withdrawn')}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Metrics Overview */}
      {complianceMetrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                {t('compliance.auditActivity', 'Audit Activity')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{t('compliance.totalEvents', 'Total Events')}</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{complianceMetrics.auditEvents.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{t('compliance.highRiskEvents', 'High Risk Events')}</span>
                  <span className="font-semibold text-orange-600">{complianceMetrics.auditEvents.highRisk}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{t('compliance.criticalEvents', 'Critical Events')}</span>
                  <span className="font-semibold text-red-600">{complianceMetrics.auditEvents.criticalRisk}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{t('compliance.lastWeek', 'Last Week')}</span>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{complianceMetrics.auditEvents.lastWeek}</span>
                    {complianceMetrics.auditEvents.lastWeek > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {t('compliance.retentionJobs', 'Retention Jobs')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{t('compliance.totalJobs', 'Total Jobs')}</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{complianceMetrics.retentionJobs.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{t('compliance.successfulJobs', 'Successful')}</span>
                  <span className="font-semibold text-green-600">{complianceMetrics.retentionJobs.successful}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{t('compliance.failedJobs', 'Failed')}</span>
                  <span className="font-semibold text-red-600">{complianceMetrics.retentionJobs.failed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{t('compliance.lastRun', 'Last Run')}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {complianceMetrics.retentionJobs.lastRun ? new Date(complianceMetrics.retentionJobs.lastRun).toLocaleDateString() : 'Never'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('compliance.dataSubjectRequests', 'Data Subject Requests')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{t('compliance.totalRequests', 'Total Requests')}</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{complianceMetrics.dataSubjectRequests.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{t('compliance.pendingRequests', 'Pending')}</span>
                  <span className="font-semibold text-yellow-600">{complianceMetrics.dataSubjectRequests.pending}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{t('compliance.completedRequests', 'Completed')}</span>
                  <span className="font-semibold text-green-600">{complianceMetrics.dataSubjectRequests.completed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{t('compliance.overdueRequests', 'Overdue')}</span>
                  <span className="font-semibold text-red-600">{complianceMetrics.dataSubjectRequests.overdue}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t('compliance.consentMetrics', 'Consent Metrics')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{t('compliance.totalUsers', 'Total Users')}</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{complianceMetrics.consentMetrics.totalUsers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{t('compliance.consentRate', 'Consent Rate')}</span>
                  <span className="font-semibold text-green-600">{complianceMetrics.consentMetrics.consentRate.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{t('compliance.withdrawalRate', 'Withdrawal Rate')}</span>
                  <span className="font-semibold text-red-600">{complianceMetrics.consentMetrics.withdrawalRate.toFixed(1)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('compliance.quickActions', 'Quick Actions')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="flex items-center gap-2 h-auto p-4">
              <Eye className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">{t('compliance.viewAuditLogs', 'View Audit Logs')}</div>
                <div className="text-sm text-gray-600">{t('compliance.viewAuditLogsDesc', 'Browse compliance audit trail')}</div>
              </div>
            </Button>

            <Button variant="outline" className="flex items-center gap-2 h-auto p-4">
              <Database className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">{t('compliance.manageRetention', 'Manage Retention')}</div>
                <div className="text-sm text-gray-600">{t('compliance.manageRetentionDesc', 'Configure data retention policies')}</div>
              </div>
            </Button>

            <Button variant="outline" className="flex items-center gap-2 h-auto p-4">
              <Users className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">{t('compliance.privacyCenter', 'Privacy Center')}</div>
                <div className="text-sm text-gray-600">{t('compliance.privacyCenterDesc', 'Manage privacy settings')}</div>
              </div>
            </Button>

            <Button variant="outline" className="flex items-center gap-2 h-auto p-4">
              <FileText className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">{t('compliance.generateReport', 'Generate Report')}</div>
                <div className="text-sm text-gray-600">{t('compliance.generateReportDesc', 'Create compliance reports')}</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
