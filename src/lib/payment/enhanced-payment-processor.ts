/**
 * Enhanced Payment Processor with Comprehensive Error Handling
 * 
 * Provides robust payment processing with retry mechanisms, state recovery,
 * and comprehensive error handling for various payment scenarios.
 */

import { logger } from '../logging-monitoring';
import { paymentErrorHandler } from './error-handling';
import { backendAPI } from '../api/backend-endpoints';

export interface PaymentConfig {
  timeouts: {
    payment: number;
    refund: number;
    webhook: number;
  };
  retries: {
    maxAttempts: number;
    backoffMultiplier: number;
    maxBackoffTime: number;
  };
  recovery: {
    enableStateRecovery: boolean;
    maxRecoveryAttempts: number;
    recoveryCheckInterval: number;
  };
}

export interface PaymentState {
  id: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled' | 'requires_action';
  amount: number;
  currency: string;
  paymentMethodId?: string;
  clientSecret?: string;
  lastError?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  status?: string;
  error?: string;
  requiresAction?: boolean;
  clientSecret?: string;
  nextAction?: any;
}

const DEFAULT_CONFIG: PaymentConfig = {
  timeouts: {
    payment: 30000,   // 30 seconds
    refund: 45000,    // 45 seconds
    webhook: 15000,   // 15 seconds
  },
  retries: {
    maxAttempts: 3,
    backoffMultiplier: 2,
    maxBackoffTime: 30000,
  },
  recovery: {
    enableStateRecovery: true,
    maxRecoveryAttempts: 5,
    recoveryCheckInterval: 60000, // 1 minute
  },
};

export class EnhancedPaymentProcessor {
  private config: PaymentConfig;
  private paymentStates = new Map<string, PaymentState>();
  private recoveryInterval?: NodeJS.Timeout;

  constructor(config: Partial<PaymentConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    if (this.config.recovery.enableStateRecovery) {
      this.startRecoveryMonitoring();
    }
  }

  /**
   * Process payment with comprehensive error handling
   */
  async processPayment(
    amount: number,
    currency: string,
    paymentMethodId: string,
    options: {
      metadata?: Record<string, any>;
      idempotencyKey?: string;
      timeout?: number;
      maxRetries?: number;
    } = {}
  ): Promise<PaymentResult> {
    const {
      timeout = this.config.timeouts.payment,
      maxRetries = this.config.retries.maxAttempts,
      idempotencyKey = this.generateIdempotencyKey(),
    } = options;

    // Create payment state
    const paymentState: PaymentState = {
      id: idempotencyKey,
      status: 'pending',
      amount,
      currency,
      paymentMethodId,
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: options.metadata,
    };

    this.paymentStates.set(paymentState.id, paymentState);

    try {
      return await this.executePaymentWithRetry(paymentState, timeout, maxRetries);
    } catch (error) {
      paymentState.status = 'failed';
      paymentState.lastError = error instanceof Error ? error.message : 'Unknown error';
      paymentState.updatedAt = new Date();

      logger.error('Payment processing failed', 'enhanced-payment-processor', {
        paymentId: paymentState.id,
        error: paymentState.lastError,
        retryCount: paymentState.retryCount
      });

      return {
        success: false,
        paymentId: paymentState.id,
        status: paymentState.status,
        error: paymentState.lastError
      };
    }
  }

  /**
   * Execute payment with retry logic
   */
  private async executePaymentWithRetry(
    paymentState: PaymentState,
    timeout: number,
    maxRetries: number
  ): Promise<PaymentResult> {
    let lastError: Error;
    let backoffTime = 1000;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        paymentState.status = 'processing';
        paymentState.retryCount = attempt + 1;
        paymentState.updatedAt = new Date();

        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Payment timeout')), timeout);
        });

        // Execute payment
        const paymentPromise = this.executePayment(paymentState);

        // Race between payment and timeout
        const result = await Promise.race([paymentPromise, timeoutPromise]);

        paymentState.status = result.status as any;
        paymentState.updatedAt = new Date();

        logger.info('Payment processed successfully', 'enhanced-payment-processor', {
          paymentId: paymentState.id,
          attempt: attempt + 1,
          status: result.status
        });

        return result;

      } catch (error) {
        lastError = error as Error;
        paymentState.lastError = lastError.message;
        paymentState.updatedAt = new Date();

        logger.warn('Payment attempt failed', 'enhanced-payment-processor', {
          paymentId: paymentState.id,
          attempt: attempt + 1,
          maxRetries,
          error: lastError.message
        });

        // Check if error is retryable
        const isRetryable = this.isRetryableError(lastError);
        
        if (!isRetryable || attempt === maxRetries - 1) {
          break;
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

    throw lastError!;
  }

  /**
   * Execute single payment attempt
   */
  private async executePayment(paymentState: PaymentState): Promise<PaymentResult> {
    try {
      // Create payment intent
      const paymentIntent = await backendAPI.createPaymentIntent({
        amount: paymentState.amount,
        currency: paymentState.currency,
        metadata: paymentState.metadata || {}
      });

      paymentState.clientSecret = paymentIntent.client_secret;

      // Confirm payment
      const confirmation = await backendAPI.confirmPayment(
        paymentIntent.id,
        paymentState.paymentMethodId!
      );

      return {
        success: true,
        paymentId: paymentIntent.id,
        status: confirmation.status,
        clientSecret: paymentState.clientSecret
      };

    } catch (error) {
      const paymentError = paymentErrorHandler.handlePaymentError(error);
      
      if (paymentError.type === 'requires_action') {
        return {
          success: false,
          paymentId: paymentState.id,
          status: 'requires_action',
          requiresAction: true,
          clientSecret: paymentState.clientSecret,
          error: paymentError.message
        };
      }

      throw error;
    }
  }

  /**
   * Process refund with error handling
   */
  async processRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: string,
    options: {
      timeout?: number;
      maxRetries?: number;
    } = {}
  ): Promise<PaymentResult> {
    const {
      timeout = this.config.timeouts.refund,
      maxRetries = this.config.retries.maxAttempts,
    } = options;

    return paymentErrorHandler.processPaymentWithErrorHandling(
      async () => {
        const refund = await backendAPI.processRefund({
          paymentIntentId,
          amount,
          reason
        });

        return {
          success: true,
          paymentId: refund.id,
          status: refund.status
        };
      },
      { timeout, retries: maxRetries }
    );
  }

  /**
   * Recover failed payments
   */
  async recoverFailedPayments(): Promise<void> {
    const failedPayments = Array.from(this.paymentStates.values())
      .filter(state => state.status === 'failed' || state.status === 'processing');

    for (const paymentState of failedPayments) {
      try {
        if (paymentState.retryCount < this.config.recovery.maxRecoveryAttempts) {
          logger.info('Attempting payment recovery', 'enhanced-payment-processor', {
            paymentId: paymentState.id,
            retryCount: paymentState.retryCount
          });

          await this.executePaymentWithRetry(
            paymentState,
            this.config.timeouts.payment,
            1 // Single recovery attempt
          );
        }
      } catch (error) {
        logger.warn('Payment recovery failed', 'enhanced-payment-processor', {
          paymentId: paymentState.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    // Network errors are retryable
    if (message.includes('network') || message.includes('timeout') || 
        message.includes('connection')) {
      return true;
    }
    
    // Server errors are retryable
    if (message.includes('500') || message.includes('502') || 
        message.includes('503') || message.includes('504')) {
      return true;
    }
    
    // Rate limit errors are retryable
    if (message.includes('rate_limit') || message.includes('429')) {
      return true;
    }
    
    // Card errors are usually not retryable
    if (message.includes('card_declined') || message.includes('insufficient_funds') ||
        message.includes('invalid_card')) {
      return false;
    }
    
    return true; // Default to retryable
  }

  /**
   * Start recovery monitoring
   */
  private startRecoveryMonitoring(): void {
    this.recoveryInterval = setInterval(() => {
      this.recoverFailedPayments().catch(error => {
        logger.error('Recovery monitoring failed', 'enhanced-payment-processor', { error });
      });
    }, this.config.recovery.recoveryCheckInterval);
  }

  /**
   * Stop recovery monitoring
   */
  stopRecoveryMonitoring(): void {
    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
      this.recoveryInterval = undefined;
    }
  }

  /**
   * Get payment state
   */
  getPaymentState(paymentId: string): PaymentState | null {
    return this.paymentStates.get(paymentId) || null;
  }

  /**
   * Utility methods
   */
  private generateIdempotencyKey(): string {
    return `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopRecoveryMonitoring();
    this.paymentStates.clear();
  }
}

// Create singleton instance
export const enhancedPaymentProcessor = new EnhancedPaymentProcessor();
