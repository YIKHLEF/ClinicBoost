import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { 
  dataRetentionService, 
  type RetentionPolicyData, 
  type DataLifecycleReport 
} from '../../lib/compliance';
import {
  Plus,
  Calendar,
  Database,
  Archive,
  Trash2,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  Play,
  Pause,
  Edit,
  Eye,
  BarChart3,
  Shield,
  FileText
} from 'lucide-react';

export const DataRetentionDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'policies' | 'jobs' | 'create'>('overview');
  const [lifecycleReport, setLifecycleReport] = useState<DataLifecycleReport | null>(null);
  const [policies, setPolicies] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPolicy, setNewPolicy] = useState<RetentionPolicyData>({
    name: '',
    description: '',
    tableName: '',
    retentionPeriodDays: 365,
    action: 'archive',
    legalBasis: '',
    isActive: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load lifecycle report
      const report = await dataRetentionService.getDataLifecycleReport();
      setLifecycleReport(report);

      // Load policies
      const policiesData = await dataRetentionService.getRetentionPolicies();
      setPolicies(policiesData);

      // Load jobs
      const jobsData = await dataRetentionService.getRetentionJobs();
      setJobs(jobsData);
    } catch (error) {
      console.error('Failed to load data retention data:', error);
      showToast('Failed to load data retention data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePolicy = async () => {
    try {
      setLoading(true);
      await dataRetentionService.createRetentionPolicy(newPolicy);
      showToast('Retention policy created successfully', 'success');
      setShowCreateForm(false);
      setNewPolicy({
        name: '',
        description: '',
        tableName: '',
        retentionPeriodDays: 365,
        action: 'archive',
        legalBasis: '',
        isActive: true
      });
      await loadData();
    } catch (error) {
      console.error('Failed to create retention policy:', error);
      showToast('Failed to create retention policy', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExecutePolicies = async () => {
    try {
      setLoading(true);
      const results = await dataRetentionService.executeRetentionPolicies();
      const successCount = results.filter(r => r.status === 'completed').length;
      showToast(`Executed ${successCount} retention policies successfully`, 'success');
      await loadData();
    } catch (error) {
      console.error('Failed to execute retention policies:', error);
      showToast('Failed to execute retention policies', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'delete':
        return <Trash2 className="h-4 w-4 text-red-600" />;
      case 'archive':
        return <Archive className="h-4 w-4 text-blue-600" />;
      case 'anonymize':
        return <Shield className="h-4 w-4 text-purple-600" />;
      default:
        return <Database className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const tabs = [
    { id: 'overview', label: t('retention.tabs.overview', 'Overview'), icon: BarChart3 },
    { id: 'policies', label: t('retention.tabs.policies', 'Policies'), icon: FileText },
    { id: 'jobs', label: t('retention.tabs.jobs', 'Jobs'), icon: Settings }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('retention.title', 'Data Retention Management')}
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            {t('retention.description', 'Manage data lifecycle and retention policies')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {t('retention.createPolicy', 'Create Policy')}
          </Button>
          <Button
            variant="outline"
            onClick={handleExecutePolicies}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            {t('retention.executePolicies', 'Execute Policies')}
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && lifecycleReport && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {t('retention.overview.totalPolicies', 'Total Policies')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {lifecycleReport.totalPolicies}
              </div>
              <div className="text-sm text-green-600">
                {lifecycleReport.activePolicies} {t('retention.overview.active', 'active')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {t('retention.overview.upcomingRetentions', 'Upcoming Retentions')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {lifecycleReport.upcomingRetentions.length}
              </div>
              <div className="text-sm text-orange-600">
                {t('retention.overview.next30Days', 'Next 30 days')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {t('retention.overview.gdprCompliance', 'GDPR Compliance')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {lifecycleReport.complianceStatus.gdprCompliant ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                )}
                <span className={`font-medium ${
                  lifecycleReport.complianceStatus.gdprCompliant 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {lifecycleReport.complianceStatus.gdprCompliant 
                    ? t('retention.overview.compliant', 'Compliant')
                    : t('retention.overview.nonCompliant', 'Non-compliant')
                  }
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {t('retention.overview.recentJobs', 'Recent Jobs')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {lifecycleReport.recentJobs.length}
              </div>
              <div className="text-sm text-blue-600">
                {t('retention.overview.last7Days', 'Last 7 days')}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Retentions */}
          {lifecycleReport.upcomingRetentions.length > 0 && (
            <Card className="md:col-span-2 lg:col-span-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {t('retention.overview.upcomingRetentionsTitle', 'Upcoming Data Retentions')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lifecycleReport.upcomingRetentions.map((retention, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getActionIcon(retention.action)}
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {retention.tableName}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            {retention.recordCount} {t('retention.overview.records', 'records')} • {retention.action}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        {new Date(retention.retentionDate).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Compliance Issues */}
          {lifecycleReport.complianceStatus.issues.length > 0 && (
            <Card className="md:col-span-2 lg:col-span-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  {t('retention.overview.complianceIssues', 'Compliance Issues')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lifecycleReport.complianceStatus.issues.map((issue, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      {issue}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Policies Tab */}
      {activeTab === 'policies' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('retention.policies.title', 'Retention Policies')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {policies.map((policy) => (
                  <div key={policy.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <div className="flex items-center gap-4">
                      {getActionIcon(policy.action)}
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {policy.name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          {policy.table_name} • {policy.retention_period_days} {t('retention.policies.days', 'days')} • {policy.action}
                        </div>
                        {policy.description && (
                          <div className="text-sm text-gray-500 mt-1">
                            {policy.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        policy.is_active 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
                      }`}>
                        {policy.is_active ? t('retention.policies.active', 'Active') : t('retention.policies.inactive', 'Inactive')}
                      </span>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Jobs Tab */}
      {activeTab === 'jobs' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('retention.jobs.title', 'Retention Jobs')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {jobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <div className="flex items-center gap-4">
                      {getStatusIcon(job.status)}
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {t('retention.jobs.job', 'Job')} {job.id.slice(0, 8)}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          {job.records_processed} {t('retention.jobs.processed', 'processed')} • {job.records_affected} {t('retention.jobs.affected', 'affected')}
                        </div>
                        {job.started_at && (
                          <div className="text-sm text-gray-500">
                            {t('retention.jobs.started', 'Started')}: {new Date(job.started_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${
                        job.status === 'completed' ? 'text-green-600' :
                        job.status === 'failed' ? 'text-red-600' :
                        'text-yellow-600'
                      }`}>
                        {job.status}
                      </div>
                      {job.completed_at && (
                        <div className="text-xs text-gray-500">
                          {new Date(job.completed_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Policy Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>{t('retention.create.title', 'Create Retention Policy')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('retention.create.name', 'Policy Name')}
                </label>
                <input
                  type="text"
                  value={newPolicy.name}
                  onChange={(e) => setNewPolicy(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder={t('retention.create.namePlaceholder', 'Enter policy name')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('retention.create.tableName', 'Table Name')}
                </label>
                <select
                  value={newPolicy.tableName}
                  onChange={(e) => setNewPolicy(prev => ({ ...prev, tableName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">{t('retention.create.selectTable', 'Select table')}</option>
                  <option value="patients">Patients</option>
                  <option value="appointments">Appointments</option>
                  <option value="treatments">Treatments</option>
                  <option value="invoices">Invoices</option>
                  <option value="audit_logs">Audit Logs</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('retention.create.retentionPeriod', 'Retention Period (Days)')}
                </label>
                <input
                  type="number"
                  value={newPolicy.retentionPeriodDays}
                  onChange={(e) => setNewPolicy(prev => ({ ...prev, retentionPeriodDays: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('retention.create.action', 'Action')}
                </label>
                <select
                  value={newPolicy.action}
                  onChange={(e) => setNewPolicy(prev => ({ ...prev, action: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="archive">{t('retention.create.archive', 'Archive')}</option>
                  <option value="anonymize">{t('retention.create.anonymize', 'Anonymize')}</option>
                  <option value="delete">{t('retention.create.delete', 'Delete')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('retention.create.legalBasis', 'Legal Basis')}
                </label>
                <input
                  type="text"
                  value={newPolicy.legalBasis}
                  onChange={(e) => setNewPolicy(prev => ({ ...prev, legalBasis: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder={t('retention.create.legalBasisPlaceholder', 'e.g., GDPR Article 6(1)(b)')}
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={newPolicy.isActive}
                  onChange={(e) => setNewPolicy(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  {t('retention.create.active', 'Active')}
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button
                  onClick={handleCreatePolicy}
                  disabled={loading || !newPolicy.name || !newPolicy.tableName}
                >
                  {t('retention.create.create', 'Create Policy')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
