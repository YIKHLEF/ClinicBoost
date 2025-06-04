/**
 * Advanced Form Validation System
 * 
 * This module provides comprehensive form validation including:
 * - Schema-based validation with Zod
 * - Real-time validation
 * - Custom validation rules
 * - Internationalized error messages
 * - Async validation support
 * - Field dependencies
 * - Conditional validation
 */

import { z } from 'zod';
import { logger } from './logging-monitoring';

export interface ValidationRule {
  name: string;
  validator: (value: any, context?: ValidationContext) => boolean | Promise<boolean>;
  message: string | ((value: any, context?: ValidationContext) => string);
  async?: boolean;
}

export interface ValidationContext {
  formData: Record<string, any>;
  fieldName: string;
  dependencies?: string[];
  metadata?: Record<string, any>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  fieldErrors: Record<string, string[]>;
  summary: {
    totalErrors: number;
    totalWarnings: number;
    validFields: number;
    invalidFields: number;
  };
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
  path?: string[];
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface FormValidationConfig {
  validateOnChange: boolean;
  validateOnBlur: boolean;
  validateOnSubmit: boolean;
  debounceMs: number;
  showWarnings: boolean;
  stopOnFirstError: boolean;
  enableAsyncValidation: boolean;
}

// Common validation schemas
export const CommonSchemas = {
  email: z.string().email('Please enter a valid email address'),
  
  phone: z.string().regex(
    /^[\+]?[1-9][\d]{0,15}$/,
    'Please enter a valid phone number'
  ),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
  
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must not exceed 50 characters')
    .regex(/^[a-zA-Z\s\-'\.]+$/, 'Name contains invalid characters'),
  
  date: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }, 'Please enter a valid date'),
  
  url: z.string().url('Please enter a valid URL'),
  
  positiveNumber: z.number().positive('Must be a positive number'),
  
  currency: z.number()
    .positive('Amount must be positive')
    .multipleOf(0.01, 'Amount can have at most 2 decimal places'),
};

// Medical-specific validation schemas
export const MedicalSchemas = {
  patientId: z.string()
    .min(3, 'Patient ID must be at least 3 characters')
    .max(20, 'Patient ID must not exceed 20 characters')
    .regex(/^[A-Z0-9\-]+$/, 'Patient ID can only contain uppercase letters, numbers, and hyphens'),
  
  diagnosis: z.string()
    .min(3, 'Diagnosis must be at least 3 characters')
    .max(500, 'Diagnosis must not exceed 500 characters'),
  
  medication: z.string()
    .min(2, 'Medication name must be at least 2 characters')
    .max(100, 'Medication name must not exceed 100 characters'),
  
  dosage: z.string()
    .min(1, 'Dosage is required')
    .max(50, 'Dosage must not exceed 50 characters'),
  
  bloodPressure: z.string()
    .regex(/^\d{2,3}\/\d{2,3}$/, 'Blood pressure must be in format XXX/XXX'),
  
  temperature: z.number()
    .min(30, 'Temperature seems too low')
    .max(45, 'Temperature seems too high'),
  
  weight: z.number()
    .min(0.5, 'Weight must be at least 0.5 kg')
    .max(500, 'Weight must not exceed 500 kg'),
  
  height: z.number()
    .min(30, 'Height must be at least 30 cm')
    .max(250, 'Height must not exceed 250 cm'),
};

// Business validation schemas
export const BusinessSchemas = {
  appointmentTime: z.string().refine((time) => {
    const appointmentDate = new Date(time);
    const now = new Date();
    return appointmentDate > now;
  }, 'Appointment must be in the future'),
  
  invoiceAmount: z.number()
    .positive('Invoice amount must be positive')
    .max(1000000, 'Invoice amount seems too high'),
  
  taxRate: z.number()
    .min(0, 'Tax rate cannot be negative')
    .max(100, 'Tax rate cannot exceed 100%'),
  
  discountPercentage: z.number()
    .min(0, 'Discount cannot be negative')
    .max(100, 'Discount cannot exceed 100%'),
};

class AdvancedValidator {
  private customRules: Map<string, ValidationRule> = new Map();
  private config: FormValidationConfig = {
    validateOnChange: true,
    validateOnBlur: true,
    validateOnSubmit: true,
    debounceMs: 300,
    showWarnings: true,
    stopOnFirstError: false,
    enableAsyncValidation: true,
  };

  constructor() {
    this.setupDefaultRules();
  }

  /**
   * Setup default validation rules
   */
  private setupDefaultRules(): void {
    // Unique email validation
    this.addRule({
      name: 'uniqueEmail',
      validator: async (email: string) => {
        // This would check against your database
        // For demo purposes, we'll simulate an API call
        await new Promise(resolve => setTimeout(resolve, 500));
        return !['admin@example.com', 'test@example.com'].includes(email);
      },
      message: 'This email address is already registered',
      async: true,
    });

    // Strong password validation
    this.addRule({
      name: 'strongPassword',
      validator: (password: string) => {
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        const hasMinLength = password.length >= 8;
        
        return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar && hasMinLength;
      },
      message: 'Password must contain uppercase, lowercase, number, and special character',
    });

    // Appointment conflict validation
    this.addRule({
      name: 'noAppointmentConflict',
      validator: async (datetime: string, context?: ValidationContext) => {
        // This would check against existing appointments
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Simulate conflict detection
        const conflictTimes = [
          '2024-01-15T10:00:00',
          '2024-01-15T14:30:00',
          '2024-01-16T09:00:00',
        ];
        
        return !conflictTimes.includes(datetime);
      },
      message: 'This time slot is already booked',
      async: true,
    });

    // Age validation
    this.addRule({
      name: 'validAge',
      validator: (birthDate: string) => {
        const birth = new Date(birthDate);
        const today = new Date();
        const age = today.getFullYear() - birth.getFullYear();
        
        return age >= 0 && age <= 150;
      },
      message: 'Please enter a valid birth date',
    });

    // Business hours validation
    this.addRule({
      name: 'businessHours',
      validator: (datetime: string) => {
        const date = new Date(datetime);
        const hour = date.getHours();
        const day = date.getDay();
        
        // Monday to Friday, 8 AM to 6 PM
        return day >= 1 && day <= 5 && hour >= 8 && hour < 18;
      },
      message: 'Appointments are only available during business hours (Mon-Fri, 8 AM - 6 PM)',
    });
  }

  /**
   * Add custom validation rule
   */
  addRule(rule: ValidationRule): void {
    this.customRules.set(rule.name, rule);
    logger.debug(`Added validation rule: ${rule.name}`, 'validation');
  }

  /**
   * Remove validation rule
   */
  removeRule(name: string): void {
    this.customRules.delete(name);
    logger.debug(`Removed validation rule: ${name}`, 'validation');
  }

  /**
   * Validate data against schema
   */
  async validateSchema<T>(
    schema: z.ZodSchema<T>,
    data: any,
    options?: {
      abortEarly?: boolean;
      context?: Record<string, any>;
    }
  ): Promise<ValidationResult> {
    const startTime = performance.now();
    
    try {
      const result = await schema.safeParseAsync(data);
      
      if (result.success) {
        const endTime = performance.now();
        logger.debug(`Schema validation successful in ${endTime - startTime}ms`, 'validation');
        
        return {
          isValid: true,
          errors: [],
          warnings: [],
          fieldErrors: {},
          summary: {
            totalErrors: 0,
            totalWarnings: 0,
            validFields: Object.keys(data).length,
            invalidFields: 0,
          },
        };
      }

      const errors: ValidationError[] = result.error.errors.map(error => ({
        field: error.path.join('.'),
        message: error.message,
        code: error.code,
        value: error.path.reduce((obj, key) => obj?.[key], data),
        path: error.path,
      }));

      const fieldErrors: Record<string, string[]> = {};
      errors.forEach(error => {
        if (!fieldErrors[error.field]) {
          fieldErrors[error.field] = [];
        }
        fieldErrors[error.field].push(error.message);
      });

      const endTime = performance.now();
      logger.warn(`Schema validation failed in ${endTime - startTime}ms`, 'validation', {
        errorCount: errors.length,
        fields: Object.keys(fieldErrors),
      });

      return {
        isValid: false,
        errors,
        warnings: [],
        fieldErrors,
        summary: {
          totalErrors: errors.length,
          totalWarnings: 0,
          validFields: Object.keys(data).length - Object.keys(fieldErrors).length,
          invalidFields: Object.keys(fieldErrors).length,
        },
      };
    } catch (error) {
      logger.error('Schema validation error', 'validation', { error });
      throw error;
    }
  }

  /**
   * Validate single field
   */
  async validateField(
    fieldName: string,
    value: any,
    rules: string[],
    context?: ValidationContext
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    for (const ruleName of rules) {
      const rule = this.customRules.get(ruleName);
      if (!rule) {
        logger.warn(`Validation rule not found: ${ruleName}`, 'validation');
        continue;
      }

      try {
        const isValid = rule.async 
          ? await rule.validator(value, context)
          : rule.validator(value, context);

        if (!isValid) {
          const message = typeof rule.message === 'function'
            ? rule.message(value, context)
            : rule.message;

          errors.push({
            field: fieldName,
            message,
            code: ruleName,
            value,
          });

          if (this.config.stopOnFirstError) {
            break;
          }
        }
      } catch (error) {
        logger.error(`Validation rule error: ${ruleName}`, 'validation', { error });
        errors.push({
          field: fieldName,
          message: 'Validation error occurred',
          code: 'VALIDATION_ERROR',
          value,
        });
      }
    }

    const fieldErrors: Record<string, string[]> = {};
    if (errors.length > 0) {
      fieldErrors[fieldName] = errors.map(e => e.message);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fieldErrors,
      summary: {
        totalErrors: errors.length,
        totalWarnings: warnings.length,
        validFields: errors.length === 0 ? 1 : 0,
        invalidFields: errors.length > 0 ? 1 : 0,
      },
    };
  }

  /**
   * Validate form with dependencies
   */
  async validateForm(
    formData: Record<string, any>,
    fieldRules: Record<string, string[]>,
    dependencies?: Record<string, string[]>
  ): Promise<ValidationResult> {
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationWarning[] = [];
    const fieldErrors: Record<string, string[]> = {};

    // Sort fields by dependencies
    const sortedFields = this.topologicalSort(Object.keys(fieldRules), dependencies || {});

    for (const fieldName of sortedFields) {
      const rules = fieldRules[fieldName];
      if (!rules || rules.length === 0) continue;

      const context: ValidationContext = {
        formData,
        fieldName,
        dependencies: dependencies?.[fieldName],
      };

      const result = await this.validateField(fieldName, formData[fieldName], rules, context);
      
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
      
      if (result.errors.length > 0) {
        fieldErrors[fieldName] = result.errors.map(e => e.message);
      }

      if (this.config.stopOnFirstError && result.errors.length > 0) {
        break;
      }
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      fieldErrors,
      summary: {
        totalErrors: allErrors.length,
        totalWarnings: allWarnings.length,
        validFields: Object.keys(fieldRules).length - Object.keys(fieldErrors).length,
        invalidFields: Object.keys(fieldErrors).length,
      },
    };
  }

  /**
   * Topological sort for field dependencies
   */
  private topologicalSort(fields: string[], dependencies: Record<string, string[]>): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: string[] = [];

    const visit = (field: string) => {
      if (visiting.has(field)) {
        throw new Error(`Circular dependency detected involving field: ${field}`);
      }
      
      if (visited.has(field)) {
        return;
      }

      visiting.add(field);
      
      const deps = dependencies[field] || [];
      for (const dep of deps) {
        if (fields.includes(dep)) {
          visit(dep);
        }
      }
      
      visiting.delete(field);
      visited.add(field);
      result.push(field);
    };

    for (const field of fields) {
      if (!visited.has(field)) {
        visit(field);
      }
    }

    return result;
  }

  /**
   * Create debounced validator
   */
  createDebouncedValidator(
    validator: (value: any) => Promise<ValidationResult>,
    delay: number = this.config.debounceMs
  ): (value: any) => Promise<ValidationResult> {
    let timeoutId: NodeJS.Timeout;
    let lastPromise: Promise<ValidationResult>;

    return (value: any): Promise<ValidationResult> => {
      return new Promise((resolve, reject) => {
        clearTimeout(timeoutId);
        
        timeoutId = setTimeout(async () => {
          try {
            const result = await validator(value);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }, delay);
      });
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<FormValidationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.debug('Validation config updated', 'validation', newConfig);
  }

  /**
   * Get configuration
   */
  getConfig(): FormValidationConfig {
    return { ...this.config };
  }

  /**
   * Get validation statistics
   */
  getStatistics(): {
    totalRules: number;
    customRules: string[];
    config: FormValidationConfig;
  } {
    return {
      totalRules: this.customRules.size,
      customRules: Array.from(this.customRules.keys()),
      config: this.config,
    };
  }
}

// Export singleton instance
export const validator = new AdvancedValidator();

// Export convenience functions
export const validateSchema = <T>(schema: z.ZodSchema<T>, data: any) =>
  validator.validateSchema(schema, data);

export const validateField = (fieldName: string, value: any, rules: string[], context?: ValidationContext) =>
  validator.validateField(fieldName, value, rules, context);

export const validateForm = (
  formData: Record<string, any>,
  fieldRules: Record<string, string[]>,
  dependencies?: Record<string, string[]>
) => validator.validateForm(formData, fieldRules, dependencies);

// Common validation schemas export
export { CommonSchemas, MedicalSchemas, BusinessSchemas };
