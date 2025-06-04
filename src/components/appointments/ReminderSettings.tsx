import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { 
  Bell, 
  MessageSquare, 
  Mail, 
  Clock, 
  Plus, 
  Trash2, 
  Save,
  Settings,
  Calendar,
  Phone
} from 'lucide-react';
import { reminderEngine, type ReminderSettings } from '../../lib/appointment-reminders';
import Modal from '../ui/Modal';

interface ReminderSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId?: string;
}

interface ReminderFormData {
  enabled: boolean;
  methods: string[];
  timings: Array<{
    type: 'days_before' | 'hours_before' | 'minutes_before';
    value: number;
  }>;
  templates: {
    sms: string;
    whatsapp: string;
    email: string;
  };
  business_hours: {
    start: string;
    end: string;
    timezone: string;
  };
}

export const ReminderSettingsComponent: React.FC<ReminderSettingsProps> = ({
  isOpen,
  onClose,
  appointmentId,
}) => {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [reminderStats, setReminderStats] = useState<any>(null);

  const defaultValues: ReminderFormData = {
    enabled: true,
    methods: ['sms', 'whatsapp'],
    timings: [
      { type: 'days_before', value: 1 },
      { type: 'hours_before', value: 2 },
    ],
    templates: {
      sms: 'Hi {firstName}, this is a reminder that you have a dental appointment tomorrow at {time} with {dentist}. Please call {clinicPhone} if you need to reschedule.',
      whatsapp: '🦷 Hi {firstName}! \n\nReminder: You have a dental appointment tomorrow at {time} with {dentist}.\n\nPlease reply CONFIRM to confirm or call {clinicPhone} to reschedule.\n\nThank you!',
      email: 'Dear {firstName},\n\nThis is a friendly reminder about your upcoming dental appointment:\n\nDate: {date}\nTime: {time}\nDentist: {dentist}\nLocation: {clinicAddress}\n\nPlease arrive 15 minutes early. If you need to reschedule, please call us at {clinicPhone}.\n\nThank you!'
    },
    business_hours: {
      start: '08:00',
      end: '18:00',
      timezone: 'Africa/Casablanca',
    },
  };

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ReminderFormData>({
    defaultValues,
  });

  const {
    fields: timingFields,
    append: appendTiming,
    remove: removeTiming,
  } = useFieldArray({
    control,
    name: 'timings',
  });

  const watchedMethods = watch('methods');

  useEffect(() => {
    if (isOpen) {
      loadReminderStats();
    }
  }, [isOpen]);

  const loadReminderStats = () => {
    const stats = reminderEngine.getReminderStatistics();
    setReminderStats(stats);
  };

  const onSubmit = async (data: ReminderFormData) => {
    try {
      const settings: Partial<ReminderSettings> = {
        enabled: data.enabled,
        methods: data.methods as ('sms' | 'whatsapp' | 'email')[],
        timings: data.timings.map(timing => ({
          [timing.type]: timing.value,
        })),
        templates: data.templates,
        business_hours: data.business_hours,
      };

      if (appointmentId) {
        // Apply settings to specific appointment
        await reminderEngine.scheduleReminders(appointmentId, settings);
        
        addToast({
          type: 'success',
          title: t('reminders.settingsApplied', 'Settings Applied'),
          message: t('reminders.settingsAppliedMessage', 'Reminder settings have been applied to the appointment.'),
        });
      } else {
        // Save as default settings (in a real app, this would be saved to database)
        localStorage.setItem('defaultReminderSettings', JSON.stringify(settings));
        
        addToast({
          type: 'success',
          title: t('reminders.settingsSaved', 'Settings Saved'),
          message: t('reminders.settingsSavedMessage', 'Default reminder settings have been saved.'),
        });
      }

      onClose();
    } catch (error: any) {
      addToast({
        type: 'error',
        title: t('reminders.settingsError', 'Settings Error'),
        message: error.message || t('reminders.settingsErrorMessage', 'Failed to save reminder settings.'),
      });
    }
  };

  const handleMethodChange = (method: string, checked: boolean) => {
    const currentMethods = watchedMethods || [];
    
    if (checked) {
      setValue('methods', [...currentMethods, method]);
    } else {
      setValue('methods', currentMethods.filter(m => m !== method));
    }
  };

  const getTimingLabel = (type: string) => {
    switch (type) {
      case 'days_before': return t('reminders.daysBefore', 'Days before');
      case 'hours_before': return t('reminders.hoursBefore', 'Hours before');
      case 'minutes_before': return t('reminders.minutesBefore', 'Minutes before');
      default: return type;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={appointmentId ? t('reminders.appointmentSettings', 'Appointment Reminder Settings') : t('reminders.defaultSettings', 'Default Reminder Settings')}
      size="3xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Enable/Disable */}
        <div className="flex items-center space-x-3">
          <input
            {...register('enabled')}
            type="checkbox"
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('reminders.enableReminders', 'Enable automatic reminders')}
          </label>
        </div>

        {/* Reminder Methods */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {t('reminders.methods', 'Reminder Methods')}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <input
                type="checkbox"
                checked={watchedMethods?.includes('sms') || false}
                onChange={(e) => handleMethodChange('sms', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <MessageSquare className="text-blue-500" size={20} />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">SMS</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Text messages</div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <input
                type="checkbox"
                checked={watchedMethods?.includes('whatsapp') || false}
                onChange={(e) => handleMethodChange('whatsapp', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <Phone className="text-green-500" size={20} />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">WhatsApp</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">WhatsApp messages</div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <input
                type="checkbox"
                checked={watchedMethods?.includes('email') || false}
                onChange={(e) => handleMethodChange('email', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <Mail className="text-purple-500" size={20} />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Email</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Email notifications</div>
              </div>
            </div>
          </div>
        </div>

        {/* Reminder Timings */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('reminders.timings', 'Reminder Timings')}
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendTiming({ type: 'hours_before', value: 1 })}
            >
              <Plus size={16} className="mr-2" />
              {t('reminders.addTiming', 'Add Timing')}
            </Button>
          </div>

          <div className="space-y-3">
            {timingFields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-4">
                  <select
                    {...register(`timings.${index}.type`)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="days_before">{t('reminders.daysBefore', 'Days before')}</option>
                    <option value="hours_before">{t('reminders.hoursBefore', 'Hours before')}</option>
                    <option value="minutes_before">{t('reminders.minutesBefore', 'Minutes before')}</option>
                  </select>
                </div>
                <div className="col-span-7">
                  <input
                    {...register(`timings.${index}.value`, { 
                      required: 'Value is required',
                      min: { value: 1, message: 'Value must be at least 1' }
                    })}
                    type="number"
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter value"
                  />
                </div>
                <div className="col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTiming(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Message Templates */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {t('reminders.templates', 'Message Templates')}
          </h3>
          
          <div className="space-y-4">
            {watchedMethods?.includes('sms') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('reminders.smsTemplate', 'SMS Template')}
                </label>
                <textarea
                  {...register('templates.sms')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="SMS message template..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  {t('reminders.templateVariables', 'Available variables')}: {'{firstName}, {lastName}, {date}, {time}, {dentist}, {clinicPhone}'}
                </p>
              </div>
            )}

            {watchedMethods?.includes('whatsapp') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('reminders.whatsappTemplate', 'WhatsApp Template')}
                </label>
                <textarea
                  {...register('templates.whatsapp')}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="WhatsApp message template..."
                />
              </div>
            )}

            {watchedMethods?.includes('email') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('reminders.emailTemplate', 'Email Template')}
                </label>
                <textarea
                  {...register('templates.email')}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Email message template..."
                />
              </div>
            )}
          </div>
        </div>

        {/* Business Hours */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {t('reminders.businessHours', 'Business Hours')}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('reminders.startTime', 'Start Time')}
              </label>
              <input
                {...register('business_hours.start')}
                type="time"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('reminders.endTime', 'End Time')}
              </label>
              <input
                {...register('business_hours.end')}
                type="time"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('reminders.timezone', 'Timezone')}
              </label>
              <select
                {...register('business_hours.timezone')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="Africa/Casablanca">Morocco (GMT+1)</option>
                <option value="Europe/Paris">Paris (GMT+1)</option>
                <option value="UTC">UTC (GMT+0)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Statistics */}
        {reminderStats && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t('reminders.statistics', 'Reminder Statistics')}
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {reminderStats.totalScheduled}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t('reminders.scheduled', 'Scheduled')}
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {reminderStats.totalSent}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t('reminders.sent', 'Sent')}
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {reminderStats.totalFailed}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t('reminders.failed', 'Failed')}
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {reminderStats.totalCancelled}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t('reminders.cancelled', 'Cancelled')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="outline"
            onClick={loadReminderStats}
          >
            <Settings size={16} className="mr-2" />
            {t('reminders.refreshStats', 'Refresh Stats')}
          </Button>

          <div className="flex space-x-3">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" loading={isSubmitting}>
              <Save size={16} className="mr-2" />
              {t('reminders.saveSettings', 'Save Settings')}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
