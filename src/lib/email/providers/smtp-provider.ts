import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { EmailProvider, EmailMessage, EmailSendResult, EmailDeliveryStatus, EmailConfig } from '../types';
import { logger } from '../../logging-monitoring';
import { handleError } from '../../error-handling';

export class SMTPProvider implements EmailProvider {
  public readonly name = 'smtp';
  private transporter: Transporter | null = null;
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    if (!this.config.smtp) {
      throw new Error('SMTP configuration is required for SMTP provider');
    }

    try {
      this.transporter = nodemailer.createTransporter({
        host: this.config.smtp.host,
        port: this.config.smtp.port,
        secure: this.config.smtp.secure || false,
        auth: this.config.smtp.auth ? {
          user: this.config.smtp.auth.user,
          pass: this.config.smtp.auth.pass,
        } : undefined,
        tls: {
          rejectUnauthorized: false, // For development with self-signed certificates
        },
      });

      logger.info('SMTP transporter initialized', 'email-smtp', {
        host: this.config.smtp.host,
        port: this.config.smtp.port,
        secure: this.config.smtp.secure,
      });
    } catch (error: any) {
      logger.error('Failed to initialize SMTP transporter', 'email-smtp', { error: error.message });
      throw error;
    }
  }

  async validateConfig(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      logger.info('SMTP configuration validated successfully', 'email-smtp');
      return true;
    } catch (error: any) {
      logger.error('SMTP configuration validation failed', 'email-smtp', { error: error.message });
      return false;
    }
  }

  async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    if (!this.transporter) {
      return {
        success: false,
        error: 'SMTP transporter not initialized',
      };
    }

    try {
      const mailOptions = {
        from: this.config.from,
        to: Array.isArray(message.to) ? message.to.join(', ') : message.to,
        cc: message.cc ? (Array.isArray(message.cc) ? message.cc.join(', ') : message.cc) : undefined,
        bcc: message.bcc ? (Array.isArray(message.bcc) ? message.bcc.join(', ') : message.bcc) : undefined,
        subject: message.subject,
        html: message.html,
        text: message.text,
        attachments: message.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
          encoding: att.encoding as any,
          cid: att.cid,
        })),
        priority: message.priority === 'high' ? 'high' : message.priority === 'low' ? 'low' : 'normal',
        headers: {
          'X-Email-Tags': message.tags?.join(','),
          'X-Email-Metadata': message.metadata ? JSON.stringify(message.metadata) : undefined,
        },
      };

      const result = await this.transporter.sendMail(mailOptions);

      logger.info('Email sent successfully via SMTP', 'email-smtp', {
        messageId: result.messageId,
        to: message.to,
        subject: message.subject,
      });

      return {
        success: true,
        messageId: result.messageId,
        details: result,
      };
    } catch (error: any) {
      logger.error('Failed to send email via SMTP', 'email-smtp', {
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
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
      logger.info('SMTP transporter closed', 'email-smtp');
    }
  }
}
