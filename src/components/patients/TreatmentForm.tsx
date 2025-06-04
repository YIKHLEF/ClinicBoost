import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import type { Database } from '../../lib/database.types';

type Treatment = Database['public']['Tables']['treatments']['Row'];
type TreatmentInsert = Database['public']['Tables']['treatments']['Insert'];

const treatmentSchema = z.object({
  name: z.string().min(1, 'Treatment name is required'),
  description: z.string().optional().nullable(),
  cost: z.number().min(0, 'Cost must be a positive number'),
  status: z.string().default('planned'),
  start_date: z.string().optional().nullable(),
  completion_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

interface TreatmentFormProps {
  patientId: string;
  treatment?: Treatment;
  onSubmit: (data: TreatmentInsert) => void;
  isLoading?: boolean;
}

export const TreatmentForm: React.FC<TreatmentFormProps> = ({
  patientId,
  treatment,
  onSubmit,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const { register, handleSubmit, formState: { errors } } = useForm<TreatmentInsert>({
    resolver: zodResolver(treatmentSchema),
    defaultValues: treatment || {
      patient_id: patientId,
      status: 'planned',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('treatments.name')}
          </label>
          <input
            type="text"
            id="name"
            {...register('name')}
            className="mt-1 input w-full"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('treatments.description')}
          </label>
          <textarea
            id="description"
            {...register('description')}
            rows={3}
            className="mt-1 input w-full"
          />
        </div>

        <div>
          <label htmlFor="cost" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('treatments.cost')}
          </label>
          <input
            type="number"
            id="cost"
            {...register('cost', { valueAsNumber: true })}
            className="mt-1 input w-full"
          />
          {errors.cost && (
            <p className="mt-1 text-sm text-red-600">{errors.cost.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('treatments.status')}
          </label>
          <select
            id="status"
            {...register('status')}
            className="mt-1 input w-full"
          >
            <option value="planned">{t('treatments.planned')}</option>
            <option value="in_progress">{t('treatments.inProgress')}</option>
            <option value="completed">{t('treatments.completed')}</option>
            <option value="cancelled">{t('treatments.cancelled')}</option>
          </select>
        </div>

        <div>
          <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('treatments.startDate')}
          </label>
          <input
            type="date"
            id="start_date"
            {...register('start_date')}
            className="mt-1 input w-full"
          />
        </div>

        <div>
          <label htmlFor="completion_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('treatments.completionDate')}
          </label>
          <input
            type="date"
            id="completion_date"
            {...register('completion_date')}
            className="mt-1 input w-full"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('treatments.notes')}
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