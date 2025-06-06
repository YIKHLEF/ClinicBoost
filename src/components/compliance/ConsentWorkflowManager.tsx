import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { consentService, type ConsentType } from '../../lib/compliance';
import {
  Calendar,
  Clock,
  Users,
  Mail,
  CheckCircle,
  AlertTriangle,
  Settings,
  Play,
  Pause,
  RefreshCw,
  Filter,
  Download,
  Bell,
  TrendingUp,
  BarChart3
} from 'lucide-react';

interface ConsentWorkflow {
  id: string;
  name: string;
  description: string;
  trigger: 'expiration' | 'renewal' | 'withdrawal' | 'new_user';
  status: 'active' | 'paused' | 'draft';
  conditions: {
    daysBeforeExpiration?: number;
    consentTypes: ConsentType[];
    userSegments?: string[];
  };
  actions: {
    sendEmail: boolean;
    sendNotification: boolean;
    updateStatus: boolean;
    escalate: boolean;
  };
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
  };
  metrics: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    lastExecution?: string;
  };
}

interface ConsentAnalytics {
  totalConsents: number;
  activeConsents: number;
  expiringSoon: number;
  recentWithdrawals: number;
  consentsByType: Record<ConsentType, number>;
  renewalRate: number;
  withdrawalRate: number;
  trends: {
    month: string;
    granted: number;
    withdrawn: number;
    renewed: number;
  }[];
}

export const ConsentWorkflowManager: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [workflows, setWorkflows] = useState<ConsentWorkflow[]>([]);
  const [analytics, setAnalytics] = useState<ConsentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<ConsentWorkflow | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadWorkflows();
    loadAnalytics();
  }, []);

  const loadWorkflows = async () => {
    try {
      // Mock data for demonstration - in real implementation, fetch from API
      const mockWorkflows: ConsentWorkflow[] = [
        {
          id: '1',
          name: 'Consent Expiration Reminder',
          description: 'Send reminders 30 days before consent expires',
          trigger: 'expiration',
          status: 'active',
          conditions: {
            daysBeforeExpiration: 30,
            consentTypes: ['cookies', 'analytics', 'marketing'],
          },
          actions: {
            sendEmail: true,
            sendNotification: true,
            updateStatus: false,
            escalate: false
          },
          schedule: {
            frequency: 'daily',
            time: '09:00'
          },
          metrics: {
            totalExecutions: 45,
            successfulExecutions: 43,
            failedExecutions: 2,
            lastExecution: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          }
        },
        {
          id: '2',
          name: 'New User Consent Collection',
          description: 'Automatically collect consent from new users',
          trigger: 'new_user',
          status: 'active',
          conditions: {
            consentTypes: ['data_processing', 'third_party_sharing'],
          },
          actions: {
            sendEmail: true,
            sendNotification: false,
            updateStatus: true,
            escalate: false
          },
          schedule: {
            frequency: 'daily',
            time: '10:00'
          },
          metrics: {
            totalExecutions: 128,
            successfulExecutions: 125,
            failedExecutions: 3,
            lastExecution: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          }
        },
        {
          id: '3',
          name: 'Consent Renewal Campaign',
          description: 'Quarterly consent renewal for marketing purposes',
          trigger: 'renewal',
          status: 'paused',
          conditions: {
            consentTypes: ['marketing'],
            userSegments: ['active_patients']
          },
          actions: {
            sendEmail: true,
            sendNotification: true,
            updateStatus: true,
            escalate: true
          },
          schedule: {
            frequency: 'monthly',
            time: '14:00'
          },
          metrics: {
            totalExecutions: 12,
            successfulExecutions: 11,
            failedExecutions: 1,
            lastExecution: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          }
        }
      ];
      
      setWorkflows(mockWorkflows);
    } catch (error) {
      console.error('Failed to load consent workflows:', error);
      showToast('Failed to load consent workflows', 'error');
    }
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Get consent statistics
      const stats = await consentService.getConsentStatistics();
      
      // Mock additional analytics data
      const mockAnalytics: ConsentAnalytics = {
        totalConsents: stats.totalConsents,
        activeConsents: stats.consentsByStatus.granted || 0,
        expiringSoon: 15, // Mock data
        recentWithdrawals: stats.consentsByStatus.withdrawn || 0,
        consentsByType: {
          cookies: 120,
          analytics: 95,
          marketing: 78,
          data_processing: 150,
          third_party_sharing: 45
        },
        renewalRate: 85.5,
        withdrawalRate: 12.3,
        trends: [
          { month: 'Jan', granted: 45, withdrawn: 5, renewed: 12 },
          { month: 'Feb', granted: 52, withdrawn: 8, renewed: 15 },
          { month: 'Mar', granted: 48, withdrawn: 6, renewed: 18 },
          { month: 'Apr', granted: 55, withdrawn: 7, renewed: 20 },
          { month: 'May', granted: 61, withdrawn: 9, renewed: 22 },
          { month: 'Jun', granted: 58, withdrawn: 4, renewed: 25 }
        ]
      };
      
      setAnalytics(mockAnalytics);
    } catch (error) {
      console.error('Failed to load consent analytics:', error);
      showToast('Failed to load consent analytics', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleWorkflow = async (workflowId: string) => {
    try {
      const workflow = workflows.find(w => w.id === workflowId);
      if (!workflow) return;

      const newStatus = workflow.status === 'active' ? 'paused' : 'active';
      
      // Update workflow status
      setWorkflows(prev => prev.map(w => 
        w.id === workflowId 
          ? { ...w, status: newStatus }
          : w
      ));

      showToast(
        `Workflow ${newStatus === 'active' ? 'activated' : 'paused'}`, 
        'success'
      );
    } catch (error) {
      console.error('Failed to toggle workflow:', error);
      showToast('Failed to update workflow status', 'error');
    }
  };

  const handleExecuteWorkflow = async (workflowId: string) => {
    try {
      const workflow = workflows.find(w => w.id === workflowId);
      if (!workflow) return;

      // Mock execution
      setWorkflows(prev => prev.map(w => 
        w.id === workflowId 
          ? { 
              ...w, 
              metrics: {
                ...w.metrics,
                totalExecutions: w.metrics.totalExecutions + 1,
                successfulExecutions: w.metrics.successfulExecutions + 1,
                lastExecution: new Date().toISOString()
              }
            }
          : w
      ));

      showToast('Workflow executed successfully', 'success');
    } catch (error) {
      console.error('Failed to execute workflow:', error);
      showToast('Failed to execute workflow', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'paused': return 'text-yellow-600';
      case 'draft': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'paused': return <Pause className="h-4 w-4" />;
      case 'draft': return <Clock className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('consent.workflow.title', 'Consent Workflow Manager')}
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            {t('consent.workflow.description', 'Automate consent management processes and workflows')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={loadWorkflows}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {t('common.refresh', 'Refresh')}
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            {t('consent.workflow.create', 'Create Workflow')}
          </Button>
        </div>
      </div>

      {/* Analytics Overview */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Consents</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{analytics.totalConsents}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Consents</p>
                  <p className="text-2xl font-bold text-green-600">{analytics.activeConsents}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Expiring Soon</p>
                  <p className="text-2xl font-bold text-yellow-600">{analytics.expiringSoon}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Renewal Rate</p>
                  <p className="text-2xl font-bold text-purple-600">{analytics.renewalRate}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Workflows List */}
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {t('consent.workflow.list', 'Active Workflows')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {workflow.name}
                        </h3>
                        <span className={`flex items-center gap-1 text-sm ${getStatusColor(workflow.status)}`}>
                          {getStatusIcon(workflow.status)}
                          {workflow.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                        {workflow.description}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Trigger:</span>
                          <span className="ml-2 text-gray-600 dark:text-gray-400">
                            {workflow.trigger.replace('_', ' ')}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Schedule:</span>
                          <span className="ml-2 text-gray-600 dark:text-gray-400">
                            {workflow.schedule.frequency} at {workflow.schedule.time}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Success Rate:</span>
                          <span className="ml-2 text-gray-600 dark:text-gray-400">
                            {workflow.metrics.totalExecutions > 0
                              ? ((workflow.metrics.successfulExecutions / workflow.metrics.totalExecutions) * 100).toFixed(1)
                              : 0}%
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {workflow.conditions.consentTypes.map((type) => (
                          <span
                            key={type}
                            className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full"
                          >
                            {type.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExecuteWorkflow(workflow.id)}
                        className="flex items-center gap-1"
                      >
                        <Play className="h-3 w-3" />
                        Execute
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleWorkflow(workflow.id)}
                        className={`flex items-center gap-1 ${
                          workflow.status === 'active'
                            ? 'text-yellow-600 hover:text-yellow-700'
                            : 'text-green-600 hover:text-green-700'
                        }`}
                      >
                        {workflow.status === 'active' ? (
                          <>
                            <Pause className="h-3 w-3" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3" />
                            Activate
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedWorkflow(workflow)}
                        className="flex items-center gap-1"
                      >
                        <Settings className="h-3 w-3" />
                        Edit
                      </Button>
                    </div>
                  </div>

                  {/* Execution Metrics */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <p className="font-medium text-gray-700 dark:text-gray-300">Total Executions</p>
                        <p className="text-lg font-bold text-blue-600">{workflow.metrics.totalExecutions}</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-gray-700 dark:text-gray-300">Successful</p>
                        <p className="text-lg font-bold text-green-600">{workflow.metrics.successfulExecutions}</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-gray-700 dark:text-gray-300">Failed</p>
                        <p className="text-lg font-bold text-red-600">{workflow.metrics.failedExecutions}</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-gray-700 dark:text-gray-300">Last Execution</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {workflow.metrics.lastExecution
                            ? new Date(workflow.metrics.lastExecution).toLocaleDateString()
                            : 'Never'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Consent Type Breakdown */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Consent Types Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(analytics.consentsByType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                      {type.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${(count / Math.max(...Object.values(analytics.consentsByType))) * 100}%`
                          }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-100 w-8">
                        {count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Consent Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Renewal Rate</p>
                    <p className="text-xl font-bold text-green-600">{analytics.renewalRate}%</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Withdrawal Rate</p>
                    <p className="text-xl font-bold text-red-600">{analytics.withdrawalRate}%</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Rate</p>
                    <p className="text-xl font-bold text-blue-600">
                      {((analytics.activeConsents / analytics.totalConsents) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Recent Activity
                  </h4>
                  <div className="space-y-2">
                    {analytics.trends.slice(-3).map((trend, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{trend.month}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-green-600">+{trend.granted} granted</span>
                          <span className="text-red-600">-{trend.withdrawn} withdrawn</span>
                          <span className="text-blue-600">{trend.renewed} renewed</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
