/**
 * Calendar Integration Demo Component
 * 
 * Demonstrates the calendar integration features with sample data
 * and interactive examples for testing and showcasing capabilities.
 */

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  Calendar,
  Play,
  CheckCircle,
  AlertTriangle,
  Clock,
  Users,
  Sync,
  Settings,
  ExternalLink,
} from 'lucide-react';

const CalendarIntegrationDemo: React.FC = () => {
  const [demoStep, setDemoStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const demoSteps = [
    {
      title: 'Provider Setup',
      description: 'Configure calendar providers with authentication',
      icon: Settings,
      color: 'text-blue-600',
    },
    {
      title: 'Sync Configuration',
      description: 'Set sync direction, frequency, and conflict resolution',
      icon: Sync,
      color: 'text-green-600',
    },
    {
      title: 'Event Synchronization',
      description: 'Sync appointments between clinic and external calendars',
      icon: Calendar,
      color: 'text-purple-600',
    },
    {
      title: 'Conflict Resolution',
      description: 'Resolve conflicts between different calendar sources',
      icon: AlertTriangle,
      color: 'text-orange-600',
    },
    {
      title: 'Monitoring & Analytics',
      description: 'Track sync performance and view detailed history',
      icon: Clock,
      color: 'text-indigo-600',
    },
  ];

  const sampleProviders = [
    {
      name: 'Google Calendar',
      type: 'google',
      status: 'connected',
      lastSync: '2 minutes ago',
      events: 24,
      icon: '🗓️',
    },
    {
      name: 'Microsoft Outlook',
      type: 'outlook',
      status: 'connected',
      lastSync: '5 minutes ago',
      events: 18,
      icon: '📅',
    },
    {
      name: 'iCloud Calendar',
      type: 'icloud',
      status: 'disconnected',
      lastSync: 'Never',
      events: 0,
      icon: '☁️',
    },
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

  return (
    <div className="space-y-6">
      {/* Demo Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Calendar Integration Demo
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Interactive demonstration of calendar synchronization features
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    {provider.status === 'connected' ? (
                      <CheckCircle className="text-green-500" size={16} />
                    ) : (
                      <AlertTriangle className="text-yellow-500" size={16} />
                    )}
                    <span className={`text-sm ${
                      provider.status === 'connected' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {provider.status === 'connected' ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Last Sync:</span>
                <span className="text-gray-900 dark:text-white">{provider.lastSync}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Events Synced:</span>
                <span className="text-gray-900 dark:text-white">{provider.events}</span>
              </div>
            </div>

            <div className="mt-4 flex space-x-2">
              <Button size="sm" className="flex-1">
                <Sync size={14} className="mr-1" />
                Sync
              </Button>
              <Button size="sm" variant="outline">
                <Settings size={14} className="mr-1" />
                Config
              </Button>
            </div>
          </Card>
        ))}
      </div>

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
                Two-way calendar synchronization
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <CheckCircle className="text-green-500" size={16} />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Multiple provider support (Google, Outlook, iCloud)
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <CheckCircle className="text-green-500" size={16} />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Automatic conflict resolution
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <CheckCircle className="text-green-500" size={16} />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Real-time sync monitoring
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <CheckCircle className="text-green-500" size={16} />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Detailed sync history and analytics
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
              <Calendar className="mr-2" size={16} />
              View Full Calendar Integration
            </Button>
            
            <Button variant="outline" className="w-full justify-start">
              <Settings className="mr-2" size={16} />
              Configure Providers
            </Button>
            
            <Button variant="outline" className="w-full justify-start">
              <Clock className="mr-2" size={16} />
              View Sync History
            </Button>
            
            <Button variant="outline" className="w-full justify-start">
              <AlertTriangle className="mr-2" size={16} />
              Resolve Conflicts
            </Button>
            
            <Button variant="outline" className="w-full justify-start">
              <ExternalLink className="mr-2" size={16} />
              Integration Documentation
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

export default CalendarIntegrationDemo;
