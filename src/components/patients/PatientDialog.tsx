import React from 'react';
import { useTranslation } from 'react-i18next';
import { PatientForm } from './PatientForm';
import { useCreatePatient, useUpdatePatient } from '../../hooks/usePatients';
import type { Database } from '../../lib/database.types';

type Patient = Database['public']['Tables']['patients']['Row'];
type PatientInsert = Database['public']['Tables']['patients']['Insert'];

interface PatientDialogProps {
  patient?: Patient;
  onClose: () => void;
}

export const PatientDialog: React.FC<PatientDialogProps> = ({ patient, onClose }) => {
  const { t } = useTranslation();
  const createPatient = useCreatePatient();
  const updatePatient = useUpdatePatient();

  const handleSubmit = async (data: PatientInsert) => {
    try {
      if (patient) {
        await updatePatient.mutateAsync({ id: patient.id, ...data });
      } else {
        await createPatient.mutateAsync(data);
      }
      onClose();
    } catch (error) {
      console.error('Error saving patient:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {patient ? t('patients.editPatient') : t('patients.addPatient')}
            </h3>
          </div>

          <PatientForm
            patient={patient}
            onSubmit={handleSubmit}
            isLoading={createPatient.isPending || updatePatient.isPending}
          />
        </div>
      </div>
    </div>
  );
};