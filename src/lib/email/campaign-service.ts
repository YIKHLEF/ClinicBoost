import type { 
  EmailCampaign, 
  EmailRecipient, 
  EmailCampaignExecution, 
  EmailStats,
  EmailAnalytics 
} from './types';
import { EmailService } from './email-service';
import { logger } from '../logging-monitoring';
import { handleError } from '../error-handling';

export class EmailCampaignService {
  private campaigns: Map<string, EmailCampaign> = new Map();
  private executions: Map<string, EmailCampaignExecution> = new Map();
  private emailService: EmailService;

  constructor(emailService: EmailService) {
    this.emailService = emailService;
  }

  async createCampaign(
    name: string,
    description: string,
    templateId: string,
    recipients: EmailRecipient[],
    createdBy: string,
    options?: {
      scheduledAt?: Date;
      tags?: string[];
      metadata?: Record<string, any>;
    }
  ): Promise<EmailCampaign> {
    const campaign: EmailCampaign = {
      id: this.generateCampaignId(),
      name,
      description,
      templateId,
      recipients: recipients.map(r => ({ ...r, status: 'pending' })),
      scheduledAt: options?.scheduledAt,
      status: options?.scheduledAt ? 'scheduled' : 'draft',
      tags: options?.tags || [],
      metadata: options?.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy,
    };

    this.campaigns.set(campaign.id, campaign);

    logger.info('Email campaign created', 'email-campaign', {
      campaignId: campaign.id,
      name: campaign.name,
      recipientCount: recipients.length,
      createdBy,
    });

    return campaign;
  }

  getCampaign(campaignId: string): EmailCampaign | undefined {
    return this.campaigns.get(campaignId);
  }

  getAllCampaigns(): EmailCampaign[] {
    return Array.from(this.campaigns.values());
  }

  getCampaignsByStatus(status: EmailCampaign['status']): EmailCampaign[] {
    return Array.from(this.campaigns.values()).filter(c => c.status === status);
  }

  async updateCampaign(campaignId: string, updates: Partial<EmailCampaign>): Promise<EmailCampaign> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    if (campaign.status === 'sending' || campaign.status === 'sent') {
      throw new Error('Cannot update campaign that is sending or has been sent');
    }

    const updated: EmailCampaign = {
      ...campaign,
      ...updates,
      id: campaignId, // Ensure ID doesn't change
      updatedAt: new Date(),
    };

    this.campaigns.set(campaignId, updated);

    logger.info('Email campaign updated', 'email-campaign', {
      campaignId,
      updates: Object.keys(updates),
    });

    return updated;
  }

  async deleteCampaign(campaignId: string): Promise<boolean> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      return false;
    }

    if (campaign.status === 'sending') {
      throw new Error('Cannot delete campaign that is currently sending');
    }

    const deleted = this.campaigns.delete(campaignId);
    this.executions.delete(campaignId);

    if (deleted) {
      logger.info('Email campaign deleted', 'email-campaign', { campaignId });
    }

    return deleted;
  }

  async executeCampaign(campaignId: string): Promise<EmailCampaignExecution> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      throw new Error(`Campaign cannot be executed in status: ${campaign.status}`);
    }

    // Update campaign status
    campaign.status = 'sending';
    campaign.updatedAt = new Date();
    this.campaigns.set(campaignId, campaign);

    const execution: EmailCampaignExecution = {
      campaignId,
      startedAt: new Date(),
      status: 'running',
      totalRecipients: campaign.recipients.length,
      sentCount: 0,
      failedCount: 0,
      errors: [],
    };

    this.executions.set(campaignId, execution);

    logger.info('Email campaign execution started', 'email-campaign', {
      campaignId,
      totalRecipients: execution.totalRecipients,
    });

    // Execute campaign asynchronously
    this.executeCampaignAsync(campaign, execution).catch(error => {
      logger.error('Campaign execution failed', 'email-campaign', {
        campaignId,
        error: error.message,
      });
    });

    return execution;
  }

  private async executeCampaignAsync(
    campaign: EmailCampaign,
    execution: EmailCampaignExecution
  ): Promise<void> {
    try {
      const template = this.emailService.getTemplateService().getTemplate(campaign.templateId);
      if (!template) {
        throw new Error(`Template not found: ${campaign.templateId}`);
      }

      for (const recipient of campaign.recipients) {
        try {
          const result = await this.emailService.sendTemplateEmail(
            campaign.templateId,
            recipient.email,
            {
              ...recipient.variables,
              recipientName: recipient.name,
              recipientEmail: recipient.email,
            },
            {
              tags: campaign.tags,
              metadata: {
                ...campaign.metadata,
                campaignId: campaign.id,
                recipientId: recipient.email,
              },
            }
          );

          if (result.success) {
            recipient.status = 'sent';
            recipient.sentAt = new Date();
            execution.sentCount++;
          } else {
            recipient.status = 'failed';
            execution.failedCount++;
            execution.errors.push(`${recipient.email}: ${result.error}`);
          }

          // Update execution
          this.executions.set(campaign.id, execution);

          // Small delay between emails to avoid overwhelming the provider
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error: any) {
          recipient.status = 'failed';
          execution.failedCount++;
          execution.errors.push(`${recipient.email}: ${error.message}`);
          
          handleError(error, 'email-campaign');
        }
      }

      // Mark execution as completed
      execution.status = 'completed';
      execution.completedAt = new Date();
      this.executions.set(campaign.id, execution);

      // Update campaign status
      campaign.status = 'sent';
      campaign.updatedAt = new Date();
      this.campaigns.set(campaign.id, campaign);

      logger.info('Email campaign execution completed', 'email-campaign', {
        campaignId: campaign.id,
        sentCount: execution.sentCount,
        failedCount: execution.failedCount,
        totalRecipients: execution.totalRecipients,
      });

    } catch (error: any) {
      execution.status = 'failed';
      execution.completedAt = new Date();
      execution.errors.push(`Campaign execution failed: ${error.message}`);
      this.executions.set(campaign.id, execution);

      campaign.status = 'draft'; // Reset to draft so it can be retried
      campaign.updatedAt = new Date();
      this.campaigns.set(campaign.id, campaign);

      logger.error('Email campaign execution failed', 'email-campaign', {
        campaignId: campaign.id,
        error: error.message,
      });

      handleError(error, 'email-campaign');
    }
  }

  async pauseCampaign(campaignId: string): Promise<void> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    if (campaign.status !== 'sending') {
      throw new Error('Can only pause campaigns that are currently sending');
    }

    campaign.status = 'paused';
    campaign.updatedAt = new Date();
    this.campaigns.set(campaignId, campaign);

    const execution = this.executions.get(campaignId);
    if (execution) {
      execution.status = 'paused';
      this.executions.set(campaignId, execution);
    }

    logger.info('Email campaign paused', 'email-campaign', { campaignId });
  }

  async resumeCampaign(campaignId: string): Promise<void> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    if (campaign.status !== 'paused') {
      throw new Error('Can only resume paused campaigns');
    }

    campaign.status = 'sending';
    campaign.updatedAt = new Date();
    this.campaigns.set(campaignId, campaign);

    const execution = this.executions.get(campaignId);
    if (execution) {
      execution.status = 'running';
      this.executions.set(campaignId, execution);
      
      // Resume execution
      this.executeCampaignAsync(campaign, execution).catch(error => {
        logger.error('Campaign resume failed', 'email-campaign', {
          campaignId,
          error: error.message,
        });
      });
    }

    logger.info('Email campaign resumed', 'email-campaign', { campaignId });
  }

  getCampaignExecution(campaignId: string): EmailCampaignExecution | undefined {
    return this.executions.get(campaignId);
  }

  getCampaignStats(campaignId: string): EmailStats {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    const sent = campaign.recipients.filter(r => r.status === 'sent').length;
    const delivered = campaign.recipients.filter(r => r.status === 'delivered').length;
    const bounced = campaign.recipients.filter(r => r.status === 'bounced').length;
    const failed = campaign.recipients.filter(r => r.status === 'failed').length;
    const opened = campaign.recipients.filter(r => r.openedAt).length;
    const clicked = campaign.recipients.filter(r => r.clickedAt).length;

    const deliveryRate = sent > 0 ? (delivered / sent) * 100 : 0;
    const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;
    const clickRate = opened > 0 ? (clicked / opened) * 100 : 0;

    return {
      sent,
      delivered,
      bounced,
      failed,
      opened,
      clicked,
      unsubscribed: 0, // Would need to track unsubscribes separately
      deliveryRate,
      openRate,
      clickRate,
    };
  }

  private generateCampaignId(): string {
    return `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
