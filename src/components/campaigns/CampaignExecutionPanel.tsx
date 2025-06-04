import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { 
  Play, 
  Pause, 
  Square, 
  Users, 
  MessageSquare, 
  CheckCircle, 
  XCircle,
  Clock,
  BarChart3,
  Calendar,
  Target
} from 'lucide-react';
import { campaignEngine, type CampaignExecution } from '../../lib/campaign-automation';
import { reminderEngine } from '../../lib/appointment-reminders';
import Modal from '../ui/Modal';

interface CampaignExecutionPanelProps {
  campaignId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CampaignExecutionPanel: React.FC<CampaignExecutionPanelProps> = ({
  campaignId,
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [execution, setExecution] = useState<CampaignExecution | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    if (isOpen && campaignId) {
      loadExecutionStatus();
      loadAnalytics();
    }
  }, [isOpen, campaignId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (execution?.status === 'running') {
      interval = setInterval(() => {
        loadExecutionStatus();
      }, 2000); // Update every 2 seconds while running
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [execution?.status]);

  const loadExecutionStatus = () => {
    const status = campaignEngine.getExecutionStatus(campaignId);
    setExecution(status);
  };

  const loadAnalytics = async () => {
    try {
      const campaignAnalytics = await campaignEngine.getCampaignAnalytics(campaignId);
      setAnalytics(campaignAnalytics);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  const handleExecuteCampaign = async () => {
    setIsExecuting(true);
    
    try {
      const executionResult = await campaignEngine.executeCampaign(campaignId);
      setExecution(executionResult);
      
      addToast({
        type: 'success',
        title: t('campaigns.executionStarted', 'Campaign Execution Started'),
        message: t('campaigns.executionStartedMessage', 'Campaign is now being executed.'),
      });
    } catch (error: any) {
      addToast({
        type: 'error',
        title: t('campaigns.executionFailed', 'Execution Failed'),
        message: error.message || t('campaigns.executionFailedMessage', 'Failed to execute campaign.'),
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCancelExecution = async () => {
    try {
      await campaignEngine.cancelCampaign(campaignId);
      loadExecutionStatus();
      
      addToast({
        type: 'info',
        title: t('campaigns.executionCancelled', 'Execution Cancelled'),
        message: t('campaigns.executionCancelledMessage', 'Campaign execution has been cancelled.'),
      });
    } catch (error: any) {
      addToast({
        type: 'error',
        title: t('campaigns.cancellationFailed', 'Cancellation Failed'),
        message: error.message || t('campaigns.cancellationFailedMessage', 'Failed to cancel campaign.'),
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-blue-600';
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'cancelled': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Clock className="text-blue-600" size={20} />;
      case 'completed': return <CheckCircle className="text-green-600" size={20} />;
      case 'failed': return <XCircle className="text-red-600" size={20} />;
      case 'cancelled': return <Square className="text-gray-600" size={20} />;
      default: return <Clock className="text-gray-600" size={20} />;
    }
  };

  const calculateProgress = () => {
    if (!execution) return 0;
    const total = execution.totalTargets;
    const processed = execution.successfulSends + execution.failedSends;
    return total > 0 ? (processed / total) * 100 : 0;
  };

  const formatDuration = (start: Date, end?: Date) => {
    const endTime = end || new Date();
    const duration = endTime.getTime() - start.getTime();
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('campaigns.executionPanel', 'Campaign Execution')}
      size="2xl"
    >
      <div className="space-y-6">
        {/* Execution Status */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('campaigns.executionStatus', 'Execution Status')}
            </h3>
            
            {execution && (
              <div className="flex items-center space-x-2">
                {getStatusIcon(execution.status)}
                <span className={`font-medium ${getStatusColor(execution.status)}`}>
                  {t(`campaigns.status.${execution.status}`, execution.status.charAt(0).toUpperCase() + execution.status.slice(1))}
                </span>
              </div>
            )}
          </div>

          {execution ? (
            <div className="space-y-4">
              {/* Progress Bar */}
              {execution.status === 'running' && (
                <div>
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <span>{t('campaigns.progress', 'Progress')}</span>
                    <span>{Math.round(calculateProgress())}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${calculateProgress()}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {execution.totalTargets}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t('campaigns.totalTargets', 'Total Targets')}
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {execution.successfulSends}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t('campaigns.successful', 'Successful')}
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {execution.failedSends}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t('campaigns.failed', 'Failed')}
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {execution.endTime ? formatDuration(execution.startTime, execution.endTime) : formatDuration(execution.startTime)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t('campaigns.duration', 'Duration')}
                  </div>
                </div>
              </div>

              {/* Errors */}
              {execution.errors.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    {t('campaigns.errors', 'Errors')} ({execution.errors.length})
                  </h4>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {execution.errors.slice(0, 5).map((error, index) => (
                      <div key={index} className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                        Patient {error.patientId}: {error.error}
                      </div>
                    ))}
                    {execution.errors.length > 5 && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        ... and {execution.errors.length - 5} more errors
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600 dark:text-gray-400">
                {t('campaigns.notExecuted', 'Campaign has not been executed yet')}
              </p>
            </div>
          )}
        </div>

        {/* Analytics */}
        {analytics && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t('campaigns.analytics', 'Campaign Analytics')}
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {analytics.totalSent}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t('campaigns.sent', 'Sent')}
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {analytics.totalDelivered}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t('campaigns.delivered', 'Delivered')}
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(analytics.deliveryRate)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t('campaigns.deliveryRate', 'Delivery Rate')}
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {Math.round(analytics.openRate)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t('campaigns.openRate', 'Open Rate')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex space-x-3">
            {!execution || execution.status === 'failed' ? (
              <Button
                onClick={handleExecuteCampaign}
                loading={isExecuting}
                disabled={execution?.status === 'running'}
              >
                <Play size={16} className="mr-2" />
                {t('campaigns.execute', 'Execute Campaign')}
              </Button>
            ) : execution.status === 'running' ? (
              <Button
                onClick={handleCancelExecution}
                variant="outline"
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                <Square size={16} className="mr-2" />
                {t('campaigns.cancel', 'Cancel Execution')}
              </Button>
            ) : null}

            <Button
              variant="outline"
              onClick={loadAnalytics}
            >
              <BarChart3 size={16} className="mr-2" />
              {t('campaigns.refreshAnalytics', 'Refresh Analytics')}
            </Button>
          </div>

          <Button variant="outline" onClick={onClose}>
            {t('common.close', 'Close')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
