/**
 * EHR Data Mapping Component
 * 
 * Provides interface for configuring data field mappings between
 * clinic system and EHR/PMS providers for accurate data synchronization.
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  Database,
  ArrowRight,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  Edit,
  Check,
  X,
  AlertTriangle,
  FileText,
  Users,
  Clock,
  Heart,
  Activity,
  Settings,
} from 'lucide-react';
import {
  type EHRProvider,
  type EHRDataType,
} from '../../lib/integrations/ehr-pms';

interface DataMapping {
  id: string;
  clinicField: string;
  ehrField: string;
  dataType: EHRDataType;
  transformation?: string;
  required: boolean;
  validated: boolean;
}

interface EHRDataMappingProps {
  providers: EHRProvider[];
  onUpdateMapping: (providerId: string, mappings: DataMapping[]) => void;
}

const EHRDataMapping: React.FC<EHRDataMappingProps> = ({
  providers,
  onUpdateMapping,
}) => {
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedDataType, setSelectedDataType] = useState<EHRDataType>('patients');
  const [mappings, setMappings] = useState<DataMapping[]>([]);
  const [editingMapping, setEditingMapping] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const dataTypes: EHRDataType[] = ['patients', 'appointments', 'medical_records', 'prescriptions', 'lab_results', 'vitals'];

  // Sample field definitions for different data types
  const getClinicFields = (dataType: EHRDataType): string[] => {
    switch (dataType) {
      case 'patients':
        return ['firstName', 'lastName', 'dateOfBirth', 'email', 'phone', 'address', 'gender', 'mrn'];
      case 'appointments':
        return ['patientId', 'providerId', 'startTime', 'endTime', 'appointmentType', 'status', 'notes'];
      case 'medical_records':
        return ['patientId', 'diagnosis', 'notes', 'date', 'providerId', 'icd10Code', 'treatmentPlan'];
      case 'prescriptions':
        return ['patientId', 'medication', 'dosage', 'frequency', 'duration', 'prescribedBy', 'date'];
      case 'lab_results':
        return ['patientId', 'testName', 'result', 'units', 'referenceRange', 'date', 'orderedBy'];
      case 'vitals':
        return ['patientId', 'bloodPressure', 'heartRate', 'temperature', 'weight', 'height', 'date'];
      default:
        return [];
    }
  };

  const getEHRFields = (dataType: EHRDataType, providerType: string): string[] => {
    // This would typically come from the EHR provider's API documentation
    switch (providerType) {
      case 'epic':
        switch (dataType) {
          case 'patients':
            return ['given', 'family', 'birthDate', 'telecom.email', 'telecom.phone', 'address', 'gender', 'identifier'];
          case 'appointments':
            return ['subject', 'participant', 'start', 'end', 'serviceType', 'status', 'comment'];
          default:
            return ['id', 'resourceType', 'meta', 'text', 'identifier'];
        }
      case 'cerner':
        switch (dataType) {
          case 'patients':
            return ['name.given', 'name.family', 'birthDate', 'telecom', 'address', 'gender', 'id'];
          case 'appointments':
            return ['subject.reference', 'participant', 'start', 'end', 'serviceCategory', 'status', 'description'];
          default:
            return ['id', 'resourceType', 'meta', 'identifier'];
        }
      default:
        return ['field1', 'field2', 'field3', 'field4', 'field5'];
    }
  };

  const getDataTypeIcon = (dataType: EHRDataType) => {
    switch (dataType) {
      case 'patients':
        return <Users className="text-blue-600" size={16} />;
      case 'appointments':
        return <Clock className="text-green-600" size={16} />;
      case 'medical_records':
        return <FileText className="text-purple-600" size={16} />;
      case 'prescriptions':
        return <Heart className="text-red-600" size={16} />;
      case 'lab_results':
        return <Activity className="text-orange-600" size={16} />;
      case 'vitals':
        return <Activity className="text-pink-600" size={16} />;
      default:
        return <Database className="text-gray-600" size={16} />;
    }
  };

  useEffect(() => {
    if (selectedProvider && selectedDataType) {
      loadMappings();
    }
  }, [selectedProvider, selectedDataType]);

  const loadMappings = () => {
    // Load existing mappings for the selected provider and data type
    // This would typically come from the backend
    const mockMappings: DataMapping[] = [
      {
        id: '1',
        clinicField: 'firstName',
        ehrField: 'given',
        dataType: selectedDataType,
        required: true,
        validated: true,
      },
      {
        id: '2',
        clinicField: 'lastName',
        ehrField: 'family',
        dataType: selectedDataType,
        required: true,
        validated: true,
      },
      {
        id: '3',
        clinicField: 'email',
        ehrField: 'telecom.email',
        dataType: selectedDataType,
        required: false,
        validated: false,
      },
    ];
    
    setMappings(selectedDataType === 'patients' ? mockMappings : []);
  };

  const addMapping = () => {
    const newMapping: DataMapping = {
      id: Date.now().toString(),
      clinicField: '',
      ehrField: '',
      dataType: selectedDataType,
      required: false,
      validated: false,
    };
    
    setMappings(prev => [...prev, newMapping]);
    setEditingMapping(newMapping.id);
  };

  const updateMapping = (id: string, updates: Partial<DataMapping>) => {
    setMappings(prev => prev.map(mapping => 
      mapping.id === id ? { ...mapping, ...updates } : mapping
    ));
  };

  const deleteMapping = (id: string) => {
    setMappings(prev => prev.filter(mapping => mapping.id !== id));
  };

  const validateMapping = async (id: string) => {
    // Simulate validation
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    updateMapping(id, { validated: true });
    setIsLoading(false);
  };

  const saveMappings = () => {
    if (selectedProvider) {
      onUpdateMapping(selectedProvider, mappings);
    }
  };

  const selectedProviderData = providers.find(p => p.id === selectedProvider);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Data Field Mapping
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Configure how clinic data fields map to EHR/PMS provider fields
          </p>
        </div>
        
        <Button onClick={saveMappings} disabled={!selectedProvider}>
          <Save size={16} className="mr-2" />
          Save Mappings
        </Button>
      </div>

      {/* Provider and Data Type Selection */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Provider
            </label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Choose a provider...</option>
              {providers.map(provider => (
                <option key={provider.id} value={provider.id}>
                  {provider.name} ({provider.type})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Data Type
            </label>
            <select
              value={selectedDataType}
              onChange={(e) => setSelectedDataType(e.target.value as EHRDataType)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              disabled={!selectedProvider}
            >
              {dataTypes.map(type => (
                <option key={type} value={type}>
                  {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Mapping Configuration */}
      {selectedProvider && selectedProviderData && (
        <Card>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getDataTypeIcon(selectedDataType)}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {selectedDataType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Field Mapping
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedProviderData.name} ({selectedProviderData.type})
                  </p>
                </div>
              </div>
              
              <Button onClick={addMapping} size="sm">
                <Plus size={16} className="mr-2" />
                Add Mapping
              </Button>
            </div>
          </div>

          <div className="p-6">
            {mappings.length === 0 ? (
              <div className="text-center py-8">
                <Database className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Mappings Configured
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Add field mappings to synchronize {selectedDataType} data
                </p>
                <Button onClick={addMapping}>
                  <Plus size={16} className="mr-2" />
                  Add First Mapping
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Header */}
                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700 dark:text-gray-300 pb-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="col-span-4">Clinic Field</div>
                  <div className="col-span-1 text-center">→</div>
                  <div className="col-span-4">EHR Field</div>
                  <div className="col-span-1 text-center">Required</div>
                  <div className="col-span-1 text-center">Status</div>
                  <div className="col-span-1 text-center">Actions</div>
                </div>

                {/* Mappings */}
                {mappings.map((mapping) => (
                  <div key={mapping.id} className="grid grid-cols-12 gap-4 items-center py-2">
                    <div className="col-span-4">
                      {editingMapping === mapping.id ? (
                        <select
                          value={mapping.clinicField}
                          onChange={(e) => updateMapping(mapping.id, { clinicField: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        >
                          <option value="">Select clinic field...</option>
                          {getClinicFields(selectedDataType).map(field => (
                            <option key={field} value={field}>{field}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sm text-gray-900 dark:text-white">
                          {mapping.clinicField || 'Not set'}
                        </span>
                      )}
                    </div>
                    
                    <div className="col-span-1 text-center">
                      <ArrowRight className="text-gray-400" size={16} />
                    </div>
                    
                    <div className="col-span-4">
                      {editingMapping === mapping.id ? (
                        <select
                          value={mapping.ehrField}
                          onChange={(e) => updateMapping(mapping.id, { ehrField: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        >
                          <option value="">Select EHR field...</option>
                          {getEHRFields(selectedDataType, selectedProviderData.type).map(field => (
                            <option key={field} value={field}>{field}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sm text-gray-900 dark:text-white">
                          {mapping.ehrField || 'Not set'}
                        </span>
                      )}
                    </div>
                    
                    <div className="col-span-1 text-center">
                      {editingMapping === mapping.id ? (
                        <input
                          type="checkbox"
                          checked={mapping.required}
                          onChange={(e) => updateMapping(mapping.id, { required: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      ) : (
                        <span className={`text-sm ${mapping.required ? 'text-red-600' : 'text-gray-400'}`}>
                          {mapping.required ? 'Yes' : 'No'}
                        </span>
                      )}
                    </div>
                    
                    <div className="col-span-1 text-center">
                      {mapping.validated ? (
                        <Check className="text-green-500" size={16} />
                      ) : (
                        <AlertTriangle className="text-yellow-500" size={16} />
                      )}
                    </div>
                    
                    <div className="col-span-1 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        {editingMapping === mapping.id ? (
                          <>
                            <button
                              onClick={() => setEditingMapping(null)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => {
                                setEditingMapping(null);
                                loadMappings(); // Reset changes
                              }}
                              className="text-gray-600 hover:text-gray-700"
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setEditingMapping(mapping.id)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => validateMapping(mapping.id)}
                              disabled={isLoading}
                              className="text-green-600 hover:text-green-700"
                            >
                              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                            </button>
                            <button
                              onClick={() => deleteMapping(mapping.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Mapping Guidelines */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Mapping Guidelines
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
              Best Practices
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Map required fields first</li>
              <li>• Validate all mappings before saving</li>
              <li>• Use consistent naming conventions</li>
              <li>• Test mappings with sample data</li>
              <li>• Document custom transformations</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
              Common Issues
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Data type mismatches</li>
              <li>• Missing required fields</li>
              <li>• Incorrect field paths</li>
              <li>• Format incompatibilities</li>
              <li>• Nested object handling</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EHRDataMapping;
