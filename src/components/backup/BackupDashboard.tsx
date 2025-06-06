/**
 * Backup Dashboard
 * 
 * Main dashboard for backup and recovery management
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
  BackupMetadata,
  BackupJob,
  BackupStatistics,
  BackupSchedule,
  RestoreJob,
  BackupType,
  BackupStatus
} from '../../lib/backup/types';
import {
  Shield,
  Download,
  Upload,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  Settings,
  Database,
  HardDrive,
  FileText,
  Calendar,
  Activity,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

const BackupDashboard: React.FC = () => {
  const { t, tCommon, format } = useTranslation();

  // State management
  const [statistics, setStatistics] = useState<BackupStatistics | null>(null);
  const [recentBackups, setRecentBackups] = useState<BackupMetadata[]>([]);
  const [activeJobs, setActiveJobs] = useState<BackupJob[]>([]);
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [restoreJobs, setRestoreJobs] = useState<RestoreJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'backups' | 'schedules' | 'restore'>('overview');

  // Load data
  useEffect(() => {
    loadDashboardData();
    
    // Set up periodic refresh
    const interval = setInterval(loadDashboardData, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Initialize services
      await backupService.initialize();
      await recoveryService.initialize();
      await schedulerService.initialize();
      
      // Load data
      const [stats, backups, jobs, scheduleList, restores] = await Promise.all([
        backupService.getStatistics(),
        backupService.listBackups(),
        Promise.resolve([]), // Active jobs would be loaded from service
        schedulerService.listSchedules(),
        recoveryService.listRestoreJobs()
      ]);

      setStatistics(stats);
      setRecentBackups(backups.slice(0, 10)); // Last 10 backups
      setActiveJobs(jobs);
      setSchedules(scheduleList);
      setRestoreJobs(restores.slice(0, 5)); // Last 5 restore jobs
      
    } catch (error) {
      console.error('Failed to load backup dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle backup creation
  const handleCreateBackup = async (type: BackupType) => {
    try {
      const jobId = await backupService.createBackup(type, {
        name: `Manual ${type} backup - ${new Date().toLocaleString()}`,
        description: `Manual backup created from dashboard`,
        tags: ['manual', type]
      });
      
      console.log(`Backup started: ${jobId}`);
      
      // Refresh data
      await loadDashboardData();
      
    } catch (error) {
      console.error('Failed to create backup:', error);
      alert(t('backup.errors.createFailed'));
    }
  };

  // Handle schedule toggle
  const handleToggleSchedule = async (scheduleId: string, enabled: boolean) => {
    try {
      await schedulerService.toggleSchedule(scheduleId, enabled);
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to toggle schedule:', error);
    }
  };

  // Handle immediate backup trigger
  const handleTriggerBackup = async (scheduleId: string) => {
    try {
      const jobId = await schedulerService.triggerImmediateBackup(scheduleId);
      if (jobId) {
        console.log(`Immediate backup triggered: ${jobId}`);
        await loadDashboardData();
      }
    } catch (error) {
      console.error('Failed to trigger backup:', error);
    }
  };

  // Get status color
  const getStatusColor = (status: BackupStatus): string => {
    switch (status) {
      case 'completed': return 'text-green-600 dark:text-green-400';
      case 'running': return 'text-blue-600 dark:text-blue-400';
      case 'failed': return 'text-red-600 dark:text-red-400';
      case 'pending': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  // Get status icon
  const getStatusIcon = (status: BackupStatus) => {
    switch (status) {
      case 'completed': return <CheckCircle size={16} className="text-green-600" />;
      case 'running': return <Activity size={16} className="text-blue-600 animate-pulse" />;
      case 'failed': return <XCircle size={16} className="text-red-600" />;
      case 'pending': return <Clock size={16} className="text-yellow-600" />;
      default: return <Clock size={16} className="text-gray-600" />;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw size={32} className="animate-spin mx-auto mb-4 text-primary-500" />
          <p className="text-gray-600 dark:text-gray-400">{t('backup.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('backup.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('backup.subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => loadDashboardData()}>
            <RefreshCw size={16} className="mr-2" />
            {tCommon('refresh')}
          </Button>
          <Button onClick={() => handleCreateBackup('full')}>
            <Shield size={16} className="mr-2" />
            {t('backup.createBackup')}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('backup.stats.totalBackups')}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {statistics.totalBackups}
                  </p>
                </div>
                <Database className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('backup.stats.totalSize')}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatFileSize(statistics.totalSize)}
                  </p>
                </div>
                <HardDrive className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('backup.stats.successRate')}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {Math.round(statistics.successRate * 100)}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('backup.stats.nextBackup')}
                  </p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {format({ date: statistics.nextScheduledBackup }).date}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: t('backup.tabs.overview'), icon: Activity },
            { id: 'backups', label: t('backup.tabs.backups'), icon: Database },
            { id: 'schedules', label: t('backup.tabs.schedules'), icon: Calendar },
            { id: 'restore', label: t('backup.tabs.restore'), icon: Upload }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
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

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play size={20} />
                  {t('backup.quickActions')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => handleCreateBackup('full')}
                    className="h-20 flex-col"
                  >
                    <Database size={24} className="mb-2" />
                    {t('backup.types.full')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleCreateBackup('incremental')}
                    className="h-20 flex-col"
                  >
                    <TrendingUp size={24} className="mb-2" />
                    {t('backup.types.incremental')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleCreateBackup('files')}
                    className="h-20 flex-col"
                  >
                    <FileText size={24} className="mb-2" />
                    {t('backup.types.files')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleCreateBackup('configuration')}
                    className="h-20 flex-col"
                  >
                    <Settings size={24} className="mb-2" />
                    {t('backup.types.configuration')}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Storage Usage */}
            {statistics && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive size={20} />
                    {t('backup.storageUsage')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{t('backup.used')}</span>
                        <span>{Math.round(statistics.storageUsage.percentage * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-primary-500 h-2 rounded-full"
                          style={{ width: `${statistics.storageUsage.percentage * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">
                          {t('backup.used')}:
                        </span>
                        <span className="font-medium ml-2">
                          {formatFileSize(statistics.storageUsage.used)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">
                          {t('backup.available')}:
                        </span>
                        <span className="font-medium ml-2">
                          {formatFileSize(statistics.storageUsage.available)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Backups Tab */}
        {activeTab === 'backups' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database size={20} />
                {t('backup.recentBackups')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentBackups.length > 0 ? (
                <div className="space-y-4">
                  {recentBackups.map((backup) => (
                    <div
                      key={backup.id}
                      className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        {getStatusIcon(backup.status)}
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {backup.name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {format({ date: backup.createdAt }).date} • {formatFileSize(backup.size)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={backup.status === 'completed' ? 'default' : 'destructive'}>
                          {backup.type}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Download size={14} className="mr-1" />
                          {t('backup.restore')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Database size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {t('backup.noBackups')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Schedules Tab */}
        {activeTab === 'schedules' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar size={20} />
                  {t('backup.schedules')}
                </CardTitle>
                <Button size="sm">
                  <Calendar size={16} className="mr-2" />
                  {t('backup.createSchedule')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {schedules.length > 0 ? (
                <div className="space-y-4">
                  {schedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${schedule.enabled ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-800'}`}>
                          <Calendar size={20} className={schedule.enabled ? 'text-green-600' : 'text-gray-600'} />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {schedule.name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {t(`backup.frequency.${schedule.frequency.type}`)} at {schedule.time}
                          </p>
                          {schedule.nextRun && (
                            <p className="text-xs text-gray-500">
                              {t('backup.nextRun')}: {format({ date: schedule.nextRun }).date}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={schedule.enabled ? 'default' : 'secondary'}>
                          {schedule.type}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTriggerBackup(schedule.id)}
                        >
                          <Play size={14} className="mr-1" />
                          {t('backup.runNow')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleSchedule(schedule.id, !schedule.enabled)}
                        >
                          {schedule.enabled ? <Pause size={14} /> : <Play size={14} />}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {t('backup.noSchedules')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Restore Tab */}
        {activeTab === 'restore' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload size={20} />
                {t('backup.restoreJobs')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {restoreJobs.length > 0 ? (
                <div className="space-y-4">
                  {restoreJobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        {getStatusIcon(job.status)}
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {t('backup.restoreJob')} #{job.id.slice(-8)}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {job.currentOperation}
                          </p>
                          {job.status === 'running' && (
                            <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-1">
                              <div
                                className="bg-primary-500 h-1 rounded-full"
                                style={{ width: `${job.progress}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={job.status === 'completed' ? 'default' : 'secondary'}>
                          {job.options.restoreType}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {job.progress}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Upload size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {t('backup.noRestoreJobs')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BackupDashboard;
