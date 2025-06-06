import { secureConfig } from '../config/secure-config';
import { logger } from '../logging-monitoring';
import { handleError } from '../error-handling';
import { supabase } from '../supabase';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  stripePriceId: string;
  maxClinics?: number;
  maxUsers?: number;
  maxPatients?: number;
}

export interface CreateSubscriptionRequest {
  clinicId: string;
  planId: string;
  customerId?: string;
  paymentMethodId: string;
  trialDays?: number;
}

export interface SubscriptionDetails {
  id: string;
  clinicId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  planType: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
  lastPaymentAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSubscriptionRequest {
  subscriptionId: string;
  newPlanId?: string;
  cancelAtPeriodEnd?: boolean;
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
}

class StripeSubscriptionService {
  private readonly SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
    {
      id: 'basic',
      name: 'Basic Plan',
      description: 'Perfect for small clinics',
      price: 2900, // 29.00 MAD
      currency: 'MAD',
      interval: 'month',
      stripePriceId: 'price_basic_monthly',
      maxClinics: 1,
      maxUsers: 3,
      maxPatients: 100,
      features: [
        'Patient Management',
        'Appointment Scheduling',
        'Basic Billing',
        'SMS Notifications',
        'Email Support',
      ],
    },
    {
      id: 'professional',
      name: 'Professional Plan',
      description: 'For growing practices',
      price: 5900, // 59.00 MAD
      currency: 'MAD',
      interval: 'month',
      stripePriceId: 'price_professional_monthly',
      maxClinics: 3,
      maxUsers: 10,
      maxPatients: 500,
      features: [
        'All Basic features',
        'Advanced Analytics',
        'Multi-clinic Support',
        'WhatsApp Integration',
        'Priority Support',
        'Custom Reports',
      ],
    },
    {
      id: 'enterprise',
      name: 'Enterprise Plan',
      description: 'For large organizations',
      price: 9900, // 99.00 MAD
      currency: 'MAD',
      interval: 'month',
      stripePriceId: 'price_enterprise_monthly',
      features: [
        'All Professional features',
        'Unlimited Clinics',
        'Unlimited Users',
        'Unlimited Patients',
        'API Access',
        'Custom Integrations',
        'Dedicated Support',
        'On-premise Option',
      ],
    },
  ];

  getAvailablePlans(): SubscriptionPlan[] {
    return this.SUBSCRIPTION_PLANS;
  }

  getPlanById(planId: string): SubscriptionPlan | null {
    return this.SUBSCRIPTION_PLANS.find(plan => plan.id === planId) || null;
  }

  async createSubscription(request: CreateSubscriptionRequest): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
    try {
      const plan = this.getPlanById(request.planId);
      if (!plan) {
        throw new Error(`Invalid plan ID: ${request.planId}`);
      }

      logger.info('Creating subscription', 'stripe-subscription', {
        clinicId: request.clinicId,
        planId: request.planId,
        trialDays: request.trialDays,
      });

      // In production, this would call your backend API
      if (secureConfig.isDevelopment()) {
        // Mock subscription creation
        const mockSubscriptionId = `sub_${Date.now()}`;
        
        // Create subscription record in database
        const { error: dbError } = await supabase
          .from('subscriptions')
          .insert({
            clinic_id: request.clinicId,
            stripe_subscription_id: mockSubscriptionId,
            stripe_customer_id: request.customerId || `cus_${Date.now()}`,
            plan_type: request.planId,
            status: request.trialDays ? 'trialing' : 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            trial_end: request.trialDays ? new Date(Date.now() + request.trialDays * 24 * 60 * 60 * 1000).toISOString() : null,
            created_at: new Date().toISOString(),
          });

        if (dbError) {
          throw dbError;
        }

        logger.info('Subscription created successfully (mock)', 'stripe-subscription', {
          subscriptionId: mockSubscriptionId,
          clinicId: request.clinicId,
        });

        return { success: true, subscriptionId: mockSubscriptionId };
      } else {
        // Production: Call backend API
        const response = await fetch('/api/stripe/subscriptions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          throw new Error(`Subscription API error: ${response.status}`);
        }

        const result = await response.json();
        logger.info('Subscription created successfully', 'stripe-subscription', {
          subscriptionId: result.subscriptionId,
          clinicId: request.clinicId,
        });

        return { success: true, subscriptionId: result.subscriptionId };
      }
    } catch (error) {
      logger.error('Failed to create subscription', 'stripe-subscription', { error, request });
      handleError(error as Error, 'stripe-subscription-create');
      return { success: false, error: (error as Error).message };
    }
  }

  async getSubscription(clinicId: string): Promise<SubscriptionDetails | null> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('status', 'active')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No subscription found
          return null;
        }
        throw error;
      }

      return {
        id: data.id,
        clinicId: data.clinic_id,
        stripeSubscriptionId: data.stripe_subscription_id,
        stripeCustomerId: data.stripe_customer_id,
        planType: data.plan_type,
        status: data.status,
        currentPeriodStart: data.current_period_start,
        currentPeriodEnd: data.current_period_end,
        cancelAtPeriodEnd: data.cancel_at_period_end || false,
        trialEnd: data.trial_end,
        lastPaymentAt: data.last_payment_at,
        cancelledAt: data.cancelled_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      logger.error('Failed to get subscription', 'stripe-subscription', { error, clinicId });
      handleError(error as Error, 'stripe-subscription-get');
      return null;
    }
  }

  async updateSubscription(request: UpdateSubscriptionRequest): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Updating subscription', 'stripe-subscription', request);

      if (secureConfig.isDevelopment()) {
        // Mock subscription update
        const updateData: any = {
          updated_at: new Date().toISOString(),
        };

        if (request.newPlanId) {
          updateData.plan_type = request.newPlanId;
        }

        if (request.cancelAtPeriodEnd !== undefined) {
          updateData.cancel_at_period_end = request.cancelAtPeriodEnd;
        }

        const { error: dbError } = await supabase
          .from('subscriptions')
          .update(updateData)
          .eq('stripe_subscription_id', request.subscriptionId);

        if (dbError) {
          throw dbError;
        }

        logger.info('Subscription updated successfully (mock)', 'stripe-subscription', {
          subscriptionId: request.subscriptionId,
        });

        return { success: true };
      } else {
        // Production: Call backend API
        const response = await fetch(`/api/stripe/subscriptions/${request.subscriptionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          throw new Error(`Subscription update API error: ${response.status}`);
        }

        logger.info('Subscription updated successfully', 'stripe-subscription', {
          subscriptionId: request.subscriptionId,
        });

        return { success: true };
      }
    } catch (error) {
      logger.error('Failed to update subscription', 'stripe-subscription', { error, request });
      handleError(error as Error, 'stripe-subscription-update');
      return { success: false, error: (error as Error).message };
    }
  }

  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean = true): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Cancelling subscription', 'stripe-subscription', {
        subscriptionId,
        cancelAtPeriodEnd,
      });

      if (secureConfig.isDevelopment()) {
        // Mock subscription cancellation
        const updateData: any = {
          cancel_at_period_end: cancelAtPeriodEnd,
          updated_at: new Date().toISOString(),
        };

        if (!cancelAtPeriodEnd) {
          updateData.status = 'cancelled';
          updateData.cancelled_at = new Date().toISOString();
        }

        const { error: dbError } = await supabase
          .from('subscriptions')
          .update(updateData)
          .eq('stripe_subscription_id', subscriptionId);

        if (dbError) {
          throw dbError;
        }

        logger.info('Subscription cancelled successfully (mock)', 'stripe-subscription', {
          subscriptionId,
        });

        return { success: true };
      } else {
        // Production: Call backend API
        const response = await fetch(`/api/stripe/subscriptions/${subscriptionId}/cancel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ cancelAtPeriodEnd }),
        });

        if (!response.ok) {
          throw new Error(`Subscription cancellation API error: ${response.status}`);
        }

        logger.info('Subscription cancelled successfully', 'stripe-subscription', {
          subscriptionId,
        });

        return { success: true };
      }
    } catch (error) {
      logger.error('Failed to cancel subscription', 'stripe-subscription', { error, subscriptionId });
      handleError(error as Error, 'stripe-subscription-cancel');
      return { success: false, error: (error as Error).message };
    }
  }

  async reactivateSubscription(subscriptionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Reactivating subscription', 'stripe-subscription', { subscriptionId });

      const { error: dbError } = await supabase
        .from('subscriptions')
        .update({
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscriptionId);

      if (dbError) {
        throw dbError;
      }

      if (!secureConfig.isDevelopment()) {
        // Production: Call backend API
        const response = await fetch(`/api/stripe/subscriptions/${subscriptionId}/reactivate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Subscription reactivation API error: ${response.status}`);
        }
      }

      logger.info('Subscription reactivated successfully', 'stripe-subscription', {
        subscriptionId,
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to reactivate subscription', 'stripe-subscription', { error, subscriptionId });
      handleError(error as Error, 'stripe-subscription-reactivate');
      return { success: false, error: (error as Error).message };
    }
  }

  async getUsageStats(clinicId: string): Promise<{
    currentUsers: number;
    currentPatients: number;
    currentClinics: number;
    limits: {
      maxUsers?: number;
      maxPatients?: number;
      maxClinics?: number;
    };
  } | null> {
    try {
      const subscription = await this.getSubscription(clinicId);
      if (!subscription) {
        return null;
      }

      const plan = this.getPlanById(subscription.planType);
      if (!plan) {
        return null;
      }

      // Get current usage from database
      const [usersResult, patientsResult, clinicsResult] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact' }).eq('clinic_id', clinicId),
        supabase.from('patients').select('id', { count: 'exact' }).eq('clinic_id', clinicId),
        supabase.from('clinics').select('id', { count: 'exact' }).eq('id', clinicId),
      ]);

      return {
        currentUsers: usersResult.count || 0,
        currentPatients: patientsResult.count || 0,
        currentClinics: clinicsResult.count || 0,
        limits: {
          maxUsers: plan.maxUsers,
          maxPatients: plan.maxPatients,
          maxClinics: plan.maxClinics,
        },
      };
    } catch (error) {
      logger.error('Failed to get usage stats', 'stripe-subscription', { error, clinicId });
      return null;
    }
  }
}

// Export singleton instance
export const stripeSubscriptionService = new StripeSubscriptionService();

// Export convenience functions
export const getSubscriptionPlans = () => stripeSubscriptionService.getAvailablePlans();
export const createSubscription = (request: CreateSubscriptionRequest) => stripeSubscriptionService.createSubscription(request);
export const getSubscription = (clinicId: string) => stripeSubscriptionService.getSubscription(clinicId);
export const updateSubscription = (request: UpdateSubscriptionRequest) => stripeSubscriptionService.updateSubscription(request);
export const cancelSubscription = (subscriptionId: string, cancelAtPeriodEnd?: boolean) => 
  stripeSubscriptionService.cancelSubscription(subscriptionId, cancelAtPeriodEnd);
export const reactivateSubscription = (subscriptionId: string) => stripeSubscriptionService.reactivateSubscription(subscriptionId);
export const getUsageStats = (clinicId: string) => stripeSubscriptionService.getUsageStats(clinicId);
