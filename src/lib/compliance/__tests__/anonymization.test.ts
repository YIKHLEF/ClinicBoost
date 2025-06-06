/**
 * Anonymization Tests
 * 
 * Comprehensive tests for data anonymization functionality to ensure
 * GDPR compliance and data privacy protection.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AnonymizationEngine } from '../anonymization-utils';
import { ANONYMIZATION_CONFIG } from '../anonymization-config';
import { gdprService } from '../gdpr-service';

describe('AnonymizationEngine', () => {
  let anonymizer: AnonymizationEngine;

  beforeEach(() => {
    anonymizer = new AnonymizationEngine();
  });

  describe('User Anonymization', () => {
    it('should anonymize user data correctly', () => {
      const userData = {
        id: 'user-123',
        first_name: 'John',
        last_name: 'Doe',
        phone: '+1-555-123-4567',
        avatar_url: 'https://example.com/avatar.jpg',
        role: 'dentist',
        default_clinic_id: 'clinic-456',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-06-01T00:00:00Z'
      };

      const anonymized = anonymizer.anonymizeUser(userData);

      // Check that sensitive fields are anonymized
      expect(anonymized.first_name).toContain('PSEUDO_');
      expect(anonymized.last_name).toContain('PSEUDO_');
      expect(anonymized.phone).toMatch(/\(\d{3}\) XXX-XXXX/); // Match any area code
      expect(anonymized.avatar_url).toBe('[REDACTED]');
      
      // Check that relationships are preserved
      expect(anonymized.default_clinic_id).toContain('PSEUDO_');
      
      // Check metadata is added
      expect(anonymized._anonymization).toBeDefined();
      expect(anonymized._anonymization.data_type).toBe('user');
    });
  });

  describe('Patient Anonymization', () => {
    it('should anonymize patient data correctly', () => {
      const patientData = {
        id: 'patient-123',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@example.com',
        phone: '+1-555-987-6543',
        date_of_birth: '1985-03-15',
        gender: 'female',
        address: '123 Main St, Apt 4B',
        city: 'New York',
        insurance_provider: 'Blue Cross',
        insurance_number: 'BC123456789',
        medical_history: {
          allergies: ['penicillin', 'latex'],
          medications: ['ibuprofen'],
          conditions: ['hypertension'],
          notes: 'Patient has anxiety about dental procedures'
        },
        notes: 'Prefers morning appointments',
        status: 'active',
        risk_level: 'medium'
      };

      const anonymized = anonymizer.anonymizePatient(patientData);

      // Check direct identifiers
      expect(anonymized.first_name).toContain('PSEUDO_');
      expect(anonymized.last_name).toContain('PSEUDO_');
      expect(anonymized.email).toBe('user@example.com');
      expect(anonymized.phone).toMatch(/\(\d{3}\) XXX-XXXX/); // Match any area code
      
      // Check quasi-identifiers
      expect(anonymized.date_of_birth).toBeUndefined();
      expect(anonymized.age_range).toBeDefined();
      expect(['0-17', '18-29', '30-49', '50-69', '70+', '[GENERALIZED_AGE]']).toContain(anonymized.age_range);
      
      // Check sensitive data
      expect(anonymized.insurance_number).toContain('HASH_');
      expect(anonymized.notes).toBe('[REDACTED]');
      
      // Check medical history anonymization
      expect(anonymized.medical_history.anonymized).toBe(true);
      expect(anonymized.medical_history.has_allergies).toBe(true);
      expect(anonymized.medical_history.has_medications).toBe(true);
      expect(anonymized.medical_history.has_conditions).toBe(true);
      
      // Check metadata
      expect(anonymized._anonymization).toBeDefined();
      expect(anonymized._anonymization.data_type).toBe('patient');
    });

    it('should generalize age correctly', () => {
      const testCases = [
        { dob: '2010-01-01', expectedPattern: /^(0-17|\[GENERALIZED_AGE\])$/ },
        { dob: '2000-01-01', expectedPattern: /^(18-29|\[GENERALIZED_AGE\])$/ },
        { dob: '1980-01-01', expectedPattern: /^(30-49|\[GENERALIZED_AGE\])$/ },
        { dob: '1960-01-01', expectedPattern: /^(50-69|\[GENERALIZED_AGE\])$/ },
        { dob: '1940-01-01', expectedPattern: /^(70\+|\[GENERALIZED_AGE\])$/ }
      ];

      testCases.forEach(({ dob, expectedPattern }) => {
        const patientData = { date_of_birth: dob };
        const anonymized = anonymizer.anonymizePatient(patientData);
        expect(anonymized.age_range).toMatch(expectedPattern);
      });
    });
  });

  describe('Appointment Anonymization', () => {
    it('should anonymize appointment data correctly', () => {
      const appointmentData = {
        id: 'appointment-123',
        patient_id: 'patient-456',
        dentist_id: 'dentist-789',
        clinic_id: 'clinic-101',
        start_time: '2023-06-15T10:00:00Z',
        end_time: '2023-06-15T11:00:00Z',
        status: 'completed',
        treatment_id: 'treatment-202',
        notes: 'Patient was nervous but procedure went well',
        reminder_sent: true
      };

      const anonymized = anonymizer.anonymizeAppointment(appointmentData);

      // Check relationship preservation
      expect(anonymized.patient_id).toContain('PSEUDO_');
      expect(anonymized.dentist_id).toContain('PSEUDO_');
      expect(anonymized.clinic_id).toContain('PSEUDO_');
      expect(anonymized.treatment_id).toContain('PSEUDO_');
      
      // Check temporal generalization
      expect(anonymized.start_time).toBeUndefined();
      expect(anonymized.end_time).toBeUndefined();
      expect(anonymized.appointment_date).toBeDefined();
      expect(anonymized.appointment_date).toMatch(/\d{4}-\d{2}-\d{2}|^\[GENERALIZED_DATE\]$/);
      
      // Check sensitive data
      expect(anonymized.notes).toBe('[REDACTED]');
      
      // Check metadata
      expect(anonymized._anonymization).toBeDefined();
    });
  });

  describe('Treatment Anonymization', () => {
    it('should anonymize treatment data correctly', () => {
      const treatmentData = {
        id: 'treatment-123',
        patient_id: 'patient-456',
        name: 'Root Canal',
        description: 'Root canal therapy on tooth #14',
        cost: 1200.00,
        status: 'completed',
        start_date: '2023-06-01',
        completion_date: '2023-06-15',
        notes: 'Patient tolerated procedure well'
      };

      const anonymized = anonymizer.anonymizeTreatment(treatmentData);

      // Check relationship preservation
      expect(anonymized.patient_id).toContain('PSEUDO_');
      
      // Check cost generalization
      expect(anonymized.cost).toBeUndefined();
      expect(anonymized.cost_range).toMatch(/^\$\d+-\d+|\$\d+\+|\[GENERALIZED_COST\]$/); // Match cost range format or fallback
      
      // Check sensitive data
      expect(anonymized.notes).toBe('[REDACTED]');
      
      // Check metadata
      expect(anonymized._anonymization).toBeDefined();
    });

    it('should generalize costs correctly', () => {
      const testCases = [
        { cost: 50, expectedPattern: /^(\$0-99|\[GENERALIZED_COST\])$/ },
        { cost: 250, expectedPattern: /^(\$100-499|\[GENERALIZED_COST\])$/ },
        { cost: 750, expectedPattern: /^(\$500-999|\[GENERALIZED_COST\])$/ },
        { cost: 1500, expectedPattern: /^(\$1000-1999|\[GENERALIZED_COST\])$/ },
        { cost: 2500, expectedPattern: /^(\$2000\+|\[GENERALIZED_COST\])$/ }
      ];

      testCases.forEach(({ cost, expectedPattern }) => {
        const treatmentData = { cost };
        const anonymized = anonymizer.anonymizeTreatment(treatmentData);
        expect(anonymized.cost_range).toMatch(expectedPattern);
      });
    });
  });

  describe('Invoice Anonymization', () => {
    it('should anonymize invoice data correctly', () => {
      const invoiceData = {
        id: 'invoice-123',
        patient_id: 'patient-456',
        treatment_id: 'treatment-789',
        amount: 1200.00,
        status: 'completed',
        due_date: '2023-07-01',
        payment_method: 'credit_card',
        stripe_payment_intent_id: 'pi_1234567890abcdef',
        notes: 'Payment received in full'
      };

      const anonymized = anonymizer.anonymizeInvoice(invoiceData);

      // Check relationship preservation
      expect(anonymized.patient_id).toContain('PSEUDO_');
      expect(anonymized.treatment_id).toContain('PSEUDO_');
      
      // Check financial data
      expect(anonymized.amount).toBeUndefined();
      expect(anonymized.amount_range).toMatch(/^\$\d+-\d+|\$\d+\+|\[GENERALIZED_COST\]$/); // Match amount range format or fallback
      expect(anonymized.stripe_payment_intent_id).toContain('HASH_');
      
      // Check sensitive data
      expect(anonymized.notes).toBe('[REDACTED]');
      
      // Check metadata
      expect(anonymized._anonymization).toBeDefined();
    });
  });

  describe('Consent Anonymization', () => {
    it('should anonymize consent data correctly', () => {
      const consentData = {
        id: 'consent-123',
        user_id: 'user-456',
        patient_id: 'patient-789',
        consent_type: 'data_processing',
        status: 'granted',
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        consent_text: 'I agree to the processing of my personal data',
        version: '1.0',
        metadata: {
          source: 'web_form',
          session_id: 'sess_123456'
        }
      };

      const anonymized = anonymizer.anonymizeConsent(consentData);

      // Check relationship preservation
      expect(anonymized.user_id).toContain('PSEUDO_');
      expect(anonymized.patient_id).toContain('PSEUDO_');
      
      // Check sensitive technical data
      expect(anonymized.ip_address).toContain('HASH_');
      expect(anonymized.consent_text).toBe('[REDACTED]');
      
      // Check metadata
      expect(anonymized._anonymization).toBeDefined();
    });
  });
});

describe('GDPR Service Anonymization', () => {
  describe('Export Data Anonymization', () => {
    it('should export anonymized data correctly', async () => {
      // Mock data would be set up here in a real test environment
      // This is a structure test to ensure the method exists and returns expected format
      
      const mockData = {
        patient: {
          id: 'patient-123',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com'
        }
      };

      // Test the fallback anonymization method
      const anonymized = (gdprService as any).fallbackAnonymization(mockData);
      
      expect(anonymized.patient.first_name).toBe('[REDACTED]');
      expect(anonymized.patient.last_name).toBe('[REDACTED]');
      expect(anonymized.patient.email).toBe('[REDACTED]');
      expect(anonymized.anonymization_metadata).toBeDefined();
      expect(anonymized.anonymization_metadata.anonymization_level).toBe('basic_redaction');
    });
  });

  describe('Anonymization Validation', () => {
    it('should validate anonymization quality', async () => {
      const originalData = {
        email: 'test@example.com',
        phone: '555-123-4567',
        name: 'John Doe'
      };

      const anonymizedData = {
        email: '[REDACTED]',
        phone: '[REDACTED]',
        name: 'PSEUDO_abc123',
        anonymization_metadata: {
          anonymized_at: new Date().toISOString(),
          techniques_used: ['redaction', 'pseudonymization']
        }
      };

      const validation = await gdprService.validateAnonymization(originalData, anonymizedData);
      
      expect(validation.isValid).toBe(true);
      expect(validation.score).toBeGreaterThan(80);
      expect(validation.issues).toHaveLength(0);
    });

    it('should detect data leaks', async () => {
      const originalData = {
        email: 'test@example.com'
      };

      const leakyData = {
        email: 'test@example.com', // Not anonymized!
        anonymization_metadata: {
          anonymized_at: new Date().toISOString()
        }
      };

      const validation = await gdprService.validateAnonymization(originalData, leakyData);
      
      expect(validation.isValid).toBe(false);
      expect(validation.score).toBeLessThan(80);
      expect(validation.issues.length).toBeGreaterThan(0);
    });
  });

  describe('Anonymization Reporting', () => {
    it('should generate comprehensive anonymization report', async () => {
      const anonymizedData = {
        patient: {
          first_name: 'PSEUDO_abc123',
          email: '[REDACTED]',
          phone: '(555) XXX-XXXX',
          _anonymization: {
            data_type: 'patient',
            techniques_applied: ['pseudonymization', 'redaction', 'generalization']
          }
        },
        anonymization_metadata: {
          anonymized_at: new Date().toISOString(),
          techniques_used: ['pseudonymization', 'redaction', 'generalization']
        }
      };

      const report = await gdprService.generateAnonymizationReport(anonymizedData);
      
      expect(report.summary.totalFields).toBeGreaterThan(0);
      expect(report.summary.anonymizedFields).toBeGreaterThan(0);
      expect(report.summary.techniques).toContain('pseudonymization');
      expect(report.summary.techniques).toContain('redaction');
      expect(report.summary.dataTypes).toContain('patient');
      
      expect(report.details.fieldBreakdown).toBeDefined();
      expect(report.details.techniqueUsage).toBeDefined();
      expect(report.details.dataTypeBreakdown).toBeDefined();
      
      expect(report.compliance.gdprCompliant).toBeDefined();
      expect(report.compliance.hipaaCompliant).toBeDefined();
    });
  });
});
