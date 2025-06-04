import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, Plus, ChevronDown } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { PatientList } from '../components/patients/PatientList';
import { PatientDetails } from '../components/patients/PatientDetails';
import { PatientDialog } from '../components/patients/PatientDialog';
import type { Database } from '../lib/database.types';

type Patient = Database['public']['Tables']['patients']['Row'];

const Patients: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'details'>('list');
  
  const handleAddPatient = () => {
    setSelectedPatient(null);
    setIsDialogOpen(true);
  };

  const handleEditPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsDialogOpen(true);
  };

  const handleViewPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setViewMode('details');
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedPatient(null);
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedPatient(null);
  };

  return (
    <div className="space-y-6">
      {viewMode === 'list' ? (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('patients.title')}
            </h1>
            <Button onClick={handleAddPatient}>
              <Plus size={16} className="mr-2" />
              {t('patients.addPatient')}
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('patients.searchPatient')}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
            
            <div className="relative">
              <Button 
                variant="outline" 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center"
              >
                <Filter size={16} className="mr-2" />
                {t('common.filter')}
                <ChevronDown size={16} className="ml-2" />
              </Button>
              
              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
                  <div className="p-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                      {t('patients.filterByStatus')}
                    </p>
                    <div className="space-y-1">
                      <button
                        className={`w-full text-left px-3 py-1.5 text-sm rounded-md ${
                          statusFilter === null 
                            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium' 
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        onClick={() => setStatusFilter(null)}
                      >
                        {t('patients.allPatients')}
                      </button>
                      <button
                        className={`w-full text-left px-3 py-1.5 text-sm rounded-md ${
                          statusFilter === 'active'
                            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        onClick={() => setStatusFilter('active')}
                      >
                        {t('patients.active')}
                      </button>
                      <button
                        className={`w-full text-left px-3 py-1.5 text-sm rounded-md ${
                          statusFilter === 'inactive'
                            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        onClick={() => setStatusFilter('inactive')}
                      >
                        {t('patients.inactive')}
                      </button>
                      <button
                        className={`w-full text-left px-3 py-1.5 text-sm rounded-md ${
                          statusFilter === 'at-risk'
                            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        onClick={() => setStatusFilter('at-risk')}
                      >
                        {t('patients.atRisk')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <PatientList
            onEdit={handleEditPatient}
            onView={handleViewPatient}
          />
        </>
      ) : (
        selectedPatient && (
          <PatientDetails
            id={selectedPatient.id}
            onEdit={() => handleEditPatient(selectedPatient)}
            onClose={handleBackToList}
          />
        )
      )}

      {isDialogOpen && (
        <PatientDialog
          patient={selectedPatient || undefined}
          onClose={handleCloseDialog}
        />
      )}
    </div>
  );
};

export default Patients;