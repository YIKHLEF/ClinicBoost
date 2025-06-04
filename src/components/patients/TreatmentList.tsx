import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTreatments } from '../../hooks/useTreatments';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { FileText, Plus } from 'lucide-react';
import { format } from 'date-fns';

interface TreatmentListProps {
  patientId: string;
  onAdd: () => void;
  onEdit: (id: string) => void;
}

export const TreatmentList: React.FC<TreatmentListProps> = ({
  patientId,
  onAdd,
  onEdit,
}) => {
  const { t } = useTranslation();
  const { data: treatments, isLoading } = useTreatments(patientId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t('patients.treatments')}</CardTitle>
        <Button size="sm" onClick={onAdd}>
          <Plus size={16} className="mr-2" />
          {t('patients.addTreatment')}
        </Button>
      </CardHeader>
      <CardContent>
        {treatments?.length === 0 ? (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            {t('patients.noTreatments')}
          </div>
        ) : (
          <div className="space-y-4">
            {treatments?.map((treatment) => (
              <div
                key={treatment.id}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                    <FileText size={20} className="text-primary-500" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {treatment.name}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {treatment.description}
                    </p>
                    <div className="mt-1 flex items-center text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        {format(new Date(treatment.start_date!), 'PPP')}
                      </span>
                      <span className="mx-2">•</span>
                      <span className={`font-medium ${
                        treatment.status === 'completed' 
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}>
                        {t(`patients.${treatment.status}`)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {new Intl.NumberFormat('fr-MA', {
                        style: 'currency',
                        currency: 'MAD'
                      }).format(treatment.cost)}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => onEdit(treatment.id)}>
                    {t('common.edit')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};