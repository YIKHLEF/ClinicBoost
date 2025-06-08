// Email service exports
export { EmailService } from './email-service';
export { EmailTemplateService } from './template-service';
export { EmailCampaignService } from './campaign-service';

// Provider exports
export { SMTPProvider } from './providers/smtp-provider';
export { SendGridProvider } from './providers/sendgrid-provider';

// Configuration exports
export { getEmailConfig, isDemoMode, getEmailConfigForEnvironment } from './config';

// Type exports
export type {
  EmailConfig,
  EmailMessage,
  EmailSendResult,
  EmailDeliveryStatus,
  EmailTemplate,
  EmailCampaign,
  EmailRecipient,
  EmailCampaignExecution,
  EmailStats,
  EmailAnalytics,
  EmailProvider,
  EmailServiceConfig,
  EmailAttachment,
  EmailCategory,
} from './types';

// Create and export a singleton email service instance
import { EmailService } from './email-service';
import { EmailCampaignService } from './campaign-service';
import { getEmailConfig, isDemoMode } from './config';
import { logger } from '../logging-monitoring';

let emailServiceInstance: EmailService | null = null;
let campaignServiceInstance: EmailCampaignService | null = null;

// Mock email service for development
function createMockEmailService(): EmailService {
  const mockConfig = {
    provider: 'smtp' as const,
    from: 'noreply@clinicboost.local',
    smtp: {
      host: 'localhost',
      port: 1025,
      secure: false,
    },
  };

  // Create a mock service that doesn't actually initialize providers
  const mockService = {
    async sendEmail(message: any) {
      console.log('📧 Mock Email Service: Would send email', {
        to: message.to,
        subject: message.subject,
      });
      return { success: true, messageId: `mock_${Date.now()}` };
    },
    async validateConfiguration() {
      return true;
    },
    getTemplateService() {
      return {
        renderTemplate: (id: string, data: any) => ({
          subject: `Mock Template: ${id}`,
          html: `<p>Mock email content for ${id}</p>`,
          text: `Mock email content for ${id}`,
        }),
        addTemplate: () => {},
        getTemplate: () => null,
        listTemplates: () => [],
      };
    },
    async sendAppointmentReminder() {
      return { success: true, messageId: `mock_${Date.now()}` };
    },
    async sendWelcomeEmail() {
      return { success: true, messageId: `mock_${Date.now()}` };
    },
    async sendInvoiceEmail() {
      return { success: true, messageId: `mock_${Date.now()}` };
    },
  } as any;

  return mockService;
}

export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    try {
      // In development mode, skip email service initialization to avoid nodemailer issues
      if (import.meta.env.DEV) {
        logger.info('Development mode: Using mock email service', 'email-service');
        // Return a mock email service for development
        emailServiceInstance = createMockEmailService();
      } else {
        const config = getEmailConfig();
        emailServiceInstance = new EmailService(config);

        // Validate configuration in non-demo mode
        if (!isDemoMode()) {
          emailServiceInstance.validateConfiguration().then(isValid => {
            if (!isValid) {
              logger.warn('Email service configuration validation failed', 'email-service');
            }
          });
        }
      }
    } catch (error: any) {
      logger.error('Failed to initialize email service', 'email-service', { error: error.message });
      // Return mock service as fallback
      emailServiceInstance = createMockEmailService();
    }
  }
  return emailServiceInstance;
}

export function getCampaignService(): EmailCampaignService {
  if (!campaignServiceInstance) {
    const emailService = getEmailService();
    campaignServiceInstance = new EmailCampaignService(emailService);
  }
  return campaignServiceInstance;
}

// Utility functions for common email operations
export async function sendAppointmentReminder(
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
): Promise<boolean> {
  try {
    if (isDemoMode()) {
      logger.info('Demo mode: Appointment reminder email would be sent', 'email-service', {
        to: patientEmail,
        appointmentData,
      });
      return true;
    }

    const emailService = getEmailService();
    const result = await emailService.sendAppointmentReminder(patientEmail, appointmentData);
    return result.success;
  } catch (error: any) {
    logger.error('Failed to send appointment reminder', 'email-service', {
      error: error.message,
      patientEmail,
    });
    return false;
  }
}

export async function sendWelcomeEmail(
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
): Promise<boolean> {
  try {
    if (isDemoMode()) {
      logger.info('Demo mode: Welcome email would be sent', 'email-service', {
        to: userEmail,
        userData,
      });
      return true;
    }

    const emailService = getEmailService();
    const result = await emailService.sendWelcomeEmail(userEmail, userData);
    return result.success;
  } catch (error: any) {
    logger.error('Failed to send welcome email', 'email-service', {
      error: error.message,
      userEmail,
    });
    return false;
  }
}

export async function sendInvoiceEmail(
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
): Promise<boolean> {
  try {
    if (isDemoMode()) {
      logger.info('Demo mode: Invoice email would be sent', 'email-service', {
        to: patientEmail,
        invoiceData,
      });
      return true;
    }

    const emailService = getEmailService();
    const result = await emailService.sendInvoiceEmail(patientEmail, invoiceData);
    return result.success;
  } catch (error: any) {
    logger.error('Failed to send invoice email', 'email-service', {
      error: error.message,
      patientEmail,
    });
    return false;
  }
}

export async function sendSystemNotification(
  adminEmails: string[],
  subject: string,
  message: string,
  priority: 'low' | 'normal' | 'high' = 'normal'
): Promise<boolean> {
  try {
    if (isDemoMode()) {
      logger.info('Demo mode: System notification email would be sent', 'email-service', {
        to: adminEmails,
        subject,
        priority,
      });
      return true;
    }

    const emailService = getEmailService();
    const results = await emailService.sendBulkEmail(
      adminEmails.map(email => ({
        to: email,
        subject,
        html: `<div style="font-family: Arial, sans-serif;">${message}</div>`,
        text: message,
        priority,
        tags: ['system-notification'],
      }))
    );

    const successCount = results.filter(r => r.success).length;
    return successCount === adminEmails.length;
  } catch (error: any) {
    logger.error('Failed to send system notification', 'email-service', {
      error: error.message,
      adminEmails,
    });
    return false;
  }
}
