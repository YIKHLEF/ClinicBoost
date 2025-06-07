/**
 * Security Initialization for ClinicBoost
 * Initializes all security features and validates configuration on startup
 */

import { environmentValidator, validateEnvironment } from '../config/environment-validator';
import { securityConfig, getSecuritySummary } from '../config/security-config';
import { securityMiddleware } from '../middleware/security-middleware';
import { createDistributedRateLimiter, DistributedRateLimitPresets } from '../middleware/distributed-rate-limiter';
import { azureAIService } from '../integrations/azure-ai';
import { logger } from '../logging-monitoring';
import { handleError } from '../error-handling';

export interface SecurityInitializationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  features: {
    environmentValidation: boolean;
    rateLimiting: boolean;
    inputValidation: boolean;
    csrfProtection: boolean;
    securityHeaders: boolean;
    azureAI: boolean;
    distributedRateLimit: boolean;
  };
  summary: any;
}

class SecurityInitializer {
  private initializationResult: SecurityInitializationResult;

  constructor() {
    this.initializationResult = {
      success: false,
      errors: [],
      warnings: [],
      features: {
        environmentValidation: false,
        rateLimiting: false,
        inputValidation: false,
        csrfProtection: false,
        securityHeaders: false,
        azureAI: false,
        distributedRateLimit: false,
      },
      summary: null,
    };
  }

  /**
   * Initialize all security features
   */
  async initialize(): Promise<SecurityInitializationResult> {
    logger.info('Starting security initialization', 'security-init');

    try {
      // Step 1: Validate environment
      await this.validateEnvironment();

      // Step 2: Initialize security middleware
      await this.initializeSecurityMiddleware();

      // Step 3: Initialize rate limiting
      await this.initializeRateLimiting();

      // Step 4: Initialize third-party integrations
      await this.initializeIntegrations();

      // Step 5: Validate all features
      await this.validateFeatures();

      // Step 6: Generate summary
      this.generateSummary();

      this.initializationResult.success = this.initializationResult.errors.length === 0;

      if (this.initializationResult.success) {
        logger.info('Security initialization completed successfully', 'security-init', {
          features: this.initializationResult.features,
          warnings: this.initializationResult.warnings.length,
        });
      } else {
        logger.error('Security initialization failed', 'security-init', {
          errors: this.initializationResult.errors,
          warnings: this.initializationResult.warnings,
        });
      }

      return this.initializationResult;
    } catch (error) {
      logger.error('Security initialization error', 'security-init', { error });
      this.initializationResult.errors.push(`Initialization error: ${(error as Error).message}`);
      this.initializationResult.success = false;
      return this.initializationResult;
    }
  }

  private async validateEnvironment(): Promise<void> {
    try {
      logger.info('Validating environment configuration', 'security-init');
      
      const validation = validateEnvironment();
      
      if (validation.isValid) {
        this.initializationResult.features.environmentValidation = true;
        logger.info('Environment validation passed', 'security-init');
      } else {
        this.initializationResult.errors.push(...validation.errors);
        this.initializationResult.errors.push(...validation.securityIssues);
        logger.error('Environment validation failed', 'security-init', {
          errors: validation.errors,
          securityIssues: validation.securityIssues,
        });
      }

      // Add warnings
      this.initializationResult.warnings.push(...validation.warnings);

      // Log environment summary
      const envSummary = environmentValidator.getEnvironmentSummary();
      logger.info('Environment summary', 'security-init', envSummary);

    } catch (error) {
      this.initializationResult.errors.push(`Environment validation error: ${(error as Error).message}`);
      logger.error('Environment validation error', 'security-init', { error });
    }
  }

  private async initializeSecurityMiddleware(): Promise<void> {
    try {
      logger.info('Initializing security middleware', 'security-init');

      const config = securityConfig.getConfig();

      // Initialize CSRF protection
      if (config.csrfProtection.enabled) {
        // CSRF tokens are generated on-demand
        this.initializationResult.features.csrfProtection = true;
        logger.info('CSRF protection enabled', 'security-init');
      }

      // Initialize input validation
      if (config.inputValidation.enabled) {
        this.initializationResult.features.inputValidation = true;
        logger.info('Input validation enabled', 'security-init', {
          strictMode: config.inputValidation.strictMode,
          maxPayloadSize: config.inputValidation.maxPayloadSize,
        });
      }

      // Initialize security headers
      if (config.securityHeaders.enabled) {
        this.initializationResult.features.securityHeaders = true;
        logger.info('Security headers enabled', 'security-init');
      }

    } catch (error) {
      this.initializationResult.errors.push(`Security middleware initialization error: ${(error as Error).message}`);
      logger.error('Security middleware initialization error', 'security-init', { error });
    }
  }

  private async initializeRateLimiting(): Promise<void> {
    try {
      logger.info('Initializing rate limiting', 'security-init');

      const config = securityConfig.getRateLimitConfig();

      if (config.enabled) {
        // Initialize basic rate limiting
        this.initializationResult.features.rateLimiting = true;

        // Initialize distributed rate limiting if enabled
        if (config.distributed) {
          try {
            // Try to initialize Redis-based distributed rate limiting
            let redisClient = null;
            
            if (config.redisUrl) {
              // In a real implementation, you would initialize Redis client here
              // redisClient = new Redis(config.redisUrl);
              logger.info('Redis URL configured for distributed rate limiting', 'security-init');
            }

            const distributedLimiter = createDistributedRateLimiter('moderate', {}, redisClient);
            this.initializationResult.features.distributedRateLimit = true;
            
            logger.info('Distributed rate limiting initialized', 'security-init', {
              backend: redisClient ? 'redis' : 'memory',
              presets: Object.keys(DistributedRateLimitPresets),
            });
          } catch (error) {
            this.initializationResult.warnings.push('Distributed rate limiting failed, falling back to local rate limiting');
            logger.warn('Distributed rate limiting initialization failed', 'security-init', { error });
          }
        }

        logger.info('Rate limiting enabled', 'security-init', {
          distributed: config.distributed,
          presets: config.presets,
        });
      } else {
        this.initializationResult.warnings.push('Rate limiting is disabled');
        logger.warn('Rate limiting is disabled', 'security-init');
      }

    } catch (error) {
      this.initializationResult.errors.push(`Rate limiting initialization error: ${(error as Error).message}`);
      logger.error('Rate limiting initialization error', 'security-init', { error });
    }
  }

  private async initializeIntegrations(): Promise<void> {
    try {
      logger.info('Initializing third-party integrations', 'security-init');

      // Initialize Azure AI
      try {
        const azureInitialized = azureAIService.isInitialized();
        if (azureInitialized) {
          this.initializationResult.features.azureAI = true;
          logger.info('Azure AI integration initialized', 'security-init');
        } else {
          this.initializationResult.warnings.push('Azure AI integration not configured');
          logger.warn('Azure AI integration not configured', 'security-init');
        }
      } catch (error) {
        this.initializationResult.warnings.push(`Azure AI initialization warning: ${(error as Error).message}`);
        logger.warn('Azure AI initialization warning', 'security-init', { error });
      }

      // Validate Stripe configuration
      const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      
      if (stripePublishableKey && stripeSecretKey) {
        logger.info('Stripe integration configured', 'security-init');
      } else {
        this.initializationResult.warnings.push('Stripe integration not fully configured');
        logger.warn('Stripe integration not fully configured', 'security-init');
      }

      // Validate Twilio configuration
      const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
      
      if (twilioAccountSid && twilioAuthToken) {
        logger.info('Twilio integration configured', 'security-init');
      } else {
        this.initializationResult.warnings.push('Twilio integration not fully configured');
        logger.warn('Twilio integration not fully configured', 'security-init');
      }

    } catch (error) {
      this.initializationResult.errors.push(`Integration initialization error: ${(error as Error).message}`);
      logger.error('Integration initialization error', 'security-init', { error });
    }
  }

  private async validateFeatures(): Promise<void> {
    try {
      logger.info('Validating initialized features', 'security-init');

      const config = securityConfig.getConfig();
      const isProduction = import.meta.env.VITE_APP_ENVIRONMENT === 'production';

      // Production-specific validations
      if (isProduction) {
        const requiredFeatures = [
          'environmentValidation',
          'rateLimiting',
          'inputValidation',
          'csrfProtection',
          'securityHeaders',
        ];

        const missingFeatures = requiredFeatures.filter(
          feature => !this.initializationResult.features[feature as keyof typeof this.initializationResult.features]
        );

        if (missingFeatures.length > 0) {
          this.initializationResult.errors.push(
            `Required security features missing in production: ${missingFeatures.join(', ')}`
          );
        }

        // Check HTTPS requirement
        if (config.production.requireHttps && !import.meta.env.VITE_APP_URL?.startsWith('https://')) {
          this.initializationResult.errors.push('HTTPS is required in production but not configured');
        }
      }

      // Feature dependency checks
      if (this.initializationResult.features.distributedRateLimit && !this.initializationResult.features.rateLimiting) {
        this.initializationResult.warnings.push('Distributed rate limiting enabled but basic rate limiting is disabled');
      }

    } catch (error) {
      this.initializationResult.errors.push(`Feature validation error: ${(error as Error).message}`);
      logger.error('Feature validation error', 'security-init', { error });
    }
  }

  private generateSummary(): void {
    try {
      this.initializationResult.summary = {
        ...getSecuritySummary(),
        initialization: {
          timestamp: new Date().toISOString(),
          success: this.initializationResult.success,
          featuresEnabled: Object.values(this.initializationResult.features).filter(Boolean).length,
          totalFeatures: Object.keys(this.initializationResult.features).length,
          errorCount: this.initializationResult.errors.length,
          warningCount: this.initializationResult.warnings.length,
        },
      };

      logger.info('Security initialization summary generated', 'security-init', this.initializationResult.summary);
    } catch (error) {
      logger.error('Summary generation error', 'security-init', { error });
    }
  }

  /**
   * Get current initialization status
   */
  getStatus(): SecurityInitializationResult {
    return { ...this.initializationResult };
  }

  /**
   * Re-initialize security features
   */
  async reinitialize(): Promise<SecurityInitializationResult> {
    logger.info('Re-initializing security features', 'security-init');
    
    // Reset state
    this.initializationResult = {
      success: false,
      errors: [],
      warnings: [],
      features: {
        environmentValidation: false,
        rateLimiting: false,
        inputValidation: false,
        csrfProtection: false,
        securityHeaders: false,
        azureAI: false,
        distributedRateLimit: false,
      },
      summary: null,
    };

    return await this.initialize();
  }
}

// Export singleton instance
export const securityInitializer = new SecurityInitializer();

// Export initialization function
export const initializeSecurity = () => securityInitializer.initialize();
export const getSecurityStatus = () => securityInitializer.getStatus();
export const reinitializeSecurity = () => securityInitializer.reinitialize();
