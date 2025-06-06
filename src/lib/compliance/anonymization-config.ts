/**
 * Anonymization Configuration
 * 
 * This module defines the anonymization rules and configurations for different
 * data types and fields. It provides fine-grained control over how sensitive
 * data is anonymized while maintaining data utility for analytics and compliance.
 */

import type { AnonymizationTechnique, AnonymizationLevel, AnonymizationOptions } from './anonymization-utils';

export interface FieldAnonymizationConfig {
  fields: Record<string, AnonymizationTechnique>;
  preserveStructure: boolean;
  preserveRelationships: boolean;
}

export interface AnonymizationConfig {
  defaultOptions: AnonymizationOptions;
  user: FieldAnonymizationConfig;
  patient: FieldAnonymizationConfig;
  appointment: FieldAnonymizationConfig;
  treatment: FieldAnonymizationConfig;
  invoice: FieldAnonymizationConfig;
  consent: FieldAnonymizationConfig;
  clinic: FieldAnonymizationConfig;
}

/**
 * Default anonymization options
 */
const DEFAULT_OPTIONS: AnonymizationOptions = {
  level: 'full',
  preserveFormat: true,
  preserveLength: false,
  techniques: ['pseudonymization', 'generalization', 'redaction', 'hashing']
};

/**
 * User data anonymization configuration
 */
const USER_CONFIG: FieldAnonymizationConfig = {
  fields: {
    // Direct identifiers - use pseudonymization to maintain relationships
    'first_name': 'pseudonymization',
    'last_name': 'pseudonymization',
    'phone': 'generalization',
    'avatar_url': 'redaction',
    
    // Keep non-sensitive fields
    'role': 'generalization', // Keep role for analytics but generalize
    'default_clinic_id': 'pseudonymization', // Maintain relationships
    
    // Timestamps - keep for analytics
    'created_at': 'generalization',
    'updated_at': 'generalization'
  },
  preserveStructure: true,
  preserveRelationships: true
};

/**
 * Patient data anonymization configuration
 */
const PATIENT_CONFIG: FieldAnonymizationConfig = {
  fields: {
    // Direct identifiers
    'first_name': 'pseudonymization',
    'last_name': 'pseudonymization',
    'email': 'generalization',
    'phone': 'generalization',
    
    // Quasi-identifiers
    'date_of_birth': 'generalization', // Will be converted to age ranges
    'gender': 'generalization',
    'address': 'generalization',
    'city': 'generalization',
    
    // Sensitive health data
    'insurance_provider': 'generalization',
    'insurance_number': 'hashing',
    'medical_history': 'generalization', // Special handling in engine
    'notes': 'redaction',
    
    // System fields
    'status': 'generalization',
    'risk_level': 'generalization',
    'clinic_id': 'pseudonymization', // Maintain relationships
    
    // Audit fields
    'created_by': 'pseudonymization',
    'updated_by': 'pseudonymization',
    'created_at': 'generalization',
    'updated_at': 'generalization'
  },
  preserveStructure: true,
  preserveRelationships: true
};

/**
 * Appointment data anonymization configuration
 */
const APPOINTMENT_CONFIG: FieldAnonymizationConfig = {
  fields: {
    // Relationship fields - pseudonymize to maintain connections
    'patient_id': 'pseudonymization',
    'dentist_id': 'pseudonymization',
    'clinic_id': 'pseudonymization',
    'treatment_id': 'pseudonymization',
    
    // Temporal data - generalize for privacy
    'start_time': 'generalization', // Will be converted to date only
    'end_time': 'generalization',
    
    // Status and operational data
    'status': 'generalization',
    'reminder_sent': 'generalization',
    
    // Sensitive notes
    'notes': 'redaction',
    
    // Audit fields
    'created_by': 'pseudonymization',
    'updated_by': 'pseudonymization',
    'created_at': 'generalization',
    'updated_at': 'generalization'
  },
  preserveStructure: true,
  preserveRelationships: true
};

/**
 * Treatment data anonymization configuration
 */
const TREATMENT_CONFIG: FieldAnonymizationConfig = {
  fields: {
    // Relationship fields
    'patient_id': 'pseudonymization',
    
    // Treatment details - keep for medical analytics
    'name': 'generalization',
    'description': 'generalization',
    'cost': 'generalization', // Will be converted to ranges
    'status': 'generalization',
    
    // Temporal data
    'start_date': 'generalization',
    'completion_date': 'generalization',
    
    // Sensitive notes
    'notes': 'redaction',
    
    // Audit fields
    'created_by': 'pseudonymization',
    'updated_by': 'pseudonymization',
    'created_at': 'generalization',
    'updated_at': 'generalization'
  },
  preserveStructure: true,
  preserveRelationships: true
};

/**
 * Invoice data anonymization configuration
 */
const INVOICE_CONFIG: FieldAnonymizationConfig = {
  fields: {
    // Relationship fields
    'patient_id': 'pseudonymization',
    'treatment_id': 'pseudonymization',
    
    // Financial data
    'amount': 'generalization', // Will be converted to ranges
    'status': 'generalization',
    'due_date': 'generalization',
    
    // Payment details - highly sensitive
    'payment_method': 'generalization',
    'stripe_payment_intent_id': 'hashing',
    
    // Notes
    'notes': 'redaction',
    
    // Audit fields
    'created_by': 'pseudonymization',
    'updated_by': 'pseudonymization',
    'created_at': 'generalization',
    'updated_at': 'generalization'
  },
  preserveStructure: true,
  preserveRelationships: true
};

/**
 * Consent data anonymization configuration
 */
const CONSENT_CONFIG: FieldAnonymizationConfig = {
  fields: {
    // Relationship fields
    'user_id': 'pseudonymization',
    'patient_id': 'pseudonymization',
    
    // Consent details - keep for compliance
    'consent_type': 'generalization',
    'status': 'generalization',
    'version': 'generalization',
    
    // Temporal data
    'granted_at': 'generalization',
    'withdrawn_at': 'generalization',
    
    // Technical data - sensitive
    'ip_address': 'hashing',
    'user_agent': 'generalization',
    'consent_text': 'redaction',
    
    // Metadata - may contain sensitive info
    'metadata': 'generalization',
    
    // Audit fields
    'created_at': 'generalization',
    'updated_at': 'generalization'
  },
  preserveStructure: true,
  preserveRelationships: true
};

/**
 * Clinic data anonymization configuration
 */
const CLINIC_CONFIG: FieldAnonymizationConfig = {
  fields: {
    // Business identifiers
    'name': 'generalization',
    'description': 'generalization',
    'type': 'generalization',
    
    // Location data
    'address': 'generalization',
    'city': 'generalization',
    'postal_code': 'generalization',
    'country': 'generalization',
    
    // Contact information
    'phone': 'generalization',
    'email': 'generalization',
    'website': 'redaction',
    
    // Business data
    'license_number': 'hashing',
    'tax_id': 'hashing',
    
    // System data
    'logo_url': 'redaction',
    'settings': 'generalization',
    'working_hours': 'generalization',
    'timezone': 'generalization',
    
    // Relationship fields
    'owner_id': 'pseudonymization',
    
    // Audit fields
    'created_by': 'pseudonymization',
    'updated_by': 'pseudonymization',
    'created_at': 'generalization',
    'updated_at': 'generalization'
  },
  preserveStructure: true,
  preserveRelationships: true
};

/**
 * Complete anonymization configuration
 */
export const ANONYMIZATION_CONFIG: AnonymizationConfig = {
  defaultOptions: DEFAULT_OPTIONS,
  user: USER_CONFIG,
  patient: PATIENT_CONFIG,
  appointment: APPOINTMENT_CONFIG,
  treatment: TREATMENT_CONFIG,
  invoice: INVOICE_CONFIG,
  consent: CONSENT_CONFIG,
  clinic: CLINIC_CONFIG
};

/**
 * Anonymization level configurations
 */
export const ANONYMIZATION_LEVELS: Record<AnonymizationLevel, AnonymizationOptions> = {
  minimal: {
    level: 'minimal',
    preserveFormat: true,
    preserveLength: true,
    techniques: ['masking', 'generalization']
  },
  standard: {
    level: 'standard',
    preserveFormat: true,
    preserveLength: false,
    techniques: ['pseudonymization', 'generalization', 'masking']
  },
  full: {
    level: 'full',
    preserveFormat: false,
    preserveLength: false,
    techniques: ['pseudonymization', 'generalization', 'redaction', 'hashing']
  }
};

/**
 * Field sensitivity classification
 */
export const FIELD_SENSITIVITY = {
  HIGH: ['email', 'phone', 'ssn', 'insurance_number', 'payment_method', 'stripe_payment_intent_id'],
  MEDIUM: ['first_name', 'last_name', 'address', 'date_of_birth', 'medical_history'],
  LOW: ['status', 'type', 'role', 'created_at', 'updated_at']
};

/**
 * Data retention and anonymization policies
 */
export const RETENTION_POLICIES = {
  IMMEDIATE_ANONYMIZATION: ['payment_method', 'stripe_payment_intent_id', 'ip_address'],
  DELAYED_ANONYMIZATION: ['email', 'phone', 'address'], // After retention period
  PRESERVE_FOR_ANALYTICS: ['status', 'type', 'role', 'created_at'] // Generalized but preserved
};
