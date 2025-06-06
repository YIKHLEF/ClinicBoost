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
  private anonymizationCache = new Map<string, any>();
  private qualityMetrics = {
    totalFields: 0,
    anonymizedFields: 0,
    techniques: new Set<string>(),
    dataTypes: new Set<string>()
  };

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

  /**
   * Enhanced anonymization with k-anonymity
   */
  async anonymizeWithKAnonymity(
    dataset: any[],
    k: number = 3,
    quasiIdentifiers: string[] = ['age_range', 'city', 'gender']
  ): Promise<{
    anonymizedData: any[];
    qualityMetrics: {
      kAnonymityLevel: number;
      informationLoss: number;
      dataUtility: number;
    };
  }> {
    try {
      logger.info('Starting k-anonymity anonymization', 'anonymization-utils', { k, quasiIdentifiers });

      // Group records by quasi-identifier combinations
      const groups = new Map<string, any[]>();

      dataset.forEach(record => {
        const key = quasiIdentifiers
          .map(qi => record[qi] || 'unknown')
          .join('|');

        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(record);
      });

      // Generalize groups that don't meet k-anonymity
      const anonymizedData: any[] = [];
      let totalInformationLoss = 0;
      let groupsProcessed = 0;

      for (const [key, records] of groups) {
        if (records.length < k) {
          // Generalize this group further
          const generalizedRecords = records.map(record => {
            const generalized = { ...record };

            // Apply more aggressive generalization
            quasiIdentifiers.forEach(qi => {
              if (generalized[qi]) {
                generalized[qi] = this.generalizeForKAnonymity(generalized[qi], qi);
              }
            });

            return generalized;
          });

          anonymizedData.push(...generalizedRecords);
          totalInformationLoss += records.length;
        } else {
          anonymizedData.push(...records);
        }
        groupsProcessed++;
      }

      // Calculate quality metrics
      const kAnonymityLevel = Math.min(...Array.from(groups.values()).map(g => g.length));
      const informationLoss = (totalInformationLoss / dataset.length) * 100;
      const dataUtility = 100 - informationLoss;

      logger.info('K-anonymity anonymization completed', 'anonymization-utils', {
        originalRecords: dataset.length,
        anonymizedRecords: anonymizedData.length,
        kAnonymityLevel,
        informationLoss,
        dataUtility
      });

      return {
        anonymizedData,
        qualityMetrics: {
          kAnonymityLevel,
          informationLoss,
          dataUtility
        }
      };
    } catch (error) {
      logger.error('Error in k-anonymity anonymization', 'anonymization-utils', { error });
      throw error;
    }
  }

  /**
   * Apply differential privacy noise
   */
  applyDifferentialPrivacy(
    value: number,
    epsilon: number = 1.0,
    sensitivity: number = 1.0
  ): number {
    try {
      // Laplace mechanism for differential privacy
      const scale = sensitivity / epsilon;
      const noise = this.generateLaplaceNoise(scale);

      return value + noise;
    } catch (error) {
      logger.error('Error applying differential privacy', 'anonymization-utils', { error });
      return value;
    }
  }

  /**
   * Generate Laplace noise for differential privacy
   */
  private generateLaplaceNoise(scale: number): number {
    // Box-Muller transform to generate Laplace noise
    const u1 = Math.random();
    const u2 = Math.random();

    if (u1 <= 0.5) {
      return scale * Math.log(2 * u1);
    } else {
      return -scale * Math.log(2 * (1 - u1));
    }
  }

  /**
   * Enhanced field detection and classification
   */
  classifyDataFields(data: any): {
    identifiers: string[];
    quasiIdentifiers: string[];
    sensitiveAttributes: string[];
    nonSensitive: string[];
  } {
    const classification = {
      identifiers: [] as string[],
      quasiIdentifiers: [] as string[],
      sensitiveAttributes: [] as string[],
      nonSensitive: [] as string[]
    };

    const identifierPatterns = [
      /^id$/i, /^.*_id$/i, /^uuid$/i, /^email$/i, /^ssn$/i, /^passport$/i
    ];

    const quasiIdentifierPatterns = [
      /age/i, /birth/i, /zip/i, /postal/i, /city/i, /gender/i, /occupation/i
    ];

    const sensitivePatterns = [
      /medical/i, /health/i, /diagnosis/i, /treatment/i, /medication/i,
      /income/i, /salary/i, /financial/i, /credit/i, /insurance/i
    ];

    Object.keys(data).forEach(field => {
      if (identifierPatterns.some(pattern => pattern.test(field))) {
        classification.identifiers.push(field);
      } else if (quasiIdentifierPatterns.some(pattern => pattern.test(field))) {
        classification.quasiIdentifiers.push(field);
      } else if (sensitivePatterns.some(pattern => pattern.test(field))) {
        classification.sensitiveAttributes.push(field);
      } else {
        classification.nonSensitive.push(field);
      }
    });

    return classification;
  }

  /**
   * Batch anonymization with progress tracking
   */
  async batchAnonymize(
    records: any[],
    options: AnonymizationOptions & { batchSize?: number } = {
      ...ANONYMIZATION_CONFIG.defaultOptions,
      batchSize: 100
    },
    progressCallback?: (progress: number, processed: number, total: number) => void
  ): Promise<{
    anonymizedRecords: any[];
    processingStats: {
      totalProcessed: number;
      successCount: number;
      errorCount: number;
      processingTime: number;
    };
  }> {
    const startTime = Date.now();
    const batchSize = options.batchSize || 100;
    const anonymizedRecords: any[] = [];
    let successCount = 0;
    let errorCount = 0;

    try {
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);

        for (const record of batch) {
          try {
            // Determine record type and apply appropriate anonymization
            const anonymized = await this.anonymizeRecord(record, options);
            anonymizedRecords.push(anonymized);
            successCount++;
          } catch (error) {
            logger.error('Error anonymizing record', 'anonymization-utils', { error, recordIndex: i });
            errorCount++;
          }
        }

        // Report progress
        const processed = Math.min(i + batchSize, records.length);
        const progress = (processed / records.length) * 100;

        if (progressCallback) {
          progressCallback(progress, processed, records.length);
        }
      }

      const processingTime = Date.now() - startTime;

      logger.info('Batch anonymization completed', 'anonymization-utils', {
        totalRecords: records.length,
        successCount,
        errorCount,
        processingTime
      });

      return {
        anonymizedRecords,
        processingStats: {
          totalProcessed: records.length,
          successCount,
          errorCount,
          processingTime
        }
      };
    } catch (error) {
      logger.error('Error in batch anonymization', 'anonymization-utils', { error });
      throw error;
    }
  }

  /**
   * Anonymize individual record based on type detection
   */
  private async anonymizeRecord(record: any, options: AnonymizationOptions): Promise<any> {
    // Auto-detect record type
    if (record.patient_id || record.medical_history) {
      return this.anonymizePatient(record, options);
    } else if (record.appointment_date || record.start_time) {
      return this.anonymizeAppointment(record, options);
    } else if (record.treatment_type || record.procedure) {
      return this.anonymizeTreatment(record, options);
    } else if (record.amount || record.invoice_number) {
      return this.anonymizeInvoice(record, options);
    } else if (record.consent_type || record.consent_status) {
      return this.anonymizeConsent(record, options);
    } else {
      // Default to user anonymization
      return this.anonymizeUser(record, options);
    }
  }

  /**
   * Generalize value for k-anonymity
   */
  private generalizeForKAnonymity(value: any, fieldType: string): string {
    if (fieldType.includes('age')) {
      const age = parseInt(value);
      if (age < 25) return '18-24';
      if (age < 35) return '25-34';
      if (age < 45) return '35-44';
      if (age < 55) return '45-54';
      if (age < 65) return '55-64';
      return '65+';
    }

    if (fieldType.includes('city')) {
      return '[GENERALIZED_REGION]';
    }

    if (fieldType.includes('gender')) {
      return value; // Keep as is for k-anonymity
    }

    return '[GENERALIZED]';
  }

  /**
   * Get anonymization quality metrics
   */
  getQualityMetrics(): {
    totalFields: number;
    anonymizedFields: number;
    anonymizationRate: number;
    techniquesUsed: string[];
    dataTypesProcessed: string[];
  } {
    return {
      totalFields: this.qualityMetrics.totalFields,
      anonymizedFields: this.qualityMetrics.anonymizedFields,
      anonymizationRate: this.qualityMetrics.totalFields > 0
        ? (this.qualityMetrics.anonymizedFields / this.qualityMetrics.totalFields) * 100
        : 0,
      techniquesUsed: Array.from(this.qualityMetrics.techniques),
      dataTypesProcessed: Array.from(this.qualityMetrics.dataTypes)
    };
  }

  /**
   * Reset quality metrics
   */
  resetQualityMetrics(): void {
    this.qualityMetrics = {
      totalFields: 0,
      anonymizedFields: 0,
      techniques: new Set<string>(),
      dataTypes: new Set<string>()
    };
  }

  /**
   * Clear anonymization cache
   */
  clearCache(): void {
    this.anonymizationCache.clear();
  }
}

export const anonymizationEngine = new AnonymizationEngine();
