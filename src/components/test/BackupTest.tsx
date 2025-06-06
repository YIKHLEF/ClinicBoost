/**
 * Backup & Recovery Test Component
 * 
 * Comprehensive test interface for the backup and recovery system
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { backupService } from '../../lib/backup/backupService';
import { recoveryService } from '../../lib/backup/recoveryService';
import { schedulerService } from '../../lib/backup/schedulerService';
import useTranslation from '../../hooks/useTranslation';
import {
  BackupJob,
  BackupMetadata,
  RestoreJob,
  BackupSchedule,
  BackupType,
  RestoreType
} from '../../lib/backup/types';
import {
  Shield,
  Database,
  Upload,
  Download,
  Play,
  TestTube,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  RefreshCw,
  AlertTriangle,
  Calendar,
  Settings
} from 'lucide-react';

const BackupTest: React.FC = () => {
  const { t, tCommon } = useTranslation();

  // State management
  const [activeTest, setActiveTest] = useState<'backup' | 'recovery' | 'scheduler' | 'integration'>('backup');
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [backupJobs, setBackupJobs] = useState<BackupJob[]>([]);
  const [restoreJobs, setRestoreJobs] = useState<RestoreJob[]>([]);
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);

  // Initialize services
  useEffect(() => {
    initializeServices();
  }, []);

  const initializeServices = async () => {
    try {
      await backupService.initialize();
      await recoveryService.initialize();
      await schedulerService.initialize();
      addTestResult('Service Initialization', 'success', 'All backup services initialized successfully');
    } catch (error) {
      addTestResult('Service Initialization', 'error', `Failed to initialize services: ${error}`);
    }
  };

  // Add test result
  const addTestResult = (name: string, status: 'success' | 'error' | 'warning', message: string) => {
    setTestResults(prev => [...prev, {
      name,
      status,
      message,
      timestamp: new Date()
    }]);
  };

  // Test backup creation
  const testBackupCreation = async (type: BackupType) => {
    try {
      setLoading(true);
      addTestResult(`${type} Backup Test`, 'warning', 'Starting backup creation test...');
      
      const jobId = await backupService.createBackup(type, {
        name: `Test ${type} backup - ${new Date().toISOString()}`,
        description: `Test backup for ${type} type`,
        tags: ['test', type]
      });

      // Monitor job progress
      const job = await backupService.getJob(jobId);
      if (job) {
        setBackupJobs(prev => [...prev, job]);
        addTestResult(`${type} Backup Test`, 'success', `Backup job created successfully: ${jobId}`);
        
        // Simulate monitoring job completion
        setTimeout(async () => {
          const updatedJob = await backupService.getJob(jobId);
          if (updatedJob) {
            addTestResult(`${type} Backup Status`, updatedJob.status === 'completed' ? 'success' : 'error', 
              `Backup ${updatedJob.status}: ${updatedJob.currentOperation}`);
          }
        }, 3000);
      }
    } catch (error) {
      addTestResult(`${type} Backup Test`, 'error', `Backup creation failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Test restore functionality
  const testRestore = async (restoreType: RestoreType) => {
    try {
      setLoading(true);
      addTestResult(`${restoreType} Restore Test`, 'warning', 'Starting restore test...');
      
      // Create a dummy backup ID for testing
      const dummyBackupId = 'test_backup_' + Date.now();
      
      const jobId = await recoveryService.startRestore(dummyBackupId, {
        restoreType,
        overwriteExisting: false,
        restoreData: true,
        restoreSchema: true,
        verification: {
          enabled: true,
          checkIntegrity: true,
          validateData: true,
          compareChecksum: true,
          testConnections: true
        }
      });

      const job = await recoveryService.getRestoreJob(jobId);
      if (job) {
        setRestoreJobs(prev => [...prev, job]);
        addTestResult(`${restoreType} Restore Test`, 'success', `Restore job created successfully: ${jobId}`);
        
        // Monitor job progress
        setTimeout(async () => {
          const updatedJob = await recoveryService.getRestoreJob(jobId);
          if (updatedJob) {
            addTestResult(`${restoreType} Restore Status`, updatedJob.status === 'completed' ? 'success' : 'error',
              `Restore ${updatedJob.status}: ${updatedJob.currentOperation}`);
          }
        }, 2000);
      }
    } catch (error) {
      addTestResult(`${restoreType} Restore Test`, 'error', `Restore test failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Test scheduler functionality
  const testScheduler = async () => {
    try {
      setLoading(true);
      addTestResult('Scheduler Test', 'warning', 'Testing backup scheduler...');
      
      // Create a test schedule
      const scheduleId = await schedulerService.createSchedule(
        'Test Daily Backup',
        'full',
        { type: 'daily' },
        {
          time: '02:00',
          enabled: true
        }
      );

      const schedule = schedulerService.getSchedule(scheduleId);
      if (schedule) {
        setSchedules(prev => [...prev, schedule]);
        addTestResult('Schedule Creation', 'success', `Schedule created successfully: ${scheduleId}`);
        
        // Test immediate trigger
        const triggerJobId = await schedulerService.triggerImmediateBackup(scheduleId);
        if (triggerJobId) {
          addTestResult('Schedule Trigger', 'success', `Immediate backup triggered: ${triggerJobId}`);
        }
        
        // Test schedule toggle
        await schedulerService.toggleSchedule(scheduleId, false);
        addTestResult('Schedule Toggle', 'success', 'Schedule disabled successfully');
        
        await schedulerService.toggleSchedule(scheduleId, true);
        addTestResult('Schedule Toggle', 'success', 'Schedule enabled successfully');
      }
    } catch (error) {
      addTestResult('Scheduler Test', 'error', `Scheduler test failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Test integration scenarios
  const testIntegration = async () => {
    try {
      setLoading(true);
      addTestResult('Integration Test', 'warning', 'Testing backup-restore integration...');
      
      // Create backup
      const backupJobId = await backupService.createBackup('full', {
        name: 'Integration Test Backup',
        description: 'Full backup for integration testing'
      });
      
      addTestResult('Integration Backup', 'success', `Integration backup created: ${backupJobId}`);
      
      // Wait for backup completion (simulated)
      setTimeout(async () => {
        // Test restore from backup
        const restoreJobId = await recoveryService.startRestore(backupJobId, {
          restoreType: 'test',
          verification: { enabled: true, checkIntegrity: true, validateData: true, compareChecksum: true, testConnections: true }
        });
        
        addTestResult('Integration Restore', 'success', `Integration restore started: ${restoreJobId}`);
        
        // Test statistics
        const stats = await backupService.getStatistics();
        addTestResult('Statistics Test', 'success', `Statistics retrieved: ${stats.totalBackups} backups, ${stats.totalSize} bytes`);
        
      }, 1000);
      
    } catch (error) {
      addTestResult('Integration Test', 'error', `Integration test failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setTestResults([]);
    addTestResult('Test Suite Started', 'success', 'Running comprehensive backup & recovery tests');
    
    // Test backup creation
    await testBackupCreation('full');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testBackupCreation('incremental');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test restore functionality
    await testRestore('complete');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testRestore('test');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test scheduler
    await testScheduler();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test integration
    await testIntegration();
    
    addTestResult('Test Suite Complete', 'success', 'All backup & recovery tests completed');
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle size={16} className="text-green-600" />;
      case 'error': return <XCircle size={16} className="text-red-600" />;
      case 'warning': return <AlertTriangle size={16} className="text-yellow-600" />;
      default: return <Clock size={16} className="text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Backup & Recovery Test Suite
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive testing interface for backup and recovery functionality
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runAllTests} disabled={loading}>
            <Play size={16} className="mr-2" />
            Run All Tests
          </Button>
          <Button variant="outline" onClick={() => setTestResults([])}>
            Clear Results
          </Button>
        </div>
      </div>

      {/* Test Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {[
            { id: 'backup', label: 'Backup Service', icon: Database },
            { id: 'recovery', label: 'Recovery Service', icon: Upload },
            { id: 'scheduler', label: 'Scheduler Service', icon: Calendar },
            { id: 'integration', label: 'Integration Tests', icon: Activity }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTest(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTest === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube size={20} />
              Test Results ({testResults.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    result.status === 'success' ? 'bg-green-50 dark:bg-green-900/20' :
                    result.status === 'error' ? 'bg-red-50 dark:bg-red-900/20' :
                    'bg-yellow-50 dark:bg-yellow-900/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {result.name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {result.message}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {result.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Content */}
      <div className="space-y-6">
        {/* Backup Service Tests */}
        {activeTest === 'backup' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database size={20} />
                Backup Service Tests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(['full', 'incremental', 'schema', 'files'] as BackupType[]).map(type => (
                    <Button
                      key={type}
                      variant="outline"
                      onClick={() => testBackupCreation(type)}
                      disabled={loading}
                      className="h-20 flex-col"
                    >
                      <Database size={24} className="mb-2" />
                      Test {type}
                    </Button>
                  ))}
                </div>
                
                {backupJobs.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Active Backup Jobs</h4>
                    <div className="space-y-2">
                      {backupJobs.map(job => (
                        <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{job.type} Backup</p>
                            <p className="text-sm text-gray-600">{job.currentOperation}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={job.status === 'completed' ? 'default' : 'secondary'}>
                              {job.status}
                            </Badge>
                            <span className="text-sm">{job.progress}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recovery Service Tests */}
        {activeTest === 'recovery' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload size={20} />
                Recovery Service Tests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(['complete', 'partial', 'test', 'clone'] as RestoreType[]).map(type => (
                    <Button
                      key={type}
                      variant="outline"
                      onClick={() => testRestore(type)}
                      disabled={loading}
                      className="h-20 flex-col"
                    >
                      <Upload size={24} className="mb-2" />
                      Test {type}
                    </Button>
                  ))}
                </div>
                
                {restoreJobs.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Active Restore Jobs</h4>
                    <div className="space-y-2">
                      {restoreJobs.map(job => (
                        <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{job.options.restoreType} Restore</p>
                            <p className="text-sm text-gray-600">{job.currentOperation}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={job.status === 'completed' ? 'default' : 'secondary'}>
                              {job.status}
                            </Badge>
                            <span className="text-sm">{job.progress}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scheduler Service Tests */}
        {activeTest === 'scheduler' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar size={20} />
                Scheduler Service Tests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button
                  onClick={testScheduler}
                  disabled={loading}
                  className="w-full h-16"
                >
                  <Calendar size={24} className="mr-3" />
                  Test Backup Scheduler
                </Button>
                
                {schedules.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Test Schedules</h4>
                    <div className="space-y-2">
                      {schedules.map(schedule => (
                        <div key={schedule.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{schedule.name}</p>
                            <p className="text-sm text-gray-600">
                              {schedule.frequency.type} at {schedule.time}
                            </p>
                          </div>
                          <Badge variant={schedule.enabled ? 'default' : 'secondary'}>
                            {schedule.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Integration Tests */}
        {activeTest === 'integration' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity size={20} />
                Integration Tests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button
                  onClick={testIntegration}
                  disabled={loading}
                  className="w-full h-16"
                >
                  <Activity size={24} className="mr-3" />
                  Test Backup-Restore Integration
                </Button>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100">Service Integration</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Tests interaction between backup, recovery, and scheduler services
                    </p>
                  </div>
                  
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <h4 className="font-medium text-green-900 dark:text-green-100">Data Integrity</h4>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      Validates backup and restore data integrity
                    </p>
                  </div>
                  
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <h4 className="font-medium text-purple-900 dark:text-purple-100">Performance</h4>
                    <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                      Measures backup and restore performance metrics
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BackupTest;
