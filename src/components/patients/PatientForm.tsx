import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import type { Database } from '../../lib/database.types';

type Patient = Database['public']['Tables']['patients']['Row'];
type PatientInsert = Database['public']['Tables']['patients']['Insert'];

const patientSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  phone: z.string().min(1, 'Phone number is required'),
  date_of_birth: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  insurance_provider: z.string().optional().nullable(),
  insurance_number: z.string().optional().nullable(),
  medical_history: z.object({
    allergies: z.array(z.string()).default([]),
    medications: z.array(z.string()).default([]),
    conditions: z.array(z.string()).default([]),
    notes: z.string().default(''),
  }).optional(),
  notes: z.string().optional().nullable(),
});

interface PatientFormProps {
  patient?: Patient;
  onSubmit: (data: PatientInsert) => void;
  isLoading?: boolean;
}

export const PatientForm: React.FC<PatientFormProps> = ({
  patient,
  onSubmit,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const { register, handleSubmit, formState: { errors } } = useForm<PatientInsert>({
    resolver: zodResolver(patientSchema),
    defaultValues: patient || {},
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('patients.firstName')}
          </label>
          <input
            type="text"
            id="first_name"
            {...register('first_name')}
            className="mt-1 input w-full"
          />
          {errors.first_name && (
            <p className="mt-1 text-sm text-red-600">{errors.first_name.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('patients.lastName')}
          </label>
          <input
            type="text"
            id="last_name"
            {...register('last_name')}
            className="mt-1 input w-full"
          />
          {errors.last_name && (
            <p className="mt-1 text-sm text-red-600">{errors.last_name.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('patients.email')}
          </label>
          <input
            type="email"
            id="email"
            {...register('email')}
            className="mt-1 input w-full"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('patients.phone')}
          </label>
          <input
            type="tel"
            id="phone"
            {...register('phone')}
            className="mt-1 input w-full"
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('patients.dateOfBirth')}
          </label>
          <input
            type="date"
            id="date_of_birth"
            {...register('date_of_birth')}
            className="mt-1 input w-full"
          />
        </div>

        <div>
          <label htmlFor="gender" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('patients.gender')}
          </label>
          <select
            id="gender"
            {...register('gender')}
            className="mt-1 input w-full"
          >
            <option value="">{t('common.select')}</option>
            <option value="male">{t('patients.male')}</option>
            <option value="female">{t('patients.female')}</option>
            <option value="other">{t('patients.other')}</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('patients.address')}
          </label>
          <input
            type="text"
            id="address"
            {...register('address')}
            className="mt-1 input w-full"
          />
        </div>

        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('patients.city')}
          </label>
          <input
            type="text"
            id="city"
            {...register('city')}
            className="mt-1 input w-full"
          />
        </div>

        <div>
          <label htmlFor="insurance_provider" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('patients.insuranceProvider')}
          </label>
          <select
            id="insurance_provider"
            {...register('insurance_provider')}
            className="mt-1 input w-full"
          >
            <option value="">{t('common.select')}</option>
            <option value="CNOPS">{t('billing.cnops')}</option>
            <option value="CNSS">{t('billing.cnss')}</option>
            <option value="Private">{t('billing.privateInsurance')}</option>
          </select>
        </div>

        <div>
          <label htmlFor="insurance_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('patients.insuranceNumber')}
          </label>
          <input
            type="text"
            id="insurance_number"
            {...register('insurance_number')}
            className="mt-1 input w-full"
          />
        </div>

        <div className="md:col-span-2">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 mt-6">
            {t('patients.medicalHistory', 'Medical History')}
          </h3>
        </div>

        <div>
          <label htmlFor="allergies" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('patients.allergies', 'Allergies')}
          </label>
          <input
            type="text"
            id="allergies"
            placeholder={t('patients.allergiesPlaceholder', 'Separate multiple allergies with commas')}
            className="mt-1 input w-full"
          />
          <p className="mt-1 text-xs text-gray-500">{t('patients.separateWithCommas', 'Separate multiple items with commas')}</p>
        </div>

        <div>
          <label htmlFor="medications" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('patients.medications', 'Current Medications')}
          </label>
          <input
            type="text"
            id="medications"
            placeholder={t('patients.medicationsPlaceholder', 'Separate multiple medications with commas')}
            className="mt-1 input w-full"
          />
          <p className="mt-1 text-xs text-gray-500">{t('patients.separateWithCommas', 'Separate multiple items with commas')}</p>
        </div>

        <div>
          <label htmlFor="conditions" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('patients.conditions', 'Medical Conditions')}
          </label>
          <input
            type="text"
            id="conditions"
            placeholder={t('patients.conditionsPlaceholder', 'Separate multiple conditions with commas')}
            className="mt-1 input w-full"
          />
          <p className="mt-1 text-xs text-gray-500">{t('patients.separateWithCommas', 'Separate multiple items with commas')}</p>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="medical_notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('patients.medicalNotes', 'Medical Notes')}
          </label>
          <textarea
            id="medical_notes"
            rows={3}
            placeholder={t('patients.medicalNotesPlaceholder', 'Additional medical information...')}
            className="mt-1 input w-full"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('patients.notes', 'General Notes')}
          </label>
          <textarea
            id="notes"
            {...register('notes')}
            rows={3}
            placeholder={t('patients.notesPlaceholder', 'Additional notes about the patient...')}
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