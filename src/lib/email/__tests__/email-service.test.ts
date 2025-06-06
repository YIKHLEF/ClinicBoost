import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmailService } from '../email-service';
import { SMTPProvider } from '../providers/smtp-provider';
import type { EmailConfig, EmailMessage } from '../types';

// Mock the providers
vi.mock('../providers/smtp-provider');
vi.mock('../providers/sendgrid-provider');

describe('EmailService', () => {
  let emailService: EmailService;
  let mockConfig: EmailConfig;

  beforeEach(() => {
    mockConfig = {
      provider: 'smtp',
      smtp: {
        host: 'localhost',
        port: 1025,
        secure: false,
      },
      from: 'test@example.com',
    };

    // Mock the SMTP provider
    const mockProvider = {
      name: 'smtp',
      sendEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'test-123' }),
      sendBulkEmail: vi.fn().mockResolvedValue([{ success: true, messageId: 'test-123' }]),
      validateConfig: vi.fn().mockResolvedValue(true),
    };

    vi.mocked(SMTPProvider).mockImplementation(() => mockProvider as any);

    emailService = new EmailService(mockConfig);
  });

  describe('sendEmail', () => {
    it('should send a simple email successfully', async () => {
      const message: EmailMessage = {
        to: 'recipient@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
        text: 'Test content',
      };

      const result = await emailService.sendEmail(message);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-123');
    });

    it('should send a template email successfully', async () => {
      const message: EmailMessage = {
        to: 'recipient@example.com',
        templateId: 'default_appointment_reminder_en',
        templateData: {
          patientName: 'John Doe',
          appointmentDate: new Date(),
          doctorName: 'Dr. Smith',
          treatmentType: 'Cleaning',
          clinicName: 'Test Clinic',
          clinicAddress: '123 Main St',
          clinicPhone: '+1234567890',
        },
        subject: '', // Will be set by template
      };

      const result = await emailService.sendEmail(message);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-123');
    });

    it('should handle email sending failure', async () => {
      const mockProvider = {
        name: 'smtp',
        sendEmail: vi.fn().mockResolvedValue({ success: false, error: 'SMTP error' }),
        validateConfig: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(SMTPProvider).mockImplementation(() => mockProvider as any);
      emailService = new EmailService(mockConfig);

      const message: EmailMessage = {
        to: 'recipient@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
      };

      const result = await emailService.sendEmail(message);

      expect(result.success).toBe(false);
      expect(result.error).toBe('SMTP error');
    });

    it('should require recipient email address', async () => {
      const message: EmailMessage = {
        to: '',
        subject: 'Test Email',
        html: '<p>Test content</p>',
      };

      const result = await emailService.sendEmail(message);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Recipient email address is required');
    });
  });

  describe('sendBulkEmail', () => {
    it('should send multiple emails successfully', async () => {
      const messages: EmailMessage[] = [
        {
          to: 'recipient1@example.com',
          subject: 'Test Email 1',
          html: '<p>Test content 1</p>',
        },
        {
          to: 'recipient2@example.com',
          subject: 'Test Email 2',
          html: '<p>Test content 2</p>',
        },
      ];

      const mockProvider = {
        name: 'smtp',
        sendEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'test-123' }),
        sendBulkEmail: vi.fn().mockResolvedValue([
          { success: true, messageId: 'test-123' },
          { success: true, messageId: 'test-124' },
        ]),
        validateConfig: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(SMTPProvider).mockImplementation(() => mockProvider as any);
      emailService = new EmailService(mockConfig);

      const results = await emailService.sendBulkEmail(messages);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });
  });

  describe('validateConfiguration', () => {
    it('should validate configuration successfully', async () => {
      const isValid = await emailService.validateConfiguration();
      expect(isValid).toBe(true);
    });

    it('should handle validation failure', async () => {
      const mockProvider = {
        name: 'smtp',
        sendEmail: vi.fn(),
        validateConfig: vi.fn().mockResolvedValue(false),
      };

      vi.mocked(SMTPProvider).mockImplementation(() => mockProvider as any);
      emailService = new EmailService(mockConfig);

      const isValid = await emailService.validateConfiguration();
      expect(isValid).toBe(false);
    });
  });

  describe('convenience methods', () => {
    it('should send appointment reminder', async () => {
      const result = await emailService.sendAppointmentReminder(
        'patient@example.com',
        {
          patientName: 'John Doe',
          appointmentDate: new Date(),
          doctorName: 'Dr. Smith',
          treatmentType: 'Cleaning',
          clinicName: 'Test Clinic',
          clinicAddress: '123 Main St',
          clinicPhone: '+1234567890',
        }
      );

      expect(result.success).toBe(true);
    });

    it('should send welcome email', async () => {
      const result = await emailService.sendWelcomeEmail(
        'user@example.com',
        {
          firstName: 'John',
          lastName: 'Doe',
          email: 'user@example.com',
          portalUrl: 'https://example.com/login',
          clinicName: 'Test Clinic',
          clinicPhone: '+1234567890',
          clinicEmail: 'info@testclinic.com',
        }
      );

      expect(result.success).toBe(true);
    });

    it('should send invoice email', async () => {
      const result = await emailService.sendInvoiceEmail(
        'patient@example.com',
        {
          patientName: 'John Doe',
          invoiceNumber: 'INV-001',
          invoiceDate: new Date(),
          dueDate: new Date(),
          totalAmount: 150,
          currency: 'USD',
          status: 'Pending',
          clinicName: 'Test Clinic',
          clinicPhone: '+1234567890',
          clinicEmail: 'billing@testclinic.com',
        }
      );

      expect(result.success).toBe(true);
    });
  });
});
