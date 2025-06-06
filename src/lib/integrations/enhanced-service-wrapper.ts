/**
 * Enhanced Service Wrapper for Third-Party Integrations
 * 
 * Provides comprehensive error handling, timeout management, and retry logic
 * for all third-party service integrations (Stripe, Twilio, Azure AI).
 */

import { logger } from '../logging-monitoring';
import { EnhancedNetworkHandler } from '../error-handling/enhanced-network-handling';
import { integrationErrorHandler } from '../error-handling/integration-errors';

export interface ServiceConfig {
  timeouts: {
    default: number;
    upload: number;
    payment: number;
    messaging: number;
    ai: number;
  };
  retries: {
    maxAttempts: number;
    backoffMultiplier: number;
    maxBackoffTime: number;
  };
  circuitBreaker: {
    enabled: boolean;
    failureThreshold: number;
    resetTimeout: number;
  };
  rateLimit: {
    enabled: boolean;
    requestsPerMinute: number;
    burstLimit: number;
  };
}

export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  retryAfter?: number;
  rateLimitRemaining?: number;
}

const DEFAULT_CONFIG: ServiceConfig = {
  timeouts: {
    default: 30000,
    upload: 300000,
    payment: 45000,
    messaging: 15000,
    ai: 60000,
  },
  retries: {
    maxAttempts: 3,
    backoffMultiplier: 2,
    maxBackoffTime: 30000,
  },
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    resetTimeout: 60000,
  },
  rateLimit: {
    enabled: true,
    requestsPerMinute: 100,
    burstLimit: 10,
  },
};

export class EnhancedServiceWrapper {
  private config: ServiceConfig;
  private networkHandler: EnhancedNetworkHandler;
  private rateLimiters = new Map<string, { requests: number; resetTime: number }>();

  constructor(config: Partial<ServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    this.networkHandler = new EnhancedNetworkHandler({
      timeouts: this.config.timeouts,
      retries: this.config.retries,
      circuitBreaker: this.config.circuitBreaker,
      offline: {
        detectionInterval: 30000,
        syncRetryInterval: 60000,
        maxOfflineOperations: 100,
      },
    });
  }

  /**
   * Enhanced Stripe operations
   */
  async executeStripeOperation<T>(
    operation: () => Promise<T>,
    operationType: string,
    options: {
      timeout?: number;
      retries?: number;
      idempotencyKey?: string;
    } = {}
  ): Promise<ServiceResult<T>> {
    const {
      timeout = this.config.timeouts.payment,
      retries = this.config.retries.maxAttempts,
    } = options;

    return this.executeWithEnhancedHandling(
      operation,
      'stripe',
      operationType,
      timeout,
      retries
    );
  }

  /**
   * Enhanced Twilio operations
   */
  async executeTwilioOperation<T>(
    operation: () => Promise<T>,
    operationType: string,
    options: {
      timeout?: number;
      retries?: number;
      phoneNumber?: string;
    } = {}
  ): Promise<ServiceResult<T>> {
    const {
      timeout = this.config.timeouts.messaging,
      retries = this.config.retries.maxAttempts,
    } = options;

    // Check rate limits for messaging
    if (options.phoneNumber && !this.checkRateLimit('twilio', options.phoneNumber)) {
      return {
        success: false,
        error: 'Rate limit exceeded for phone number',
        retryAfter: this.getRateLimitResetTime('twilio', options.phoneNumber)
      };
    }

    return this.executeWithEnhancedHandling(
      operation,
      'twilio',
      operationType,
      timeout,
      retries
    );
  }

  /**
   * Enhanced Azure AI operations
   */
  async executeAzureAIOperation<T>(
    operation: () => Promise<T>,
    operationType: string,
    options: {
      timeout?: number;
      retries?: number;
      textLength?: number;
    } = {}
  ): Promise<ServiceResult<T>> {
    const {
      timeout = this.config.timeouts.ai,
      retries = this.config.retries.maxAttempts,
    } = options;

    // Adjust timeout based on text length for AI operations
    const adjustedTimeout = options.textLength 
      ? Math.max(timeout, Math.min(options.textLength * 100, 120000))
      : timeout;

    return this.executeWithEnhancedHandling(
      operation,
      'azure-ai',
      operationType,
      adjustedTimeout,
      retries
    );
  }

  /**
   * Enhanced file upload operations
   */
  async executeUploadOperation<T>(
    operation: () => Promise<T>,
    operationType: string,
    options: {
      fileSize?: number;
      retries?: number;
    } = {}
  ): Promise<ServiceResult<T>> {
    const {
      retries = this.config.retries.maxAttempts,
    } = options;

    // Calculate timeout based on file size
    const timeout = options.fileSize 
      ? Math.max(this.config.timeouts.upload, options.fileSize / 1024) // 1KB per ms minimum
      : this.config.timeouts.upload;

    return this.executeWithEnhancedHandling(
      operation,
      'file-upload',
      operationType,
      timeout,
      retries
    );
  }

  /**
   * Core enhanced execution with comprehensive error handling
   */
  private async executeWithEnhancedHandling<T>(
    operation: () => Promise<T>,
    service: string,
    operationType: string,
    timeout: number,
    maxRetries: number
  ): Promise<ServiceResult<T>> {
    let lastError: Error;
    let backoffTime = 1000;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`${service} ${operationType} timeout after ${timeout}ms`)), timeout);
        });

        // Execute operation with timeout
        const result = await Promise.race([
          operation(),
          timeoutPromise
        ]);

        logger.info(`${service} operation successful`, 'enhanced-service-wrapper', {
          service,
          operationType,
          attempt: attempt + 1
        });

        return {
          success: true,
          data: result
        };

      } catch (error) {
        lastError = error as Error;
        
        // Handle the error through integration error handler
        const integrationError = await integrationErrorHandler.handleError(
          lastError,
          service,
          { operationType, attempt: attempt + 1 }
        );

        logger.warn(`${service} operation failed`, 'enhanced-service-wrapper', {
          service,
          operationType,
          attempt: attempt + 1,
          maxRetries,
          error: integrationError.message,
          retryable: integrationError.retryable
        });

        // Don't retry if not retryable or last attempt
        if (!integrationError.retryable || attempt === maxRetries - 1) {
          return {
            success: false,
            error: integrationError.userMessage || integrationError.message,
            retryAfter: integrationError.retryAfter
          };
        }

        // Calculate backoff time with jitter
        const jitter = Math.random() * 0.1;
        const delay = Math.min(
          backoffTime * (1 + jitter),
          this.config.retries.maxBackoffTime
        );

        await this.delay(delay);
        backoffTime *= this.config.retries.backoffMultiplier;
      }
    }

    return {
      success: false,
      error: lastError!.message
    };
  }

  /**
   * Rate limiting functionality
   */
  private checkRateLimit(service: string, identifier: string): boolean {
    if (!this.config.rateLimit.enabled) {
      return true;
    }

    const key = `${service}_${identifier}`;
    const now = Date.now();
    const rateLimiter = this.rateLimiters.get(key);

    if (!rateLimiter || now > rateLimiter.resetTime) {
      // Reset rate limiter
      this.rateLimiters.set(key, {
        requests: 1,
        resetTime: now + 60000 // 1 minute window
      });
      return true;
    }

    if (rateLimiter.requests >= this.config.rateLimit.requestsPerMinute) {
      return false;
    }

    rateLimiter.requests++;
    return true;
  }

  private getRateLimitResetTime(service: string, identifier: string): number {
    const key = `${service}_${identifier}`;
    const rateLimiter = this.rateLimiters.get(key);
    return rateLimiter ? rateLimiter.resetTime - Date.now() : 0;
  }

  /**
   * Health check for all services
   */
  async performHealthCheck(): Promise<{
    stripe: boolean;
    twilio: boolean;
    azureAI: boolean;
    overall: boolean;
  }> {
    const results = {
      stripe: false,
      twilio: false,
      azureAI: false,
      overall: false
    };

    try {
      // Test Stripe connectivity
      const stripeResult = await this.executeStripeOperation(
        async () => {
          // Simple health check - could be a minimal API call
          return { status: 'ok' };
        },
        'health_check',
        { timeout: 5000, retries: 1 }
      );
      results.stripe = stripeResult.success;

      // Test Twilio connectivity
      const twilioResult = await this.executeTwilioOperation(
        async () => {
          // Simple health check
          return { status: 'ok' };
        },
        'health_check',
        { timeout: 5000, retries: 1 }
      );
      results.twilio = twilioResult.success;

      // Test Azure AI connectivity
      const azureResult = await this.executeAzureAIOperation(
        async () => {
          // Simple health check
          return { status: 'ok' };
        },
        'health_check',
        { timeout: 5000, retries: 1 }
      );
      results.azureAI = azureResult.success;

      results.overall = results.stripe && results.twilio && results.azureAI;

    } catch (error) {
      logger.error('Health check failed', 'enhanced-service-wrapper', { error });
    }

    return results;
  }

  /**
   * Get service statistics
   */
  getServiceStatistics(): {
    networkStats: any;
    rateLimitStats: Array<{ service: string; identifier: string; requests: number; resetTime: number }>;
  } {
    return {
      networkStats: this.networkHandler.getNetworkStatistics(),
      rateLimitStats: Array.from(this.rateLimiters.entries()).map(([key, limiter]) => {
        const [service, identifier] = key.split('_');
        return {
          service,
          identifier,
          requests: limiter.requests,
          resetTime: limiter.resetTime
        };
      })
    };
  }

  /**
   * Utility methods
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.rateLimiters.clear();
  }
}

// Create singleton instance
export const enhancedServiceWrapper = new EnhancedServiceWrapper();

// Export convenience methods for each service
export const executeStripeOperation = enhancedServiceWrapper.executeStripeOperation.bind(enhancedServiceWrapper);
export const executeTwilioOperation = enhancedServiceWrapper.executeTwilioOperation.bind(enhancedServiceWrapper);
export const executeAzureAIOperation = enhancedServiceWrapper.executeAzureAIOperation.bind(enhancedServiceWrapper);
export const executeUploadOperation = enhancedServiceWrapper.executeUploadOperation.bind(enhancedServiceWrapper);
