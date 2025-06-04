import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import type { Database } from '../../lib/database.types';

type Appointment = Database['public']['Tables']['appointments']['Row'];
type AppointmentInsert = Database['public']['Tables']['appointments']['Insert'];

const appointmentSchema = z.object({
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']).default('scheduled'),
  treatment_id: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

interface AppointmentFormProps {
  patientId: string;
  appointment?: Appointment;
  onSubmit: (data: AppointmentInsert) => void;
  isLoading?: boolean;
}

export const AppointmentForm: React.FC<AppointmentFormProps> = ({
  patientId,
  appointment,
  onSubmit,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const { register, handleSubmit, formState: { errors } } = useForm<AppointmentInsert>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: appointment || {
      patient_id: patientId,
      status: 'scheduled',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('appointments.startTime')}
          </label>
          <input
            type="datetime-local"
            id="start_time"
            {...register('start_time')}
            className="mt-1 input w-full"
          />
          {errors.start_time && (
            <p className="mt-1 text-sm text-red-600">{errors.start_time.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('appointments.endTime')}
          </label>
          <input
            type="datetime-local"
            id="end_time"
            {...register('end_time')}
            className="mt-1 input w-full"
          />
          {errors.end_time && (
            <p className="mt-1 text-sm text-red-600">{errors.end_time.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('appointments.status')}
          </label>
          <select
            id="status"
            {...register('status')}
            className="mt-1 input w-full"
          >
            <option value="scheduled">{t('appointments.scheduled')}</option>
            <option value="confirmed">{t('appointments.confirmed')}</option>
            <option value="completed">{t('appointments.completed')}</option>
            <option value="cancelled">{t('appointments.cancelled')}</option>
            <option value="no_show">{t('appointments.noShow')}</option>
          </select>
        </div>

        <div>
          <label htmlFor="treatment_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('appointments.treatment')}
          </label>
          <select
            id="treatment_id"
            {...register('treatment_id')}
            className="mt-1 input w-full"
          >
            <option value="">{t('common.select')}</option>
            {/* Treatment options will be populated from the treatments query */}
          </select>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('appointments.notes')}
          </label>
          <textarea
            id="notes"
            {...register('notes')}
            rows={3}
            className="mt-1 input w-full"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline">
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? t('common.saving') : t('common.save')}
        </Button>
      </div>
    </form>
  );
};