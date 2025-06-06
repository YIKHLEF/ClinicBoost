import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { azureAIService, analyzeSentiment, extractKeyPhrases, analyzePatientFeedback } from '../../lib/integrations/azure-ai';
import { sendSMS, sendWhatsApp, getTwilioStatus } from '../../utils/twilio';
import { processRefund, createPaymentIntent } from '../../lib/stripe';
import { stripeSubscriptionService, createSubscription, getSubscription } from '../../lib/integrations/stripe-subscriptions';
import { stripeWebhookHandler, processStripeWebhook } from '../../lib/integrations/stripe-webhooks';
import { mockAPIService } from '../../lib/api/mock-endpoints';

// Mock external dependencies
vi.mock('@azure/ai-text-analytics', () => ({
  TextAnalyticsClient: vi.fn().mockImplementation(() => ({
    analyzeSentiment: vi.fn().mockResolvedValue([{
      sentiment: 'positive',
      confidenceScores: {
        positive: 0.9,
        negative: 0.05,
        neutral: 0.05,
      },
    }]),
    extractKeyPhrases: vi.fn().mockResolvedValue([{
      keyPhrases: ['excellent service', 'professional staff', 'clean facility'],
    }]),
    recognizeEntities: vi.fn().mockResolvedValue([{
      entities: [{
        text: 'dental cleaning',
        category: 'HealthcareEntity',
        confidenceScore: 0.95,
      }],
    }]),
    detectLanguage: vi.fn().mockResolvedValue([{
      primaryLanguage: {
        iso6391Name: 'en',
        confidenceScore: 0.99,
      },
    }]),
  })),
  AzureKeyCredential: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'test-subscription',
              clinic_id: 'test-clinic',
              stripe_subscription_id: 'sub_test',
              plan_type: 'professional',
              status: 'active',
            },
            error: null,
          }),
        }),
      }),
    }),
  },
}));

describe('Azure AI Text Analytics Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should analyze sentiment correctly', async () => {
    const result = await analyzeSentiment('I love this dental clinic! The staff is amazing.');
    
    expect(result).toBeDefined();
    expect(result?.sentiment).toBe('positive');
    expect(result?.confidence).toBeGreaterThan(0.8);
  });

  it('should extract key phrases', async () => {
    const result = await extractKeyPhrases('The dental cleaning was excellent and the staff was very professional.');
    
    expect(result).toBeDefined();
    expect(result?.keyPhrases).toContain('excellent service');
    expect(result?.keyPhrases.length).toBeGreaterThan(0);
  });

  it('should analyze patient feedback comprehensively', async () => {
    const feedback = 'I had a great experience at the clinic. The dentist was very professional and the cleaning was thorough.';
    const result = await analyzePatientFeedback(feedback);
    
    expect(result).toBeDefined();
    expect(result?.sentiment).toBeDefined();
    expect(result?.keyPhrases).toBeDefined();
    expect(result?.entities).toBeDefined();
    expect(result?.language).toBeDefined();
    expect(result?.riskScore).toBeDefined();
    expect(result?.recommendations).toBeDefined();
    expect(result?.riskScore).toBeLessThan(30); // Positive feedback should have low risk
  });

  it('should handle rate limiting', async () => {
    // Simulate multiple rapid requests
    const promises = Array(25).fill(0).map(() => 
      analyzeSentiment('Test message')
    );
    
    const results = await Promise.allSettled(promises);
    const rejectedResults = results.filter(r => r.status === 'rejected');
    
    // Some requests should be rate limited
    expect(rejectedResults.length).toBeGreaterThan(0);
  });

  it('should calculate risk scores correctly', async () => {
    const negativeFeedback = 'I am very unhappy with the service. The dentist was rude and the treatment was painful.';
    const result = await analyzePatientFeedback(negativeFeedback);
    
    expect(result?.riskScore).toBeGreaterThan(50); // Negative feedback should have high risk
    expect(result?.recommendations).toContain('High priority: Schedule immediate follow-up call');
  });
});

describe('Twilio Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send SMS successfully', async () => {
    const result = await sendSMS({
      to: '+212612345678',
      body: 'Test SMS message',
    });
    
    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    expect(result.messageId).toMatch(/^SM/);
  });

  it('should send WhatsApp message successfully', async () => {
    const result = await sendWhatsApp({
      to: '+212612345678',
      body: 'Test WhatsApp message',
    });
    
    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    expect(result.messageId).toMatch(/^WA/);
  });

  it('should validate phone numbers', async () => {
    const invalidResult = await sendSMS({
      to: 'invalid-phone',
      body: 'Test message',
    });
    
    expect(invalidResult.success).toBe(false);
    expect(invalidResult.error).toContain('Invalid phone number');
  });

  it('should check configuration status', () => {
    const status = getTwilioStatus();
    
    expect(status).toBeDefined();
    expect(status.initialized).toBeDefined();
    expect(status.errors).toBeDefined();
    expect(status.warnings).toBeDefined();
  });

  it('should handle rate limiting for SMS', async () => {
    // Simulate rapid SMS sending
    const promises = Array(15).fill(0).map(() => 
      sendSMS({
        to: '+212612345678',
        body: 'Test message',
      })
    );
    
    const results = await Promise.allSettled(promises);
    const rejectedResults = results.filter(r => r.status === 'rejected');
    
    // Some requests should be rate limited
    expect(rejectedResults.length).toBeGreaterThan(0);
  });
});

describe('Stripe Payment Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create payment intent', async () => {
    const result = await createPaymentIntent({
      amount: 5000,
      currency: 'mad',
      description: 'Test payment',
    });
    
    expect(result).toBeDefined();
    expect(result.id).toMatch(/^pi_/);
    expect(result.client_secret).toBeDefined();
  });

  it('should process refunds', async () => {
    const result = await processRefund({
      paymentIntentId: 'pi_test123',
      amount: 2500,
      reason: 'requested_by_customer',
    });
    
    expect(result.success).toBe(true);
    expect(result.refund).toBeDefined();
    expect(result.refund?.id).toMatch(/^re_/);
  });

  it('should handle refund errors', async () => {
    // Mock a failed refund
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));
    
    const result = await processRefund({
      paymentIntentId: 'pi_invalid',
      amount: 1000,
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('Stripe Subscription Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should get available subscription plans', () => {
    const plans = stripeSubscriptionService.getAvailablePlans();
    
    expect(plans).toBeDefined();
    expect(plans.length).toBeGreaterThan(0);
    expect(plans[0]).toHaveProperty('id');
    expect(plans[0]).toHaveProperty('name');
    expect(plans[0]).toHaveProperty('price');
  });

  it('should create subscription', async () => {
    const result = await createSubscription({
      clinicId: 'test-clinic',
      planId: 'professional',
      paymentMethodId: 'pm_test123',
    });
    
    expect(result.success).toBe(true);
    expect(result.subscriptionId).toBeDefined();
  });

  it('should get subscription details', async () => {
    const subscription = await getSubscription('test-clinic');
    
    expect(subscription).toBeDefined();
    expect(subscription?.clinicId).toBe('test-clinic');
    expect(subscription?.planType).toBe('professional');
  });

  it('should validate plan IDs', async () => {
    const result = await createSubscription({
      clinicId: 'test-clinic',
      planId: 'invalid-plan',
      paymentMethodId: 'pm_test123',
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid plan ID');
  });
});

describe('Stripe Webhook Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process payment intent succeeded webhook', async () => {
    const webhookEvent = {
      id: 'evt_test123',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test123',
          amount: 5000,
          currency: 'mad',
          status: 'succeeded',
          metadata: {
            invoice_id: 'inv_test123',
            patient_id: 'pat_test123',
            clinic_id: 'clinic_test123',
          },
          charges: {
            data: [{
              id: 'ch_test123',
              amount: 5000,
              currency: 'mad',
              status: 'succeeded',
              receipt_url: 'https://receipt.stripe.com/test',
            }],
          },
        },
      },
      created: Date.now(),
      livemode: false,
      pending_webhooks: 1,
      request: { id: null, idempotency_key: null },
    };
    
    const result = await processStripeWebhook(webhookEvent);
    
    expect(result.success).toBe(true);
  });

  it('should process subscription created webhook', async () => {
    const webhookEvent = {
      id: 'evt_test123',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_test123',
          customer: 'cus_test123',
          status: 'active',
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 2592000, // 30 days
          items: {
            data: [{
              id: 'si_test123',
              price: {
                id: 'price_test123',
                unit_amount: 5900,
                currency: 'mad',
                recurring: { interval: 'month', interval_count: 1 },
              },
            }],
          },
          metadata: {
            clinic_id: 'clinic_test123',
            plan_type: 'professional',
          },
        },
      },
      created: Date.now(),
      livemode: false,
      pending_webhooks: 1,
      request: { id: null, idempotency_key: null },
    };
    
    const result = await processStripeWebhook(webhookEvent);
    
    expect(result.success).toBe(true);
  });

  it('should handle unknown webhook events gracefully', async () => {
    const webhookEvent = {
      id: 'evt_test123',
      type: 'unknown.event.type',
      data: { object: {} },
      created: Date.now(),
      livemode: false,
      pending_webhooks: 1,
      request: { id: null, idempotency_key: null },
    };
    
    const result = await processStripeWebhook(webhookEvent);
    
    expect(result.success).toBe(true); // Should handle gracefully
  });
});

describe('Mock API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide health check', async () => {
    const result = await mockAPIService.healthCheck();
    
    expect(result.success).toBe(true);
    expect(result.data?.status).toBe('healthy');
    expect(result.data?.services).toBeDefined();
  });

  it('should simulate API delays', async () => {
    const startTime = Date.now();
    await mockAPIService.sendSMS({
      to: '+212612345678',
      body: 'Test',
      from: '+1234567890',
    });
    const endTime = Date.now();
    
    expect(endTime - startTime).toBeGreaterThan(400); // Should have some delay
  });

  it('should simulate occasional failures', async () => {
    // Run multiple requests to test failure simulation
    const promises = Array(20).fill(0).map(() => 
      mockAPIService.sendSMS({
        to: '+212612345678',
        body: 'Test',
        from: '+1234567890',
      })
    );
    
    const results = await Promise.all(promises);
    const failures = results.filter(r => !r.success);
    
    // Should have some failures (5% failure rate)
    expect(failures.length).toBeGreaterThan(0);
  });
});
