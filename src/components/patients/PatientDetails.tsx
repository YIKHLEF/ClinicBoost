import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePatient } from '../../hooks/usePatients';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { User, Phone, Mail, MapPin, Calendar, FileText, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { TreatmentList } from './TreatmentList';
import { AppointmentList } from './AppointmentList';
import { TreatmentDialog } from './TreatmentDialog';
import { AppointmentDialog } from './AppointmentDialog';

interface PatientDetailsProps {
  id: string;
  onEdit: () => void;
  onClose: () => void;
}

export const PatientDetails: React.FC<PatientDetailsProps> = ({ id, onEdit, onClose }) => {
  const { t } = useTranslation();
  const { data: patient, isLoading, error } = usePatient(id);
  const [isTreatmentDialogOpen, setIsTreatmentDialogOpen] = useState(false);
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{t('common.error')}</div>
      </div>
    );
  }

  const handleAddTreatment = () => {
    setSelectedTreatmentId(null);
    setIsTreatmentDialogOpen(true);
  };

  const handleEditTreatment = (treatmentId: string) => {
    setSelectedTreatmentId(treatmentId);
    setIsTreatmentDialogOpen(true);
  };

  const handleAddAppointment = () => {
    setSelectedAppointmentId(null);
    setIsAppointmentDialogOpen(true);
  };

  const handleEditAppointment = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setIsAppointmentDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('patients.patientDetails')}
        </h2>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={onClose}>
            {t('common.close')}
          </Button>
          <Button onClick={onEdit}>
            {t('common.edit')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('patients.personalInfo')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('patients.fullName')}
                </label>
                <p className="mt-1 text-base text-gray-900 dark:text-white">
                  {patient.first_name} {patient.last_name}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('patients.dateOfBirth')}
                </label>
                <p className="mt-1 text-base text-gray-900 dark:text-white">
                  {patient.date_of_birth ? format(new Date(patient.date_of_birth), 'PPP') : '-'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('patients.phone')}
                </label>
                <p className="mt-1 text-base text-gray-900 dark:text-white">
                  {patient.phone}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('patients.email')}
                </label>
                <p className="mt-1 text-base text-gray-900 dark:text-white">
                  {patient.email || '-'}
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('patients.address')}
                </label>
                <p className="mt-1 text-base text-gray-900 dark:text-white">
                  {patient.address || '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('patients.insuranceInfo')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('patients.insuranceProvider')}
                </label>
                <p className="mt-1 text-base text-gray-900 dark:text-white">
                  {patient.insurance_provider ? t(`billing.${patient.insurance_provider.toLowerCase()}`) : '-'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('patients.insuranceNumber')}
                </label>
                <p className="mt-1 text-base text-gray-900 dark:text-white">
                  {patient.insurance_number || '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          <TreatmentList
            patientId={patient.id}
            onAdd={handleAddTreatment}
            onEdit={handleEditTreatment}
          />
        </div>

        <div className="lg:col-span-3">
          <AppointmentList
            patientId={patient.id}
            onAdd={handleAddAppointment}
            onEdit={handleEditAppointment}
          />
        </div>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{t('patients.medicalHistory')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose dark:prose-invert max-w-none">
              {Object.entries(patient.medical_history as Record<string, unknown>).length > 0 ? (
                <pre className="text-sm bg-gray-50 dark:bg-gray-800 p-4 rounded-md overflow-auto">
                  {JSON.stringify(patient.medical_history, null, 2)}
                </pre>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  {t('patients.noMedicalHistory')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {patient.notes && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>{t('patients.notes')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {patient.notes}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {isTreatmentDialogOpen && (
        <TreatmentDialog
          patientId={patient.id}
          treatment={selectedTreatmentId ? undefined : undefined}
          onClose={() => setIsTreatmentDialogOpen(false)}
        />
      )}

      {isAppointmentDialogOpen && (
        <AppointmentDialog
          patientId={patient.id}
          appointment={selectedAppointmentId ? undefined : undefined}
          onClose={() => setIsAppointmentDialogOpen(false)}
        />
      )}
    </div>
  );
};