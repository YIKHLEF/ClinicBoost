import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ComplianceDashboard } from '../components/compliance/ComplianceDashboard';
import { AuditLogViewer } from '../components/compliance/AuditLogViewer';
import { DataRetentionDashboard } from '../components/compliance/DataRetentionDashboard';
import { PrivacyCenter } from '../components/compliance/PrivacyCenter';
import { DataSubjectRequestManager } from '../components/compliance/DataSubjectRequestManager';
import { useRBAC, ProtectedComponent } from '../hooks/useRBAC';
import {
  Shield,
  Activity,
  Database,
  Users,
  FileText,
  Settings,
  AlertTriangle
} from 'lucide-react';

type ComplianceTab = 'dashboard' | 'audit' | 'retention' | 'privacy' | 'data-requests' | 'reports';

export const Compliance: React.FC = () => {
  const { t } = useTranslation();
  const { hasPermission } = useRBAC();
  const [activeTab, setActiveTab] = useState<ComplianceTab>('dashboard');

  const tabs = [
    {
      id: 'dashboard' as ComplianceTab,
      label: t('compliance.tabs.dashboard', 'Dashboard'),
      icon: Shield,
      permission: 'compliance.view'
    },
    {
      id: 'audit' as ComplianceTab,
      label: t('compliance.tabs.auditLogs', 'Audit Logs'),
      icon: Activity,
      permission: 'compliance.audit.view'
    },
    {
      id: 'retention' as ComplianceTab,
      label: t('compliance.tabs.dataRetention', 'Data Retention'),
      icon: Database,
      permission: 'compliance.retention.view'
    },
    {
      id: 'privacy' as ComplianceTab,
      label: t('compliance.tabs.privacy', 'Privacy Center'),
      icon: Users,
      permission: 'compliance.privacy.view'
    },
    {
      id: 'data-requests' as ComplianceTab,
      label: t('compliance.tabs.dataRequests', 'Data Requests'),
      icon: FileText,
      permission: 'compliance.gdpr.manage'
    },
    {
      id: 'reports' as ComplianceTab,
      label: t('compliance.tabs.reports', 'Reports'),
      icon: Settings,
      permission: 'compliance.reports.view'
    }
  ];

  // Filter tabs based on user permissions
  const availableTabs = tabs.filter(tab => hasPermission(tab.permission));

  // If user has no compliance permissions, show access denied
  if (availableTabs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {t('compliance.accessDenied', 'Access Denied')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          {t('compliance.accessDeniedDesc', 'You do not have permission to access compliance features.')}
        </p>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <ProtectedComponent permission="compliance.view">
            <ComplianceDashboard />
          </ProtectedComponent>
        );
      case 'audit':
        return (
          <ProtectedComponent permission="compliance.audit.view">
            <AuditLogViewer />
          </ProtectedComponent>
        );
      case 'retention':
        return (
          <ProtectedComponent permission="compliance.retention.view">
            <DataRetentionDashboard />
          </ProtectedComponent>
        );
      case 'privacy':
        return (
          <ProtectedComponent permission="compliance.privacy.view">
            <PrivacyCenter />
          </ProtectedComponent>
        );
      case 'data-requests':
        return (
          <ProtectedComponent permission="compliance.gdpr.manage">
            <DataSubjectRequestManager />
          </ProtectedComponent>
        );
      case 'reports':
        return (
          <ProtectedComponent permission="compliance.reports.view">
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                {t('compliance.reportsComingSoon', 'Reports Coming Soon')}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {t('compliance.reportsComingSoonDesc', 'Advanced compliance reporting features are under development.')}
              </p>
            </div>
          </ProtectedComponent>
        );
      default:
        return <ComplianceDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-primary-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {t('compliance.title', 'Compliance Center')}
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            {t('compliance.subtitle', 'Ensure regulatory compliance and data protection across your organization')}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {availableTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      isActive
                        ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {renderTabContent()}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            {t('compliance.footer', 'Compliance features help ensure your organization meets regulatory requirements including GDPR, HIPAA, and other data protection standards.')}
          </p>
        </div>
      </div>
    </div>
  );
};
