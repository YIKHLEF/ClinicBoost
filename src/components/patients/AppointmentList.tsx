import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppointments } from '../../hooks/useAppointments';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Calendar, Plus, Clock, CheckCircle2, X } from 'lucide-react';
import { format } from 'date-fns';

interface AppointmentListProps {
  patientId: string;
  onAdd: () => void;
  onEdit: (id: string) => void;
}

export const AppointmentList: React.FC<AppointmentListProps> = ({
  patientId,
  onAdd,
  onEdit,
}) => {
  const { t } = useTranslation();
  const { data: appointments, isLoading } = useAppointments(patientId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={16} className="text-green-500" />;
      case 'cancelled':
        return <X size={16} className="text-red-500" />;
      default:
        return <Clock size={16} className="text-amber-500" />;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t('patients.appointments')}</CardTitle>
        <Button size="sm" onClick={onAdd}>
          <Plus size={16} className="mr-2" />
          {t('patients.addAppointment')}
        </Button>
      </CardHeader>
      <CardContent>
        {appointments?.length === 0 ? (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            {t('patients.noAppointments')}
          </div>
        ) : (
          <div className="space-y-4">
            {appointments?.map((appointment) => (
              <div
                key={appointment.id}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                    <Calendar size={20} className="text-primary-500" />
                  </div>
                  <div>
                    <div className="flex items-center">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {format(new Date(appointment.start_time), 'PPP')}
                      </h4>
                      <span className="mx-2">•</span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {format(new Date(appointment.start_time), 'p')}
                      </span>
                    </div>
                    {appointment.notes && (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {appointment.notes}
                      </p>
                    )}
                    <div className="mt-1 flex items-center text-sm">
                      {getStatusIcon(appointment.status)}
                      <span className="ml-1 text-gray-500 dark:text-gray-400">
                        {t(`patients.${appointment.status}`)}
                      </span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => onEdit(appointment.id)}>
                  {t('common.edit')}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};