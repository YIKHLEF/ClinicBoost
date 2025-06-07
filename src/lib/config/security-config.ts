/**
 * Security Configuration for ClinicBoost
 * Centralized security settings and feature toggles
 */

import { secureConfig } from './secure-config';
import { logger } from '../logging-monitoring';
import { environmentValidator } from './environment-validator';

export interface SecurityConfig {
  // Rate Limiting
  rateLimiting: {
    enabled: boolean;
    distributed: boolean;
    redisUrl?: string;
    presets: {
      api: { windowMs: number; maxRequests: number };
      login: { windowMs: number; maxRequests: number };
      webhook: { windowMs: number; maxRequests: number };
      upload: { windowMs: number; maxRequests: number };
    };
  };

  // Input Validation
  inputValidation: {
    enabled: boolean;
    strictMode: boolean;
    sanitizeHtml: boolean;
    maxPayloadSize: number;
    allowedFileTypes: string[];
    maxFileSize: number;
  };

  // CSRF Protection
  csrfProtection: {
    enabled: boolean;
    tokenExpiry: number;
    cookieOptions: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: 'strict' | 'lax' | 'none';
    };
  };

  // Security Headers
  securityHeaders: {
    enabled: boolean;
    contentSecurityPolicy: string;
    strictTransportSecurity: string;
    xFrameOptions: string;
    xContentTypeOptions: string;
    referrerPolicy: string;
  };

  // Authentication & Authorization
  authentication: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
    requireTwoFactor: boolean;
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
      preventReuse: number;
    };
  };

  // Encryption
  encryption: {
    algorithm: string;
    keyRotationInterval: number;
    encryptSensitiveData: boolean;
  };

  // Monitoring & Alerting
  monitoring: {
    logSecurityEvents: boolean;
    alertOnSuspiciousActivity: boolean;
    alertThresholds: {
      failedLogins: number;
      rateLimitExceeded: number;
      suspiciousPatterns: number;
    };
  };

  // Production Security
  production: {
    requireHttps: boolean;
    disableDebugMode: boolean;
    hideServerInfo: boolean;
    enableSecurityAuditing: boolean;
  };
}

class SecurityConfigManager {
  private config: SecurityConfig;
  private environment: string;
  private isProduction: boolean;

  constructor() {
    this.environment = import.meta.env.VITE_APP_ENVIRONMENT || 'development';
    this.isProduction = this.environment === 'production';
    this.config = this.initializeConfig();
    this.validateConfiguration();
  }

  private initializeConfig(): SecurityConfig {
    const baseConfig: SecurityConfig = {
      rateLimiting: {
        enabled: this.getEnvBoolean('VITE_ENABLE_RATE_LIMITING', true),
        distributed: this.isProduction,
        redisUrl: process.env.REDIS_URL,
        presets: {
          api: { windowMs: 60000, maxRequests: this.isProduction ? 60 : 1000 },
          login: { windowMs: 900000, maxRequests: this.isProduction ? 5 : 20 },
          webhook: { windowMs: 60000, maxRequests: 1000 },
          upload: { windowMs: 60000, maxRequests: this.isProduction ? 10 : 50 },
        },
      },

      inputValidation: {
        enabled: this.getEnvBoolean('VITE_ENABLE_INPUT_VALIDATION', true),
        strictMode: this.getEnvBoolean('ENABLE_STRICT_MODE', this.isProduction),
        sanitizeHtml: true,
        maxPayloadSize: 10 * 1024 * 1024, // 10MB
        allowedFileTypes: [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp',
          'application/pdf', 'text/plain', 'text/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ],
        maxFileSize: 5 * 1024 * 1024, // 5MB
      },

      csrfProtection: {
        enabled: this.getEnvBoolean('VITE_ENABLE_CSRF_PROTECTION', true),
        tokenExpiry: 3600000, // 1 hour
        cookieOptions: {
          httpOnly: true,
          secure: this.isProduction,
          sameSite: this.isProduction ? 'strict' : 'lax',
        },
      },

      securityHeaders: {
        enabled: this.getEnvBoolean('VITE_ENABLE_SECURITY_HEADERS', true),
        contentSecurityPolicy: this.buildCSP(),
        strictTransportSecurity: 'max-age=31536000; includeSubDomains',
        xFrameOptions: 'DENY',
        xContentTypeOptions: 'nosniff',
        referrerPolicy: 'strict-origin-when-cross-origin',
      },

      authentication: {
        sessionTimeout: 8 * 60 * 60 * 1000, // 8 hours
        maxLoginAttempts: this.isProduction ? 5 : 10,
        lockoutDuration: this.isProduction ? 30 * 60 * 1000 : 5 * 60 * 1000, // 30 min prod, 5 min dev
        requireTwoFactor: this.getEnvBoolean('REQUIRE_TWO_FACTOR', false),
        passwordPolicy: {
          minLength: this.isProduction ? 12 : 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: this.isProduction,
          preventReuse: this.isProduction ? 5 : 3,
        },
      },

      encryption: {
        algorithm: 'aes-256-gcm',
        keyRotationInterval: 90 * 24 * 60 * 60 * 1000, // 90 days
        encryptSensitiveData: true,
      },

      monitoring: {
        logSecurityEvents: true,
        alertOnSuspiciousActivity: this.isProduction,
        alertThresholds: {
          failedLogins: this.isProduction ? 10 : 50,
          rateLimitExceeded: this.isProduction ? 5 : 20,
          suspiciousPatterns: this.isProduction ? 3 : 10,
        },
      },

      production: {
        requireHttps: this.getEnvBoolean('REQUIRE_HTTPS_IN_PRODUCTION', this.isProduction),
        disableDebugMode: this.isProduction,
        hideServerInfo: this.isProduction,
        enableSecurityAuditing: this.isProduction,
      },
    };

    return baseConfig;
  }

  private buildCSP(): string {
    const baseCSP = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://maps.googleapis.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://api.stripe.com https://*.supabase.co wss://*.supabase.co",
      "frame-src https://js.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ];

    if (!this.isProduction) {
      // Allow development tools
      baseCSP.push("script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:*");
      baseCSP.push("connect-src 'self' http://localhost:* ws://localhost:* wss://localhost:*");
    }

    return baseCSP.join('; ');
  }

  private validateConfiguration(): void {
    const validation = environmentValidator.validateEnvironment();
    
    if (!validation.isValid) {
      logger.error('Security configuration validation failed', 'security-config', {
        errors: validation.errors,
        securityIssues: validation.securityIssues,
      });

      // Disable certain features if validation fails
      if (validation.securityIssues.length > 0) {
        this.config.production.requireHttps = false;
        logger.warn('HTTPS requirement disabled due to configuration issues', 'security-config');
      }
    }

    // Production-specific validations
    if (this.isProduction) {
      this.validateProductionSecurity();
    }

    logger.info('Security configuration initialized', 'security-config', {
      environment: this.environment,
      rateLimiting: this.config.rateLimiting.enabled,
      inputValidation: this.config.inputValidation.enabled,
      csrfProtection: this.config.csrfProtection.enabled,
      securityHeaders: this.config.securityHeaders.enabled,
    });
  }

  private validateProductionSecurity(): void {
    const issues: string[] = [];

    // Check for secure configurations
    if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length < 32) {
      issues.push('Encryption key is missing or too short for production');
    }

    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      issues.push('JWT secret is missing or too short for production');
    }

    if (!this.config.production.requireHttps) {
      issues.push('HTTPS is not required in production');
    }

    if (!this.config.rateLimiting.enabled) {
      issues.push('Rate limiting is disabled in production');
    }

    if (!this.config.csrfProtection.enabled) {
      issues.push('CSRF protection is disabled in production');
    }

    if (issues.length > 0) {
      logger.error('Production security issues detected', 'security-config', { issues });
      throw new Error(`Production security validation failed: ${issues.join(', ')}`);
    }
  }

  private getEnvBoolean(key: string, defaultValue: boolean): boolean {
    const value = import.meta.env[key] || process.env[key];
    if (value === undefined) return defaultValue;
    return value === 'true' || value === '1';
  }

  /**
   * Get the complete security configuration
   */
  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Get rate limiting configuration
   */
  getRateLimitConfig() {
    return this.config.rateLimiting;
  }

  /**
   * Get input validation configuration
   */
  getInputValidationConfig() {
    return this.config.inputValidation;
  }

  /**
   * Get CSRF protection configuration
   */
  getCSRFConfig() {
    return this.config.csrfProtection;
  }

  /**
   * Get security headers configuration
   */
  getSecurityHeadersConfig() {
    return this.config.securityHeaders;
  }

  /**
   * Get authentication configuration
   */
  getAuthConfig() {
    return this.config.authentication;
  }

  /**
   * Check if a security feature is enabled
   */
  isFeatureEnabled(feature: keyof SecurityConfig): boolean {
    const featureConfig = this.config[feature];
    return typeof featureConfig === 'object' && 'enabled' in featureConfig 
      ? featureConfig.enabled 
      : false;
  }

  /**
   * Update configuration at runtime (for testing)
   */
  updateConfig(updates: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info('Security configuration updated', 'security-config', { updates });
  }

  /**
   * Get security summary for monitoring
   */
  getSecuritySummary() {
    return {
      environment: this.environment,
      isProduction: this.isProduction,
      enabledFeatures: {
        rateLimiting: this.config.rateLimiting.enabled,
        inputValidation: this.config.inputValidation.enabled,
        csrfProtection: this.config.csrfProtection.enabled,
        securityHeaders: this.config.securityHeaders.enabled,
        twoFactor: this.config.authentication.requireTwoFactor,
        encryption: this.config.encryption.encryptSensitiveData,
      },
      securityLevel: this.calculateSecurityLevel(),
    };
  }

  private calculateSecurityLevel(): 'low' | 'medium' | 'high' {
    const enabledFeatures = [
      this.config.rateLimiting.enabled,
      this.config.inputValidation.enabled,
      this.config.csrfProtection.enabled,
      this.config.securityHeaders.enabled,
      this.config.authentication.requireTwoFactor,
      this.config.encryption.encryptSensitiveData,
    ].filter(Boolean).length;

    if (enabledFeatures >= 5) return 'high';
    if (enabledFeatures >= 3) return 'medium';
    return 'low';
  }
}

// Export singleton instance
export const securityConfig = new SecurityConfigManager();

// Export convenience functions
export const getSecurityConfig = () => securityConfig.getConfig();
export const isSecurityFeatureEnabled = (feature: keyof SecurityConfig) => 
  securityConfig.isFeatureEnabled(feature);
export const getSecuritySummary = () => securityConfig.getSecuritySummary();
