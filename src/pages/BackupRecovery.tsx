/**
 * Backup & Recovery Page
 * 
 * Main page for backup and recovery management
 */

import React, { useState } from 'react';
import BackupDashboard from '../components/backup/BackupDashboard';
import BackupConfiguration from '../components/backup/BackupConfiguration';
import DisasterRecoveryPlanComponent from '../components/backup/DisasterRecoveryPlan';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import useTranslation from '../hooks/useTranslation';
import {
  Shield,
  Settings,
  AlertTriangle,
  Database,
  Clock,
  Activity,
  FileText,
  Users,
  CheckCircle
} from 'lucide-react';

const BackupRecovery: React.FC = () => {
  const { t } = useTranslation();

  // State management
  const [activeView, setActiveView] = useState<'dashboard' | 'configuration' | 'disaster-recovery'>('dashboard');

  // Navigation items
  const navigationItems = [
    {
      id: 'dashboard',
      label: t('backup.navigation.dashboard'),
      icon: Database,
      description: t('backup.navigation.dashboardDesc')
    },
    {
      id: 'configuration',
      label: t('backup.navigation.configuration'),
      icon: Settings,
      description: t('backup.navigation.configurationDesc')
    },
    {
      id: 'disaster-recovery',
      label: t('backup.navigation.disasterRecovery'),
      icon: AlertTriangle,
      description: t('backup.navigation.disasterRecoveryDesc')
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('backup.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('backup.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary-500" />
          <span className="text-lg font-semibold text-primary-600 dark:text-primary-400">
            {t('backup.systemProtected')}
          </span>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {navigationItems.map((item) => (
          <Card
            key={item.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              activeView === item.id
                ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            onClick={() => setActiveView(item.id as any)}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${
                  activeView === item.id
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}>
                  <item.icon size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {item.label}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {item.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Area */}
      <div className="min-h-[600px]">
        {activeView === 'dashboard' && <BackupDashboard />}
        {activeView === 'configuration' && (
          <BackupConfiguration
            onSave={(config) => {
              console.log('Backup configuration saved:', config);
              // In a real implementation, save to backend
            }}
          />
        )}
        {activeView === 'disaster-recovery' && (
          <DisasterRecoveryPlanComponent
            onSave={(plan) => {
              console.log('Disaster recovery plan saved:', plan);
              // In a real implementation, save to backend
            }}
            onTest={(planId) => {
              console.log('Testing disaster recovery plan:', planId);
              // In a real implementation, execute test
            }}
          />
        )}
      </div>

      {/* Quick Stats Footer */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('backup.footer.lastBackup')}
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {t('backup.footer.today')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Clock size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('backup.footer.nextBackup')}
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {t('backup.footer.tonight')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Activity size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('backup.footer.systemHealth')}
                </p>
                <p className="font-medium text-green-600">
                  {t('backup.footer.excellent')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <Shield size={20} className="text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('backup.footer.dataProtection')}
                </p>
                <p className="font-medium text-green-600">
                  {t('backup.footer.active')}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupRecovery;
