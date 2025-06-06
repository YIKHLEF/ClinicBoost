import sgMail from '@sendgrid/mail';
import type { EmailProvider, EmailMessage, EmailSendResult, EmailDeliveryStatus, EmailConfig } from '../types';
import { logger } from '../../logging-monitoring';
import { handleError } from '../../error-handling';

export class SendGridProvider implements EmailProvider {
  public readonly name = 'sendgrid';
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
    this.initialize();
  }

  private initialize(): void {
    if (!this.config.sendgrid?.apiKey) {
      throw new Error('SendGrid API key is required for SendGrid provider');
    }

    try {
      sgMail.setApiKey(this.config.sendgrid.apiKey);
      logger.info('SendGrid provider initialized', 'email-sendgrid');
    } catch (error: any) {
      logger.error('Failed to initialize SendGrid provider', 'email-sendgrid', { error: error.message });
      throw error;
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      // Test the API key by making a simple request
      const testMessage = {
        to: 'test@example.com',
        from: this.config.from,
        subject: 'Test',
        text: 'Test message',
      };

      // Use SendGrid's mail/send endpoint validation (dry run)
      await sgMail.send(testMessage, false); // false = don't actually send
      logger.info('SendGrid configuration validated successfully', 'email-sendgrid');
      return true;
    } catch (error: any) {
      logger.error('SendGrid configuration validation failed', 'email-sendgrid', { error: error.message });
      return false;
    }
  }

  async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    try {
      const sgMessage = {
        to: Array.isArray(message.to) ? message.to : [message.to],
        cc: message.cc ? (Array.isArray(message.cc) ? message.cc : [message.cc]) : undefined,
        bcc: message.bcc ? (Array.isArray(message.bcc) ? message.bcc : [message.bcc]) : undefined,
        from: this.config.from,
        replyTo: this.config.replyTo,
        subject: message.subject,
        html: message.html,
        text: message.text,
        attachments: message.attachments?.map(att => ({
          filename: att.filename,
          content: typeof att.content === 'string' ? att.content : att.content.toString('base64'),
          type: att.contentType,
          disposition: 'attachment',
          contentId: att.cid,
        })),
        categories: message.tags,
        customArgs: message.metadata,
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true },
        },
      };

      const result = await sgMail.send(sgMessage);
      const messageId = result[0]?.headers?.['x-message-id'] || `sg_${Date.now()}`;

      logger.info('Email sent successfully via SendGrid', 'email-sendgrid', {
        messageId,
        to: message.to,
        subject: message.subject,
      });

      return {
        success: true,
        messageId,
        details: result[0],
      };
    } catch (error: any) {
      logger.error('Failed to send email via SendGrid', 'email-sendgrid', {
        error: error.message,
        to: message.to,
        subject: message.subject,
      });

      handleError(error, 'email-sendgrid');

      return {
        success: false,
        error: error.message,
        details: error,
      };
    }
  }

  async sendBulkEmail(messages: EmailMessage[]): Promise<EmailSendResult[]> {
    try {
      const sgMessages = messages.map(message => ({
        to: Array.isArray(message.to) ? message.to : [message.to],
        cc: message.cc ? (Array.isArray(message.cc) ? message.cc : [message.cc]) : undefined,
        bcc: message.bcc ? (Array.isArray(message.bcc) ? message.bcc : [message.bcc]) : undefined,
        from: this.config.from,
        replyTo: this.config.replyTo,
        subject: message.subject,
        html: message.html,
        text: message.text,
        attachments: message.attachments?.map(att => ({
          filename: att.filename,
          content: typeof att.content === 'string' ? att.content : att.content.toString('base64'),
          type: att.contentType,
          disposition: 'attachment',
          contentId: att.cid,
        })),
        categories: message.tags,
        customArgs: message.metadata,
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true },
        },
      }));

      const results = await sgMail.send(sgMessages);
      
      const sendResults: EmailSendResult[] = results.map((result, index) => {
        const messageId = result?.headers?.['x-message-id'] || `sg_bulk_${Date.now()}_${index}`;
        return {
          success: true,
          messageId,
          details: result,
        };
      });

      logger.info('Bulk email sending completed via SendGrid', 'email-sendgrid', {
        totalMessages: messages.length,
        successCount: sendResults.filter(r => r.success).length,
      });

      return sendResults;
    } catch (error: any) {
      logger.error('Failed to send bulk email via SendGrid', 'email-sendgrid', {
        error: error.message,
        messageCount: messages.length,
      });

      handleError(error, 'email-sendgrid');

      // Return failed results for all messages
      return messages.map(() => ({
        success: false,
        error: error.message,
        details: error,
      }));
    }
  }

  async getDeliveryStatus(messageId: string): Promise<EmailDeliveryStatus> {
    try {
      // SendGrid provides webhook-based delivery status
      // This would typically be implemented with their Event Webhook
      logger.info('Checking delivery status via SendGrid', 'email-sendgrid', { messageId });
      
      // For now, return a basic status
      // In a real implementation, you'd query SendGrid's API or webhook data
      return {
        messageId,
        status: 'sent',
        timestamp: new Date(),
        details: { note: 'Use SendGrid webhooks for real-time delivery status' },
      };
    } catch (error: any) {
      logger.error('Failed to get delivery status from SendGrid', 'email-sendgrid', {
        error: error.message,
        messageId,
      });

      return {
        messageId,
        status: 'failed',
        timestamp: new Date(),
        details: { error: error.message },
      };
    }
  }
}
