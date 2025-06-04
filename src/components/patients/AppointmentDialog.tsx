import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppointmentForm } from './AppointmentForm';
import { useCreateAppointment, useUpdateAppointment } from '../../hooks/useAppointments';
import type { Database } from '../../lib/database.types';

type Appointment = Database['public']['Tables']['appointments']['Row'];
type AppointmentInsert = Database['public']['Tables']['appointments']['Insert'];

interface AppointmentDialogProps {
  patientId: string;
  appointment?: Appointment;
  onClose: () => void;
}

export const AppointmentDialog: React.FC<AppointmentDialogProps> = ({
  patientId,
  appointment,
  onClose,
}) => {
  const { t } = useTranslation();
  const createAppointment = useCreateAppointment();
  const updateAppointment = useUpdateAppointment();

  const handleSubmit = async (data: AppointmentInsert) => {
    try {
      if (appointment) {
        await updateAppointment.mutateAsync({ id: appointment.id, ...data });
      } else {
        await createAppointment.mutateAsync({ ...data, patient_id: patientId });
      }
      onClose();
    } catch (error) {
      console.error('Error saving appointment:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {appointment ? t('appointments.editAppointment') : t('appointments.addAppointment')}
            </h3>
          </div>

          <AppointmentForm
            patientId={patientId}
            appointment={appointment}
            onSubmit={handleSubmit}
            isLoading={createAppointment.isPending || updateAppointment.isPending}
          />
        </div>
      </div>
    </div>
  );
};