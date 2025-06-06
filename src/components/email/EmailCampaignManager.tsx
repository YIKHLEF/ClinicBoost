import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Mail, 
  Plus, 
  Play, 
  Pause, 
  Trash2, 
  Users, 
  Calendar,
  BarChart3,
  Eye,
  Edit
} from 'lucide-react';
import { getCampaignService, getEmailService } from '../../lib/email';
import type { EmailCampaign, EmailTemplate, EmailStats } from '../../lib/email/types';
import { useToast } from '../../hooks/useToast';
import { logger } from '../../lib/logging-monitoring';

interface EmailCampaignManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmailCampaignManager: React.FC<EmailCampaignManagerProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null);
  const [campaignStats, setCampaignStats] = useState<Record<string, EmailStats>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCampaigns();
      loadTemplates();
    }
  }, [isOpen]);

  const loadCampaigns = async () => {
    try {
      const campaignService = getCampaignService();
      const allCampaigns = campaignService.getAllCampaigns();
      setCampaigns(allCampaigns);

      // Load stats for each campaign
      const stats: Record<string, EmailStats> = {};
      for (const campaign of allCampaigns) {
        try {
          stats[campaign.id] = campaignService.getCampaignStats(campaign.id);
        } catch (error) {
          // Campaign might not have stats yet
        }
      }
      setCampaignStats(stats);
    } catch (error: any) {
      logger.error('Failed to load campaigns', 'email-campaign-manager', { error: error.message });
      addToast({
        type: 'error',
        title: t('email.campaigns.loadError', 'Failed to load campaigns'),
        description: error.message,
      });
    }
  };

  const loadTemplates = async () => {
    try {
      const emailService = getEmailService();
      const templateService = emailService.getTemplateService();
      const allTemplates = templateService.getAllTemplates();
      setTemplates(allTemplates);
    } catch (error: any) {
      logger.error('Failed to load templates', 'email-campaign-manager', { error: error.message });
    }
  };

  const handleExecuteCampaign = async (campaignId: string) => {
    try {
      setIsLoading(true);
      const campaignService = getCampaignService();
      await campaignService.executeCampaign(campaignId);
      
      addToast({
        type: 'success',
        title: t('email.campaigns.executeSuccess', 'Campaign started'),
        description: t('email.campaigns.executeSuccessDesc', 'The email campaign has been started successfully.'),
      });
      
      loadCampaigns();
    } catch (error: any) {
      logger.error('Failed to execute campaign', 'email-campaign-manager', { error: error.message });
      addToast({
        type: 'error',
        title: t('email.campaigns.executeError', 'Failed to start campaign'),
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePauseCampaign = async (campaignId: string) => {
    try {
      setIsLoading(true);
      const campaignService = getCampaignService();
      await campaignService.pauseCampaign(campaignId);
      
      addToast({
        type: 'success',
        title: t('email.campaigns.pauseSuccess', 'Campaign paused'),
        description: t('email.campaigns.pauseSuccessDesc', 'The email campaign has been paused.'),
      });
      
      loadCampaigns();
    } catch (error: any) {
      logger.error('Failed to pause campaign', 'email-campaign-manager', { error: error.message });
      addToast({
        type: 'error',
        title: t('email.campaigns.pauseError', 'Failed to pause campaign'),
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm(t('email.campaigns.deleteConfirm', 'Are you sure you want to delete this campaign?'))) {
      return;
    }

    try {
      setIsLoading(true);
      const campaignService = getCampaignService();
      await campaignService.deleteCampaign(campaignId);
      
      addToast({
        type: 'success',
        title: t('email.campaigns.deleteSuccess', 'Campaign deleted'),
        description: t('email.campaigns.deleteSuccessDesc', 'The email campaign has been deleted.'),
      });
      
      loadCampaigns();
    } catch (error: any) {
      logger.error('Failed to delete campaign', 'email-campaign-manager', { error: error.message });
      addToast({
        type: 'error',
        title: t('email.campaigns.deleteError', 'Failed to delete campaign'),
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: EmailCampaign['status']) => {
    switch (status) {
      case 'draft': return 'text-gray-600 bg-gray-100';
      case 'scheduled': return 'text-blue-600 bg-blue-100';
      case 'sending': return 'text-yellow-600 bg-yellow-100';
      case 'sent': return 'text-green-600 bg-green-100';
      case 'paused': return 'text-orange-600 bg-orange-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Mail className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('email.campaigns.title', 'Email Campaigns')}
            </h2>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span>{t('email.campaigns.create', 'Create Campaign')}</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {showCreateForm ? (
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {t('email.campaigns.createNew', 'Create New Campaign')}
              </h3>
              {/* Create form would go here */}
              <div className="text-center py-8">
                <p className="text-gray-500">Campaign creation form coming soon...</p>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  {t('common.back', 'Back')}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 overflow-auto">
              {campaigns.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {t('email.campaigns.noCampaigns', 'No email campaigns')}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {t('email.campaigns.noCampaignsDesc', 'Create your first email campaign to get started.')}
                  </p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mx-auto"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{t('email.campaigns.create', 'Create Campaign')}</span>
                  </button>
                </div>
              ) : (
                <div className="grid gap-6">
                  {campaigns.map((campaign) => {
                    const stats = campaignStats[campaign.id];
                    return (
                      <div
                        key={campaign.id}
                        className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                              {campaign.name}
                            </h3>
                            {campaign.description && (
                              <p className="text-gray-600 dark:text-gray-300 mt-1">
                                {campaign.description}
                              </p>
                            )}
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(campaign.status)}`}>
                            {t(`email.campaigns.status.${campaign.status}`, campaign.status)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              {campaign.recipients.length} {t('email.campaigns.recipients', 'recipients')}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              {campaign.createdAt.toLocaleDateString()}
                            </span>
                          </div>
                          {stats && (
                            <>
                              <div className="flex items-center space-x-2">
                                <BarChart3 className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-600 dark:text-gray-300">
                                  {stats.sent} {t('email.campaigns.sent', 'sent')}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Eye className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-600 dark:text-gray-300">
                                  {stats.openRate.toFixed(1)}% {t('email.campaigns.openRate', 'open rate')}
                                </span>
                              </div>
                            </>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {campaign.status === 'draft' && (
                              <button
                                onClick={() => handleExecuteCampaign(campaign.id)}
                                disabled={isLoading}
                                className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                              >
                                <Play className="h-3 w-3" />
                                <span>{t('email.campaigns.start', 'Start')}</span>
                              </button>
                            )}
                            {campaign.status === 'sending' && (
                              <button
                                onClick={() => handlePauseCampaign(campaign.id)}
                                disabled={isLoading}
                                className="flex items-center space-x-1 px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
                              >
                                <Pause className="h-3 w-3" />
                                <span>{t('email.campaigns.pause', 'Pause')}</span>
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedCampaign(campaign)}
                              className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              <Eye className="h-3 w-3" />
                              <span>{t('email.campaigns.view', 'View')}</span>
                            </button>
                          </div>
                          <button
                            onClick={() => handleDeleteCampaign(campaign.id)}
                            disabled={isLoading || campaign.status === 'sending'}
                            className="flex items-center space-x-1 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>{t('common.delete', 'Delete')}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
