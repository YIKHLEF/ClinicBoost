// Mock API endpoints for third-party service integrations
// In production, these would be actual backend API routes

import { logger } from '../logging-monitoring';
import { handleError } from '../error-handling';

export interface MockAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class MockAPIService {
  private baseUrl = '/api';

  // Twilio Mock Endpoints
  async sendSMS(payload: {
    to: string;
    body: string;
    from: string;
    mediaUrl?: string[];
  }): Promise<MockAPIResponse<{ messageId: string; status: string }>> {
    try {
      logger.info('Mock API: Sending SMS', 'mock-api', { to: payload.to });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Simulate 95% success rate
      if (Math.random() > 0.05) {
        const messageId = `SM${Date.now()}${Math.random().toString(36).substr(2, 8)}`;
        return {
          success: true,
          data: {
            messageId,
            status: 'queued',
          },
        };
      } else {
        throw new Error('SMS delivery failed (simulated)');
      }
    } catch (error) {
      logger.error('Mock API: SMS sending failed', 'mock-api', { error });
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  async sendWhatsApp(payload: {
    to: string;
    body: string;
    from: string;
    mediaUrl?: string[];
  }): Promise<MockAPIResponse<{ messageId: string; status: string }>> {
    try {
      logger.info('Mock API: Sending WhatsApp', 'mock-api', { to: payload.to });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 700));

      // Simulate 95% success rate
      if (Math.random() > 0.05) {
        const messageId = `WA${Date.now()}${Math.random().toString(36).substr(2, 8)}`;
        return {
          success: true,
          data: {
            messageId,
            status: 'queued',
          },
        };
      } else {
        throw new Error('WhatsApp delivery failed (simulated)');
      }
    } catch (error) {
      logger.error('Mock API: WhatsApp sending failed', 'mock-api', { error });
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // Stripe Mock Endpoints
  async createPaymentIntent(payload: {
    amount: number;
    currency: string;
    invoice_id?: string;
    patient_id?: string;
    description?: string;
  }): Promise<MockAPIResponse<{ id: string; client_secret: string; status: string }>> {
    try {
      logger.info('Mock API: Creating payment intent', 'mock-api', { amount: payload.amount });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));

      const paymentIntentId = `pi_${Date.now()}${Math.random().toString(36).substr(2, 16)}`;
      const clientSecret = `${paymentIntentId}_secret_${Math.random().toString(36).substr(2, 16)}`;

      return {
        success: true,
        data: {
          id: paymentIntentId,
          client_secret: clientSecret,
          status: 'requires_payment_method',
        },
      };
    } catch (error) {
      logger.error('Mock API: Payment intent creation failed', 'mock-api', { error });
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  async processRefund(payload: {
    paymentIntentId: string;
    amount?: number;
    reason?: string;
    metadata?: Record<string, string>;
  }): Promise<MockAPIResponse<{ id: string; amount: number; status: string }>> {
    try {
      logger.info('Mock API: Processing refund', 'mock-api', { 
        paymentIntentId: payload.paymentIntentId,
        amount: payload.amount 
      });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Simulate 98% success rate for refunds
      if (Math.random() > 0.02) {
        const refundId = `re_${Date.now()}${Math.random().toString(36).substr(2, 16)}`;
        return {
          success: true,
          data: {
            id: refundId,
            amount: payload.amount || 5000,
            status: 'succeeded',
          },
        };
      } else {
        throw new Error('Refund processing failed (simulated)');
      }
    } catch (error) {
      logger.error('Mock API: Refund processing failed', 'mock-api', { error });
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  async createSubscription(payload: {
    clinicId: string;
    planId: string;
    customerId?: string;
    paymentMethodId: string;
    trialDays?: number;
  }): Promise<MockAPIResponse<{ subscriptionId: string; status: string }>> {
    try {
      logger.info('Mock API: Creating subscription', 'mock-api', { 
        clinicId: payload.clinicId,
        planId: payload.planId 
      });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      const subscriptionId = `sub_${Date.now()}${Math.random().toString(36).substr(2, 16)}`;
      return {
        success: true,
        data: {
          subscriptionId,
          status: payload.trialDays ? 'trialing' : 'active',
        },
      };
    } catch (error) {
      logger.error('Mock API: Subscription creation failed', 'mock-api', { error });
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  async updateSubscription(subscriptionId: string, payload: {
    newPlanId?: string;
    cancelAtPeriodEnd?: boolean;
    prorationBehavior?: string;
  }): Promise<MockAPIResponse<{ subscriptionId: string; status: string }>> {
    try {
      logger.info('Mock API: Updating subscription', 'mock-api', { subscriptionId });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      return {
        success: true,
        data: {
          subscriptionId,
          status: 'active',
        },
      };
    } catch (error) {
      logger.error('Mock API: Subscription update failed', 'mock-api', { error });
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  async cancelSubscription(subscriptionId: string, payload: {
    cancelAtPeriodEnd: boolean;
  }): Promise<MockAPIResponse<{ subscriptionId: string; status: string }>> {
    try {
      logger.info('Mock API: Cancelling subscription', 'mock-api', { 
        subscriptionId,
        cancelAtPeriodEnd: payload.cancelAtPeriodEnd 
      });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));

      return {
        success: true,
        data: {
          subscriptionId,
          status: payload.cancelAtPeriodEnd ? 'active' : 'cancelled',
        },
      };
    } catch (error) {
      logger.error('Mock API: Subscription cancellation failed', 'mock-api', { error });
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  async reactivateSubscription(subscriptionId: string): Promise<MockAPIResponse<{ subscriptionId: string; status: string }>> {
    try {
      logger.info('Mock API: Reactivating subscription', 'mock-api', { subscriptionId });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 600));

      return {
        success: true,
        data: {
          subscriptionId,
          status: 'active',
        },
      };
    } catch (error) {
      logger.error('Mock API: Subscription reactivation failed', 'mock-api', { error });
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // Webhook simulation
  async processWebhook(payload: {
    type: string;
    data: any;
  }): Promise<MockAPIResponse<{ processed: boolean }>> {
    try {
      logger.info('Mock API: Processing webhook', 'mock-api', { type: payload.type });
      
      // Simulate webhook processing
      await new Promise(resolve => setTimeout(resolve, 300));

      return {
        success: true,
        data: {
          processed: true,
        },
      };
    } catch (error) {
      logger.error('Mock API: Webhook processing failed', 'mock-api', { error });
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // Health check endpoint
  async healthCheck(): Promise<MockAPIResponse<{ status: string; timestamp: string; services: Record<string, string> }>> {
    return {
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          twilio: 'operational',
          stripe: 'operational',
          azure_ai: 'operational',
          database: 'operational',
        },
      },
    };
  }
}

// Export singleton instance
export const mockAPIService = new MockAPIService();

// Export convenience functions for easy access
export const mockTwilioSMS = (payload: any) => mockAPIService.sendSMS(payload);
export const mockTwilioWhatsApp = (payload: any) => mockAPIService.sendWhatsApp(payload);
export const mockStripePaymentIntent = (payload: any) => mockAPIService.createPaymentIntent(payload);
export const mockStripeRefund = (payload: any) => mockAPIService.processRefund(payload);
export const mockStripeSubscription = (payload: any) => mockAPIService.createSubscription(payload);
export const mockWebhookProcessing = (payload: any) => mockAPIService.processWebhook(payload);
export const mockHealthCheck = () => mockAPIService.healthCheck();
