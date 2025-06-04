import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { usePatients } from '../../hooks/usePatients';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { AdvancedTable, type Column } from '../ui/AdvancedTable';
import { EmptyState, PatientsEmptyState } from '../ui/EmptyState';
import { User, Phone, MapPin, AlertTriangle, CheckCircle2, Clock, Mail, Calendar, Shield } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { Database } from '../../lib/database.types';

type Patient = Database['public']['Tables']['patients']['Row'];

interface PatientListProps {
  onEdit: (patient: Patient) => void;
  onView: (patient: Patient) => void;
  onAdd?: () => void;
  viewMode?: 'table' | 'cards';
}

export const PatientList: React.FC<PatientListProps> = ({
  onEdit,
  onView,
  onAdd,
  viewMode = 'table'
}) => {
  const { t } = useTranslation();
  const { data: patients, isLoading, error } = usePatients({ realtime: true });
  const [sortBy, setSortBy] = useState<string>('first_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Define table columns
  const columns: Column<Patient>[] = useMemo(() => [
    {
      id: 'name',
      header: t('patients.name', 'Name'),
      accessor: (patient) => `${patient.first_name} ${patient.last_name}`,
      sortable: true,
      resizable: true,
      width: 200,
      render: (value, patient) => (
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <User size={16} className="text-gray-500 dark:text-gray-400" />
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {patient.first_name} {patient.last_name}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              ID: {patient.id.slice(0, 8)}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'contact',
      header: t('patients.contact', 'Contact'),
      accessor: 'phone',
      sortable: true,
      resizable: true,
      width: 180,
      render: (value, patient) => (
        <div className="space-y-1">
          <div className="flex items-center text-sm">
            <Phone size={14} className="text-gray-400 mr-2" />
            <span className="text-gray-900 dark:text-white">{patient.phone}</span>
          </div>
          {patient.email && (
            <div className="flex items-center text-sm">
              <Mail size={14} className="text-gray-400 mr-2" />
              <span className="text-gray-600 dark:text-gray-300">{patient.email}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'status',
      header: t('patients.status', 'Status'),
      accessor: 'status',
      sortable: true,
      resizable: true,
      width: 120,
      render: (value, patient) => {
        const statusConfig = {
          active: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/20' },
          inactive: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-900/20' },
          archived: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/20' },
        };

        const config = statusConfig[patient.status as keyof typeof statusConfig] || statusConfig.active;
        const Icon = config.icon;

        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
            <Icon size={12} className="mr-1" />
            {t(`patients.${patient.status}`, patient.status)}
          </span>
        );
      },
    },
    {
      id: 'risk_level',
      header: t('patients.riskLevel', 'Risk Level'),
      accessor: 'risk_level',
      sortable: true,
      resizable: true,
      width: 120,
      render: (value, patient) => {
        const riskConfig = {
          low: { color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/20' },
          medium: { color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/20' },
          high: { color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/20' },
        };

        const config = riskConfig[patient.risk_level as keyof typeof riskConfig] || riskConfig.low;

        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
            {t(`patients.${patient.risk_level}Risk`, patient.risk_level)}
          </span>
        );
      },
    },
    {
      id: 'insurance',
      header: t('patients.insurance', 'Insurance'),
      accessor: 'insurance_provider',
      sortable: true,
      resizable: true,
      width: 150,
      render: (value, patient) => (
        <div className="flex items-center">
          <Shield size={14} className="text-gray-400 mr-2" />
          <span className="text-gray-900 dark:text-white">
            {patient.insurance_provider || t('patients.noInsurance', 'No Insurance')}
          </span>
        </div>
      ),
    },
    {
      id: 'location',
      header: t('patients.location', 'Location'),
      accessor: 'city',
      sortable: true,
      resizable: true,
      width: 150,
      render: (value, patient) => (
        <div className="flex items-center">
          <MapPin size={14} className="text-gray-400 mr-2" />
          <span className="text-gray-900 dark:text-white">
            {patient.city || t('patients.noLocation', 'Not specified')}
          </span>
        </div>
      ),
    },
    {
      id: 'date_of_birth',
      header: t('patients.age', 'Age'),
      accessor: 'date_of_birth',
      sortable: true,
      resizable: true,
      width: 100,
      render: (value, patient) => {
        if (!patient.date_of_birth) return '-';

        const age = new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear();
        return (
          <div className="flex items-center">
            <Calendar size={14} className="text-gray-400 mr-2" />
            <span className="text-gray-900 dark:text-white">{age}</span>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: t('common.actions', 'Actions'),
      accessor: () => '',
      sortable: false,
      resizable: false,
      width: 120,
      render: (value, patient) => (
        <div className="flex space-x-2">
          <Button variant="ghost" size="sm" onClick={() => onView(patient)}>
            {t('common.view', 'View')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onEdit(patient)}>
            {t('common.edit', 'Edit')}
          </Button>
        </div>
      ),
    },
  ], [t, onView, onEdit]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        type="general"
        title={t('common.error', 'Error')}
        description={t('patients.loadError', 'Failed to load patients. Please try again.')}
        size="md"
      />
    );
  }

  if (!patients?.length) {
    return <PatientsEmptyState onAddPatient={onAdd} />;
  }

  // Handle sorting
  const handleSort = (column: string, order: 'asc' | 'desc') => {
    setSortBy(column);
    setSortOrder(order);
  };

  // Sort patients
  const sortedPatients = useMemo(() => {
    if (!patients) return [];

    return [...patients].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = `${a.first_name} ${a.last_name}`;
          bValue = `${b.first_name} ${b.last_name}`;
          break;
        case 'date_of_birth':
          aValue = a.date_of_birth ? new Date(a.date_of_birth) : new Date(0);
          bValue = b.date_of_birth ? new Date(b.date_of_birth) : new Date(0);
          break;
        default:
          aValue = a[sortBy as keyof Patient] || '';
          bValue = b[sortBy as keyof Patient] || '';
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [patients, sortBy, sortOrder]);

  if (viewMode === 'cards') {
    return (
      <div className="space-y-4">
        {sortedPatients.map((patient) => (
          <Card key={patient.id} className="hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <User className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {patient.first_name} {patient.last_name}
                    </h3>
                    <div className="flex items-center mt-1 text-sm text-gray-500 dark:text-gray-400">
                      <span>{t(`patients.${patient.status}`)}</span>
                      <span className="mx-2">•</span>
                      <span>{patient.insurance_provider || t('patients.noInsurance', 'No Insurance')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => onView(patient)}>
                    {t('common.view')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onEdit(patient)}>
                    {t('common.edit')}
                  </Button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center text-sm">
                  <Phone size={16} className="text-gray-400 mr-2" />
                  <span className="text-gray-600 dark:text-gray-300">{patient.phone}</span>
                </div>
                {patient.email && (
                  <div className="flex items-center text-sm">
                    <Mail size={16} className="text-gray-400 mr-2" />
                    <span className="text-gray-600 dark:text-gray-300">{patient.email}</span>
                  </div>
                )}
                {patient.address && (
                  <div className="flex items-center text-sm sm:col-span-2">
                    <MapPin size={16} className="text-gray-400 mr-2" />
                    <span className="text-gray-600 dark:text-gray-300">{patient.address}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <AdvancedTable
      data={sortedPatients}
      columns={columns}
      loading={isLoading}
      sorting={{
        sortBy,
        sortOrder,
        onSort: handleSort,
      }}
      onRowClick={(patient) => onView(patient)}
      emptyState={<PatientsEmptyState onAddPatient={onAdd} />}
      className="mt-4"
    />
  );
};