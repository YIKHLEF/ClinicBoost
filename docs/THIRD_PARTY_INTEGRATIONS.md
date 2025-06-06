# Third-Party Service Integrations 🔌

This document provides comprehensive information about the third-party service integrations implemented in ClinicBoost, including configuration, usage, and troubleshooting.

## 📋 Overview

ClinicBoost integrates with several third-party services to provide enhanced functionality:

- **Azure AI Text Analytics** - Sentiment analysis and text processing
- **Twilio** - SMS and WhatsApp messaging
- **Stripe** - Payment processing and subscription management

## 🧠 Azure AI Text Analytics

### Features
- **Sentiment Analysis** - Analyze patient feedback sentiment
- **Key Phrase Extraction** - Extract important phrases from text
- **Entity Recognition** - Identify medical entities and concepts
- **Language Detection** - Detect text language automatically
- **Patient Feedback Analysis** - Comprehensive analysis with risk scoring

### Configuration

```bash
# Environment Variables
AZURE_AI_ENDPOINT=https://your-region.api.cognitive.microsoft.com
AZURE_AI_API_KEY=your_azure_ai_api_key
```

### Usage

```typescript
import { analyzePatientFeedback, analyzeSentiment } from '../lib/integrations/azure-ai';

// Analyze patient feedback
const analysis = await analyzePatientFeedback(
  "I had a great experience at the clinic. The staff was very professional."
);

// Simple sentiment analysis
const sentiment = await analyzeSentiment("The service was excellent!");
```

### Rate Limits
- **20 requests per minute** across all operations
- Automatic rate limiting with exponential backoff
- Rate limit status available via `azureAIService.getStatus()`

### Risk Scoring
The system automatically calculates risk scores (0-100) based on:
- Sentiment analysis results (negative sentiment increases risk)
- Key phrases containing risk keywords
- Medical entities detected
- Provides actionable recommendations based on risk level

## 📱 Twilio Integration

### Features
- **SMS Messaging** - Send appointment reminders and notifications
- **WhatsApp Messaging** - Rich messaging with media support
- **Phone Number Validation** - Moroccan phone number format validation
- **Rate Limiting** - Configurable rate limits for different message types
- **Production Validation** - Comprehensive configuration validation

### Configuration

```bash
# Environment Variables
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=+212522123456
TWILIO_WHATSAPP_NUMBER=whatsapp:+212522123456
```

### Usage

```typescript
import { sendSMS, sendWhatsApp, getTwilioStatus } from '../utils/twilio';

// Send SMS
const smsResult = await sendSMS({
  to: '+212612345678',
  body: 'Your appointment is tomorrow at 9:00 AM',
});

// Send WhatsApp message
const whatsappResult = await sendWhatsApp({
  to: '+212612345678',
  body: 'Appointment reminder with image',
  mediaUrl: ['https://example.com/image.jpg'],
});

// Check service status
const status = getTwilioStatus();
```

### Rate Limits
- **SMS**: 10/minute, 100/hour
- **WhatsApp**: 5/minute, 50/hour
- **Calls**: 3/minute, 20/hour

### Phone Number Validation
Supports Moroccan phone number formats:
- International: `+212612345678`
- National: `0612345678`
- Without prefix: `612345678`

## 💳 Stripe Integration

### Features
- **Payment Processing** - Secure payment intent creation and confirmation
- **Subscription Management** - Full subscription lifecycle management
- **Webhook Handling** - Real-time payment and subscription events
- **Refund Processing** - Full and partial refund support
- **Multi-plan Support** - Basic, Professional, and Enterprise plans

### Configuration

```bash
# Environment Variables
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### Payment Processing

```typescript
import { createPaymentIntent, processRefund } from '../lib/stripe';

// Create payment intent
const paymentIntent = await createPaymentIntent({
  amount: 5000, // 50.00 MAD in cents
  currency: 'mad',
  description: 'Dental consultation',
  invoice_id: 'inv_123',
  patient_id: 'pat_123',
});

// Process refund
const refund = await processRefund({
  paymentIntentId: 'pi_123',
  amount: 2500, // Partial refund
  reason: 'requested_by_customer',
});
```

### Subscription Management

```typescript
import { 
  createSubscription, 
  getSubscription, 
  cancelSubscription,
  getSubscriptionPlans 
} from '../lib/integrations/stripe-subscriptions';

// Get available plans
const plans = getSubscriptionPlans();

// Create subscription
const subscription = await createSubscription({
  clinicId: 'clinic_123',
  planId: 'professional',
  paymentMethodId: 'pm_123',
  trialDays: 14,
});

// Cancel subscription
await cancelSubscription('sub_123', true); // Cancel at period end
```

### Available Plans

| Plan | Price (MAD/month) | Features |
|------|-------------------|----------|
| Basic | 29.00 | 1 clinic, 3 users, 100 patients |
| Professional | 59.00 | 3 clinics, 10 users, 500 patients |
| Enterprise | 99.00 | Unlimited everything + API access |

### Webhook Events

Supported webhook events:
- `payment_intent.succeeded` - Payment completed
- `payment_intent.payment_failed` - Payment failed
- `customer.subscription.created` - New subscription
- `customer.subscription.updated` - Subscription changed
- `customer.subscription.deleted` - Subscription cancelled
- `invoice.payment_succeeded` - Recurring payment succeeded
- `invoice.payment_failed` - Recurring payment failed

## 🔧 Configuration Management

### Environment-Specific Configuration

The system uses different configurations for different environments:

```typescript
// Development
- Mock services for testing
- Relaxed rate limits
- Detailed logging

// Staging
- Test API keys
- Production-like rate limits
- Enhanced monitoring

// Production
- Live API keys
- Strict rate limits
- Comprehensive error handling
```

### Configuration Validation

All integrations include comprehensive validation:
- Required field checks
- Format validation
- Production-specific warnings
- Real-time status monitoring

## 📊 Monitoring and Status

### Integration Status Dashboard

The `ThirdPartyIntegrationsStatus` component provides:
- Real-time service status
- Rate limit monitoring
- Configuration validation results
- Last check timestamps
- Overall health indicators

### Health Check Endpoints

```typescript
// Check overall health
GET /api/health

// Service-specific status
const azureStatus = azureAIService.getStatus();
const twilioStatus = getTwilioStatus();
const rateLimits = getTwilioRateLimitStatus();
```

## 🧪 Testing

### Unit Tests

Comprehensive test suite covering:
- Service initialization
- API calls and responses
- Rate limiting behavior
- Error handling
- Configuration validation

### Mock Services

Development and testing use mock services that:
- Simulate real API behavior
- Include configurable failure rates
- Respect rate limits
- Provide realistic delays

### Running Tests

```bash
# Run all integration tests
npm run test src/test/integrations/

# Run specific service tests
npm run test azure-ai
npm run test twilio
npm run test stripe
```

## 🚨 Error Handling

### Automatic Retry Logic
- Exponential backoff for transient failures
- Configurable retry attempts
- Circuit breaker pattern for persistent failures

### Error Logging
- Structured error logging with context
- Integration with monitoring services
- Error categorization and alerting

### Fallback Mechanisms
- Graceful degradation when services are unavailable
- Queue-based retry for critical operations
- User-friendly error messages

## 🔒 Security Considerations

### API Key Management
- Server-side only for sensitive keys
- Environment-specific key rotation
- Secure key storage practices

### Data Privacy
- PII data handling compliance
- Audit logging for sensitive operations
- Data retention policies

### Rate Limiting
- Protection against abuse
- Fair usage enforcement
- Monitoring and alerting

## 📈 Performance Optimization

### Caching Strategies
- Response caching for expensive operations
- Rate limit status caching
- Configuration caching

### Batch Operations
- Bulk message sending
- Batch payment processing
- Optimized webhook handling

### Monitoring Metrics
- Response times
- Success/failure rates
- Rate limit utilization
- Error frequencies

## 🛠️ Troubleshooting

### Common Issues

1. **Configuration Errors**
   - Check environment variables
   - Validate API key formats
   - Verify endpoint URLs

2. **Rate Limiting**
   - Monitor rate limit status
   - Implement proper backoff
   - Consider upgrading service plans

3. **Network Issues**
   - Check connectivity
   - Verify firewall settings
   - Monitor service status pages

### Debug Mode

Enable debug logging:
```bash
DEBUG=clinicboost:integrations npm start
```

### Support Contacts

- **Azure AI**: Azure Support Portal
- **Twilio**: Twilio Console Support
- **Stripe**: Stripe Dashboard Support

---

For more detailed API documentation, see the individual service documentation files in the `/docs/api/` directory.
