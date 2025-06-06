import { secureConfig } from '../config/secure-config';
import { logger } from '../logging-monitoring';
import { handleError } from '../error-handling';
import { supabase } from '../supabase';

export interface WebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
    previous_attributes?: any;
  };
  created: number;
  livemode: boolean;
  pending_webhooks: number;
  request: {
    id: string | null;
    idempotency_key: string | null;
  };
}

export interface PaymentIntentWebhookData {
  id: string;
  amount: number;
  currency: string;
  status: string;
  customer?: string;
  metadata: Record<string, string>;
  charges: {
    data: Array<{
      id: string;
      amount: number;
      currency: string;
      status: string;
      receipt_url?: string;
    }>;
  };
}

export interface SubscriptionWebhookData {
  id: string;
  customer: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  items: {
    data: Array<{
      id: string;
      price: {
        id: string;
        unit_amount: number;
        currency: string;
        recurring: {
          interval: string;
          interval_count: number;
        };
      };
    }>;
  };
  metadata: Record<string, string>;
}

class StripeWebhookHandler {
  private webhookSecret: string;

  constructor() {
    const config = secureConfig.getAppConfig();
    this.webhookSecret = config.integrations.stripe.webhookSecret || '';
  }

  async verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
    if (!this.webhookSecret) {
      logger.warn('Stripe webhook secret not configured', 'stripe-webhook');
      return false;
    }

    try {
      // In a real implementation, you would use Stripe's webhook signature verification
      // This is a simplified version for demonstration
      const expectedSignature = this.generateSignature(payload);
      return signature === expectedSignature;
    } catch (error) {
      logger.error('Webhook signature verification failed', 'stripe-webhook', { error });
      return false;
    }
  }

  private generateSignature(payload: string): string {
    // Simplified signature generation - in production use Stripe's actual verification
    return `v1=${Buffer.from(payload + this.webhookSecret).toString('base64')}`;
  }

  async handleWebhook(event: WebhookEvent): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Processing Stripe webhook', 'stripe-webhook', { 
        eventType: event.type, 
        eventId: event.id 
      });

      switch (event.type) {
        case 'payment_intent.succeeded':
          return await this.handlePaymentIntentSucceeded(event.data.object as PaymentIntentWebhookData);
        
        case 'payment_intent.payment_failed':
          return await this.handlePaymentIntentFailed(event.data.object as PaymentIntentWebhookData);
        
        case 'customer.subscription.created':
          return await this.handleSubscriptionCreated(event.data.object as SubscriptionWebhookData);
        
        case 'customer.subscription.updated':
          return await this.handleSubscriptionUpdated(event.data.object as SubscriptionWebhookData);
        
        case 'customer.subscription.deleted':
          return await this.handleSubscriptionDeleted(event.data.object as SubscriptionWebhookData);
        
        case 'invoice.payment_succeeded':
          return await this.handleInvoicePaymentSucceeded(event.data.object);
        
        case 'invoice.payment_failed':
          return await this.handleInvoicePaymentFailed(event.data.object);
        
        default:
          logger.info('Unhandled webhook event type', 'stripe-webhook', { eventType: event.type });
          return { success: true };
      }
    } catch (error) {
      logger.error('Webhook processing failed', 'stripe-webhook', { 
        error, 
        eventType: event.type, 
        eventId: event.id 
      });
      handleError(error as Error, 'stripe-webhook');
      return { success: false, error: (error as Error).message };
    }
  }

  private async handlePaymentIntentSucceeded(paymentIntent: PaymentIntentWebhookData): Promise<{ success: boolean; error?: string }> {
    try {
      const { invoice_id, patient_id, clinic_id } = paymentIntent.metadata;

      if (!invoice_id) {
        throw new Error('Invoice ID not found in payment intent metadata');
      }

      // Update invoice status in database
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_method: 'stripe',
          stripe_payment_intent_id: paymentIntent.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoice_id);

      if (updateError) {
        throw updateError;
      }

      // Create payment record
      const charge = paymentIntent.charges.data[0];
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          invoice_id,
          patient_id,
          clinic_id,
          amount: paymentIntent.amount / 100, // Convert from cents
          currency: paymentIntent.currency.toUpperCase(),
          payment_method: 'stripe',
          stripe_payment_intent_id: paymentIntent.id,
          stripe_charge_id: charge?.id,
          receipt_url: charge?.receipt_url,
          status: 'completed',
          created_at: new Date().toISOString(),
        });

      if (paymentError) {
        throw paymentError;
      }

      logger.info('Payment intent succeeded processed', 'stripe-webhook', {
        paymentIntentId: paymentIntent.id,
        invoiceId: invoice_id,
        amount: paymentIntent.amount / 100,
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to process payment intent succeeded', 'stripe-webhook', { error });
      return { success: false, error: (error as Error).message };
    }
  }

  private async handlePaymentIntentFailed(paymentIntent: PaymentIntentWebhookData): Promise<{ success: boolean; error?: string }> {
    try {
      const { invoice_id } = paymentIntent.metadata;

      if (!invoice_id) {
        throw new Error('Invoice ID not found in payment intent metadata');
      }

      // Update invoice status
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          status: 'payment_failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoice_id);

      if (updateError) {
        throw updateError;
      }

      logger.info('Payment intent failed processed', 'stripe-webhook', {
        paymentIntentId: paymentIntent.id,
        invoiceId: invoice_id,
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to process payment intent failed', 'stripe-webhook', { error });
      return { success: false, error: (error as Error).message };
    }
  }

  private async handleSubscriptionCreated(subscription: SubscriptionWebhookData): Promise<{ success: boolean; error?: string }> {
    try {
      const { clinic_id, plan_type } = subscription.metadata;

      if (!clinic_id) {
        throw new Error('Clinic ID not found in subscription metadata');
      }

      // Create subscription record
      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert({
          clinic_id,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer,
          plan_type: plan_type || 'basic',
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          created_at: new Date().toISOString(),
        });

      if (subscriptionError) {
        throw subscriptionError;
      }

      logger.info('Subscription created processed', 'stripe-webhook', {
        subscriptionId: subscription.id,
        clinicId: clinic_id,
        status: subscription.status,
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to process subscription created', 'stripe-webhook', { error });
      return { success: false, error: (error as Error).message };
    }
  }

  private async handleSubscriptionUpdated(subscription: SubscriptionWebhookData): Promise<{ success: boolean; error?: string }> {
    try {
      // Update subscription record
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);

      if (updateError) {
        throw updateError;
      }

      logger.info('Subscription updated processed', 'stripe-webhook', {
        subscriptionId: subscription.id,
        status: subscription.status,
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to process subscription updated', 'stripe-webhook', { error });
      return { success: false, error: (error as Error).message };
    }
  }

  private async handleSubscriptionDeleted(subscription: SubscriptionWebhookData): Promise<{ success: boolean; error?: string }> {
    try {
      // Update subscription status to cancelled
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);

      if (updateError) {
        throw updateError;
      }

      logger.info('Subscription deleted processed', 'stripe-webhook', {
        subscriptionId: subscription.id,
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to process subscription deleted', 'stripe-webhook', { error });
      return { success: false, error: (error as Error).message };
    }
  }

  private async handleInvoicePaymentSucceeded(invoice: any): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Invoice payment succeeded', 'stripe-webhook', {
        invoiceId: invoice.id,
        subscriptionId: invoice.subscription,
      });

      // Handle recurring subscription payments
      if (invoice.subscription) {
        // Update subscription last payment date
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            last_payment_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', invoice.subscription);

        if (updateError) {
          throw updateError;
        }
      }

      return { success: true };
    } catch (error) {
      logger.error('Failed to process invoice payment succeeded', 'stripe-webhook', { error });
      return { success: false, error: (error as Error).message };
    }
  }

  private async handleInvoicePaymentFailed(invoice: any): Promise<{ success: boolean; error?: string }> {
    try {
      logger.warn('Invoice payment failed', 'stripe-webhook', {
        invoiceId: invoice.id,
        subscriptionId: invoice.subscription,
      });

      // Handle failed subscription payments
      if (invoice.subscription) {
        // You might want to send notifications or take other actions here
        logger.warn('Subscription payment failed', 'stripe-webhook', {
          subscriptionId: invoice.subscription,
        });
      }

      return { success: true };
    } catch (error) {
      logger.error('Failed to process invoice payment failed', 'stripe-webhook', { error });
      return { success: false, error: (error as Error).message };
    }
  }
}

// Export singleton instance
export const stripeWebhookHandler = new StripeWebhookHandler();

// Export convenience function
export const processStripeWebhook = (event: WebhookEvent) => stripeWebhookHandler.handleWebhook(event);
export const verifyStripeWebhook = (payload: string, signature: string) => 
  stripeWebhookHandler.verifyWebhookSignature(payload, signature);
