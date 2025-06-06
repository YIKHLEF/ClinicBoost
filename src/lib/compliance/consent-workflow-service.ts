/**
 * Consent Workflow Service
 * 
 * Handles automated consent management workflows including:
 * - Consent expiration notifications
 * - Automated renewal campaigns
 * - New user consent collection
 * - Consent withdrawal processing
 */

import { supabase } from '../supabase';
import { logger } from '../logging-monitoring';
import { consentService, type ConsentType } from './consent-service';
import { getEmailService } from '../email';

export interface ConsentWorkflow {
  id: string;
  name: string;
  description: string;
  trigger: 'expiration' | 'renewal' | 'withdrawal' | 'new_user';
  status: 'active' | 'paused' | 'draft';
  conditions: {
    daysBeforeExpiration?: number;
    consentTypes: ConsentType[];
    userSegments?: string[];
  };
  actions: {
    sendEmail: boolean;
    sendNotification: boolean;
    updateStatus: boolean;
    escalate: boolean;
  };
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
  };
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  results: {
    processed: number;
    successful: number;
    failed: number;
    errors?: string[];
  };
}

export interface ConsentNotification {
  id: string;
  user_id?: string;
  patient_id?: string;
  type: 'expiration_reminder' | 'renewal_request' | 'withdrawal_confirmation';
  consent_types: ConsentType[];
  status: 'pending' | 'sent' | 'failed';
  scheduled_for: string;
  sent_at?: string;
  email_content?: string;
}

class ConsentWorkflowService {
  private static instance: ConsentWorkflowService;

  static getInstance(): ConsentWorkflowService {
    if (!ConsentWorkflowService.instance) {
      ConsentWorkflowService.instance = new ConsentWorkflowService();
    }
    return ConsentWorkflowService.instance;
  }

  /**
   * Create a new consent workflow
   */
  async createWorkflow(workflowData: Omit<ConsentWorkflow, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('consent_workflows')
        .insert({
          name: workflowData.name,
          description: workflowData.description,
          trigger: workflowData.trigger,
          status: workflowData.status,
          conditions: workflowData.conditions,
          actions: workflowData.actions,
          schedule: workflowData.schedule
        })
        .select('id')
        .single();

      if (error) throw error;

      logger.info('Consent workflow created', 'consent-workflow-service', {
        workflowId: data.id,
        name: workflowData.name,
        trigger: workflowData.trigger
      });

      return data.id;
    } catch (error) {
      logger.error('Failed to create consent workflow', 'consent-workflow-service', { error, workflowData });
      throw error;
    }
  }

  /**
   * Get all consent workflows
   */
  async getWorkflows(): Promise<ConsentWorkflow[]> {
    try {
      const { data, error } = await supabase
        .from('consent_workflows')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error('Failed to get consent workflows', 'consent-workflow-service', { error });
      throw error;
    }
  }

  /**
   * Update workflow status
   */
  async updateWorkflowStatus(workflowId: string, status: 'active' | 'paused' | 'draft'): Promise<void> {
    try {
      const { error } = await supabase
        .from('consent_workflows')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', workflowId);

      if (error) throw error;

      logger.info('Workflow status updated', 'consent-workflow-service', {
        workflowId,
        status
      });
    } catch (error) {
      logger.error('Failed to update workflow status', 'consent-workflow-service', { error, workflowId, status });
      throw error;
    }
  }

  /**
   * Execute a specific workflow
   */
  async executeWorkflow(workflowId: string): Promise<WorkflowExecution> {
    try {
      // Get workflow details
      const { data: workflow, error: workflowError } = await supabase
        .from('consent_workflows')
        .select('*')
        .eq('id', workflowId)
        .single();

      if (workflowError) throw workflowError;
      if (!workflow || workflow.status !== 'active') {
        throw new Error('Workflow not found or not active');
      }

      // Create execution record
      const { data: execution, error: executionError } = await supabase
        .from('workflow_executions')
        .insert({
          workflow_id: workflowId,
          status: 'running',
          started_at: new Date().toISOString(),
          results: { processed: 0, successful: 0, failed: 0 }
        })
        .select('*')
        .single();

      if (executionError) throw executionError;

      logger.info('Starting workflow execution', 'consent-workflow-service', {
        workflowId,
        executionId: execution.id,
        trigger: workflow.trigger
      });

      // Execute workflow based on trigger type
      let results;
      switch (workflow.trigger) {
        case 'expiration':
          results = await this.executeExpirationWorkflow(workflow);
          break;
        case 'renewal':
          results = await this.executeRenewalWorkflow(workflow);
          break;
        case 'new_user':
          results = await this.executeNewUserWorkflow(workflow);
          break;
        case 'withdrawal':
          results = await this.executeWithdrawalWorkflow(workflow);
          break;
        default:
          throw new Error(`Unknown workflow trigger: ${workflow.trigger}`);
      }

      // Update execution record
      const { error: updateError } = await supabase
        .from('workflow_executions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          results
        })
        .eq('id', execution.id);

      if (updateError) throw updateError;

      logger.info('Workflow execution completed', 'consent-workflow-service', {
        workflowId,
        executionId: execution.id,
        results
      });

      return {
        ...execution,
        status: 'completed',
        completed_at: new Date().toISOString(),
        results
      };
    } catch (error) {
      logger.error('Failed to execute workflow', 'consent-workflow-service', { error, workflowId });
      throw error;
    }
  }

  /**
   * Execute expiration reminder workflow
   */
  private async executeExpirationWorkflow(workflow: ConsentWorkflow): Promise<{
    processed: number;
    successful: number;
    failed: number;
    errors?: string[];
  }> {
    const results = { processed: 0, successful: 0, failed: 0, errors: [] as string[] };
    const daysBeforeExpiration = workflow.conditions.daysBeforeExpiration || 30;

    try {
      // Find consents expiring soon
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + daysBeforeExpiration);

      const { data: expiringConsents, error } = await supabase
        .from('consent_records')
        .select('*')
        .in('consent_type', workflow.conditions.consentTypes)
        .eq('status', 'granted')
        .lt('expires_at', expirationDate.toISOString());

      if (error) throw error;

      results.processed = expiringConsents?.length || 0;

      // Process each expiring consent
      for (const consent of expiringConsents || []) {
        try {
          if (workflow.actions.sendEmail) {
            await this.sendExpirationReminderEmail(consent);
          }

          if (workflow.actions.sendNotification) {
            await this.createConsentNotification({
              user_id: consent.user_id,
              patient_id: consent.patient_id,
              type: 'expiration_reminder',
              consent_types: [consent.consent_type],
              status: 'pending',
              scheduled_for: new Date().toISOString()
            });
          }

          results.successful++;
        } catch (error) {
          results.failed++;
          results.errors?.push(`Failed to process consent ${consent.id}: ${error}`);
        }
      }

      return results;
    } catch (error) {
      logger.error('Error in expiration workflow execution', 'consent-workflow-service', { error });
      throw error;
    }
  }

  /**
   * Execute renewal workflow
   */
  private async executeRenewalWorkflow(workflow: ConsentWorkflow): Promise<{
    processed: number;
    successful: number;
    failed: number;
    errors?: string[];
  }> {
    const results = { processed: 0, successful: 0, failed: 0, errors: [] as string[] };

    try {
      // Find users eligible for renewal
      const { data: eligibleUsers, error } = await supabase
        .from('users')
        .select('*')
        .eq('status', 'active');

      if (error) throw error;

      results.processed = eligibleUsers?.length || 0;

      // Process each user
      for (const user of eligibleUsers || []) {
        try {
          if (workflow.actions.sendEmail) {
            await this.sendRenewalRequestEmail(user, workflow.conditions.consentTypes);
          }

          if (workflow.actions.sendNotification) {
            await this.createConsentNotification({
              user_id: user.id,
              type: 'renewal_request',
              consent_types: workflow.conditions.consentTypes,
              status: 'pending',
              scheduled_for: new Date().toISOString()
            });
          }

          results.successful++;
        } catch (error) {
          results.failed++;
          results.errors?.push(`Failed to process user ${user.id}: ${error}`);
        }
      }

      return results;
    } catch (error) {
      logger.error('Error in renewal workflow execution', 'consent-workflow-service', { error });
      throw error;
    }
  }

  /**
   * Execute new user workflow
   */
  private async executeNewUserWorkflow(workflow: ConsentWorkflow): Promise<{
    processed: number;
    successful: number;
    failed: number;
    errors?: string[];
  }> {
    const results = { processed: 0, successful: 0, failed: 0, errors: [] as string[] };

    try {
      // Find new users without consent records
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: newUsers, error } = await supabase
        .from('users')
        .select('*')
        .gte('created_at', yesterday.toISOString())
        .eq('status', 'active');

      if (error) throw error;

      results.processed = newUsers?.length || 0;

      // Process each new user
      for (const user of newUsers || []) {
        try {
          if (workflow.actions.sendEmail) {
            await this.sendNewUserConsentEmail(user, workflow.conditions.consentTypes);
          }

          results.successful++;
        } catch (error) {
          results.failed++;
          results.errors?.push(`Failed to process new user ${user.id}: ${error}`);
        }
      }

      return results;
    } catch (error) {
      logger.error('Error in new user workflow execution', 'consent-workflow-service', { error });
      throw error;
    }
  }

  /**
   * Execute withdrawal workflow
   */
  private async executeWithdrawalWorkflow(workflow: ConsentWorkflow): Promise<{
    processed: number;
    successful: number;
    failed: number;
    errors?: string[];
  }> {
    const results = { processed: 0, successful: 0, failed: 0, errors: [] as string[] };

    try {
      // Find recent withdrawals
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: withdrawals, error } = await supabase
        .from('consent_records')
        .select('*')
        .eq('status', 'withdrawn')
        .gte('updated_at', yesterday.toISOString());

      if (error) throw error;

      results.processed = withdrawals?.length || 0;

      // Process each withdrawal
      for (const withdrawal of withdrawals || []) {
        try {
          if (workflow.actions.sendEmail) {
            await this.sendWithdrawalConfirmationEmail(withdrawal);
          }

          results.successful++;
        } catch (error) {
          results.failed++;
          results.errors?.push(`Failed to process withdrawal ${withdrawal.id}: ${error}`);
        }
      }

      return results;
    } catch (error) {
      logger.error('Error in withdrawal workflow execution', 'consent-workflow-service', { error });
      throw error;
    }
  }

  /**
   * Send expiration reminder email
   */
  private async sendExpirationReminderEmail(consent: any): Promise<void> {
    try {
      const emailService = getEmailService();
      const expirationDate = new Date(consent.expires_at).toLocaleDateString();

      const result = await emailService.sendEmail({
        to: consent.user_email || consent.patient_email,
        subject: 'Consent Expiration Reminder - ClinicBoost',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Consent Expiration Reminder</h2>
            <p>Your consent for <strong>${consent.consent_type.replace('_', ' ')}</strong> will expire on <strong>${expirationDate}</strong>.</p>
            <p>To continue receiving our services, please renew your consent by clicking the link below:</p>
            <p><a href="${window.location.origin}/privacy-center" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Renew Consent</a></p>
            <p>If you have any questions, please contact our support team.</p>
            <p>Best regards,<br>ClinicBoost Team</p>
          </div>
        `,
        text: `Your consent for ${consent.consent_type.replace('_', ' ')} will expire on ${expirationDate}. Please visit ${window.location.origin}/privacy-center to renew your consent.`,
        tags: ['consent-expiration'],
        metadata: { consentId: consent.id, consentType: consent.consent_type }
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      logger.info('Expiration reminder email sent', 'consent-workflow-service', {
        consentId: consent.id,
        email: consent.user_email || consent.patient_email,
        messageId: result.messageId
      });
    } catch (error) {
      logger.error('Failed to send expiration reminder email', 'consent-workflow-service', { error, consentId: consent.id });
      throw error;
    }
  }

  /**
   * Send renewal request email
   */
  private async sendRenewalRequestEmail(user: any, consentTypes: ConsentType[]): Promise<void> {
    try {
      const emailService = getEmailService();
      const consentTypesList = consentTypes.map(type => type.replace('_', ' ')).join(', ');

      const result = await emailService.sendEmail({
        to: user.email,
        subject: 'Consent Renewal Request - ClinicBoost',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Consent Renewal Request</h2>
            <p>Hello ${user.first_name || 'Valued User'},</p>
            <p>We would like to request your renewed consent for the following data processing activities:</p>
            <ul>
              ${consentTypes.map(type => `<li>${type.replace('_', ' ')}</li>`).join('')}
            </ul>
            <p>Your privacy is important to us. Please review and update your consent preferences:</p>
            <p><a href="${window.location.origin}/privacy-center" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Update Consent Preferences</a></p>
            <p>Thank you for your continued trust in our services.</p>
            <p>Best regards,<br>ClinicBoost Team</p>
          </div>
        `,
        text: `Hello ${user.first_name || 'Valued User'}, we would like to request your renewed consent for: ${consentTypesList}. Please visit ${window.location.origin}/privacy-center to update your preferences.`,
        tags: ['consent-renewal'],
        metadata: { userId: user.id, consentTypes }
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      logger.info('Renewal request email sent', 'consent-workflow-service', {
        userId: user.id,
        email: user.email,
        messageId: result.messageId
      });
    } catch (error) {
      logger.error('Failed to send renewal request email', 'consent-workflow-service', { error, userId: user.id });
      throw error;
    }
  }

  /**
   * Send new user consent email
   */
  private async sendNewUserConsentEmail(user: any, consentTypes: ConsentType[]): Promise<void> {
    try {
      const emailService = getEmailService();
      const consentTypesList = consentTypes.map(type => type.replace('_', ' ')).join(', ');

      const result = await emailService.sendEmail({
        to: user.email,
        subject: 'Welcome! Please Set Your Consent Preferences - ClinicBoost',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Welcome to ClinicBoost!</h2>
            <p>Hello ${user.first_name || 'New User'},</p>
            <p>Welcome to ClinicBoost! To complete your registration and ensure we provide you with the best possible service, please set your consent preferences for:</p>
            <ul>
              ${consentTypes.map(type => `<li>${type.replace('_', ' ')}</li>`).join('')}
            </ul>
            <p>Setting your preferences helps us personalize your experience while respecting your privacy choices.</p>
            <p><a href="${window.location.origin}/privacy-center" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Set Consent Preferences</a></p>
            <p>If you have any questions about our privacy practices, please don't hesitate to contact us.</p>
            <p>Best regards,<br>ClinicBoost Team</p>
          </div>
        `,
        text: `Welcome to ClinicBoost! Please set your consent preferences for: ${consentTypesList}. Visit ${window.location.origin}/privacy-center to get started.`,
        tags: ['new-user-consent'],
        metadata: { userId: user.id, consentTypes }
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      logger.info('New user consent email sent', 'consent-workflow-service', {
        userId: user.id,
        email: user.email,
        messageId: result.messageId
      });
    } catch (error) {
      logger.error('Failed to send new user consent email', 'consent-workflow-service', { error, userId: user.id });
      throw error;
    }
  }

  /**
   * Send withdrawal confirmation email
   */
  private async sendWithdrawalConfirmationEmail(consent: any): Promise<void> {
    try {
      const emailService = getEmailService();

      const result = await emailService.sendEmail({
        to: consent.user_email || consent.patient_email,
        subject: 'Consent Withdrawal Confirmation - ClinicBoost',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Consent Withdrawal Confirmation</h2>
            <p>This email confirms that your consent for <strong>${consent.consent_type.replace('_', ' ')}</strong> has been successfully withdrawn.</p>
            <p><strong>Withdrawal Date:</strong> ${new Date(consent.updated_at).toLocaleDateString()}</p>
            <p>We have updated our records and will no longer process your data for this purpose, except where required by law.</p>
            <p>You can update your consent preferences at any time by visiting your privacy center:</p>
            <p><a href="${window.location.origin}/privacy-center" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Privacy Center</a></p>
            <p>If you have any questions about this withdrawal or our privacy practices, please contact our support team.</p>
            <p>Best regards,<br>ClinicBoost Team</p>
          </div>
        `,
        text: `This confirms that your consent for ${consent.consent_type.replace('_', ' ')} has been withdrawn on ${new Date(consent.updated_at).toLocaleDateString()}. Visit ${window.location.origin}/privacy-center to manage your preferences.`,
        tags: ['consent-withdrawal'],
        metadata: { consentId: consent.id, consentType: consent.consent_type }
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      logger.info('Withdrawal confirmation email sent', 'consent-workflow-service', {
        consentId: consent.id,
        email: consent.user_email || consent.patient_email,
        messageId: result.messageId
      });
    } catch (error) {
      logger.error('Failed to send withdrawal confirmation email', 'consent-workflow-service', { error, consentId: consent.id });
      throw error;
    }
  }

  /**
   * Create consent notification
   */
  private async createConsentNotification(notification: Omit<ConsentNotification, 'id'>): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('consent_notifications')
        .insert(notification)
        .select('id')
        .single();

      if (error) throw error;

      logger.info('Consent notification created', 'consent-workflow-service', {
        notificationId: data.id,
        type: notification.type,
        userId: notification.user_id,
        patientId: notification.patient_id
      });

      return data.id;
    } catch (error) {
      logger.error('Failed to create consent notification', 'consent-workflow-service', { error, notification });
      throw error;
    }
  }

  /**
   * Get workflow execution history
   */
  async getWorkflowExecutions(workflowId?: string): Promise<WorkflowExecution[]> {
    try {
      let query = supabase
        .from('workflow_executions')
        .select('*')
        .order('started_at', { ascending: false });

      if (workflowId) {
        query = query.eq('workflow_id', workflowId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error('Failed to get workflow executions', 'consent-workflow-service', { error, workflowId });
      throw error;
    }
  }

  /**
   * Schedule workflow execution
   */
  async scheduleWorkflow(workflowId: string, scheduledFor: Date): Promise<void> {
    try {
      // In a real implementation, this would integrate with a job scheduler
      // For now, we'll just log the scheduling
      logger.info('Workflow scheduled', 'consent-workflow-service', {
        workflowId,
        scheduledFor: scheduledFor.toISOString()
      });

      // TODO: Integrate with job scheduler (e.g., Bull Queue, Agenda.js, etc.)
    } catch (error) {
      logger.error('Failed to schedule workflow', 'consent-workflow-service', { error, workflowId });
      throw error;
    }
  }
}

export const consentWorkflowService = ConsentWorkflowService.getInstance();
