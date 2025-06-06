import Handlebars from 'handlebars';
import type { EmailTemplate, EmailCategory } from './types';
import { logger } from '../logging-monitoring';
import { handleError } from '../error-handling';

export class EmailTemplateService {
  private templates: Map<string, EmailTemplate> = new Map();
  private compiledTemplates: Map<string, { subject: HandlebarsTemplateDelegate; html: HandlebarsTemplateDelegate; text?: HandlebarsTemplateDelegate }> = new Map();

  constructor() {
    this.registerHelpers();
    this.loadDefaultTemplates();
  }

  private registerHelpers(): void {
    // Register Handlebars helpers for common formatting
    Handlebars.registerHelper('formatDate', (date: Date, format: string) => {
      if (!date) return '';

      const dateObj = new Date(date);

      switch (format) {
        case 'short':
          return dateObj.toLocaleDateString('en-US', { dateStyle: 'short' });
        case 'medium':
          return dateObj.toLocaleDateString('en-US', { dateStyle: 'medium' });
        case 'long':
          return dateObj.toLocaleDateString('en-US', { dateStyle: 'long' });
        case 'time':
          return dateObj.toLocaleTimeString('en-US', { timeStyle: 'short' });
        default:
          return dateObj.toLocaleDateString('en-US', { dateStyle: 'medium' });
      }
    });

    Handlebars.registerHelper('formatCurrency', (amount: number, currency: string = 'MAD') => {
      if (typeof amount !== 'number') return '';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(amount);
    });

    Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    Handlebars.registerHelper('ne', (a: any, b: any) => a !== b);
    Handlebars.registerHelper('gt', (a: number, b: number) => a > b);
    Handlebars.registerHelper('lt', (a: number, b: number) => a < b);
  }

  private loadDefaultTemplates(): void {
    const defaultTemplates: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Appointment Reminder',
        subject: 'Appointment Reminder for {{patientName}} - {{clinicName}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Appointment Reminder</h2>
            <p>Dear {{patientName}},</p>
            <p>This is a friendly reminder about your upcoming appointment:</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Date:</strong> {{formatDate appointmentDate 'long'}}</p>
              <p><strong>Time:</strong> {{formatDate appointmentDate 'time'}}</p>
              <p><strong>Doctor:</strong> Dr. {{doctorName}}</p>
              <p><strong>Treatment:</strong> {{treatmentType}}</p>
              <p><strong>Location:</strong> {{clinicAddress}}</p>
            </div>
            <p>Please arrive 15 minutes early for check-in. If you need to reschedule, please contact us at {{clinicPhone}} at least 24 hours in advance.</p>
            <p>Best regards,<br>{{clinicName}} Team</p>
          </div>
        `,
        textContent: `Dear {{patientName}},

This is a friendly reminder about your upcoming appointment:

Date: {{formatDate appointmentDate 'long'}}
Time: {{formatDate appointmentDate 'time'}}
Doctor: Dr. {{doctorName}}
Treatment: {{treatmentType}}
Location: {{clinicAddress}}

Please arrive 15 minutes early for check-in. If you need to reschedule, please contact us at {{clinicPhone}} at least 24 hours in advance.

Best regards,
{{clinicName}} Team`,
        variables: ['patientName', 'appointmentDate', 'doctorName', 'treatmentType', 'clinicName', 'clinicAddress', 'clinicPhone'],
        category: 'appointment_reminder',
        language: 'en',
        isActive: true,
      },
      {
        name: 'Welcome Email',
        subject: 'Welcome to {{clinicName}}!',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Welcome to {{clinicName}}!</h2>
            <p>Dear {{firstName}} {{lastName}},</p>
            <p>Welcome to our clinic! We're excited to have you as a new patient.</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Your Account Details:</h3>
              <p><strong>Email:</strong> {{email}}</p>
              <p><strong>Patient ID:</strong> {{patientId}}</p>
              {{#if temporaryPassword}}
              <p><strong>Temporary Password:</strong> {{temporaryPassword}}</p>
              <p style="color: #dc2626;"><em>Please change your password after your first login.</em></p>
              {{/if}}
            </div>
            <p>You can access your patient portal at: <a href="{{portalUrl}}">{{portalUrl}}</a></p>
            <p>If you have any questions, please don't hesitate to contact us at {{clinicPhone}} or {{clinicEmail}}.</p>
            <p>Best regards,<br>{{clinicName}} Team</p>
          </div>
        `,
        textContent: `Dear {{firstName}} {{lastName}},

Welcome to {{clinicName}}! We're excited to have you as a new patient.

Your Account Details:
Email: {{email}}
Patient ID: {{patientId}}
{{#if temporaryPassword}}
Temporary Password: {{temporaryPassword}}
Please change your password after your first login.
{{/if}}

You can access your patient portal at: {{portalUrl}}

If you have any questions, please don't hesitate to contact us at {{clinicPhone}} or {{clinicEmail}}.

Best regards,
{{clinicName}} Team`,
        variables: ['firstName', 'lastName', 'email', 'patientId', 'temporaryPassword', 'portalUrl', 'clinicName', 'clinicPhone', 'clinicEmail'],
        category: 'welcome',
        language: 'en',
        isActive: true,
      },
      {
        name: 'Invoice Email',
        subject: 'Invoice #{{invoiceNumber}} - {{clinicName}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Invoice #{{invoiceNumber}}</h2>
            <p>Dear {{patientName}},</p>
            <p>Please find your invoice details below:</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Invoice Date:</strong> {{formatDate invoiceDate 'medium'}}</p>
              <p><strong>Due Date:</strong> {{formatDate dueDate 'medium'}}</p>
              <p><strong>Amount:</strong> {{formatCurrency totalAmount currency}}</p>
              <p><strong>Status:</strong> {{status}}</p>
            </div>
            {{#if paymentUrl}}
            <p><a href="{{paymentUrl}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Pay Now</a></p>
            {{/if}}
            <p>If you have any questions about this invoice, please contact us at {{clinicPhone}} or {{clinicEmail}}.</p>
            <p>Best regards,<br>{{clinicName}} Team</p>
          </div>
        `,
        textContent: `Dear {{patientName}},

Please find your invoice details below:

Invoice #{{invoiceNumber}}
Invoice Date: {{formatDate invoiceDate 'medium'}}
Due Date: {{formatDate dueDate 'medium'}}
Amount: {{formatCurrency totalAmount currency}}
Status: {{status}}

{{#if paymentUrl}}
Pay online at: {{paymentUrl}}
{{/if}}

If you have any questions about this invoice, please contact us at {{clinicPhone}} or {{clinicEmail}}.

Best regards,
{{clinicName}} Team`,
        variables: ['patientName', 'invoiceNumber', 'invoiceDate', 'dueDate', 'totalAmount', 'currency', 'status', 'paymentUrl', 'clinicName', 'clinicPhone', 'clinicEmail'],
        category: 'invoice',
        language: 'en',
        isActive: true,
      },
    ];

    defaultTemplates.forEach(template => {
      const emailTemplate: EmailTemplate = {
        ...template,
        id: `default_${template.category}_${template.language}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.addTemplate(emailTemplate);
    });

    logger.info('Default email templates loaded', 'email-templates', {
      count: defaultTemplates.length,
    });
  }

  addTemplate(template: EmailTemplate): void {
    try {
      // Compile the template
      const compiledSubject = Handlebars.compile(template.subject);
      const compiledHtml = Handlebars.compile(template.htmlContent);
      const compiledText = template.textContent ? Handlebars.compile(template.textContent) : undefined;

      this.templates.set(template.id, template);
      this.compiledTemplates.set(template.id, {
        subject: compiledSubject,
        html: compiledHtml,
        text: compiledText,
      });

      logger.info('Email template added', 'email-templates', {
        templateId: template.id,
        name: template.name,
        category: template.category,
      });
    } catch (error: any) {
      logger.error('Failed to add email template', 'email-templates', {
        templateId: template.id,
        error: error.message,
      });
      handleError(error, 'email-templates');
      throw error;
    }
  }

  getTemplate(templateId: string): EmailTemplate | undefined {
    return this.templates.get(templateId);
  }

  getTemplatesByCategory(category: EmailCategory): EmailTemplate[] {
    return Array.from(this.templates.values()).filter(template => template.category === category);
  }

  getTemplatesByLanguage(language: 'en' | 'fr' | 'ar'): EmailTemplate[] {
    return Array.from(this.templates.values()).filter(template => template.language === language);
  }

  getAllTemplates(): EmailTemplate[] {
    return Array.from(this.templates.values());
  }

  renderTemplate(templateId: string, data: Record<string, any>): { subject: string; html: string; text?: string } {
    const compiled = this.compiledTemplates.get(templateId);
    if (!compiled) {
      throw new Error(`Template not found: ${templateId}`);
    }

    try {
      const subject = compiled.subject(data);
      const html = compiled.html(data);
      const text = compiled.text ? compiled.text(data) : undefined;

      return { subject, html, text };
    } catch (error: any) {
      logger.error('Failed to render email template', 'email-templates', {
        templateId,
        error: error.message,
      });
      handleError(error, 'email-templates');
      throw error;
    }
  }

  updateTemplate(templateId: string, updates: Partial<EmailTemplate>): void {
    const existing = this.templates.get(templateId);
    if (!existing) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const updated: EmailTemplate = {
      ...existing,
      ...updates,
      id: templateId, // Ensure ID doesn't change
      updatedAt: new Date(),
    };

    this.addTemplate(updated);
  }

  deleteTemplate(templateId: string): boolean {
    const deleted = this.templates.delete(templateId);
    this.compiledTemplates.delete(templateId);
    
    if (deleted) {
      logger.info('Email template deleted', 'email-templates', { templateId });
    }
    
    return deleted;
  }
}
