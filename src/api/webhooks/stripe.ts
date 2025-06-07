/**
 * Stripe Webhook Handler for ClinicBoost
 * Handles all Stripe webhook events for payments, subscriptions, and billing
 */

import Stripe from 'stripe';
import { securityMiddleware } from '../../lib/middleware/security-middleware';
import { logger } from '../../lib/logging-monitoring';
import { handleError } from '../../lib/error-handling';
import { supabase } from '../../lib/supabase';
import { z } from 'zod';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

// Webhook event validation schema
const stripeWebhookEventSchema = z.object({
  id: z.string(),
  object: z.literal('event'),
  type: z.string(),
  data: z.object({
    object: z.any(),
  }),
  created: z.number(),
  livemode: z.boolean(),
  pending_webhooks: z.number(),
  request: z.object({
    id: z.string().nullable(),
    idempotency_key: z.string().nullable(),
  }).nullable(),
});

class StripeWebhookHandler {
  private webhookSecret: string;

  constructor() {
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  }

  /**
   * Verify Stripe webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): Stripe.Event | null {
    if (!this.webhookSecret) {
      logger.warn('Stripe webhook secret not configured', 'stripe-webhook');
      return null;
    }

    try {
      return stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
    } catch (error) {
      logger.error('Stripe webhook signature verification failed', 'stripe-webhook', { error });
      return null;
    }
  }

  /**
   * Handle Stripe webhook event
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Processing Stripe webhook', 'stripe-webhook', {
        eventType: event.type,
        eventId: event.id,
        livemode: event.livemode,
      });

      switch (event.type) {
        // Payment Intent Events
        case 'payment_intent.succeeded':
          return await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        
        case 'payment_intent.payment_failed':
          return await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        
        case 'payment_intent.canceled':
          return await this.handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent);

        // Charge Events
        case 'charge.succeeded':
          return await this.handleChargeSucceeded(event.data.object as Stripe.Charge);
        
        case 'charge.failed':
          return await this.handleChargeFailed(event.data.object as Stripe.Charge);

        // Invoice Events
        case 'invoice.payment_succeeded':
          return await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        
        case 'invoice.payment_failed':
          return await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        
        case 'invoice.created':
          return await this.handleInvoiceCreated(event.data.object as Stripe.Invoice);

        // Subscription Events
        case 'customer.subscription.created':
          return await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        
        case 'customer.subscription.updated':
          return await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        
        case 'customer.subscription.deleted':
          return await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);

        // Customer Events
        case 'customer.created':
          return await this.handleCustomerCreated(event.data.object as Stripe.Customer);
        
        case 'customer.updated':
          return await this.handleCustomerUpdated(event.data.object as Stripe.Customer);

        // Dispute Events
        case 'charge.dispute.created':
          return await this.handleDisputeCreated(event.data.object as Stripe.Dispute);

        default:
          logger.info('Unhandled Stripe webhook event', 'stripe-webhook', { eventType: event.type });
          return { success: true };
      }
    } catch (error) {
      logger.error('Stripe webhook processing failed', 'stripe-webhook', {
        error,
        eventType: event.type,
        eventId: event.id,
      });
      handleError(error as Error, 'stripe-webhook');
      return { success: false, error: (error as Error).message };
    }
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<{ success: boolean; error?: string }> {
    try {
      const { invoice_id, patient_id, clinic_id } = paymentIntent.metadata;

      // Update payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .upsert({
          stripe_payment_intent_id: paymentIntent.id,
          invoice_id,
          patient_id,
          clinic_id,
          amount: paymentIntent.amount / 100, // Convert from cents
          currency: paymentIntent.currency.toUpperCase(),
          payment_method: 'stripe',
          status: 'completed',
          receipt_url: paymentIntent.charges.data[0]?.receipt_url,
          stripe_charge_id: paymentIntent.charges.data[0]?.id,
          processed_at: new Date(paymentIntent.created * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'stripe_payment_intent_id'
        });

      if (paymentError) throw paymentError;

      // Update invoice status
      if (invoice_id) {
        const { error: invoiceError } = await supabase
          .from('invoices')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', invoice_id);

        if (invoiceError) throw invoiceError;
      }

      // Send payment confirmation
      await this.sendPaymentConfirmation(patient_id, paymentIntent);

      logger.info('Payment intent succeeded processed', 'stripe-webhook', {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        invoiceId: invoice_id,
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to process payment intent succeeded', 'stripe-webhook', { error, paymentIntentId: paymentIntent.id });
      return { success: false, error: (error as Error).message };
    }
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<{ success: boolean; error?: string }> {
    try {
      const { invoice_id, patient_id } = paymentIntent.metadata;

      // Update payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .upsert({
          stripe_payment_intent_id: paymentIntent.id,
          invoice_id,
          patient_id,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency.toUpperCase(),
          payment_method: 'stripe',
          status: 'failed',
          failure_reason: paymentIntent.last_payment_error?.message,
          failure_code: paymentIntent.last_payment_error?.code,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'stripe_payment_intent_id'
        });

      if (paymentError) throw paymentError;

      // Send payment failure notification
      await this.sendPaymentFailureNotification(patient_id, paymentIntent);

      logger.warn('Payment intent failed', 'stripe-webhook', {
        paymentIntentId: paymentIntent.id,
        failureReason: paymentIntent.last_payment_error?.message,
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to process payment intent failed', 'stripe-webhook', { error, paymentIntentId: paymentIntent.id });
      return { success: false, error: (error as Error).message };
    }
  }

  private async handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent): Promise<{ success: boolean; error?: string }> {
    try {
      const { invoice_id } = paymentIntent.metadata;

      // Update payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          status: 'canceled',
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_payment_intent_id', paymentIntent.id);

      if (paymentError) throw paymentError;

      logger.info('Payment intent canceled', 'stripe-webhook', {
        paymentIntentId: paymentIntent.id,
        invoiceId: invoice_id,
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to process payment intent canceled', 'stripe-webhook', { error, paymentIntentId: paymentIntent.id });
      return { success: false, error: (error as Error).message };
    }
  }

  private async handleChargeSucceeded(charge: Stripe.Charge): Promise<{ success: boolean; error?: string }> {
    try {
      // Update charge information
      const { error } = await supabase
        .from('payments')
        .update({
          stripe_charge_id: charge.id,
          receipt_url: charge.receipt_url,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_payment_intent_id', charge.payment_intent);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      logger.error('Failed to process charge succeeded', 'stripe-webhook', { error, chargeId: charge.id });
      return { success: false, error: (error as Error).message };
    }
  }

  private async handleChargeFailed(charge: Stripe.Charge): Promise<{ success: boolean; error?: string }> {
    try {
      // Log charge failure
      logger.warn('Charge failed', 'stripe-webhook', {
        chargeId: charge.id,
        failureCode: charge.failure_code,
        failureMessage: charge.failure_message,
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to process charge failed', 'stripe-webhook', { error, chargeId: charge.id });
      return { success: false, error: (error as Error).message };
    }
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<{ success: boolean; error?: string }> {
    try {
      // Handle subscription invoice payments
      if (invoice.subscription) {
        await this.handleSubscriptionInvoicePayment(invoice);
      }

      return { success: true };
    } catch (error) {
      logger.error('Failed to process invoice payment succeeded', 'stripe-webhook', { error, invoiceId: invoice.id });
      return { success: false, error: (error as Error).message };
    }
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<{ success: boolean; error?: string }> {
    try {
      // Handle failed subscription payments
      if (invoice.subscription) {
        await this.handleFailedSubscriptionPayment(invoice);
      }

      return { success: true };
    } catch (error) {
      logger.error('Failed to process invoice payment failed', 'stripe-webhook', { error, invoiceId: invoice.id });
      return { success: false, error: (error as Error).message };
    }
  }

  private async handleInvoiceCreated(invoice: Stripe.Invoice): Promise<{ success: boolean; error?: string }> {
    try {
      // Log invoice creation
      logger.info('Invoice created', 'stripe-webhook', {
        invoiceId: invoice.id,
        customerId: invoice.customer,
        amount: invoice.amount_due / 100,
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to process invoice created', 'stripe-webhook', { error, invoiceId: invoice.id });
      return { success: false, error: (error as Error).message };
    }
  }

  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<{ success: boolean; error?: string }> {
    try {
      // Create subscription record
      const { error } = await supabase
        .from('subscriptions')
        .insert({
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer as string,
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      logger.error('Failed to process subscription created', 'stripe-webhook', { error, subscriptionId: subscription.id });
      return { success: false, error: (error as Error).message };
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<{ success: boolean; error?: string }> {
    try {
      // Update subscription record
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      logger.error('Failed to process subscription updated', 'stripe-webhook', { error, subscriptionId: subscription.id });
      return { success: false, error: (error as Error).message };
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<{ success: boolean; error?: string }> {
    try {
      // Update subscription status
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      logger.error('Failed to process subscription deleted', 'stripe-webhook', { error, subscriptionId: subscription.id });
      return { success: false, error: (error as Error).message };
    }
  }

  private async handleCustomerCreated(customer: Stripe.Customer): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Customer created', 'stripe-webhook', { customerId: customer.id });
      return { success: true };
    } catch (error) {
      logger.error('Failed to process customer created', 'stripe-webhook', { error, customerId: customer.id });
      return { success: false, error: (error as Error).message };
    }
  }

  private async handleCustomerUpdated(customer: Stripe.Customer): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Customer updated', 'stripe-webhook', { customerId: customer.id });
      return { success: true };
    } catch (error) {
      logger.error('Failed to process customer updated', 'stripe-webhook', { error, customerId: customer.id });
      return { success: false, error: (error as Error).message };
    }
  }

  private async handleDisputeCreated(dispute: Stripe.Dispute): Promise<{ success: boolean; error?: string }> {
    try {
      // Log dispute and alert administrators
      logger.warn('Dispute created', 'stripe-webhook', {
        disputeId: dispute.id,
        chargeId: dispute.charge,
        amount: dispute.amount / 100,
        reason: dispute.reason,
      });

      // Create dispute record
      const { error } = await supabase
        .from('payment_disputes')
        .insert({
          stripe_dispute_id: dispute.id,
          stripe_charge_id: dispute.charge as string,
          amount: dispute.amount / 100,
          currency: dispute.currency.toUpperCase(),
          reason: dispute.reason,
          status: dispute.status,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      logger.error('Failed to process dispute created', 'stripe-webhook', { error, disputeId: dispute.id });
      return { success: false, error: (error as Error).message };
    }
  }

  private async sendPaymentConfirmation(patientId: string, paymentIntent: Stripe.PaymentIntent): Promise<void> {
    // Implementation for sending payment confirmation
    // This would integrate with your notification system
    logger.info('Payment confirmation sent', 'stripe-webhook', { patientId, paymentIntentId: paymentIntent.id });
  }

  private async sendPaymentFailureNotification(patientId: string, paymentIntent: Stripe.PaymentIntent): Promise<void> {
    // Implementation for sending payment failure notification
    logger.info('Payment failure notification sent', 'stripe-webhook', { patientId, paymentIntentId: paymentIntent.id });
  }

  private async handleSubscriptionInvoicePayment(invoice: Stripe.Invoice): Promise<void> {
    // Handle subscription-related invoice payments
    logger.info('Subscription invoice payment processed', 'stripe-webhook', { invoiceId: invoice.id });
  }

  private async handleFailedSubscriptionPayment(invoice: Stripe.Invoice): Promise<void> {
    // Handle failed subscription payments
    logger.warn('Subscription payment failed', 'stripe-webhook', { invoiceId: invoice.id });
  }
}

// Export singleton instance
export const stripeWebhookHandler = new StripeWebhookHandler();

// Express.js route handler
export const handleStripeWebhook = async (req: any, res: any) => {
  try {
    // Apply rate limiting
    const rateLimiter = securityMiddleware.createRateLimiter({
      windowMs: 60000, // 1 minute
      maxRequests: 200, // Allow high volume for webhooks
    });

    await new Promise((resolve, reject) => {
      rateLimiter(req, res, (err: any) => {
        if (err) reject(err);
        else resolve(void 0);
      });
    });

    // Get raw body for signature verification
    const signature = req.headers['stripe-signature'];
    const event = stripeWebhookHandler.verifyWebhookSignature(req.body, signature);

    if (!event) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    // Process the webhook event
    const result = await stripeWebhookHandler.handleWebhookEvent(event);

    if (result.success) {
      res.status(200).json({ received: true });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    logger.error('Stripe webhook handler error', 'stripe-webhook', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
};
