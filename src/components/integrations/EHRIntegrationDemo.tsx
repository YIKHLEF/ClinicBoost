/**
 * EHR Integration Demo Component
 * 
 * Demonstrates the EHR/PMS integration features with sample data
 * and interactive examples for testing and showcasing capabilities.
 */

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  Database,
  Play,
  CheckCircle,
  AlertTriangle,
  Clock,
  Users,
  Sync,
  Settings,
  Shield,
  FileText,
  Heart,
  Activity,
  Stethoscope,
} from 'lucide-react';

const EHRIntegrationDemo: React.FC = () => {
  const [demoStep, setDemoStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const demoSteps = [
    {
      title: 'Provider Setup',
      description: 'Configure EHR/PMS providers with authentication',
      icon: Settings,
      color: 'text-blue-600',
    },
    {
      title: 'Data Mapping',
      description: 'Map clinic fields to EHR provider schemas',
      icon: FileText,
      color: 'text-green-600',
    },
    {
      title: 'FHIR Validation',
      description: 'Validate healthcare data against FHIR R4 standards',
      icon: Shield,
      color: 'text-purple-600',
    },
    {
      title: 'Data Synchronization',
      description: 'Sync patient records, appointments, and medical data',
      icon: Sync,
      color: 'text-orange-600',
    },
    {
      title: 'Compliance Monitoring',
      description: 'Monitor FHIR compliance and data quality',
      icon: Activity,
      color: 'text-indigo-600',
    },
  ];

  const sampleProviders = [
    {
      name: 'Epic MyChart',
      type: 'epic',
      status: 'connected',
      lastSync: '3 minutes ago',
      records: 1247,
      compliance: 98,
      icon: '🏥',
    },
    {
      name: 'Cerner PowerChart',
      type: 'cerner',
      status: 'connected',
      lastSync: '7 minutes ago',
      records: 856,
      compliance: 95,
      icon: '🩺',
    },
    {
      name: 'athenahealth',
      type: 'athena',
      status: 'syncing',
      lastSync: '15 minutes ago',
      records: 634,
      compliance: 92,
      icon: '⚕️',
    },
    {
      name: 'Allscripts',
      type: 'allscripts',
      status: 'error',
      lastSync: '2 hours ago',
      records: 423,
      compliance: 87,
      icon: '📋',
    },
  ];

  const dataTypes = [
    { name: 'Patients', icon: Users, count: 1247, synced: 1198 },
    { name: 'Appointments', icon: Clock, count: 856, synced: 834 },
    { name: 'Medical Records', icon: FileText, count: 3421, synced: 3398 },
    { name: 'Prescriptions', icon: Heart, count: 2156, synced: 2134 },
    { name: 'Lab Results', icon: Activity, count: 1876, synced: 1863 },
    { name: 'Vitals', icon: Stethoscope, count: 4532, synced: 4501 },
  ];

  const runDemo = async () => {
    setIsRunning(true);
    
    for (let i = 0; i < demoSteps.length; i++) {
      setDemoStep(i);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    setIsRunning(false);
    setDemoStep(0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-600';
      case 'syncing':
        return 'text-blue-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="text-green-500" size={16} />;
      case 'syncing':
        return <Sync className="text-blue-500 animate-spin" size={16} />;
      case 'error':
        return <AlertTriangle className="text-red-500" size={16} />;
      default:
        return <AlertTriangle className="text-gray-500" size={16} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Demo Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              EHR/PMS Integration Demo
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Interactive demonstration of healthcare system integration features
            </p>
          </div>
          
          <Button onClick={runDemo} disabled={isRunning}>
            {isRunning ? (
              <>
                <Sync className="animate-spin mr-2" size={16} />
                Running Demo...
              </>
            ) : (
              <>
                <Play className="mr-2" size={16} />
                Start Demo
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Demo Steps */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {demoSteps.map((step, index) => {
          const Icon = step.icon;
          const isActive = isRunning && demoStep === index;
          const isCompleted = isRunning && demoStep > index;
          
          return (
            <Card key={index} className={`p-4 transition-all duration-300 ${
              isActive ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
            }`}>
              <div className="text-center">
                <div className={`mx-auto mb-3 p-3 rounded-full ${
                  isCompleted ? 'bg-green-100 dark:bg-green-900/20' :
                  isActive ? 'bg-blue-100 dark:bg-blue-900/20' :
                  'bg-gray-100 dark:bg-gray-800'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="text-green-600" size={24} />
                  ) : (
                    <Icon className={isActive ? 'text-blue-600' : step.color} size={24} />
                  )}
                </div>
                
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {step.description}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Sample Providers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {sampleProviders.map((provider, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{provider.icon}</div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {provider.name}
                  </h3>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(provider.status)}
                    <span className={`text-sm ${getStatusColor(provider.status)}`}>
                      {provider.status.charAt(0).toUpperCase() + provider.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Records:</span>
                <span className="text-gray-900 dark:text-white">{provider.records.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">FHIR Compliance:</span>
                <span className={`font-medium ${
                  provider.compliance >= 95 ? 'text-green-600' :
                  provider.compliance >= 85 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {provider.compliance}%
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Last Sync:</span>
                <span className="text-gray-900 dark:text-white">{provider.lastSync}</span>
              </div>
            </div>

            <div className="mt-4">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    provider.compliance >= 95 ? 'bg-green-500' :
                    provider.compliance >= 85 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${provider.compliance}%` }}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Data Types Overview */}
      <Card>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Synchronized Data Types
          </h3>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dataTypes.map((dataType, index) => {
              const Icon = dataType.icon;
              const syncPercentage = Math.round((dataType.synced / dataType.count) * 100);
              
              return (
                <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="p-2 bg-white dark:bg-gray-700 rounded-lg">
                    <Icon className="text-blue-600" size={20} />
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {dataType.name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {dataType.synced.toLocaleString()} / {dataType.count.toLocaleString()} ({syncPercentage}%)
                    </p>
                    
                    <div className="mt-2 w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1">
                      <div
                        className="h-1 bg-blue-500 rounded-full"
                        style={{ width: `${syncPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Key Features
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <CheckCircle className="text-green-500" size={16} />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                FHIR R4 compliance monitoring
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <CheckCircle className="text-green-500" size={16} />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Epic MyChart & Cerner PowerChart integration
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <CheckCircle className="text-green-500" size={16} />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Real-time data synchronization
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <CheckCircle className="text-green-500" size={16} />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Automated conflict resolution
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <CheckCircle className="text-green-500" size={16} />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Data field mapping and validation
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h3>
          
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <Database className="mr-2" size={16} />
              View Full EHR Integration
            </Button>
            
            <Button variant="outline" className="w-full justify-start">
              <Settings className="mr-2" size={16} />
              Configure Providers
            </Button>
            
            <Button variant="outline" className="w-full justify-start">
              <FileText className="mr-2" size={16} />
              Data Field Mapping
            </Button>
            
            <Button variant="outline" className="w-full justify-start">
              <Shield className="mr-2" size={16} />
              FHIR Compliance Check
            </Button>
            
            <Button variant="outline" className="w-full justify-start">
              <Activity className="mr-2" size={16} />
              Sync History & Analytics
            </Button>
          </div>
        </Card>
      </div>

      {/* Demo Status */}
      {isRunning && (
        <Card className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-center space-x-3">
            <Sync className="animate-spin text-blue-600" size={20} />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100">
                Demo in Progress
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Currently demonstrating: {demoSteps[demoStep]?.title}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default EHRIntegrationDemo;
