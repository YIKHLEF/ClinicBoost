/**
 * Secure Configuration Management
 * 
 * This module provides secure handling of environment variables and API keys.
 * It ensures that sensitive data is never exposed to the frontend and implements
 * proper validation and encryption for configuration values.
 */

import CryptoJS from 'crypto-js';

// Environment types
export type Environment = 'development' | 'staging' | 'production';

// Configuration interface
export interface AppConfig {
  environment: Environment;
  app: {
    name: string;
    version: string;
    url: string;
    supportEmail: string;
  };
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey?: string; // Only available on server-side
  };
  security: {
    encryptionKey: string;
    jwtSecret: string;
    sessionTimeout: number;
    maxLoginAttempts: number;
    passwordMinLength: number;
    enableTwoFactor: boolean;
  };
  integrations: {
    stripe: {
      publishableKey: string;
      webhookSecret?: string; // Server-side only
    };
    twilio: {
      accountSid?: string; // Server-side only
      authToken?: string; // Server-side only
      fromNumber?: string; // Server-side only
    };
    azure: {
      endpoint?: string; // Server-side only
      apiKey?: string; // Server-side only
    };
  };
  features: {
    enablePayments: boolean;
    enableSMS: boolean;
    enableEmailNotifications: boolean;
    enableInsuranceClaims: boolean;
    enableAnalytics: boolean;
  };
}

// Sensitive keys that should never be exposed to frontend
const SENSITIVE_KEYS = [
  'supabase.serviceRoleKey',
  'security.jwtSecret',
  'integrations.stripe.webhookSecret',
  'integrations.twilio.accountSid',
  'integrations.twilio.authToken',
  'integrations.twilio.fromNumber',
  'integrations.azure.endpoint',
  'integrations.azure.apiKey',
];

// Required environment variables
const REQUIRED_ENV_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_APP_NAME',
  'VITE_APP_VERSION',
];

class SecureConfigManager {
  private config: AppConfig;
  private isClient: boolean;
  private encryptionKey: string;

  constructor() {
    this.isClient = typeof window !== 'undefined';
    this.encryptionKey = this.generateEncryptionKey();
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  /**
   * Load configuration from environment variables
   */
  private loadConfiguration(): AppConfig {
    // Validate required environment variables
    this.validateRequiredEnvVars();

    const config: AppConfig = {
      environment: this.getEnvironment(),
      app: {
        name: this.getEnvVar('VITE_APP_NAME', 'ClinicBoost'),
        version: this.getEnvVar('VITE_APP_VERSION', '1.0.0'),
        url: this.getEnvVar('VITE_APP_URL', 'http://localhost:5173'),
        supportEmail: this.getEnvVar('VITE_SUPPORT_EMAIL', 'support@clinicboost.com'),
      },
      supabase: {
        url: this.getEnvVar('VITE_SUPABASE_URL', 'https://demo.supabase.co'),
        anonKey: this.getEnvVar('VITE_SUPABASE_ANON_KEY', 'demo-anon-key'),
        ...(this.isServerSide() && {
          serviceRoleKey: this.getEnvVar('SUPABASE_SERVICE_ROLE_KEY', 'demo-service-key'),
        }),
      },
      security: {
        encryptionKey: this.encryptionKey,
        jwtSecret: this.getEnvVar('JWT_SECRET', this.generateSecureSecret()),
        sessionTimeout: parseInt(this.getEnvVar('SESSION_TIMEOUT', '480')), // 8 hours
        maxLoginAttempts: parseInt(this.getEnvVar('MAX_LOGIN_ATTEMPTS', '5')),
        passwordMinLength: parseInt(this.getEnvVar('PASSWORD_MIN_LENGTH', '8')),
        enableTwoFactor: this.getEnvVar('ENABLE_TWO_FACTOR', 'false') === 'true',
      },
      integrations: {
        stripe: {
          publishableKey: this.getEnvVar('VITE_STRIPE_PUBLISHABLE_KEY', ''),
          ...(this.isServerSide() && {
            webhookSecret: this.getEnvVar('STRIPE_WEBHOOK_SECRET'),
          }),
        },
        twilio: this.isServerSide() ? {
          accountSid: this.getEnvVar('TWILIO_ACCOUNT_SID'),
          authToken: this.getEnvVar('TWILIO_AUTH_TOKEN'),
          fromNumber: this.getEnvVar('TWILIO_FROM_NUMBER'),
        } : {},
        azure: this.isServerSide() ? {
          endpoint: this.getEnvVar('AZURE_AI_ENDPOINT'),
          apiKey: this.getEnvVar('AZURE_AI_API_KEY'),
        } : {},
      },
      features: {
        enablePayments: this.getEnvVar('VITE_ENABLE_PAYMENTS', 'true') === 'true',
        enableSMS: this.getEnvVar('VITE_ENABLE_SMS', 'true') === 'true',
        enableEmailNotifications: this.getEnvVar('VITE_ENABLE_EMAIL', 'true') === 'true',
        enableInsuranceClaims: this.getEnvVar('VITE_ENABLE_INSURANCE', 'false') === 'true',
        enableAnalytics: this.getEnvVar('VITE_ENABLE_ANALYTICS', 'true') === 'true',
      },
    };

    // Remove sensitive data on client-side
    if (this.isClient) {
      this.sanitizeClientConfig(config);
    }

    return config;
  }

  /**
   * Get environment variable with fallback
   */
  private getEnvVar(key: string, fallback?: string): string {
    // Try Vite environment variables first (available in browser)
    let value = import.meta.env[key];

    // Try process.env only if we're in a Node.js environment
    if (!value && typeof window === 'undefined' && typeof process !== 'undefined' && process.env) {
      value = process.env[key];
    }

    if (!value && !fallback) {
      // In browser environment, don't throw for missing env vars, just warn
      if (typeof window !== 'undefined') {
        console.warn(`Environment variable ${key} is not set, using fallback`);
        return fallback || '';
      }
      throw new Error(`Required environment variable ${key} is not set`);
    }

    return value || fallback || '';
  }

  /**
   * Determine current environment
   */
  private getEnvironment(): Environment {
    const env = this.getEnvVar('NODE_ENV', 'development');
    const mode = this.getEnvVar('VITE_MODE', 'development');
    
    if (env === 'production' || mode === 'production') return 'production';
    if (env === 'staging' || mode === 'staging') return 'staging';
    return 'development';
  }

  /**
   * Check if running on server-side
   */
  private isServerSide(): boolean {
    return !this.isClient;
  }

  /**
   * Validate required environment variables
   */
  private validateRequiredEnvVars(): void {
    const missing = REQUIRED_ENV_VARS.filter(key => !this.getEnvVar(key, ''));

    if (missing.length > 0) {
      // In browser environment, just warn about missing env vars
      if (typeof window !== 'undefined') {
        console.warn(`Missing environment variables (using defaults): ${missing.join(', ')}`);
        return;
      }
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  /**
   * Validate configuration
   */
  private validateConfiguration(): void {
    // Check if we're in demo mode
    const isDemoMode = this.getEnvVar('VITE_DEMO_MODE', 'false') === 'true';

    // Skip Supabase validation in demo mode or for demo URLs
    if (!isDemoMode && this.config.supabase.url !== 'https://demo.supabase.co') {
      // Validate Supabase URL format only if not in demo mode and not a demo URL
      if (this.config.supabase.url && !this.config.supabase.url.startsWith('https://')) {
        throw new Error('Supabase URL must use HTTPS');
      }
    }

    // Validate app URL in production
    if (this.config.environment === 'production' && this.config.app.url.includes('localhost')) {
      console.warn('Production environment detected but app URL contains localhost');
    }

    // Validate security settings
    if (this.config.security.passwordMinLength < 8) {
      throw new Error('Password minimum length must be at least 8 characters');
    }

    if (this.config.security.maxLoginAttempts < 3) {
      throw new Error('Maximum login attempts must be at least 3');
    }
  }

  /**
   * Remove sensitive data for client-side
   */
  private sanitizeClientConfig(config: AppConfig): void {
    SENSITIVE_KEYS.forEach(keyPath => {
      const keys = keyPath.split('.');
      let obj: any = config;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (obj[keys[i]]) {
          obj = obj[keys[i]];
        } else {
          return; // Path doesn't exist
        }
      }
      
      const finalKey = keys[keys.length - 1];
      if (obj && obj[finalKey]) {
        delete obj[finalKey];
      }
    });
  }

  /**
   * Generate encryption key
   */
  private generateEncryptionKey(): string {
    const key = this.getEnvVar('ENCRYPTION_KEY', '');
    if (key) return key;

    // Generate a secure key for development or browser environment
    if (this.getEnvironment() === 'development' || typeof window !== 'undefined') {
      return CryptoJS.lib.WordArray.random(256/8).toString();
    }

    throw new Error('ENCRYPTION_KEY environment variable is required in production');
  }

  /**
   * Generate secure secret
   */
  private generateSecureSecret(): string {
    return CryptoJS.lib.WordArray.random(512/8).toString();
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(data: string): string {
    return CryptoJS.AES.encrypt(data, this.encryptionKey).toString();
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Get configuration
   */
  getConfig(): AppConfig {
    return { ...this.config };
  }

  /**
   * Get specific configuration section
   */
  getAppConfig() {
    return this.config.app;
  }

  getSupabaseConfig() {
    return this.config.supabase;
  }

  getSecurityConfig() {
    return this.config.security;
  }

  getIntegrationsConfig() {
    return this.config.integrations;
  }

  getFeaturesConfig() {
    return this.config.features;
  }

  /**
   * Check if feature is enabled
   */
  isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    return this.config.features[feature];
  }

  /**
   * Get environment
   */
  getEnvironmentType(): Environment {
    return this.config.environment;
  }

  /**
   * Check if in development mode
   */
  isDevelopment(): boolean {
    return this.config.environment === 'development';
  }

  /**
   * Check if in production mode
   */
  isProduction(): boolean {
    return this.config.environment === 'production';
  }

  /**
   * Validate API key format
   */
  validateApiKey(key: string, service: string): boolean {
    if (!key) return false;

    switch (service) {
      case 'stripe':
        return key.startsWith('pk_') || key.startsWith('sk_');
      case 'supabase':
        return key.length > 50; // Supabase keys are typically long
      case 'twilio':
        return key.startsWith('AC') || key.startsWith('SK');
      default:
        return key.length > 10; // Basic length check
    }
  }

  /**
   * Mask sensitive values for logging
   */
  maskSensitiveValue(value: string): string {
    if (!value || value.length < 8) return '***';
    return value.substring(0, 4) + '*'.repeat(value.length - 8) + value.substring(value.length - 4);
  }

  /**
   * Get safe config for logging
   */
  getSafeConfigForLogging(): any {
    const safeConfig = JSON.parse(JSON.stringify(this.config));
    
    // Mask sensitive values
    if (safeConfig.supabase.anonKey) {
      safeConfig.supabase.anonKey = this.maskSensitiveValue(safeConfig.supabase.anonKey);
    }
    
    if (safeConfig.integrations.stripe.publishableKey) {
      safeConfig.integrations.stripe.publishableKey = this.maskSensitiveValue(safeConfig.integrations.stripe.publishableKey);
    }

    safeConfig.security.encryptionKey = '***';
    safeConfig.security.jwtSecret = '***';

    return safeConfig;
  }
}

// Export singleton instance
export const secureConfig = new SecureConfigManager();

// Export configuration getters
export const getAppConfig = () => secureConfig.getAppConfig();
export const getSupabaseConfig = () => secureConfig.getSupabaseConfig();
export const getSecurityConfig = () => secureConfig.getSecurityConfig();
export const getIntegrationsConfig = () => secureConfig.getIntegrationsConfig();
export const getFeaturesConfig = () => secureConfig.getFeaturesConfig();
export const isFeatureEnabled = (feature: keyof AppConfig['features']) => secureConfig.isFeatureEnabled(feature);
export const isDevelopment = () => secureConfig.isDevelopment();
export const isProduction = () => secureConfig.isProduction();
