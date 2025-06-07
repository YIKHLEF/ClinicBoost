/**
 * EHR Conflict Resolver Component
 * 
 * Provides interface for resolving data synchronization conflicts
 * between clinic records and EHR/PMS system records.
 */

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  AlertTriangle,
  Database,
  Clock,
  Users,
  MapPin,
  FileText,
  CheckCircle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Merge,
  Eye,
  Edit,
  Heart,
  Activity,
  Stethoscope,
} from 'lucide-react';
import {
  type DataConflict,
  type EHRDataType,
} from '../../lib/integrations/ehr-pms';

interface EHRConflictResolverProps {
  conflicts: DataConflict[];
  onResolveConflict: (conflictId: string, resolution: 'clinic-wins' | 'ehr-wins' | 'merge') => void;
}

const EHRConflictResolver: React.FC<EHRConflictResolverProps> = ({
  conflicts,
  onResolveConflict,
}) => {
  const [selectedConflict, setSelectedConflict] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});

  const getDataTypeIcon = (type: EHRDataType) => {
    switch (type) {
      case 'patients':
        return <Users className="text-blue-500" size={20} />;
      case 'appointments':
        return <Clock className="text-green-500" size={20} />;
      case 'medical_records':
        return <FileText className="text-purple-500" size={20} />;
      case 'prescriptions':
        return <Heart className="text-red-500" size={20} />;
      case 'lab_results':
        return <Activity className="text-orange-500" size={20} />;
      case 'vitals':
        return <Stethoscope className="text-pink-500" size={20} />;
      default:
        return <Database className="text-gray-500" size={20} />;
    }
  };

  const getDataTypeText = (type: EHRDataType) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getConflictDescription = (conflict: DataConflict) => {
    const dataType = getDataTypeText(conflict.dataType);
    const fieldCount = conflict.conflictFields.length;
    
    return `${dataType} record has ${fieldCount} conflicting field${fieldCount > 1 ? 's' : ''}: ${conflict.conflictFields.join(', ')}`;
  };

  const formatFieldValue = (value: any) => {
    if (value === null || value === undefined) return 'Not set';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (value instanceof Date) return value.toLocaleString();
    return String(value);
  };

  const toggleDetails = (conflictId: string) => {
    setShowDetails(prev => ({
      ...prev,
      [conflictId]: !prev[conflictId],
    }));
  };

  const RecordCard: React.FC<{ 
    record: any; 
    label: string; 
    color: string; 
    dataType: EHRDataType;
    conflictFields: string[];
  }> = ({ record, label, color, dataType, conflictFields }) => (
    <div className={`p-4 border-2 rounded-lg ${color}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900 dark:text-white">{label}</h4>
        {getDataTypeIcon(dataType)}
      </div>
      
      <div className="space-y-2">
        {/* Display relevant fields based on data type */}
        {dataType === 'patients' && (
          <>
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Name:</span>
              <span className={`ml-2 text-sm ${conflictFields.includes('name') ? 'bg-yellow-100 dark:bg-yellow-900/20 px-1 rounded' : ''}`}>
                {record.firstName} {record.lastName}
              </span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">DOB:</span>
              <span className={`ml-2 text-sm ${conflictFields.includes('dateOfBirth') ? 'bg-yellow-100 dark:bg-yellow-900/20 px-1 rounded' : ''}`}>
                {record.dateOfBirth ? new Date(record.dateOfBirth).toLocaleDateString() : 'Not set'}
              </span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Email:</span>
              <span className={`ml-2 text-sm ${conflictFields.includes('email') ? 'bg-yellow-100 dark:bg-yellow-900/20 px-1 rounded' : ''}`}>
                {record.email || 'Not set'}
              </span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone:</span>
              <span className={`ml-2 text-sm ${conflictFields.includes('phone') ? 'bg-yellow-100 dark:bg-yellow-900/20 px-1 rounded' : ''}`}>
                {record.phone || 'Not set'}
              </span>
            </div>
          </>
        )}

        {dataType === 'appointments' && (
          <>
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Title:</span>
              <span className={`ml-2 text-sm ${conflictFields.includes('title') ? 'bg-yellow-100 dark:bg-yellow-900/20 px-1 rounded' : ''}`}>
                {record.title || record.appointmentType || 'Not set'}
              </span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Time:</span>
              <span className={`ml-2 text-sm ${conflictFields.includes('startTime') ? 'bg-yellow-100 dark:bg-yellow-900/20 px-1 rounded' : ''}`}>
                {record.startTime ? new Date(record.startTime).toLocaleString() : 'Not set'}
              </span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Duration:</span>
              <span className={`ml-2 text-sm ${conflictFields.includes('duration') ? 'bg-yellow-100 dark:bg-yellow-900/20 px-1 rounded' : ''}`}>
                {record.duration || 'Not set'}
              </span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
              <span className={`ml-2 text-sm ${conflictFields.includes('status') ? 'bg-yellow-100 dark:bg-yellow-900/20 px-1 rounded' : ''}`}>
                {record.status || 'Not set'}
              </span>
            </div>
          </>
        )}

        {dataType === 'medical_records' && (
          <>
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Diagnosis:</span>
              <span className={`ml-2 text-sm ${conflictFields.includes('diagnosis') ? 'bg-yellow-100 dark:bg-yellow-900/20 px-1 rounded' : ''}`}>
                {record.diagnosis || 'Not set'}
              </span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes:</span>
              <span className={`ml-2 text-sm ${conflictFields.includes('notes') ? 'bg-yellow-100 dark:bg-yellow-900/20 px-1 rounded' : ''}`}>
                {record.notes || 'Not set'}
              </span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Date:</span>
              <span className={`ml-2 text-sm ${conflictFields.includes('date') ? 'bg-yellow-100 dark:bg-yellow-900/20 px-1 rounded' : ''}`}>
                {record.date ? new Date(record.date).toLocaleDateString() : 'Not set'}
              </span>
            </div>
          </>
        )}

        {/* Generic field display for other types */}
        {!['patients', 'appointments', 'medical_records'].includes(dataType) && (
          <div className="space-y-1">
            {Object.entries(record).slice(0, 5).map(([key, value]) => (
              <div key={key}>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                </span>
                <span className={`ml-2 text-sm ${conflictFields.includes(key) ? 'bg-yellow-100 dark:bg-yellow-900/20 px-1 rounded' : ''}`}>
                  {formatFieldValue(value)}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Last Updated: {record.lastUpdated ? new Date(record.lastUpdated).toLocaleString() : 'Unknown'}
          </span>
        </div>
      </div>
    </div>
  );

  if (conflicts.length === 0) {
    return (
      <Card className="p-12 text-center">
        <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No Conflicts
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          All EHR/PMS data is synchronized without conflicts.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Data Conflicts
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {conflicts.length} conflict(s) need resolution
          </p>
        </div>
      </div>

      {/* Conflicts List */}
      <div className="space-y-4">
        {conflicts.map((conflict) => (
          <Card key={conflict.id} className="overflow-hidden">
            {/* Conflict Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getDataTypeIcon(conflict.dataType)}
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {getDataTypeText(conflict.dataType)} Conflict
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {getConflictDescription(conflict)}
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleDetails(conflict.id)}
                  >
                    <Eye size={14} className="mr-1" />
                    {showDetails[conflict.id] ? 'Hide' : 'Show'} Details
                  </Button>
                </div>
              </div>
            </div>

            {/* Conflict Details */}
            {showDetails[conflict.id] && (
              <div className="p-6 bg-gray-50 dark:bg-gray-800">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <RecordCard
                    record={conflict.clinicRecord}
                    label="Clinic Record"
                    color="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800"
                    dataType={conflict.dataType}
                    conflictFields={conflict.conflictFields}
                  />
                  
                  <RecordCard
                    record={conflict.ehrRecord}
                    label="EHR Record"
                    color="border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800"
                    dataType={conflict.dataType}
                    conflictFields={conflict.conflictFields}
                  />
                </div>

                {/* Detailed Field Comparison */}
                <div className="mt-6">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                    Field-by-Field Comparison:
                  </h4>
                  
                  <div className="space-y-3">
                    {conflict.conflictFields.map((field) => (
                      <div key={field} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <div className="text-sm font-medium text-gray-900 dark:text-white mb-2 capitalize">
                          {field.replace(/([A-Z])/g, ' $1').trim()}:
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div>
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Clinic:</span>
                            <div className="text-sm text-gray-700 dark:text-gray-300 mt-1 p-2 bg-white dark:bg-gray-700 rounded border">
                              {formatFieldValue(conflict.clinicRecord[field])}
                            </div>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-purple-600 dark:text-purple-400">EHR:</span>
                            <div className="text-sm text-gray-700 dark:text-gray-300 mt-1 p-2 bg-white dark:bg-gray-700 rounded border">
                              {formatFieldValue(conflict.ehrRecord[field])}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Resolution Actions */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                    Choose Resolution
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Select which version to keep or merge the changes
                  </p>
                </div>
                
                <div className="flex space-x-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onResolveConflict(conflict.id, 'clinic-wins')}
                    className="flex items-center"
                  >
                    <ArrowLeft size={14} className="mr-1" />
                    Keep Clinic
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onResolveConflict(conflict.id, 'ehr-wins')}
                    className="flex items-center"
                  >
                    <ArrowRight size={14} className="mr-1" />
                    Keep EHR
                  </Button>
                  
                  <Button
                    size="sm"
                    onClick={() => onResolveConflict(conflict.id, 'merge')}
                    className="flex items-center"
                  >
                    <Merge size={14} className="mr-1" />
                    Merge Changes
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Bulk Actions */}
      {conflicts.length > 1 && (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                Bulk Actions
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Apply the same resolution to all conflicts
              </p>
            </div>
            
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  conflicts.forEach(conflict => {
                    onResolveConflict(conflict.id, 'clinic-wins');
                  });
                }}
              >
                Keep All Clinic
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  conflicts.forEach(conflict => {
                    onResolveConflict(conflict.id, 'ehr-wins');
                  });
                }}
              >
                Keep All EHR
              </Button>
              
              <Button
                onClick={() => {
                  conflicts.forEach(conflict => {
                    onResolveConflict(conflict.id, 'merge');
                  });
                }}
              >
                Merge All
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default EHRConflictResolver;
