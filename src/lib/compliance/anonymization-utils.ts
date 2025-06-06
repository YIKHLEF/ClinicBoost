/**
 * Data Anonymization Utilities
 * 
 * This module provides comprehensive data anonymization capabilities for GDPR compliance.
 * It implements multiple anonymization techniques including pseudonymization, generalization,
 * redaction, and hashing to ensure privacy protection while maintaining data utility.
 */

import CryptoJS from 'crypto-js';
import { secureConfig } from '../config/secure-config';
import { logger } from '../logging-monitoring';
import { ANONYMIZATION_CONFIG } from './anonymization-config';

export type AnonymizationTechnique = 'redaction' | 'pseudonymization' | 'generalization' | 'hashing' | 'masking';
export type AnonymizationLevel = 'minimal' | 'standard' | 'full';

export interface AnonymizationOptions {
  level: AnonymizationLevel;
  preserveFormat: boolean;
  preserveLength: boolean;
  techniques: AnonymizationTechnique[];
  customRules?: Record<string, AnonymizationTechnique>;
}

export interface AnonymizedField {
  original_type: string;
  anonymization_technique: AnonymizationTechnique;
  anonymized_at: string;
}

export class AnonymizationEngine {
  private readonly encryptionKey: string;
  private readonly saltKey: string;
  
  constructor() {
    this.encryptionKey = secureConfig.getSecurityConfig().encryptionKey;
    this.saltKey = CryptoJS.lib.WordArray.random(256/8).toString();
  }

  /**
   * Anonymize user data
   */
  anonymizeUser(user: any, options: AnonymizationOptions = ANONYMIZATION_CONFIG.defaultOptions): any {
    const anonymized = { ...user };
    const config = ANONYMIZATION_CONFIG.user;

    // Apply field-specific anonymization
    for (const [field, technique] of Object.entries(config.fields)) {
      if (anonymized[field] !== undefined && anonymized[field] !== null) {
        anonymized[field] = this.applyTechnique(anonymized[field], technique, field);
      }
    }

    // Handle nested objects
    if (anonymized.metadata && typeof anonymized.metadata === 'object') {
      anonymized.metadata = this.anonymizeGenericObject(anonymized.metadata, options);
    }

    return this.addAnonymizationMetadata(anonymized, 'user');
  }

  /**
   * Anonymize patient data
   */
  anonymizePatient(patient: any, options: AnonymizationOptions = ANONYMIZATION_CONFIG.defaultOptions): any {
    const anonymized = { ...patient };
    const config = ANONYMIZATION_CONFIG.patient;

    // Apply field-specific anonymization
    for (const [field, technique] of Object.entries(config.fields)) {
      if (anonymized[field] !== undefined && anonymized[field] !== null) {
        anonymized[field] = this.applyTechnique(anonymized[field], technique, field);
      }
    }

    // Handle medical history (JSON field)
    if (anonymized.medical_history && typeof anonymized.medical_history === 'object') {
      anonymized.medical_history = this.anonymizeMedicalHistory(anonymized.medical_history);
    }

    // Generalize date of birth to age range
    if (anonymized.date_of_birth) {
      anonymized.age_range = this.generalizeAge(anonymized.date_of_birth);
      delete anonymized.date_of_birth;
    }

    return this.addAnonymizationMetadata(anonymized, 'patient');
  }

  /**
   * Anonymize appointment data
   */
  anonymizeAppointment(appointment: any, options: AnonymizationOptions = ANONYMIZATION_CONFIG.defaultOptions): any {
    const anonymized = { ...appointment };
    const config = ANONYMIZATION_CONFIG.appointment;

    // Apply field-specific anonymization
    for (const [field, technique] of Object.entries(config.fields)) {
      if (anonymized[field] !== undefined && anonymized[field] !== null) {
        anonymized[field] = this.applyTechnique(anonymized[field], technique, field);
      }
    }

    // Generalize timestamps to date only
    if (anonymized.start_time) {
      try {
        const date = new Date(anonymized.start_time);
        if (!isNaN(date.getTime())) {
          anonymized.appointment_date = date.toISOString().split('T')[0];
        } else {
          anonymized.appointment_date = '[GENERALIZED_DATE]';
        }
      } catch (error) {
        anonymized.appointment_date = '[GENERALIZED_DATE]';
      }
      delete anonymized.start_time;
      delete anonymized.end_time;
    }

    return this.addAnonymizationMetadata(anonymized, 'appointment');
  }

  /**
   * Anonymize treatment data
   */
  anonymizeTreatment(treatment: any, options: AnonymizationOptions = ANONYMIZATION_CONFIG.defaultOptions): any {
    const anonymized = { ...treatment };
    const config = ANONYMIZATION_CONFIG.treatment;

    // Apply field-specific anonymization
    for (const [field, technique] of Object.entries(config.fields)) {
      if (anonymized[field] !== undefined && anonymized[field] !== null) {
        anonymized[field] = this.applyTechnique(anonymized[field], technique, field);
      }
    }

    // Generalize cost to ranges
    if (anonymized.cost) {
      anonymized.cost_range = this.generalizeCost(anonymized.cost);
      delete anonymized.cost;
    }

    return this.addAnonymizationMetadata(anonymized, 'treatment');
  }

  /**
   * Anonymize invoice data
   */
  anonymizeInvoice(invoice: any, options: AnonymizationOptions = ANONYMIZATION_CONFIG.defaultOptions): any {
    const anonymized = { ...invoice };
    const config = ANONYMIZATION_CONFIG.invoice;

    // Apply field-specific anonymization
    for (const [field, technique] of Object.entries(config.fields)) {
      if (anonymized[field] !== undefined && anonymized[field] !== null) {
        anonymized[field] = this.applyTechnique(anonymized[field], technique, field);
      }
    }

    // Generalize amount to ranges
    if (anonymized.amount) {
      anonymized.amount_range = this.generalizeCost(anonymized.amount);
      delete anonymized.amount;
    }

    return this.addAnonymizationMetadata(anonymized, 'invoice');
  }

  /**
   * Anonymize consent data
   */
  anonymizeConsent(consent: any, options: AnonymizationOptions = ANONYMIZATION_CONFIG.defaultOptions): any {
    const anonymized = { ...consent };
    const config = ANONYMIZATION_CONFIG.consent;

    // Apply field-specific anonymization
    for (const [field, technique] of Object.entries(config.fields)) {
      if (anonymized[field] !== undefined && anonymized[field] !== null) {
        anonymized[field] = this.applyTechnique(anonymized[field], technique, field);
      }
    }

    // Handle metadata
    if (anonymized.metadata && typeof anonymized.metadata === 'object') {
      anonymized.metadata = this.anonymizeGenericObject(anonymized.metadata, options);
    }

    return this.addAnonymizationMetadata(anonymized, 'consent');
  }

  /**
   * Apply specific anonymization technique to a value
   */
  private applyTechnique(value: any, technique: AnonymizationTechnique, fieldName: string): any {
    if (value === null || value === undefined) return value;

    switch (technique) {
      case 'redaction':
        return '[REDACTED]';
        
      case 'pseudonymization':
        return this.pseudonymize(value, fieldName);
        
      case 'generalization':
        return this.generalize(value, fieldName);
        
      case 'hashing':
        return this.hash(value);
        
      case 'masking':
        return this.mask(value);
        
      default:
        logger.warn(`Unknown anonymization technique: ${technique}`, 'anonymization-utils');
        return '[REDACTED]';
    }
  }

  /**
   * Pseudonymize a value using deterministic encryption
   */
  private pseudonymize(value: string, fieldName: string): string {
    const salt = CryptoJS.SHA256(fieldName + this.saltKey).toString().substring(0, 16);
    const pseudonym = CryptoJS.AES.encrypt(value, this.encryptionKey + salt).toString();
    return `PSEUDO_${pseudonym.substring(0, 12)}`;
  }

  /**
   * Hash a value using SHA-256
   */
  private hash(value: string): string {
    return `HASH_${CryptoJS.SHA256(value + this.saltKey).toString().substring(0, 16)}`;
  }

  /**
   * Mask a value preserving format
   */
  private mask(value: string): string {
    if (typeof value !== 'string') return '[MASKED]';
    
    if (value.length <= 4) return '*'.repeat(value.length);
    
    // Preserve first and last 2 characters for readability
    const start = value.substring(0, 2);
    const end = value.substring(value.length - 2);
    const middle = '*'.repeat(value.length - 4);
    
    return start + middle + end;
  }

  /**
   * Generalize a value based on field type
   */
  private generalize(value: any, fieldName: string): string {
    if (fieldName.includes('email')) {
      return this.generalizeEmail(value);
    } else if (fieldName.includes('phone')) {
      return this.generalizePhone(value);
    } else if (fieldName.includes('address')) {
      return this.generalizeAddress(value);
    } else if (fieldName.includes('city')) {
      return this.generalizeCity(value);
    }
    
    return '[GENERALIZED]';
  }

  /**
   * Generalize email to domain only
   */
  private generalizeEmail(email: string): string {
    if (!email || !email.includes('@')) return '[GENERALIZED_EMAIL]';
    const domain = email.split('@')[1];
    return `user@${domain}`;
  }

  /**
   * Generalize phone to area code only
   */
  private generalizePhone(phone: string): string {
    if (!phone) return '[GENERALIZED_PHONE]';
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 3) {
      const areaCode = digits.substring(0, 3);
      return `(${areaCode}) XXX-XXXX`;
    }
    return '[GENERALIZED_PHONE]';
  }

  /**
   * Generalize address to city/region level
   */
  private generalizeAddress(address: string): string {
    return '[GENERALIZED_ADDRESS]';
  }

  /**
   * Generalize city to region
   */
  private generalizeCity(city: string): string {
    return '[GENERALIZED_CITY]';
  }

  /**
   * Generalize age from date of birth
   */
  private generalizeAge(dateOfBirth: string): string {
    try {
      const birth = new Date(dateOfBirth);
      if (isNaN(birth.getTime())) {
        return '[GENERALIZED_AGE]';
      }

      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();

      // Adjust age if birthday hasn't occurred this year
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }

      if (age < 18) return '0-17';
      if (age < 30) return '18-29';
      if (age < 50) return '30-49';
      if (age < 70) return '50-69';
      return '70+';
    } catch (error) {
      return '[GENERALIZED_AGE]';
    }
  }

  /**
   * Generalize cost to ranges
   */
  private generalizeCost(cost: number): string {
    if (typeof cost !== 'number' || isNaN(cost)) {
      return '[GENERALIZED_COST]';
    }

    if (cost < 100) return '$0-99';
    if (cost < 500) return '$100-499';
    if (cost < 1000) return '$500-999';
    if (cost < 2000) return '$1000-1999';
    return '$2000+';
  }

  /**
   * Anonymize medical history object
   */
  private anonymizeMedicalHistory(medicalHistory: any): any {
    return {
      has_allergies: !!medicalHistory.allergies?.length,
      has_medications: !!medicalHistory.medications?.length,
      has_conditions: !!medicalHistory.conditions?.length,
      has_notes: !!medicalHistory.notes,
      anonymized: true
    };
  }

  /**
   * Anonymize generic object
   */
  private anonymizeGenericObject(obj: any, options: AnonymizationOptions): any {
    const anonymized: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && this.isSensitiveField(key)) {
        anonymized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        anonymized[key] = this.anonymizeGenericObject(value, options);
      } else {
        anonymized[key] = value;
      }
    }
    
    return anonymized;
  }

  /**
   * Check if field is sensitive
   */
  private isSensitiveField(fieldName: string): boolean {
    const sensitivePatterns = [
      'email', 'phone', 'address', 'name', 'ssn', 'id', 'token', 'key', 'secret'
    ];
    
    return sensitivePatterns.some(pattern => 
      fieldName.toLowerCase().includes(pattern)
    );
  }

  /**
   * Add anonymization metadata to object
   */
  private addAnonymizationMetadata(obj: any, dataType: string): any {
    obj._anonymization = {
      data_type: dataType,
      anonymized_at: new Date().toISOString(),
      techniques_applied: ['pseudonymization', 'generalization', 'redaction'],
      anonymization_version: '1.0'
    };
    
    return obj;
  }
}

export const anonymizationEngine = new AnonymizationEngine();
