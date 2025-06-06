import { describe, it, expect, beforeEach } from 'vitest';
import { EmailTemplateService } from '../template-service';
import type { EmailTemplate } from '../types';

describe('EmailTemplateService', () => {
  let templateService: EmailTemplateService;

  beforeEach(() => {
    templateService = new EmailTemplateService();
  });

  describe('template management', () => {
    it('should load default templates', () => {
      const templates = templateService.getAllTemplates();
      expect(templates.length).toBeGreaterThan(0);
      
      // Check for default appointment reminder template
      const appointmentTemplate = templates.find(t => t.category === 'appointment_reminder');
      expect(appointmentTemplate).toBeDefined();
      expect(appointmentTemplate?.language).toBe('en');
    });

    it('should add a new template', () => {
      const newTemplate: EmailTemplate = {
        id: 'test-template',
        name: 'Test Template',
        subject: 'Test Subject: {{name}}',
        htmlContent: '<p>Hello {{name}}!</p>',
        textContent: 'Hello {{name}}!',
        variables: ['name'],
        category: 'welcome',
        language: 'en',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      templateService.addTemplate(newTemplate);
      const retrieved = templateService.getTemplate('test-template');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Template');
    });

    it('should update an existing template', async () => {
      const templates = templateService.getAllTemplates();
      const firstTemplate = templates[0];

      // Add a small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));

      templateService.updateTemplate(firstTemplate.id, {
        name: 'Updated Template Name',
      });

      const updated = templateService.getTemplate(firstTemplate.id);
      expect(updated?.name).toBe('Updated Template Name');
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(firstTemplate.updatedAt.getTime());
    });

    it('should delete a template', () => {
      const newTemplate: EmailTemplate = {
        id: 'delete-test',
        name: 'Delete Test',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        variables: [],
        category: 'welcome',
        language: 'en',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      templateService.addTemplate(newTemplate);
      expect(templateService.getTemplate('delete-test')).toBeDefined();

      const deleted = templateService.deleteTemplate('delete-test');
      expect(deleted).toBe(true);
      expect(templateService.getTemplate('delete-test')).toBeUndefined();
    });
  });

  describe('template filtering', () => {
    it('should filter templates by category', () => {
      const appointmentTemplates = templateService.getTemplatesByCategory('appointment_reminder');
      expect(appointmentTemplates.length).toBeGreaterThan(0);
      appointmentTemplates.forEach(template => {
        expect(template.category).toBe('appointment_reminder');
      });
    });

    it('should filter templates by language', () => {
      const englishTemplates = templateService.getTemplatesByLanguage('en');
      expect(englishTemplates.length).toBeGreaterThan(0);
      englishTemplates.forEach(template => {
        expect(template.language).toBe('en');
      });
    });
  });

  describe('template rendering', () => {
    it('should render a template with data', () => {
      const templates = templateService.getAllTemplates();
      const appointmentTemplate = templates.find(t => t.category === 'appointment_reminder');
      
      if (!appointmentTemplate) {
        throw new Error('Appointment template not found');
      }

      const data = {
        patientName: 'John Doe',
        appointmentDate: new Date('2024-01-15T10:00:00Z'),
        doctorName: 'Dr. Smith',
        treatmentType: 'Dental Cleaning',
        clinicName: 'Test Clinic',
        clinicAddress: '123 Main St',
        clinicPhone: '+1234567890',
      };

      const rendered = templateService.renderTemplate(appointmentTemplate.id, data);

      expect(rendered.subject).toContain('John Doe');
      expect(rendered.html).toContain('John Doe');
      expect(rendered.html).toContain('Dr. Smith');
      expect(rendered.html).toContain('Dental Cleaning');
      
      if (rendered.text) {
        expect(rendered.text).toContain('John Doe');
      }
    });

    it('should handle missing template data gracefully', () => {
      const templates = templateService.getAllTemplates();
      const appointmentTemplate = templates.find(t => t.category === 'appointment_reminder');
      
      if (!appointmentTemplate) {
        throw new Error('Appointment template not found');
      }

      const data = {
        patientName: 'John Doe',
        // Missing other required fields
      };

      const rendered = templateService.renderTemplate(appointmentTemplate.id, data);

      expect(rendered.subject).toContain('John Doe');
      expect(rendered.html).toContain('John Doe');
      // Missing fields should be rendered as empty strings or undefined
    });

    it('should throw error for non-existent template', () => {
      expect(() => {
        templateService.renderTemplate('non-existent-template', {});
      }).toThrow('Template not found');
    });

    it('should format dates correctly', () => {
      const templates = templateService.getAllTemplates();
      const appointmentTemplate = templates.find(t => t.category === 'appointment_reminder');
      
      if (!appointmentTemplate) {
        throw new Error('Appointment template not found');
      }

      const data = {
        patientName: 'John Doe',
        appointmentDate: new Date('2024-01-15T10:00:00Z'),
        doctorName: 'Dr. Smith',
        treatmentType: 'Dental Cleaning',
        clinicName: 'Test Clinic',
        clinicAddress: '123 Main St',
        clinicPhone: '+1234567890',
      };

      const rendered = templateService.renderTemplate(appointmentTemplate.id, data);

      // Check that date formatting helpers work
      expect(rendered.html).toMatch(/January|Jan/); // Date should be formatted
      expect(rendered.html).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/); // Time should be formatted
    });

    it('should format currency correctly', () => {
      const templates = templateService.getAllTemplates();
      const invoiceTemplate = templates.find(t => t.category === 'invoice');
      
      if (!invoiceTemplate) {
        // Create a test invoice template
        const testTemplate: EmailTemplate = {
          id: 'test-invoice',
          name: 'Test Invoice',
          subject: 'Invoice {{invoiceNumber}}',
          htmlContent: '<p>Amount: {{formatCurrency totalAmount currency}}</p>',
          variables: ['invoiceNumber', 'totalAmount', 'currency'],
          category: 'invoice',
          language: 'en',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        templateService.addTemplate(testTemplate);
      }

      const data = {
        invoiceNumber: 'INV-001',
        totalAmount: 150.50,
        currency: 'USD',
      };

      const templateId = invoiceTemplate?.id || 'test-invoice';
      const rendered = templateService.renderTemplate(templateId, data);

      expect(rendered.html).toContain('$150.50');
    });
  });

  describe('handlebars helpers', () => {
    it('should provide comparison helpers', () => {
      const testTemplate: EmailTemplate = {
        id: 'test-helpers',
        name: 'Test Helpers',
        subject: 'Test',
        htmlContent: '{{#if (eq status "active")}}Active{{else}}Inactive{{/if}}',
        variables: ['status'],
        category: 'system_notification',
        language: 'en',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      templateService.addTemplate(testTemplate);

      const rendered1 = templateService.renderTemplate('test-helpers', { status: 'active' });
      expect(rendered1.html).toBe('Active');

      const rendered2 = templateService.renderTemplate('test-helpers', { status: 'inactive' });
      expect(rendered2.html).toBe('Inactive');
    });

    it('should provide numeric comparison helpers', () => {
      const testTemplate: EmailTemplate = {
        id: 'test-numeric',
        name: 'Test Numeric',
        subject: 'Test',
        htmlContent: '{{#if (gt amount 100)}}High{{else}}Low{{/if}}',
        variables: ['amount'],
        category: 'system_notification',
        language: 'en',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      templateService.addTemplate(testTemplate);

      const rendered1 = templateService.renderTemplate('test-numeric', { amount: 150 });
      expect(rendered1.html).toBe('High');

      const rendered2 = templateService.renderTemplate('test-numeric', { amount: 50 });
      expect(rendered2.html).toBe('Low');
    });
  });
});
