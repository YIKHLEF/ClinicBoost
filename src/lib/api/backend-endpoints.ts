/**
 * Backend API Endpoints for Production Integration
 * 
 * This module provides the actual backend API calls for production use.
 * It replaces mock implementations with real API endpoints that handle
 * server-side operations securely.
 */

import { logger } from '../logging-monitoring';
import { handleError } from '../error-handling';
import { secureConfig } from '../config/secure-config';

// Base API configuration
interface APIConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

class BackendAPIService {
  private config: APIConfig;
  private abortController: AbortController | null = null;

  constructor() {
    this.config = {
      baseURL: this.getAPIBaseURL(),
      timeout: 30000, // 30 seconds
      retryAttempts: 3,
      retryDelay: 1000, // 1 second
    };
  }

  private getAPIBaseURL(): string {
    const config = secureConfig.getConfig();
    
    // Use environment-specific API URLs
    switch (config.environment) {
      case 'production':
        return 'https://api.clinicboost.com';
      case 'staging':
        return 'https://staging-api.clinicboost.com';
      default:
        return 'http://localhost:3000/api';
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<T> {
    this.abortController = new AbortController();
    
    const url = `${this.config.baseURL}${endpoint}`;
    const requestOptions: RequestInit = {
      ...options,
      signal: this.abortController.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    // Add timeout
    const timeoutId = setTimeout(() => {
      this.abortController?.abort();
    }, this.config.timeout);

    try {
      logger.info('Making API request', 'backend-api', { 
        url: this.maskURL(url), 
        method: options.method || 'GET' 
      });

      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.info('API request successful', 'backend-api', { 
        url: this.maskURL(url), 
        status: response.status 
      });

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Handle network errors and retries
      if (retryCount < this.config.retryAttempts && this.shouldRetry(error as Error)) {
        logger.warn('API request failed, retrying', 'backend-api', { 
          url: this.maskURL(url), 
          error: (error as Error).message, 
          retryCount: retryCount + 1 
        });
        
        await this.delay(this.config.retryDelay * Math.pow(2, retryCount));
        return this.makeRequest<T>(endpoint, options, retryCount + 1);
      }

      logger.error('API request failed', 'backend-api', { 
        url: this.maskURL(url), 
        error 
      });
      handleError(error as Error, 'backend-api');
      throw error;
    }
  }

  private shouldRetry(error: Error): boolean {
    // Retry on network errors, timeouts, and 5xx server errors
    return (
      error.name === 'AbortError' ||
      error.message.includes('fetch') ||
      error.message.includes('5')
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private maskURL(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
    } catch {
      return '***';
    }
  }

  // Stripe API endpoints
  async createPaymentIntent(data: {
    amount: number;
    currency: string;
    metadata?: Record<string, string>;
  }) {
    return this.makeRequest('/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async confirmPayment(paymentIntentId: string, paymentMethodId: string) {
    return this.makeRequest('/payments/confirm', {
      method: 'POST',
      body: JSON.stringify({ paymentIntentId, paymentMethodId }),
    });
  }

  async processRefund(data: {
    paymentIntentId: string;
    amount?: number;
    reason?: string;
  }) {
    return this.makeRequest('/payments/refund', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createSubscription(data: {
    customerId: string;
    priceId: string;
    metadata?: Record<string, string>;
  }) {
    return this.makeRequest('/subscriptions/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSubscription(subscriptionId: string, data: {
    priceId?: string;
    metadata?: Record<string, string>;
  }) {
    return this.makeRequest(`/subscriptions/${subscriptionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async cancelSubscription(subscriptionId: string) {
    return this.makeRequest(`/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
    });
  }

  // Twilio API endpoints
  async sendSMS(data: {
    to: string;
    message: string;
    scheduledTime?: string;
  }) {
    return this.makeRequest('/messaging/sms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async sendWhatsApp(data: {
    to: string;
    message: string;
    mediaUrl?: string;
  }) {
    return this.makeRequest('/messaging/whatsapp', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMessagingStatus() {
    return this.makeRequest('/messaging/status');
  }

  // Azure AI API endpoints
  async analyzeSentiment(text: string) {
    return this.makeRequest('/ai/sentiment', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  async extractKeyPhrases(text: string) {
    return this.makeRequest('/ai/keyphrases', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  async recognizeEntities(text: string) {
    return this.makeRequest('/ai/entities', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  async detectLanguage(text: string) {
    return this.makeRequest('/ai/language', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  async analyzePatientFeedback(feedback: string) {
    return this.makeRequest('/ai/analyze-feedback', {
      method: 'POST',
      body: JSON.stringify({ feedback }),
    });
  }

  // Health check endpoints
  async healthCheck() {
    return this.makeRequest('/health');
  }

  async getServiceStatus() {
    return this.makeRequest('/status');
  }

  // Cancel ongoing requests
  cancelRequests(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}

// Export singleton instance
export const backendAPI = new BackendAPIService();

// Export convenience functions
export const {
  createPaymentIntent,
  confirmPayment,
  processRefund,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  sendSMS,
  sendWhatsApp,
  getMessagingStatus,
  analyzeSentiment,
  extractKeyPhrases,
  recognizeEntities,
  detectLanguage,
  analyzePatientFeedback,
  healthCheck,
  getServiceStatus,
} = backendAPI;
