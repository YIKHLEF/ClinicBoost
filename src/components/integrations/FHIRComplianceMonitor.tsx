/**
 * FHIR Compliance Monitor Component
 * 
 * Monitors and displays FHIR R4 compliance status, validation results,
 * and provides tools for ensuring healthcare data interoperability standards.
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  FileText,
  Database,
  Activity,
  TrendingUp,
  TrendingDown,
  BarChart3,
  ExternalLink,
  Download,
  Play,
  Settings,
  Eye,
} from 'lucide-react';
import {
  type EHRProvider,
} from '../../lib/integrations/ehr-pms';

interface FHIRComplianceResult {
  resourceType: string;
  totalResources: number;
  validResources: number;
  invalidResources: number;
  warnings: number;
  errors: string[];
  lastChecked: Date;
}

interface FHIRComplianceMonitorProps {
  providers: EHRProvider[];
  complianceScore: number;
  onRunCompliance: () => void;
}

const FHIRComplianceMonitor: React.FC<FHIRComplianceMonitorProps> = ({
  providers,
  complianceScore,
  onRunCompliance,
}) => {
  const [complianceResults, setComplianceResults] = useState<FHIRComplianceResult[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});

  // Mock FHIR resource types
  const fhirResourceTypes = [
    'Patient', 'Practitioner', 'Organization', 'Appointment', 'Encounter',
    'Observation', 'DiagnosticReport', 'Medication', 'MedicationRequest',
    'AllergyIntolerance', 'Condition', 'Procedure', 'DocumentReference'
  ];

  useEffect(() => {
    loadComplianceResults();
  }, [selectedProvider]);

  const loadComplianceResults = () => {
    // Mock compliance results
    const mockResults: FHIRComplianceResult[] = [
      {
        resourceType: 'Patient',
        totalResources: 1247,
        validResources: 1198,
        invalidResources: 49,
        warnings: 23,
        errors: ['Missing required field: identifier', 'Invalid date format in birthDate'],
        lastChecked: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      {
        resourceType: 'Appointment',
        totalResources: 856,
        validResources: 834,
        invalidResources: 22,
        warnings: 15,
        errors: ['Invalid status value', 'Missing participant reference'],
        lastChecked: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        resourceType: 'Observation',
        totalResources: 3421,
        validResources: 3398,
        invalidResources: 23,
        warnings: 45,
        errors: ['Invalid value type', 'Missing required code system'],
        lastChecked: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
    ];
    
    setComplianceResults(mockResults);
  };

  const runComplianceCheck = async () => {
    setIsRunning(true);
    
    // Simulate compliance check
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Update results with new timestamps
    const updatedResults = complianceResults.map(result => ({
      ...result,
      lastChecked: new Date(),
      // Simulate some improvements
      validResources: result.validResources + Math.floor(Math.random() * 5),
      invalidResources: Math.max(0, result.invalidResources - Math.floor(Math.random() * 3)),
    }));
    
    setComplianceResults(updatedResults);
    setIsRunning(false);
    onRunCompliance();
  };

  const getCompliancePercentage = (result: FHIRComplianceResult) => {
    return Math.round((result.validResources / result.totalResources) * 100);
  };

  const getComplianceColor = (percentage: number) => {
    if (percentage >= 95) return 'text-green-600';
    if (percentage >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getComplianceIcon = (percentage: number) => {
    if (percentage >= 95) return <CheckCircle className="text-green-500" size={20} />;
    if (percentage >= 85) return <AlertTriangle className="text-yellow-500" size={20} />;
    return <XCircle className="text-red-500" size={20} />;
  };

  const toggleDetails = (resourceType: string) => {
    setShowDetails(prev => ({
      ...prev,
      [resourceType]: !prev[resourceType],
    }));
  };

  const exportComplianceReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      overallScore: complianceScore,
      provider: selectedProvider || 'All Providers',
      results: complianceResults,
      summary: {
        totalResources: complianceResults.reduce((sum, r) => sum + r.totalResources, 0),
        validResources: complianceResults.reduce((sum, r) => sum + r.validResources, 0),
        invalidResources: complianceResults.reduce((sum, r) => sum + r.invalidResources, 0),
        totalWarnings: complianceResults.reduce((sum, r) => sum + r.warnings, 0),
      },
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fhir-compliance-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const totalResources = complianceResults.reduce((sum, r) => sum + r.totalResources, 0);
  const validResources = complianceResults.reduce((sum, r) => sum + r.validResources, 0);
  const invalidResources = complianceResults.reduce((sum, r) => sum + r.invalidResources, 0);
  const totalWarnings = complianceResults.reduce((sum, r) => sum + r.warnings, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            FHIR R4 Compliance Monitor
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Monitor healthcare data interoperability standards compliance
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button variant="outline" onClick={exportComplianceReport}>
            <Download size={16} className="mr-2" />
            Export Report
          </Button>
          
          <Button onClick={runComplianceCheck} disabled={isRunning}>
            {isRunning ? (
              <RefreshCw size={16} className="mr-2 animate-spin" />
            ) : (
              <Play size={16} className="mr-2" />
            )}
            {isRunning ? 'Running Check...' : 'Run Compliance Check'}
          </Button>
        </div>
      </div>

      {/* Overall Compliance Score */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Overall FHIR R4 Compliance
            </h3>
            <div className="flex items-center space-x-4">
              <div className="text-4xl font-bold text-green-600">
                {complianceScore}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <div>Last checked: {complianceResults[0]?.lastChecked.toLocaleString() || 'Never'}</div>
                <div className="flex items-center space-x-2 mt-1">
                  <TrendingUp className="text-green-500" size={14} />
                  <span className="text-green-600">+2.3% from last week</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <Shield className="text-blue-600 mb-2" size={48} />
            <div className="text-sm text-gray-600 dark:text-gray-400">
              FHIR R4 Standard
            </div>
          </div>
        </div>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Resources</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalResources.toLocaleString()}
              </p>
            </div>
            <Database className="text-blue-600" size={24} />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Valid Resources</p>
              <p className="text-2xl font-bold text-green-600">
                {validResources.toLocaleString()}
              </p>
            </div>
            <CheckCircle className="text-green-600" size={24} />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Invalid Resources</p>
              <p className="text-2xl font-bold text-red-600">
                {invalidResources.toLocaleString()}
              </p>
            </div>
            <XCircle className="text-red-600" size={24} />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Warnings</p>
              <p className="text-2xl font-bold text-yellow-600">
                {totalWarnings.toLocaleString()}
              </p>
            </div>
            <AlertTriangle className="text-yellow-600" size={24} />
          </div>
        </Card>
      </div>

      {/* Provider Filter */}
      <Card className="p-6">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Filter by Provider:
          </label>
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Providers</option>
            {providers.map(provider => (
              <option key={provider.id} value={provider.id}>
                {provider.name} ({provider.type})
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Compliance Results by Resource Type */}
      <Card>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Compliance by Resource Type
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {complianceResults.map((result) => {
            const percentage = getCompliancePercentage(result);
            
            return (
              <div key={result.resourceType} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getComplianceIcon(percentage)}
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {result.resourceType}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {result.validResources.toLocaleString()} of {result.totalResources.toLocaleString()} resources valid
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className={`text-lg font-bold ${getComplianceColor(percentage)}`}>
                        {percentage}%
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {result.warnings} warnings
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleDetails(result.resourceType)}
                    >
                      <Eye size={14} className="mr-1" />
                      {showDetails[result.resourceType] ? 'Hide' : 'Show'} Details
                    </Button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        percentage >= 95 ? 'bg-green-500' :
                        percentage >= 85 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                {/* Detailed Results */}
                {showDetails[result.resourceType] && (
                  <div className="mt-6 space-y-4">
                    {/* Error Details */}
                    {result.errors.length > 0 && (
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <h5 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                          Common Validation Errors:
                        </h5>
                        <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                          {result.errors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Compliance Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-lg font-bold text-green-600">
                          {result.validResources.toLocaleString()}
                        </div>
                        <div className="text-sm text-green-700 dark:text-green-300">
                          Valid Resources
                        </div>
                      </div>
                      
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div className="text-lg font-bold text-red-600">
                          {result.invalidResources.toLocaleString()}
                        </div>
                        <div className="text-sm text-red-700 dark:text-red-300">
                          Invalid Resources
                        </div>
                      </div>
                      
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <div className="text-lg font-bold text-yellow-600">
                          {result.warnings.toLocaleString()}
                        </div>
                        <div className="text-sm text-yellow-700 dark:text-yellow-300">
                          Warnings
                        </div>
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <h5 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                        Recommendations:
                      </h5>
                      <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                        <li>• Review and update data validation rules</li>
                        <li>• Implement automated FHIR validation in data pipeline</li>
                        <li>• Train staff on FHIR R4 data entry requirements</li>
                        <li>• Set up automated compliance monitoring alerts</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* FHIR Resources Reference */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          FHIR R4 Resources Reference
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {fhirResourceTypes.map((resourceType) => (
            <div
              key={resourceType}
              className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center"
            >
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {resourceType}
              </div>
              <button className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mt-1">
                <ExternalLink size={12} className="inline mr-1" />
                Spec
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default FHIRComplianceMonitor;
