// Browser-safe SMTP provider - delegates to backend API
// Note: nodemailer is only used on the server side
import type { EmailProvider, EmailMessage, EmailSendResult, EmailDeliveryStatus, EmailConfig } from '../types';
import { logger } from '../../logging-monitoring';
import { handleError } from '../../error-handling';

export class SMTPProvider implements EmailProvider {
  public readonly name = 'smtp';
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
    this.initialize();
  }

  private initialize(): void {
    if (!this.config.smtp) {
      throw new Error('SMTP configuration is required for SMTP provider');
    }

    logger.info('SMTP provider initialized (browser-safe)', 'email-smtp', {
      host: this.config.smtp.host,
      port: this.config.smtp.port,
      secure: this.config.smtp.secure,
    });
  }

  async validateConfig(): Promise<boolean> {
    try {
      // In browser environment, validate by making API call to backend
      const response = await fetch('/api/email/validate-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'smtp', config: this.config.smtp }),
      });

      const result = await response.json();

      if (result.success) {
        logger.info('SMTP configuration validated successfully', 'email-smtp');
        return true;
      } else {
        logger.error('SMTP configuration validation failed', 'email-smtp', { error: result.error });
        return false;
      }
    } catch (error: any) {
      logger.error('SMTP configuration validation failed', 'email-smtp', { error: error.message });
      return false;
    }
  }

  async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    try {
      // In browser environment, send email via backend API
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'smtp',
          message: {
            from: this.config.from,
            to: Array.isArray(message.to) ? message.to : [message.to],
            cc: message.cc ? (Array.isArray(message.cc) ? message.cc : [message.cc]) : undefined,
            bcc: message.bcc ? (Array.isArray(message.bcc) ? message.bcc : [message.bcc]) : undefined,
            subject: message.subject,
            html: message.html,
            text: message.text,
            attachments: message.attachments,
            priority: message.priority,
            tags: message.tags,
            metadata: message.metadata,
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        logger.info('Email sent successfully via SMTP API', 'email-smtp', {
          messageId: result.messageId,
          to: message.to,
          subject: message.subject,
        });

        return {
          success: true,
          messageId: result.messageId,
          details: result.details,
        };
      } else {
        logger.error('Failed to send email via SMTP API', 'email-smtp', {
          error: result.error,
          to: message.to,
          subject: message.subject,
        });

        return {
          success: false,
          error: result.error,
          details: result.details,
        };
      }
    } catch (error: any) {
      logger.error('Failed to send email via SMTP API', 'email-smtp', {
        error: error.message,
        to: message.to,
        subject: message.subject,
      });

      handleError(error, 'email-smtp');

      return {
        success: false,
        error: error.message,
        details: error,
      };
    }
  }

  async sendBulkEmail(messages: EmailMessage[]): Promise<EmailSendResult[]> {
    const results: EmailSendResult[] = [];

    for (const message of messages) {
      const result = await this.sendEmail(message);
      results.push(result);

      // Add a small delay between emails to avoid overwhelming the SMTP server
      if (messages.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    logger.info('Bulk email sending completed via SMTP', 'email-smtp', {
      totalMessages: messages.length,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length,
    });

    return results;
  }

  async getDeliveryStatus(messageId: string): Promise<EmailDeliveryStatus> {
    // SMTP doesn't provide delivery status tracking by default
    // This would need to be implemented with additional services like webhooks
    logger.warn('Delivery status tracking not available for SMTP provider', 'email-smtp', { messageId });
    
    return {
      messageId,
      status: 'sent',
      timestamp: new Date(),
      details: { note: 'Delivery status tracking not available for SMTP' },
    };
  }

  async close(): Promise<void> {
    // No cleanup needed in browser environment
    logger.info('SMTP provider closed', 'email-smtp');
  }
}
