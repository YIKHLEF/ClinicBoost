import React from 'react';
import { useTranslation } from 'react-i18next';
import { TreatmentForm } from './TreatmentForm';
import { useCreateTreatment, useUpdateTreatment } from '../../hooks/useTreatments';
import type { Database } from '../../lib/database.types';

type Treatment = Database['public']['Tables']['treatments']['Row'];
type TreatmentInsert = Database['public']['Tables']['treatments']['Insert'];

interface TreatmentDialogProps {
  patientId: string;
  treatment?: Treatment;
  onClose: () => void;
}

export const TreatmentDialog: React.FC<TreatmentDialogProps> = ({
  patientId,
  treatment,
  onClose,
}) => {
  const { t } = useTranslation();
  const createTreatment = useCreateTreatment();
  const updateTreatment = useUpdateTreatment();

  const handleSubmit = async (data: TreatmentInsert) => {
    try {
      if (treatment) {
        await updateTreatment.mutateAsync({ id: treatment.id, ...data });
      } else {
        await createTreatment.mutateAsync({ ...data, patient_id: patientId });
      }
      onClose();
    } catch (error) {
      console.error('Error saving treatment:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {treatment ? t('treatments.editTreatment') : t('treatments.addTreatment')}
            </h3>
          </div>

          <TreatmentForm
            patientId={patientId}
            treatment={treatment}
            onSubmit={handleSubmit}
            isLoading={createTreatment.isPending || updateTreatment.isPending}
          />
        </div>
      </div>
    </div>
  );
};