import { describe, it, expect, vi } from 'vitest';
import {
  calculatePatientRisk,
  personalizeMessage,
  predictNoShow,
  generateRecallPriority
} from './messaging';

describe('Messaging Utils', () => {
  describe('calculatePatientRisk', () => {
    it('should calculate high risk for patients with long gaps', () => {
      const patient = {
        id: '1',
        lastVisit: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
        nextAppointment: null,
        treatmentCompleted: false,
        noShowHistory: 0
      };
      
      const risk = calculatePatientRisk(patient);
      expect(risk.riskLevel).toBe('high');
    });
    
    it('should calculate medium risk for incomplete treatment', () => {
      const patient = {
        id: '1',
        lastVisit: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        nextAppointment: null,
        treatmentCompleted: false,
        noShowHistory: 0
      };
      
      const risk = calculatePatientRisk(patient);
      expect(risk.riskLevel).toBe('medium');
    });
  });
  
  describe('personalizeMessage', () => {
    it('should replace all placeholders in template', async () => {
      const template = {
        id: '1',
        name: 'Recall',
        content: {
          en: 'Hello {{patientName}}, your appointment is on {{date}} at {{time}}',
          fr: 'Bonjour {{patientName}}, votre rendez-vous est le {{date}} à {{time}}',
          ar: 'مرحباً {{patientName}}، موعدك في {{date}} الساعة {{time}}'
        },
        type: 'recall' as const
      };
      
      const patient = {
        name: 'John Doe',
        nextAppointment: new Date('2024-03-20T14:30:00').toISOString()
      };
      
      const message = await personalizeMessage(template, patient, 'en');
      expect(message).toContain('John Doe');
      expect(message).toContain('2:30');
    });
  });
  
  describe('predictNoShow', () => {
    it('should calculate higher risk for patients with history', () => {
      const highRiskPatient = {
        noShowHistory: 2,
        lastMinuteCancellations: 2,
        confirmedAppointment: false,
        distance: 25,
        paymentIssues: true
      };
      
      const lowRiskPatient = {
        noShowHistory: 0,
        lastMinuteCancellations: 0,
        confirmedAppointment: true,
        distance: 5,
        paymentIssues: false
      };
      
      const highRisk = predictNoShow(highRiskPatient);
      const lowRisk = predictNoShow(lowRiskPatient);
      
      expect(highRisk).toBeGreaterThan(lowRisk);
    });
  });
  
  describe('generateRecallPriority', () => {
    it('should prioritize high-risk patients', () => {
      const patients = [
        {
          id: '1',
          lastVisit: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          treatmentCompleted: true,
          noShowHistory: 0
        },
        {
          id: '2',
          lastVisit: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
          treatmentCompleted: false,
          noShowHistory: 2
        }
      ];
      
      const prioritized = generateRecallPriority(patients);
      expect(prioritized[0].id).toBe('2');
    });
  });
});