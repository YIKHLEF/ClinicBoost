/**
 * Payment Error Handling
 * 
 * Comprehensive error handling for payment processing operations
 */

import { logger } from '../logging-monitoring';
import { handleError } from '../error-handling';

export interface PaymentError {
  code: string;
  message: string;
  type: 'card_error' | 'validation_error' | 'api_error' | 'network_error' | 'authentication_error';
  declineCode?: string;
  userMessage: string;
  retryable: boolean;
  details?: any;
}

export const PAYMENT_ERROR_CODES = {
  // Card errors
  CARD_DECLINED: 'CARD_DECLINED',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  EXPIRED_CARD: 'EXPIRED_CARD',
  INVALID_CVC: 'INVALID_CVC',
  INVALID_NUMBER: 'INVALID_NUMBER',
  INVALID_EXPIRY: 'INVALID_EXPIRY',
  
  // Processing errors
  PROCESSING_ERROR: 'PROCESSING_ERROR',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  
  // Validation errors
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  MISSING_PAYMENT_METHOD: 'MISSING_PAYMENT_METHOD',
  INVALID_CURRENCY: 'INVALID_CURRENCY',
  
  // Authentication errors
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  
  // API errors
  API_ERROR: 'API_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export const PAYMENT_ERROR_MESSAGES = {
  [PAYMENT_ERROR_CODES.CARD_DECLINED]: 'Your card was declined',
  [PAYMENT_ERROR_CODES.INSUFFICIENT_FUNDS]: 'Insufficient funds on your card',
  [PAYMENT_ERROR_CODES.EXPIRED_CARD]: 'Your card has expired',
  [PAYMENT_ERROR_CODES.INVALID_CVC]: 'Invalid security code',
  [PAYMENT_ERROR_CODES.INVALID_NUMBER]: 'Invalid card number',
  [PAYMENT_ERROR_CODES.INVALID_EXPIRY]: 'Invalid expiry date',
  [PAYMENT_ERROR_CODES.PROCESSING_ERROR]: 'Payment processing error',
  [PAYMENT_ERROR_CODES.PAYMENT_FAILED]: 'Payment failed',
  [PAYMENT_ERROR_CODES.TIMEOUT_ERROR]: 'Payment request timed out',
  [PAYMENT_ERROR_CODES.NETWORK_ERROR]: 'Network error during payment',
  [PAYMENT_ERROR_CODES.INVALID_AMOUNT]: 'Invalid payment amount',
  [PAYMENT_ERROR_CODES.MISSING_PAYMENT_METHOD]: 'Payment method is required',
  [PAYMENT_ERROR_CODES.INVALID_CURRENCY]: 'Invalid currency',
  [PAYMENT_ERROR_CODES.AUTHENTICATION_REQUIRED]: 'Additional authentication required',
  [PAYMENT_ERROR_CODES.AUTHENTICATION_FAILED]: 'Authentication failed',
  [PAYMENT_ERROR_CODES.API_ERROR]: 'Payment service error',
  [PAYMENT_ERROR_CODES.RATE_LIMITED]: 'Too many payment attempts',
  [PAYMENT_ERROR_CODES.SERVICE_UNAVAILABLE]: 'Payment service temporarily unavailable',
};

export class PaymentErrorHandler {
  private static instance: PaymentErrorHandler;

  public static getInstance(): PaymentErrorHandler {
    if (!PaymentErrorHandler.instance) {
      PaymentErrorHandler.instance = new PaymentErrorHandler();
    }
    return PaymentErrorHandler.instance;
  }

  /**
   * Parse Stripe error
   */
  parseStripeError(error: any): PaymentError {
    logger.error('Stripe payment error', 'payment', { error });

    const { type, code, decline_code, message } = error;

    // Card errors
    if (type === 'card_error') {
      switch (code) {
        case 'card_declined':
          return {
            code: PAYMENT_ERROR_CODES.CARD_DECLINED,
            message,
            type: 'card_error',
            declineCode: decline_code,
            userMessage: this.getDeclineMessage(decline_code),
            retryable: decline_code === 'insufficient_funds' || decline_code === 'try_again_later',
            details: error
          };
        case 'expired_card':
          return {
            code: PAYMENT_ERROR_CODES.EXPIRED_CARD,
            message,
            type: 'card_error',
            userMessage: 'Your card has expired. Please use a different card.',
            retryable: false,
            details: error
          };
        case 'incorrect_cvc':
          return {
            code: PAYMENT_ERROR_CODES.INVALID_CVC,
            message,
            type: 'card_error',
            userMessage: 'The security code is incorrect. Please check and try again.',
            retryable: true,
            details: error
          };
        case 'invalid_number':
          return {
            code: PAYMENT_ERROR_CODES.INVALID_NUMBER,
            message,
            type: 'card_error',
            userMessage: 'The card number is invalid. Please check and try again.',
            retryable: true,
            details: error
          };
      }
    }

    // API errors
    if (type === 'api_error') {
      return {
        code: PAYMENT_ERROR_CODES.API_ERROR,
        message,
        type: 'api_error',
        userMessage: 'Payment service is temporarily unavailable. Please try again later.',
        retryable: true,
        details: error
      };
    }

    // Rate limit errors
    if (type === 'rate_limit_error') {
      return {
        code: PAYMENT_ERROR_CODES.RATE_LIMITED,
        message,
        type: 'api_error',
        userMessage: 'Too many payment attempts. Please wait a moment and try again.',
        retryable: true,
        details: error
      };
    }

    // Generic error
    return {
      code: PAYMENT_ERROR_CODES.PAYMENT_FAILED,
      message: message || 'Payment failed',
      type: 'api_error',
      userMessage: 'Payment failed. Please try again or use a different payment method.',
      retryable: true,
      details: error
    };
  }

  /**
   * Parse network/timeout errors
   */
  parseNetworkError(error: any): PaymentError {
    logger.error('Payment network error', 'payment', { error });

    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      return {
        code: PAYMENT_ERROR_CODES.TIMEOUT_ERROR,
        message: 'Payment request timed out',
        type: 'network_error',
        userMessage: 'Payment request timed out. Please check your connection and try again.',
        retryable: true,
        details: error
      };
    }

    return {
      code: PAYMENT_ERROR_CODES.NETWORK_ERROR,
      message: error.message || 'Network error',
      type: 'network_error',
      userMessage: 'Network error during payment. Please check your connection and try again.',
      retryable: true,
      details: error
    };
  }

  /**
   * Validate payment data
   */
  validatePaymentData(data: {
    amount?: number;
    currency?: string;
    paymentMethodId?: string;
  }): PaymentError | null {
    const { amount, currency, paymentMethodId } = data;

    if (!amount || amount <= 0) {
      return {
        code: PAYMENT_ERROR_CODES.INVALID_AMOUNT,
        message: 'Invalid payment amount',
        type: 'validation_error',
        userMessage: 'Please enter a valid payment amount.',
        retryable: true
      };
    }

    if (!currency) {
      return {
        code: PAYMENT_ERROR_CODES.INVALID_CURRENCY,
        message: 'Currency is required',
        type: 'validation_error',
        userMessage: 'Currency is required for payment.',
        retryable: true
      };
    }

    if (!paymentMethodId) {
      return {
        code: PAYMENT_ERROR_CODES.MISSING_PAYMENT_METHOD,
        message: 'Payment method is required',
        type: 'validation_error',
        userMessage: 'Please select a payment method.',
        retryable: true
      };
    }

    return null;
  }

  /**
   * Process payment with comprehensive error handling
   */
  async processPaymentWithErrorHandling(
    paymentFn: () => Promise<any>,
    options: {
      timeout?: number;
      retries?: number;
      retryDelay?: number;
    } = {}
  ): Promise<{ success: boolean; data?: any; error?: PaymentError }> {
    const {
      timeout = 30000, // 30 seconds
      retries = 2,
      retryDelay = 2000
    } = options;

    let lastError: any;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Payment timeout')), timeout);
        });

        // Race between payment and timeout
        const result = await Promise.race([
          paymentFn(),
          timeoutPromise
        ]);

        logger.info('Payment processed successfully', 'payment', { attempt: attempt + 1 });
        return { success: true, data: result };
      } catch (error) {
        lastError = error;
        
        // Parse error to determine if retryable
        const paymentError = this.handlePaymentError(error);
        
        // Don't retry non-retryable errors
        if (!paymentError.retryable || attempt === retries) {
          return { success: false, error: paymentError };
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }

    const paymentError = this.handlePaymentError(lastError);
    return { success: false, error: paymentError };
  }

  /**
   * Handle any payment error
   */
  handlePaymentError(error: any): PaymentError {
    // Stripe errors
    if (error.type && (error.type.includes('card_error') || error.type.includes('api_error'))) {
      return this.parseStripeError(error);
    }

    // Network/timeout errors
    if (error.name === 'AbortError' || error.name === 'NetworkError' || error.message?.includes('timeout')) {
      return this.parseNetworkError(error);
    }

    // Generic error
    return {
      code: PAYMENT_ERROR_CODES.PAYMENT_FAILED,
      message: error.message || 'Payment failed',
      type: 'api_error',
      userMessage: 'Payment failed. Please try again or contact support.',
      retryable: false,
      details: error
    };
  }

  /**
   * Get user-friendly decline message
   */
  private getDeclineMessage(declineCode?: string): string {
    switch (declineCode) {
      case 'insufficient_funds':
        return 'Your card has insufficient funds. Please use a different card or add funds.';
      case 'lost_card':
      case 'stolen_card':
        return 'Your card has been reported as lost or stolen. Please contact your bank.';
      case 'expired_card':
        return 'Your card has expired. Please use a different card.';
      case 'incorrect_cvc':
        return 'The security code is incorrect. Please check and try again.';
      case 'processing_error':
        return 'A processing error occurred. Please try again.';
      case 'try_again_later':
        return 'Please try again in a few minutes.';
      default:
        return 'Your card was declined. Please try a different payment method.';
    }
  }
}

export const paymentErrorHandler = PaymentErrorHandler.getInstance();
