/**
 * Backup Configuration
 * 
 * Component for configuring backup settings and policies
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Badge } from '../ui/Badge';
import useTranslation from '../../hooks/useTranslation';
import {
  BackupConfiguration as BackupConfig,
  BackupLocation,
  EncryptionInfo,
  RetentionPolicy,
  NotificationSettings,
  BackupFrequency,
  BackupType
} from '../../lib/backup/types';
import {
  Settings,
  Shield,
  Clock,
  Bell,
  HardDrive,
  Key,
  Mail,
  Webhook,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Database,
  Cloud,
  Server
} from 'lucide-react';

interface BackupConfigurationProps {
  onSave?: (config: BackupConfig) => void;
  initialConfig?: Partial<BackupConfig>;
}

const BackupConfiguration: React.FC<BackupConfigurationProps> = ({
  onSave,
  initialConfig
}) => {
  const { t, tCommon } = useTranslation();

  // State management
  const [config, setConfig] = useState<BackupConfig>(getDefaultConfig());
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'notifications' | 'compliance'>('general');
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  // Initialize configuration
  useEffect(() => {
    if (initialConfig) {
      setConfig(prev => ({ ...prev, ...initialConfig }));
    }
  }, [initialConfig]);

  // Handle configuration save
  const handleSave = async () => {
    setSaving(true);
    try {
      // Validate configuration
      const validation = validateConfiguration(config);
      if (!validation.isValid) {
        alert(validation.errors.join('\n'));
        return;
      }

      // Save configuration
      onSave?.(config);
      
      // Show success message
      alert(t('backup.config.saved'));
      
    } catch (error) {
      console.error('Failed to save backup configuration:', error);
      alert(t('backup.config.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  // Test backup location connection
  const testConnection = async () => {
    setTestingConnection(true);
    try {
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert(t('backup.config.connectionSuccess'));
    } catch (error) {
      alert(t('backup.config.connectionFailed'));
    } finally {
      setTestingConnection(false);
    }
  };

  // Update configuration field
  const updateConfig = (path: string, value: any) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      const keys = path.split('.');
      let current: any = newConfig;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('backup.config.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('backup.config.subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={testConnection} disabled={testingConnection}>
            {testingConnection ? (
              <RefreshCw size={16} className="mr-2 animate-spin" />
            ) : (
              <CheckCircle size={16} className="mr-2" />
            )}
            {t('backup.config.testConnection')}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <RefreshCw size={16} className="mr-2 animate-spin" />
            ) : (
              <Save size={16} className="mr-2" />
            )}
            {tCommon('save')}
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {[
            { id: 'general', label: t('backup.config.tabs.general'), icon: Settings },
            { id: 'security', label: t('backup.config.tabs.security'), icon: Shield },
            { id: 'notifications', label: t('backup.config.tabs.notifications'), icon: Bell },
            { id: 'compliance', label: t('backup.config.tabs.compliance'), icon: AlertTriangle }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* General Settings */}
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Default Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive size={20} />
                  {t('backup.config.defaultLocation')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('backup.config.locationType')}
                  </label>
                  <Select
                    value={config.general.defaultLocation.type}
                    onValueChange={(value) => updateConfig('general.defaultLocation.type', value)}
                  >
                    <option value="local">{t('backup.config.locationTypes.local')}</option>
                    <option value="cloud">{t('backup.config.locationTypes.cloud')}</option>
                    <option value="remote">{t('backup.config.locationTypes.remote')}</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('backup.config.path')}
                  </label>
                  <Input
                    value={config.general.defaultLocation.path}
                    onChange={(e) => updateConfig('general.defaultLocation.path', e.target.value)}
                    placeholder="/backups"
                  />
                </div>

                {config.general.defaultLocation.type === 'cloud' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('backup.config.provider')}
                      </label>
                      <Select
                        value={config.general.defaultLocation.provider || 'aws'}
                        onValueChange={(value) => updateConfig('general.defaultLocation.provider', value)}
                      >
                        <option value="aws">Amazon S3</option>
                        <option value="azure">Azure Blob Storage</option>
                        <option value="gcp">Google Cloud Storage</option>
                        <option value="supabase">Supabase Storage</option>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('backup.config.bucket')}
                      </label>
                      <Input
                        value={config.general.defaultLocation.bucket || ''}
                        onChange={(e) => updateConfig('general.defaultLocation.bucket', e.target.value)}
                        placeholder="my-backup-bucket"
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Retention Policy */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock size={20} />
                  {t('backup.config.retentionPolicy')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('backup.config.keepDaily')}
                    </label>
                    <Input
                      type="number"
                      value={config.general.defaultRetention.keepDaily}
                      onChange={(e) => updateConfig('general.defaultRetention.keepDaily', parseInt(e.target.value))}
                      min="1"
                      max="365"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('backup.config.keepWeekly')}
                    </label>
                    <Input
                      type="number"
                      value={config.general.defaultRetention.keepWeekly}
                      onChange={(e) => updateConfig('general.defaultRetention.keepWeekly', parseInt(e.target.value))}
                      min="1"
                      max="52"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('backup.config.keepMonthly')}
                    </label>
                    <Input
                      type="number"
                      value={config.general.defaultRetention.keepMonthly}
                      onChange={(e) => updateConfig('general.defaultRetention.keepMonthly', parseInt(e.target.value))}
                      min="1"
                      max="120"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('backup.config.keepYearly')}
                    </label>
                    <Input
                      type="number"
                      value={config.general.defaultRetention.keepYearly}
                      onChange={(e) => updateConfig('general.defaultRetention.keepYearly', parseInt(e.target.value))}
                      min="1"
                      max="10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('backup.config.maxAge')} ({t('backup.config.days')})
                  </label>
                  <Input
                    type="number"
                    value={config.general.defaultRetention.maxAge}
                    onChange={(e) => updateConfig('general.defaultRetention.maxAge', parseInt(e.target.value))}
                    min="1"
                    max="3650"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Performance Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings size={20} />
                  {t('backup.config.performance')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('backup.config.compressionLevel')} (0-9)
                  </label>
                  <Input
                    type="number"
                    value={config.general.compressionLevel}
                    onChange={(e) => updateConfig('general.compressionLevel', parseInt(e.target.value))}
                    min="0"
                    max="9"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('backup.config.compressionHelp')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('backup.config.parallelJobs')}
                  </label>
                  <Input
                    type="number"
                    value={config.general.parallelJobs}
                    onChange={(e) => updateConfig('general.parallelJobs', parseInt(e.target.value))}
                    min="1"
                    max="10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('backup.config.timeout')} ({t('backup.config.minutes')})
                  </label>
                  <Input
                    type="number"
                    value={config.general.timeoutMinutes}
                    onChange={(e) => updateConfig('general.timeoutMinutes', parseInt(e.target.value))}
                    min="5"
                    max="1440"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Security Settings */}
        {activeTab === 'security' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Encryption */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key size={20} />
                  {t('backup.config.encryption')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="encryptionEnabled"
                    checked={config.general.defaultEncryption.enabled}
                    onChange={(e) => updateConfig('general.defaultEncryption.enabled', e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="encryptionEnabled" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    {t('backup.config.enableEncryption')}
                  </label>
                </div>

                {config.general.defaultEncryption.enabled && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('backup.config.algorithm')}
                    </label>
                    <Select
                      value={config.general.defaultEncryption.algorithm || 'AES-256'}
                      onValueChange={(value) => updateConfig('general.defaultEncryption.algorithm', value)}
                    >
                      <option value="AES-256">AES-256</option>
                      <option value="AES-128">AES-128</option>
                    </Select>
                  </div>
                )}

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="encryptionRequired"
                    checked={config.security.encryptionRequired}
                    onChange={(e) => updateConfig('security.encryptionRequired', e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="encryptionRequired" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    {t('backup.config.requireEncryption')}
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('backup.config.keyRotation')} ({t('backup.config.days')})
                  </label>
                  <Input
                    type="number"
                    value={config.security.keyRotationDays}
                    onChange={(e) => updateConfig('security.keyRotationDays', parseInt(e.target.value))}
                    min="1"
                    max="365"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Audit & Logging */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield size={20} />
                  {t('backup.config.auditLogging')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="accessLogging"
                    checked={config.security.accessLogging}
                    onChange={(e) => updateConfig('security.accessLogging', e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="accessLogging" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    {t('backup.config.enableAccessLogging')}
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="auditTrail"
                    checked={config.security.auditTrail}
                    onChange={(e) => updateConfig('security.auditTrail', e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="auditTrail" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    {t('backup.config.enableAuditTrail')}
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Notifications Settings */}
        {activeTab === 'notifications' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell size={20} />
                {t('backup.config.notifications')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email Notifications */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <Mail size={18} />
                  {t('backup.config.emailNotifications')}
                </h3>

                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="notifySuccess"
                      checked={config.notifications.onSuccess}
                      onChange={(e) => updateConfig('notifications.onSuccess', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="notifySuccess" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      {t('backup.config.onSuccess')}
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="notifyFailure"
                      checked={config.notifications.onFailure}
                      onChange={(e) => updateConfig('notifications.onFailure', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="notifyFailure" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      {t('backup.config.onFailure')}
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="notifyWarning"
                      checked={config.notifications.onWarning}
                      onChange={(e) => updateConfig('notifications.onWarning', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="notifyWarning" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      {t('backup.config.onWarning')}
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('backup.config.emailAddresses')}
                  </label>
                  <Textarea
                    value={config.notifications.email.join('\n')}
                    onChange={(e) => updateConfig('notifications.email', e.target.value.split('\n').filter(email => email.trim()))}
                    placeholder="admin@clinic.com&#10;backup@clinic.com"
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('backup.config.emailHelp')}
                  </p>
                </div>
              </div>

              {/* Webhook Notifications */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <Webhook size={18} />
                  {t('backup.config.webhookNotifications')}
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('backup.config.webhookUrl')}
                  </label>
                  <Input
                    value={config.notifications.webhook || ''}
                    onChange={(e) => updateConfig('notifications.webhook', e.target.value)}
                    placeholder="https://hooks.slack.com/services/..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Compliance Settings */}
        {activeTab === 'compliance' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle size={20} />
                {t('backup.config.compliance')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('backup.config.dataRetention')} ({t('backup.config.days')})
                    </label>
                    <Input
                      type="number"
                      value={config.compliance.dataRetentionDays}
                      onChange={(e) => updateConfig('compliance.dataRetentionDays', parseInt(e.target.value))}
                      min="1"
                      max="3650"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="gdprCompliant"
                      checked={config.compliance.gdprCompliant}
                      onChange={(e) => updateConfig('compliance.gdprCompliant', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="gdprCompliant" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      {t('backup.config.gdprCompliant')}
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="hipaaCompliant"
                      checked={config.compliance.hipaaCompliant}
                      onChange={(e) => updateConfig('compliance.hipaaCompliant', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="hipaaCompliant" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      {t('backup.config.hipaaCompliant')}
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('backup.config.auditRequirements')}
                  </label>
                  <div className="space-y-2">
                    {['access_logs', 'backup_logs', 'restore_logs', 'security_logs'].map(requirement => (
                      <div key={requirement} className="flex items-center">
                        <input
                          type="checkbox"
                          id={requirement}
                          checked={config.compliance.auditRequirements.includes(requirement)}
                          onChange={(e) => {
                            const current = config.compliance.auditRequirements;
                            if (e.target.checked) {
                              updateConfig('compliance.auditRequirements', [...current, requirement]);
                            } else {
                              updateConfig('compliance.auditRequirements', current.filter(r => r !== requirement));
                            }
                          }}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor={requirement} className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                          {t(`backup.config.auditTypes.${requirement}`)}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

// Default configuration
function getDefaultConfig(): BackupConfig {
  return {
    general: {
      defaultLocation: {
        type: 'local',
        path: '/backups'
      },
      defaultEncryption: {
        enabled: true,
        algorithm: 'AES-256'
      },
      defaultRetention: {
        keepDaily: 7,
        keepWeekly: 4,
        keepMonthly: 12,
        keepYearly: 3,
        maxAge: 365,
        maxSize: 100 * 1024 * 1024 * 1024 // 100GB
      },
      compressionLevel: 6,
      parallelJobs: 2,
      timeoutMinutes: 60
    },
    notifications: {
      onSuccess: false,
      onFailure: true,
      onWarning: true,
      email: []
    },
    monitoring: {
      enabled: true,
      alertThresholds: {
        failureRate: 0.1,
        storageUsage: 0.9,
        backupAge: 7
      },
      healthChecks: true,
      performanceMetrics: true
    },
    security: {
      encryptionRequired: true,
      keyRotationDays: 90,
      accessLogging: true,
      auditTrail: true
    },
    compliance: {
      dataRetentionDays: 2555, // 7 years
      gdprCompliant: true,
      hipaaCompliant: true,
      auditRequirements: ['access_logs', 'backup_logs', 'restore_logs']
    }
  };
}

// Validate configuration
function validateConfiguration(config: BackupConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate retention policy
  if (config.general.defaultRetention.keepDaily < 1) {
    errors.push('Daily retention must be at least 1 day');
  }

  // Validate compression level
  if (config.general.compressionLevel < 0 || config.general.compressionLevel > 9) {
    errors.push('Compression level must be between 0 and 9');
  }

  // Validate parallel jobs
  if (config.general.parallelJobs < 1 || config.general.parallelJobs > 10) {
    errors.push('Parallel jobs must be between 1 and 10');
  }

  // Validate email addresses
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const email of config.notifications.email) {
    if (!emailRegex.test(email)) {
      errors.push(`Invalid email address: ${email}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export default BackupConfiguration;
