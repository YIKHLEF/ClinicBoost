import type { 
  EmailConfig, 
  EmailProvider, 
  EmailMessage, 
  EmailSendResult, 
  EmailDeliveryStatus,
  EmailServiceConfig 
} from './types';
import { SMTPProvider } from './providers/smtp-provider';
import { SendGridProvider } from './providers/sendgrid-provider';
import { EmailTemplateService } from './template-service';
import { logger } from '../logging-monitoring';
import { handleError } from '../error-handling';

export class EmailService {
  private provider: EmailProvider;
  private templateService: EmailTemplateService;
  private config: EmailServiceConfig;

  constructor(emailConfig: EmailConfig) {
    this.templateService = new EmailTemplateService();
    this.provider = this.createProvider(emailConfig);
    
    this.config = {
      provider: this.provider,
      templates: new Map(),
      defaultFrom: emailConfig.from,
      defaultReplyTo: emailConfig.replyTo,
      trackOpens: true,
      trackClicks: true,
      enableRetries: true,
      maxRetries: 3,
      retryDelay: 1000,
    };

    logger.info('Email service initialized', 'email-service', {
      provider: this.provider.name,
      from: emailConfig.from,
    });
  }

  private createProvider(config: EmailConfig): EmailProvider {
    switch (config.provider) {
      case 'smtp':
        return new SMTPProvider(config);
      case 'sendgrid':
        return new SendGridProvider(config);
      default:
        throw new Error(`Unsupported email provider: ${config.provider}`);
    }
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      const isValid = await this.provider.validateConfig();
      logger.info('Email configuration validation result', 'email-service', { isValid });
      return isValid;
    } catch (error: any) {
      logger.error('Email configuration validation failed', 'email-service', { error: error.message });
      return false;
    }
  }

  async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    try {
      // If template is specified, render it
      if (message.templateId && message.templateData) {
        const rendered = this.templateService.renderTemplate(message.templateId, message.templateData);
        message.subject = rendered.subject;
        message.html = rendered.html;
        message.text = rendered.text;
      }

      // Set default from if not specified
      if (!message.to) {
        throw new Error('Recipient email address is required');
      }

      const result = await this.sendWithRetry(message);
      
      logger.info('Email sent', 'email-service', {
        success: result.success,
        messageId: result.messageId,
        to: message.to,
        subject: message.subject,
      });

      return result;
    } catch (error: any) {
      logger.error('Failed to send email', 'email-service', {
        error: error.message,
        to: message.to,
        subject: message.subject,
      });
      
      handleError(error, 'email-service');
      
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async sendWithRetry(message: EmailMessage, attempt: number = 1): Promise<EmailSendResult> {
    const result = await this.provider.sendEmail(message);
    
    if (!result.success && this.config.enableRetries && attempt < (this.config.maxRetries || 3)) {
      logger.warn('Email sending failed, retrying', 'email-service', {
        attempt,
        maxRetries: this.config.maxRetries,
        error: result.error,
      });
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, (this.config.retryDelay || 1000) * attempt));
      
      return this.sendWithRetry(message, attempt + 1);
    }
    
    return result;
  }

  async sendBulkEmail(messages: EmailMessage[]): Promise<EmailSendResult[]> {
    try {
      // Process templates for all messages
      const processedMessages = messages.map(message => {
        if (message.templateId && message.templateData) {
          const rendered = this.templateService.renderTemplate(message.templateId, message.templateData);
          return {
            ...message,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
          };
        }
        return message;
      });

      const results = await this.provider.sendBulkEmail(processedMessages);
      
      logger.info('Bulk email sending completed', 'email-service', {
        totalMessages: messages.length,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length,
      });

      return results;
    } catch (error: any) {
      logger.error('Failed to send bulk email', 'email-service', {
        error: error.message,
        messageCount: messages.length,
      });
      
      handleError(error, 'email-service');
      
      // Return failed results for all messages
      return messages.map(() => ({
        success: false,
        error: error.message,
      }));
    }
  }

  async sendTemplateEmail(
    templateId: string,
    to: string | string[],
    templateData: Record<string, any>,
    options?: Partial<EmailMessage>
  ): Promise<EmailSendResult> {
    const message: EmailMessage = {
      to,
      templateId,
      templateData,
      subject: '', // Will be set by template
      ...options,
    };

    return this.sendEmail(message);
  }

  async getDeliveryStatus(messageId: string): Promise<EmailDeliveryStatus> {
    try {
      if (this.provider.getDeliveryStatus) {
        return await this.provider.getDeliveryStatus(messageId);
      } else {
        return {
          messageId,
          status: 'sent',
          timestamp: new Date(),
          details: { note: 'Delivery status tracking not available for this provider' },
        };
      }
    } catch (error: any) {
      logger.error('Failed to get delivery status', 'email-service', {
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

  // Template management methods
  getTemplateService(): EmailTemplateService {
    return this.templateService;
  }

  // Convenience methods for common email types
  async sendAppointmentReminder(
    patientEmail: string,
    appointmentData: {
      patientName: string;
      appointmentDate: Date;
      doctorName: string;
      treatmentType: string;
      clinicName: string;
      clinicAddress: string;
      clinicPhone: string;
    }
  ): Promise<EmailSendResult> {
    return this.sendTemplateEmail(
      'default_appointment_reminder_en',
      patientEmail,
      appointmentData
    );
  }

  async sendWelcomeEmail(
    userEmail: string,
    userData: {
      firstName: string;
      lastName: string;
      email: string;
      patientId?: string;
      temporaryPassword?: string;
      portalUrl: string;
      clinicName: string;
      clinicPhone: string;
      clinicEmail: string;
    }
  ): Promise<EmailSendResult> {
    return this.sendTemplateEmail(
      'default_welcome_en',
      userEmail,
      userData
    );
  }

  async sendInvoiceEmail(
    patientEmail: string,
    invoiceData: {
      patientName: string;
      invoiceNumber: string;
      invoiceDate: Date;
      dueDate: Date;
      totalAmount: number;
      currency: string;
      status: string;
      paymentUrl?: string;
      clinicName: string;
      clinicPhone: string;
      clinicEmail: string;
    }
  ): Promise<EmailSendResult> {
    return this.sendTemplateEmail(
      'default_invoice_en',
      patientEmail,
      invoiceData
    );
  }
}
