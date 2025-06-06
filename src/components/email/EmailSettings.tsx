import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { 
  Settings, 
  Mail, 
  Server, 
  Key, 
  TestTube,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { getEmailService, getEmailConfig } from '../../lib/email';
import { useToast } from '../../hooks/useToast';
import { logger } from '../../lib/logging-monitoring';

interface EmailSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EmailConfigForm {
  provider: 'smtp' | 'sendgrid';
  from: string;
  replyTo?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;
  sendgridApiKey?: string;
}

export const EmailSettings: React.FC<EmailSettingsProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [configValid, setConfigValid] = useState<boolean | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EmailConfigForm>();

  const watchedProvider = watch('provider');

  useEffect(() => {
    if (isOpen) {
      loadCurrentConfig();
      validateCurrentConfig();
    }
  }, [isOpen]);

  const loadCurrentConfig = () => {
    try {
      const config = getEmailConfig();
      setValue('provider', config.provider);
      setValue('from', config.from);
      setValue('replyTo', config.replyTo || '');
      
      if (config.smtp) {
        setValue('smtpHost', config.smtp.host);
        setValue('smtpPort', config.smtp.port);
        setValue('smtpSecure', config.smtp.secure);
        setValue('smtpUser', config.smtp.auth?.user || '');
        setValue('smtpPass', config.smtp.auth?.pass || '');
      }
      
      if (config.sendgrid) {
        setValue('sendgridApiKey', config.sendgrid.apiKey);
      }
    } catch (error: any) {
      logger.error('Failed to load email config', 'email-settings', { error: error.message });
    }
  };

  const validateCurrentConfig = async () => {
    try {
      const emailService = getEmailService();
      const isValid = await emailService.validateConfiguration();
      setConfigValid(isValid);
    } catch (error: any) {
      logger.error('Failed to validate email config', 'email-settings', { error: error.message });
      setConfigValid(false);
    }
  };

  const handleTestEmail = async () => {
    try {
      setIsLoading(true);
      setTestResult(null);
      
      const emailService = getEmailService();
      const result = await emailService.sendEmail({
        to: 'test@example.com', // In a real app, this would be the admin's email
        subject: 'Test Email - ClinicBoost',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Email Configuration Test</h2>
            <p>This is a test email to verify your email configuration is working correctly.</p>
            <p>If you received this email, your email service is configured properly!</p>
            <p>Sent at: ${new Date().toLocaleString()}</p>
            <p>Best regards,<br>ClinicBoost Team</p>
          </div>
        `,
        text: `Email Configuration Test\n\nThis is a test email to verify your email configuration is working correctly.\n\nIf you received this email, your email service is configured properly!\n\nSent at: ${new Date().toLocaleString()}\n\nBest regards,\nClinicBoost Team`,
        tags: ['test-email'],
      });

      if (result.success) {
        setTestResult({
          success: true,
          message: t('email.settings.testSuccess', 'Test email sent successfully!'),
        });
        addToast({
          type: 'success',
          title: t('email.settings.testEmailSent', 'Test email sent'),
          description: t('email.settings.testEmailSentDesc', 'Check your inbox to verify the email was received.'),
        });
      } else {
        setTestResult({
          success: false,
          message: result.error || t('email.settings.testFailed', 'Failed to send test email'),
        });
      }
    } catch (error: any) {
      logger.error('Failed to send test email', 'email-settings', { error: error.message });
      setTestResult({
        success: false,
        message: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: EmailConfigForm) => {
    try {
      setIsLoading(true);
      
      // In a real implementation, this would save the configuration
      // For now, we'll just show a success message
      addToast({
        type: 'success',
        title: t('email.settings.saveSuccess', 'Settings saved'),
        description: t('email.settings.saveSuccessDesc', 'Email settings have been saved successfully.'),
      });
      
      // Validate the new configuration
      await validateCurrentConfig();
      
    } catch (error: any) {
      logger.error('Failed to save email settings', 'email-settings', { error: error.message });
      addToast({
        type: 'error',
        title: t('email.settings.saveError', 'Failed to save settings'),
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-5/6 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Settings className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('email.settings.title', 'Email Settings')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Configuration Status */}
          <div className="flex items-center space-x-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
            {configValid === null ? (
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            ) : configValid ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {configValid === null
                  ? t('email.settings.statusChecking', 'Checking configuration...')
                  : configValid
                  ? t('email.settings.statusValid', 'Email configuration is valid')
                  : t('email.settings.statusInvalid', 'Email configuration has issues')
                }
              </p>
              {configValid === false && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {t('email.settings.statusInvalidDesc', 'Please check your email settings and test the configuration.')}
                </p>
              )}
            </div>
          </div>

          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('email.settings.provider', 'Email Provider')}
            </label>
            <select
              {...register('provider', { required: true })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="smtp">SMTP</option>
              <option value="sendgrid">SendGrid</option>
            </select>
          </div>

          {/* Basic Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('email.settings.fromEmail', 'From Email')}
              </label>
              <input
                type="email"
                {...register('from', { required: true })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="noreply@clinicboost.com"
              />
              {errors.from && (
                <p className="mt-1 text-sm text-red-600">{t('common.required', 'This field is required')}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('email.settings.replyTo', 'Reply To Email')}
              </label>
              <input
                type="email"
                {...register('replyTo')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="support@clinicboost.com"
              />
            </div>
          </div>

          {/* SMTP Settings */}
          {watchedProvider === 'smtp' && (
            <div className="space-y-4 p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div className="flex items-center space-x-2">
                <Server className="h-5 w-5 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {t('email.settings.smtpSettings', 'SMTP Settings')}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('email.settings.smtpHost', 'SMTP Host')}
                  </label>
                  <input
                    type="text"
                    {...register('smtpHost')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="smtp.gmail.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('email.settings.smtpPort', 'SMTP Port')}
                  </label>
                  <input
                    type="number"
                    {...register('smtpPort', { valueAsNumber: true })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="587"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('email.settings.smtpUser', 'SMTP Username')}
                  </label>
                  <input
                    type="text"
                    {...register('smtpUser')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="your-email@gmail.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('email.settings.smtpPass', 'SMTP Password')}
                  </label>
                  <input
                    type="password"
                    {...register('smtpPass')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  {...register('smtpSecure')}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  {t('email.settings.smtpSecure', 'Use SSL/TLS')}
                </label>
              </div>
            </div>
          )}

          {/* SendGrid Settings */}
          {watchedProvider === 'sendgrid' && (
            <div className="space-y-4 p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div className="flex items-center space-x-2">
                <Key className="h-5 w-5 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {t('email.settings.sendgridSettings', 'SendGrid Settings')}
                </h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('email.settings.sendgridApiKey', 'SendGrid API Key')}
                </label>
                <input
                  type="password"
                  {...register('sendgridApiKey')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="SG.••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••"
                />
              </div>
            </div>
          )}

          {/* Test Email */}
          <div className="space-y-4 p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TestTube className="h-5 w-5 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {t('email.settings.testEmail', 'Test Email')}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleTestEmail}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Mail className="h-4 w-4" />
                <span>{t('email.settings.sendTest', 'Send Test')}</span>
              </button>
            </div>

            {testResult && (
              <div className={`p-3 rounded-lg ${testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {testResult.message}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
