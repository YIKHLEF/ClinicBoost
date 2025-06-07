/**
 * Calendar Provider Configuration Modal
 * 
 * Modal component for configuring calendar provider settings,
 * credentials, and synchronization options.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';
import {
  X,
  Calendar,
  Settings,
  Shield,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Key,
  Sync,
  ArrowUpDown,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import {
  type CalendarProvider,
  type CalendarProviderSettings,
  configureCalendarProvider,
} from '../../lib/integrations/calendar-sync';

interface CalendarProviderConfigProps {
  provider: CalendarProvider | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (provider: CalendarProvider) => void;
}

const CalendarProviderConfig: React.FC<CalendarProviderConfigProps> = ({
  provider,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Partial<CalendarProvider>>({});
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (provider) {
      setFormData(provider);
      setCredentials(provider.credentials || {});
    } else {
      setFormData({});
      setCredentials({});
    }
    setTestResult(null);
  }, [provider]);

  const handleSettingsChange = (key: keyof CalendarProviderSettings, value: any) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [key]: value,
      } as CalendarProviderSettings,
    }));
  };

  const handleCredentialsChange = (key: string, value: string) => {
    setCredentials(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const testConnection = async () => {
    if (!provider) return;

    setIsLoading(true);
    setTestResult(null);

    try {
      // Test the connection with current credentials
      await configureCalendarProvider(provider.id, credentials, formData.settings);
      
      setTestResult({
        success: true,
        message: 'Connection test successful!',
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!provider || !formData.settings) return;

    setIsLoading(true);

    try {
      await configureCalendarProvider(provider.id, credentials, formData.settings);
      
      const updatedProvider: CalendarProvider = {
        ...provider,
        ...formData,
        credentials,
        enabled: true,
      };

      onSave(updatedProvider);
      onClose();
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to save configuration',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'google':
        return '🗓️';
      case 'outlook':
        return '📅';
      case 'icloud':
        return '☁️';
      case 'caldav':
        return '🔗';
      default:
        return '📋';
    }
  };

  const getCredentialFields = (type: string) => {
    switch (type) {
      case 'google':
        return [
          { key: 'clientId', label: 'Client ID', type: 'text', required: true },
          { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
          { key: 'accessToken', label: 'Access Token', type: 'password', required: false },
          { key: 'refreshToken', label: 'Refresh Token', type: 'password', required: false },
        ];
      case 'outlook':
        return [
          { key: 'clientId', label: 'Application ID', type: 'text', required: true },
          { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
          { key: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
          { key: 'accessToken', label: 'Access Token', type: 'password', required: false },
        ];
      case 'caldav':
        return [
          { key: 'serverUrl', label: 'CalDAV Server URL', type: 'url', required: true },
          { key: 'username', label: 'Username', type: 'text', required: true },
          { key: 'password', label: 'Password', type: 'password', required: true },
        ];
      default:
        return [];
    }
  };

  if (!isOpen || !provider) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{getProviderIcon(provider.type)}</div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Configure {provider.name}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Set up calendar synchronization settings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Credentials Section */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Key className="text-blue-600" size={20} />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Authentication
              </h3>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {getCredentialFields(provider.type).map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type={field.type}
                    value={credentials[field.key] || ''}
                    onChange={(e) => handleCredentialsChange(field.key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    required={field.required}
                  />
                </div>
              ))}
            </div>

            {/* Test Connection */}
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={testConnection}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Sync className="animate-spin mr-2" size={16} />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2" size={16} />
                    Test Connection
                  </>
                )}
              </Button>

              {testResult && (
                <div className={`mt-3 p-3 rounded-lg ${
                  testResult.success 
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                }`}>
                  <div className="flex items-center space-x-2">
                    {testResult.success ? (
                      <CheckCircle size={16} />
                    ) : (
                      <AlertTriangle size={16} />
                    )}
                    <span className="text-sm">{testResult.message}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sync Settings */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Settings className="text-green-600" size={20} />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Synchronization Settings
              </h3>
            </div>

            <div className="space-y-4">
              {/* Sync Direction */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sync Direction
                </label>
                <select
                  value={formData.settings?.syncDirection || 'bidirectional'}
                  onChange={(e) => handleSettingsChange('syncDirection', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="bidirectional">
                    <ArrowUpDown className="inline mr-2" size={16} />
                    Two-way sync (Bidirectional)
                  </option>
                  <option value="clinic-to-external">
                    <ArrowRight className="inline mr-2" size={16} />
                    Clinic to External only
                  </option>
                  <option value="external-to-clinic">
                    <ArrowLeft className="inline mr-2" size={16} />
                    External to Clinic only
                  </option>
                </select>
              </div>

              {/* Sync Frequency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sync Frequency (minutes)
                </label>
                <select
                  value={formData.settings?.syncFrequency || 15}
                  onChange={(e) => handleSettingsChange('syncFrequency', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value={5}>Every 5 minutes</option>
                  <option value={15}>Every 15 minutes</option>
                  <option value={30}>Every 30 minutes</option>
                  <option value={60}>Every hour</option>
                  <option value={240}>Every 4 hours</option>
                  <option value={1440}>Daily</option>
                </select>
              </div>

              {/* Conflict Resolution */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Conflict Resolution
                </label>
                <select
                  value={formData.settings?.conflictResolution || 'manual'}
                  onChange={(e) => handleSettingsChange('conflictResolution', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="manual">Manual resolution</option>
                  <option value="clinic-wins">Clinic always wins</option>
                  <option value="external-wins">External always wins</option>
                </select>
              </div>

              {/* Toggle Options */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Auto-create events
                  </label>
                  <Switch
                    checked={formData.settings?.autoCreateEvents || false}
                    onCheckedChange={(checked) => handleSettingsChange('autoCreateEvents', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sync reminders
                  </label>
                  <Switch
                    checked={formData.settings?.syncReminders || false}
                    onCheckedChange={(checked) => handleSettingsChange('syncReminders', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sync attendees
                  </label>
                  <Switch
                    checked={formData.settings?.syncAttendees || false}
                    onCheckedChange={(checked) => handleSettingsChange('syncAttendees', checked)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Provider-specific help */}
          {provider.type === 'google' && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-start space-x-2">
                <ExternalLink className="text-blue-600 mt-1" size={16} />
                <div>
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Google Calendar Setup
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Create credentials in Google Cloud Console and enable the Calendar API.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <Sync className="animate-spin mr-2" size={16} />
                Saving...
              </>
            ) : (
              'Save Configuration'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CalendarProviderConfig;
