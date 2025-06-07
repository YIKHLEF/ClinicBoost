/**
 * Environment Variable Validator for ClinicBoost
 * Validates all required environment variables and configurations
 */

import { z } from 'zod';
import { logger } from '../logging-monitoring';

// Environment validation schemas
const requiredEnvSchema = z.object({
  // Application
  VITE_APP_NAME: z.string().min(1, 'App name is required'),
  VITE_APP_VERSION: z.string().min(1, 'App version is required'),
  VITE_APP_ENVIRONMENT: z.enum(['development', 'staging', 'production']),
  
  // Supabase (required unless in demo mode)
  VITE_SUPABASE_URL: z.string().url().optional(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1).optional(),
});

const productionEnvSchema = z.object({
  // Security (required in production)
  ENCRYPTION_KEY: z.string().min(32, 'Encryption key must be at least 32 characters'),
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  SESSION_SECRET: z.string().min(32, 'Session secret must be at least 32 characters'),
  
  // Supabase (required in production)
  VITE_SUPABASE_URL: z.string().url('Valid Supabase URL required'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key required'),
  
  // Third-party services (optional but validated if present)
  STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),
  TWILIO_ACCOUNT_SID: z.string().startsWith('AC').optional(),
  TWILIO_AUTH_TOKEN: z.string().min(1).optional(),
  AZURE_AI_ENDPOINT: z.string().url().optional(),
  AZURE_AI_API_KEY: z.string().min(1).optional(),
});

const integrationValidationSchema = z.object({
  // Stripe validation
  VITE_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_').optional(),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
  
  // Twilio validation
  TWILIO_ACCOUNT_SID: z.string().startsWith('AC').optional(),
  TWILIO_FROM_NUMBER: z.string().regex(/^\+\d{10,15}$/).optional(),
  
  // Azure AI validation
  AZURE_AI_ENDPOINT: z.string().url().optional(),
  AZURE_AI_API_KEY: z.string().min(1).optional(),
});

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingRequired: string[];
  invalidFormat: string[];
  securityIssues: string[];
}

export class EnvironmentValidator {
  private isDemoMode: boolean;
  private isProduction: boolean;
  private environment: string;

  constructor() {
    this.isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
    this.environment = import.meta.env.VITE_APP_ENVIRONMENT || 'development';
    this.isProduction = this.environment === 'production';
  }

  /**
   * Validate all environment variables
   */
  validateEnvironment(): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      missingRequired: [],
      invalidFormat: [],
      securityIssues: [],
    };

    try {
      // Basic validation
      this.validateBasicRequirements(result);
      
      // Production-specific validation
      if (this.isProduction) {
        this.validateProductionRequirements(result);
      }
      
      // Integration validation
      this.validateIntegrations(result);
      
      // Security validation
      this.validateSecurity(result);
      
      // Demo mode warnings
      if (this.isDemoMode && this.isProduction) {
        result.securityIssues.push('Demo mode is enabled in production environment');
      }

      result.isValid = result.errors.length === 0 && result.securityIssues.length === 0;

      // Log results
      if (result.isValid) {
        logger.info('Environment validation passed', 'env-validator', {
          environment: this.environment,
          demoMode: this.isDemoMode,
          warnings: result.warnings.length,
        });
      } else {
        logger.error('Environment validation failed', 'env-validator', {
          environment: this.environment,
          errors: result.errors,
          securityIssues: result.securityIssues,
        });
      }

      return result;
    } catch (error) {
      logger.error('Environment validation error', 'env-validator', { error });
      result.errors.push(`Validation error: ${(error as Error).message}`);
      result.isValid = false;
      return result;
    }
  }

  private validateBasicRequirements(result: ValidationResult): void {
    try {
      requiredEnvSchema.parse(import.meta.env);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          result.missingRequired.push(`${err.path.join('.')}: ${err.message}`);
          result.errors.push(`Missing required: ${err.path.join('.')}`);
        });
      }
    }

    // Validate demo mode configuration
    if (this.isDemoMode) {
      result.warnings.push('Running in demo mode - some features may be limited');
    } else {
      // Check Supabase configuration when not in demo mode
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        result.errors.push('Supabase configuration required when not in demo mode');
      }
    }
  }

  private validateProductionRequirements(result: ValidationResult): void {
    try {
      productionEnvSchema.parse(process.env);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          result.missingRequired.push(`Production: ${err.path.join('.')}: ${err.message}`);
          result.errors.push(`Production missing: ${err.path.join('.')}`);
        });
      }
    }

    // Additional production checks
    if (import.meta.env.VITE_APP_URL?.includes('localhost')) {
      result.securityIssues.push('Production app URL should not use localhost');
    }

    if (!import.meta.env.REQUIRE_HTTPS_IN_PRODUCTION || 
        !import.meta.env.VITE_APP_URL?.startsWith('https://')) {
      result.securityIssues.push('HTTPS is required in production');
    }
  }

  private validateIntegrations(result: ValidationResult): void {
    try {
      integrationValidationSchema.parse(process.env);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          result.invalidFormat.push(`Integration: ${err.path.join('.')}: ${err.message}`);
          result.warnings.push(`Invalid format: ${err.path.join('.')}`);
        });
      }
    }

    // Check integration completeness
    this.validateStripeIntegration(result);
    this.validateTwilioIntegration(result);
    this.validateAzureAIIntegration(result);
  }

  private validateStripeIntegration(result: ValidationResult): void {
    const hasPublishableKey = !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    const hasSecretKey = !!process.env.STRIPE_SECRET_KEY;
    const hasWebhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET;

    if (hasPublishableKey && !hasSecretKey) {
      result.warnings.push('Stripe publishable key present but secret key missing');
    }

    if ((hasPublishableKey || hasSecretKey) && !hasWebhookSecret) {
      result.warnings.push('Stripe webhook secret missing - webhooks will not work');
    }

    // Check for test vs production keys mismatch
    if (this.isProduction) {
      if (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.includes('test')) {
        result.securityIssues.push('Using Stripe test keys in production');
      }
    }
  }

  private validateTwilioIntegration(result: ValidationResult): void {
    const hasAccountSid = !!process.env.TWILIO_ACCOUNT_SID;
    const hasAuthToken = !!process.env.TWILIO_AUTH_TOKEN;
    const hasFromNumber = !!process.env.TWILIO_FROM_NUMBER;

    if (hasAccountSid && !hasAuthToken) {
      result.warnings.push('Twilio Account SID present but Auth Token missing');
    }

    if ((hasAccountSid || hasAuthToken) && !hasFromNumber) {
      result.warnings.push('Twilio credentials present but from number missing');
    }

    // Check for test credentials in production
    if (this.isProduction && hasAccountSid) {
      if (process.env.TWILIO_ACCOUNT_SID?.includes('test')) {
        result.securityIssues.push('Using Twilio test credentials in production');
      }
    }
  }

  private validateAzureAIIntegration(result: ValidationResult): void {
    const hasEndpoint = !!process.env.AZURE_AI_ENDPOINT;
    const hasApiKey = !!process.env.AZURE_AI_API_KEY;

    if (hasEndpoint && !hasApiKey) {
      result.warnings.push('Azure AI endpoint present but API key missing');
    }

    if (hasApiKey && !hasEndpoint) {
      result.warnings.push('Azure AI API key present but endpoint missing');
    }
  }

  private validateSecurity(result: ValidationResult): void {
    // Check for default/weak values
    const defaultValues = [
      'your-stripe-publishable-key',
      'your-twilio-account-sid',
      'your_azure_ai_api_key',
      'demo-anon-key',
      'your-32-character-encryption-key-here',
    ];

    Object.entries(process.env).forEach(([key, value]) => {
      if (value && defaultValues.some(defaultVal => value.includes(defaultVal))) {
        result.securityIssues.push(`Default value detected for ${key}`);
      }
    });

    // Check security feature flags
    const securityFeatures = [
      'VITE_ENABLE_RATE_LIMITING',
      'VITE_ENABLE_INPUT_VALIDATION',
      'VITE_ENABLE_CSRF_PROTECTION',
      'VITE_ENABLE_SECURITY_HEADERS',
    ];

    securityFeatures.forEach(feature => {
      if (import.meta.env[feature] !== 'true') {
        if (this.isProduction) {
          result.securityIssues.push(`Security feature ${feature} is disabled in production`);
        } else {
          result.warnings.push(`Security feature ${feature} is disabled`);
        }
      }
    });
  }

  /**
   * Get environment summary
   */
  getEnvironmentSummary(): {
    environment: string;
    demoMode: boolean;
    integrations: {
      supabase: boolean;
      stripe: boolean;
      twilio: boolean;
      azureAI: boolean;
    };
    securityFeatures: {
      rateLimiting: boolean;
      inputValidation: boolean;
      csrfProtection: boolean;
      securityHeaders: boolean;
    };
  } {
    return {
      environment: this.environment,
      demoMode: this.isDemoMode,
      integrations: {
        supabase: !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY),
        stripe: !!(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY && process.env.STRIPE_SECRET_KEY),
        twilio: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
        azureAI: !!(process.env.AZURE_AI_ENDPOINT && process.env.AZURE_AI_API_KEY),
      },
      securityFeatures: {
        rateLimiting: import.meta.env.VITE_ENABLE_RATE_LIMITING === 'true',
        inputValidation: import.meta.env.VITE_ENABLE_INPUT_VALIDATION === 'true',
        csrfProtection: import.meta.env.VITE_ENABLE_CSRF_PROTECTION === 'true',
        securityHeaders: import.meta.env.VITE_ENABLE_SECURITY_HEADERS === 'true',
      },
    };
  }
}

// Export singleton instance
export const environmentValidator = new EnvironmentValidator();

// Export validation function
export const validateEnvironment = () => environmentValidator.validateEnvironment();
export const getEnvironmentSummary = () => environmentValidator.getEnvironmentSummary();
