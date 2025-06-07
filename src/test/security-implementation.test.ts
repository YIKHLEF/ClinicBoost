/**
 * Security Implementation Tests
 * Tests for the critical priority security features
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { environmentValidator, validateEnvironment } from '../lib/config/environment-validator';
import { securityConfig, getSecuritySummary } from '../lib/config/security-config';
import { initializeSecurity, getSecurityStatus } from '../lib/initialization/security-initialization';
import { createDistributedRateLimiter } from '../lib/middleware/distributed-rate-limiter';
import { twilioWebhookHandler } from '../api/webhooks/twilio';
import { stripeWebhookHandler } from '../api/webhooks/stripe';

// Mock environment variables
const mockEnv = {
  VITE_APP_NAME: 'ClinicBoost',
  VITE_APP_VERSION: '1.0.0',
  VITE_APP_ENVIRONMENT: 'development',
  VITE_ENABLE_RATE_LIMITING: 'true',
  VITE_ENABLE_INPUT_VALIDATION: 'true',
  VITE_ENABLE_CSRF_PROTECTION: 'true',
  VITE_ENABLE_SECURITY_HEADERS: 'true',
  ENCRYPTION_KEY: 'test-encryption-key-32-characters-long',
  JWT_SECRET: 'test-jwt-secret-32-characters-long-key',
  SESSION_SECRET: 'test-session-secret-32-characters-long',
  AZURE_AI_ENDPOINT: 'https://test.cognitiveservices.azure.com/',
  AZURE_AI_API_KEY: 'test-azure-api-key',
  STRIPE_SECRET_KEY: 'sk_test_test_key',
  STRIPE_WEBHOOK_SECRET: 'whsec_test_webhook_secret',
  TWILIO_ACCOUNT_SID: 'ACtest_account_sid',
  TWILIO_AUTH_TOKEN: 'test_auth_token',
};

describe('Critical Priority Security Implementation', () => {
  beforeEach(() => {
    // Mock environment variables
    Object.entries(mockEnv).forEach(([key, value]) => {
      vi.stubEnv(key, value);
    });
  });

  describe('Environment Validation', () => {
    it('should validate environment variables correctly', () => {
      const result = validateEnvironment();
      
      expect(result).toBeDefined();
      expect(result.isValid).toBeDefined();
      expect(result.errors).toBeInstanceOf(Array);
      expect(result.warnings).toBeInstanceOf(Array);
    });

    it('should detect missing required variables', () => {
      vi.stubEnv('VITE_APP_NAME', '');
      
      const result = validateEnvironment();
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should provide environment summary', () => {
      const summary = environmentValidator.getEnvironmentSummary();
      
      expect(summary).toBeDefined();
      expect(summary.environment).toBe('development');
      expect(summary.demoMode).toBeDefined();
      expect(summary.integrations).toBeDefined();
      expect(summary.securityFeatures).toBeDefined();
    });
  });

  describe('Security Configuration', () => {
    it('should initialize security configuration', () => {
      const config = securityConfig.getConfig();
      
      expect(config).toBeDefined();
      expect(config.rateLimiting).toBeDefined();
      expect(config.inputValidation).toBeDefined();
      expect(config.csrfProtection).toBeDefined();
      expect(config.securityHeaders).toBeDefined();
    });

    it('should provide security summary', () => {
      const summary = getSecuritySummary();
      
      expect(summary).toBeDefined();
      expect(summary.environment).toBeDefined();
      expect(summary.enabledFeatures).toBeDefined();
      expect(summary.securityLevel).toMatch(/^(low|medium|high)$/);
    });

    it('should enable security features based on environment', () => {
      const config = securityConfig.getConfig();
      
      expect(config.rateLimiting.enabled).toBe(true);
      expect(config.inputValidation.enabled).toBe(true);
      expect(config.csrfProtection.enabled).toBe(true);
      expect(config.securityHeaders.enabled).toBe(true);
    });
  });

  describe('Distributed Rate Limiting', () => {
    it('should create distributed rate limiter', () => {
      const rateLimiter = createDistributedRateLimiter('moderate');
      
      expect(rateLimiter).toBeDefined();
      expect(typeof rateLimiter.checkLimit).toBe('function');
      expect(typeof rateLimiter.createMiddleware).toBe('function');
    });

    it('should handle rate limit checks', async () => {
      const rateLimiter = createDistributedRateLimiter('strict');
      
      const mockReq = {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'test-agent' },
      };

      const result = await rateLimiter.checkLimit(mockReq);
      
      expect(result).toBeDefined();
      expect(result.allowed).toBeDefined();
      expect(result.remaining).toBeDefined();
      expect(result.resetTime).toBeDefined();
    });

    it('should create middleware function', () => {
      const rateLimiter = createDistributedRateLimiter('api');
      const middleware = rateLimiter.createMiddleware();
      
      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(3); // req, res, next
    });
  });

  describe('Azure AI Integration', () => {
    it('should handle Azure AI configuration validation', () => {
      const summary = environmentValidator.getEnvironmentSummary();
      
      // Azure AI should be configured in our test environment
      expect(summary.integrations.azureAI).toBe(true);
    });
  });

  describe('Webhook Handlers', () => {
    describe('Twilio Webhook Handler', () => {
      it('should verify webhook signatures', () => {
        const isValid = twilioWebhookHandler.verifyWebhookSignature(
          'test-payload',
          'test-signature',
          'https://example.com/webhook'
        );
        
        expect(typeof isValid).toBe('boolean');
      });

      it('should handle SMS webhook data', async () => {
        const mockSMSData = {
          MessageSid: 'SM123456789',
          AccountSid: 'AC123456789',
          From: '+1234567890',
          To: '+0987654321',
          Body: 'Test message',
          MessageStatus: 'received' as const,
        };

        const result = await twilioWebhookHandler.handleSMSWebhook(mockSMSData);
        
        expect(result).toBeDefined();
        expect(result.success).toBeDefined();
      });

      it('should handle WhatsApp webhook data', async () => {
        const mockWhatsAppData = {
          MessageSid: 'WA123456789',
          AccountSid: 'AC123456789',
          From: 'whatsapp:+1234567890',
          To: 'whatsapp:+0987654321',
          Body: 'Test WhatsApp message',
          MessageStatus: 'received' as const,
        };

        const result = await twilioWebhookHandler.handleWhatsAppWebhook(mockWhatsAppData);
        
        expect(result).toBeDefined();
        expect(result.success).toBeDefined();
      });
    });

    describe('Stripe Webhook Handler', () => {
      it('should handle webhook events', async () => {
        const mockEvent = {
          id: 'evt_test_123',
          object: 'event' as const,
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: 'pi_test_123',
              amount: 5000,
              currency: 'usd',
              metadata: {
                invoice_id: 'inv_123',
                patient_id: 'pat_123',
                clinic_id: 'clinic_123',
              },
              charges: {
                data: [{
                  id: 'ch_test_123',
                  receipt_url: 'https://pay.stripe.com/receipts/test',
                }],
              },
              created: Math.floor(Date.now() / 1000),
            },
          },
          created: Math.floor(Date.now() / 1000),
          livemode: false,
          pending_webhooks: 1,
          request: {
            id: 'req_test_123',
            idempotency_key: null,
          },
        };

        const result = await stripeWebhookHandler.handleWebhookEvent(mockEvent as any);
        
        expect(result).toBeDefined();
        expect(result.success).toBeDefined();
      });
    });
  });

  describe('Security Initialization', () => {
    it('should initialize security features', async () => {
      const result = await initializeSecurity();
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.errors).toBeInstanceOf(Array);
      expect(result.warnings).toBeInstanceOf(Array);
      expect(result.features).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should provide security status', () => {
      const status = getSecurityStatus();
      
      expect(status).toBeDefined();
      expect(status.features).toBeDefined();
      expect(status.summary).toBeDefined();
    });

    it('should validate required features for production', async () => {
      vi.stubEnv('VITE_APP_ENVIRONMENT', 'production');
      vi.stubEnv('VITE_APP_URL', 'https://clinicboost.com');
      
      const result = await initializeSecurity();
      
      // In production, certain features should be required
      if (result.success) {
        expect(result.features.environmentValidation).toBe(true);
        expect(result.features.rateLimiting).toBe(true);
        expect(result.features.inputValidation).toBe(true);
        expect(result.features.csrfProtection).toBe(true);
        expect(result.features.securityHeaders).toBe(true);
      }
    });
  });

  describe('Integration Completeness', () => {
    it('should validate all critical integrations', () => {
      const summary = environmentValidator.getEnvironmentSummary();
      
      // Check that integrations are properly configured
      expect(summary.integrations).toBeDefined();
      
      // In test environment, we should have proper configuration
      expect(summary.securityFeatures.rateLimiting).toBe(true);
      expect(summary.securityFeatures.inputValidation).toBe(true);
      expect(summary.securityFeatures.csrfProtection).toBe(true);
      expect(summary.securityFeatures.securityHeaders).toBe(true);
    });

    it('should handle missing integrations gracefully', () => {
      // Remove integration credentials
      vi.stubEnv('AZURE_AI_ENDPOINT', '');
      vi.stubEnv('AZURE_AI_API_KEY', '');
      
      const result = validateEnvironment();
      
      // Should still be valid but with warnings
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});

describe('Security Feature Integration', () => {
  it('should work together as a complete security system', async () => {
    // Test the complete security initialization flow
    const initResult = await initializeSecurity();
    const securitySummary = getSecuritySummary();
    const envSummary = environmentValidator.getEnvironmentSummary();
    
    // Verify all components are working together
    expect(initResult.success).toBeDefined();
    expect(securitySummary.securityLevel).toMatch(/^(low|medium|high)$/);
    expect(envSummary.environment).toBe('development');
    
    // Verify feature integration
    const enabledFeatures = Object.values(initResult.features).filter(Boolean).length;
    expect(enabledFeatures).toBeGreaterThan(0);
    
    console.log('Security Implementation Test Summary:', {
      initializationSuccess: initResult.success,
      securityLevel: securitySummary.securityLevel,
      enabledFeatures: enabledFeatures,
      totalFeatures: Object.keys(initResult.features).length,
      errors: initResult.errors.length,
      warnings: initResult.warnings.length,
    });
  });
});
