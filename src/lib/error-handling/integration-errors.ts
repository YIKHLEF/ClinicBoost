/**
 * Enhanced Error Handling for Third-Party Integrations
 * 
 * This module provides comprehensive error handling for network timeouts,
 * offline sync issues, file uploads, payment processing, and other
 * integration-specific error scenarios.
 */

import { logger } from '../logging-monitoring';

// Error types for different integration scenarios
export enum IntegrationErrorType {
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  OFFLINE_SYNC = 'OFFLINE_SYNC',
  FILE_UPLOAD = 'FILE_UPLOAD',
  PAYMENT_PROCESSING = 'PAYMENT_PROCESSING',
  SMS_DELIVERY = 'SMS_DELIVERY',
  AI_ANALYSIS = 'AI_ANALYSIS',
  RATE_LIMIT = 'RATE_LIMIT',
  AUTHENTICATION = 'AUTHENTICATION',
  CONFIGURATION = 'CONFIGURATION',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

export interface IntegrationError extends Error {
  type: IntegrationErrorType;
  service: string;
  retryable: boolean;
  retryAfter?: number;
  details?: Record<string, any>;
  userMessage?: string;
}

export class IntegrationErrorHandler {
  private static instance: IntegrationErrorHandler;
  private errorQueue: IntegrationError[] = [];
  private retryQueue: Map<string, { error: IntegrationError; attempts: number; nextRetry: number }> = new Map();
  private maxRetryAttempts = 3;
  private baseRetryDelay = 1000; // 1 second

  static getInstance(): IntegrationErrorHandler {
    if (!IntegrationErrorHandler.instance) {
      IntegrationErrorHandler.instance = new IntegrationErrorHandler();
    }
    return IntegrationErrorHandler.instance;
  }

  /**
   * Handle integration errors with appropriate retry logic
   */
  async handleError(error: Error, service: string, context?: Record<string, any>): Promise<IntegrationError> {
    const integrationError = this.classifyError(error, service, context);
    
    logger.error('Integration error occurred', service, {
      type: integrationError.type,
      message: integrationError.message,
      retryable: integrationError.retryable,
      context,
    });

    // Add to error queue for monitoring
    this.errorQueue.push(integrationError);
    this.trimErrorQueue();

    // Handle retryable errors
    if (integrationError.retryable) {
      await this.scheduleRetry(integrationError);
    }

    return integrationError;
  }

  /**
   * Classify errors based on type and service
   */
  private classifyError(error: Error, service: string, context?: Record<string, any>): IntegrationError {
    const integrationError = error as IntegrationError;
    integrationError.service = service;
    integrationError.details = context;

    // Network and timeout errors
    if (this.isNetworkError(error)) {
      integrationError.type = IntegrationErrorType.NETWORK_TIMEOUT;
      integrationError.retryable = true;
      integrationError.retryAfter = 5000; // 5 seconds
      integrationError.userMessage = 'Network connection issue. Please check your internet connection.';
    }
    // Rate limiting errors
    else if (this.isRateLimitError(error)) {
      integrationError.type = IntegrationErrorType.RATE_LIMIT;
      integrationError.retryable = true;
      integrationError.retryAfter = this.extractRetryAfter(error) || 60000; // 1 minute default
      integrationError.userMessage = 'Service is temporarily busy. Please try again in a moment.';
    }
    // Authentication errors
    else if (this.isAuthError(error)) {
      integrationError.type = IntegrationErrorType.AUTHENTICATION;
      integrationError.retryable = false;
      integrationError.userMessage = 'Authentication failed. Please check your credentials.';
    }
    // Service-specific errors
    else {
      this.classifyServiceSpecificError(integrationError, service);
    }

    return integrationError;
  }

  private isNetworkError(error: Error): boolean {
    return (
      error.name === 'AbortError' ||
      error.name === 'TimeoutError' ||
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('timeout') ||
      error.message.includes('ECONNRESET') ||
      error.message.includes('ENOTFOUND')
    );
  }

  private isRateLimitError(error: Error): boolean {
    return (
      error.message.includes('rate limit') ||
      error.message.includes('429') ||
      error.message.includes('too many requests')
    );
  }

  private isAuthError(error: Error): boolean {
    return (
      error.message.includes('401') ||
      error.message.includes('403') ||
      error.message.includes('unauthorized') ||
      error.message.includes('forbidden') ||
      error.message.includes('invalid credentials')
    );
  }

  private extractRetryAfter(error: Error): number | null {
    const match = error.message.match(/retry after (\d+)/i);
    return match ? parseInt(match[1]) * 1000 : null;
  }

  private classifyServiceSpecificError(error: IntegrationError, service: string): void {
    switch (service) {
      case 'stripe':
      case 'stripe-webhook':
      case 'stripe-subscription':
        error.type = IntegrationErrorType.PAYMENT_PROCESSING;
        error.retryable = !error.message.includes('card_declined');
        error.userMessage = error.retryable 
          ? 'Payment processing issue. Please try again.'
          : 'Payment was declined. Please check your payment method.';
        break;

      case 'twilio':
      case 'twilio-sms':
      case 'twilio-whatsapp':
        error.type = IntegrationErrorType.SMS_DELIVERY;
        error.retryable = !error.message.includes('invalid number');
        error.userMessage = error.retryable
          ? 'Message delivery issue. We\'ll try again shortly.'
          : 'Invalid phone number. Please check the number and try again.';
        break;

      case 'azure-ai':
      case 'azure-ai-sentiment':
      case 'azure-ai-keyphrases':
        error.type = IntegrationErrorType.AI_ANALYSIS;
        error.retryable = true;
        error.userMessage = 'AI analysis temporarily unavailable. Please try again.';
        break;

      case 'file-upload':
        error.type = IntegrationErrorType.FILE_UPLOAD;
        error.retryable = !error.message.includes('file too large');
        error.userMessage = error.retryable
          ? 'File upload failed. Please try again.'
          : 'File is too large. Please choose a smaller file.';
        break;

      case 'offline-sync':
        error.type = IntegrationErrorType.OFFLINE_SYNC;
        error.retryable = true;
        error.userMessage = 'Sync failed. Changes will be saved when connection is restored.';
        break;

      default:
        error.type = IntegrationErrorType.SERVICE_UNAVAILABLE;
        error.retryable = true;
        error.userMessage = 'Service temporarily unavailable. Please try again.';
    }
  }

  /**
   * Schedule retry for retryable errors
   */
  private async scheduleRetry(error: IntegrationError): Promise<void> {
    const retryKey = `${error.service}-${error.type}-${Date.now()}`;
    const existingRetry = this.retryQueue.get(retryKey);
    const attempts = existingRetry ? existingRetry.attempts + 1 : 1;

    if (attempts > this.maxRetryAttempts) {
      logger.warn('Max retry attempts reached', error.service, {
        type: error.type,
        attempts,
      });
      return;
    }

    const delay = error.retryAfter || this.calculateBackoffDelay(attempts);
    const nextRetry = Date.now() + delay;

    this.retryQueue.set(retryKey, {
      error,
      attempts,
      nextRetry,
    });

    logger.info('Scheduled retry', error.service, {
      type: error.type,
      attempts,
      delay,
      nextRetry: new Date(nextRetry).toISOString(),
    });
  }

  private calculateBackoffDelay(attempts: number): number {
    return this.baseRetryDelay * Math.pow(2, attempts - 1);
  }

  /**
   * Process retry queue
   */
  async processRetries(): Promise<void> {
    const now = Date.now();
    const readyRetries = Array.from(this.retryQueue.entries())
      .filter(([_, retry]) => retry.nextRetry <= now);

    for (const [key, retry] of readyRetries) {
      try {
        logger.info('Processing retry', retry.error.service, {
          type: retry.error.type,
          attempts: retry.attempts,
        });

        // Remove from retry queue
        this.retryQueue.delete(key);

        // Emit retry event for handling by the appropriate service
        this.emitRetryEvent(retry.error);
      } catch (error) {
        logger.error('Retry processing failed', retry.error.service, { error });
      }
    }
  }

  private emitRetryEvent(error: IntegrationError): void {
    // Emit custom event for retry handling
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('integration-retry', {
        detail: error,
      }));
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsByService: Record<string, number>;
    pendingRetries: number;
  } {
    const errorsByType: Record<string, number> = {};
    const errorsByService: Record<string, number> = {};

    this.errorQueue.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      errorsByService[error.service] = (errorsByService[error.service] || 0) + 1;
    });

    return {
      totalErrors: this.errorQueue.length,
      errorsByType,
      errorsByService,
      pendingRetries: this.retryQueue.size,
    };
  }

  /**
   * Clear error queue (keep only recent errors)
   */
  private trimErrorQueue(): void {
    const maxErrors = 100;
    if (this.errorQueue.length > maxErrors) {
      this.errorQueue = this.errorQueue.slice(-maxErrors);
    }
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(error: IntegrationError): string {
    return error.userMessage || 'An unexpected error occurred. Please try again.';
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error: IntegrationError): boolean {
    return error.retryable && this.getRetryAttempts(error) < this.maxRetryAttempts;
  }

  private getRetryAttempts(error: IntegrationError): number {
    const retryKey = `${error.service}-${error.type}`;
    return Array.from(this.retryQueue.values())
      .filter(retry => retry.error.service === error.service && retry.error.type === error.type)
      .reduce((max, retry) => Math.max(max, retry.attempts), 0);
  }
}

// Export singleton instance
export const integrationErrorHandler = IntegrationErrorHandler.getInstance();

// Export convenience functions
export const handleIntegrationError = (error: Error, service: string, context?: Record<string, any>) =>
  integrationErrorHandler.handleError(error, service, context);

export const processRetries = () => integrationErrorHandler.processRetries();
export const getErrorStats = () => integrationErrorHandler.getErrorStats();
export const getUserErrorMessage = (error: IntegrationError) => integrationErrorHandler.getUserMessage(error);
export const isErrorRetryable = (error: IntegrationError) => integrationErrorHandler.isRetryable(error);
