# Email Integration System

A comprehensive email service implementation for the ClinicBoost application, supporting multiple email providers, template management, and campaign automation.

## Features

- **Multiple Email Providers**: Support for SMTP and SendGrid
- **Template Management**: Handlebars-based email templates with multi-language support
- **Campaign Management**: Create and execute email campaigns with tracking
- **Delivery Tracking**: Monitor email delivery status and analytics
- **Retry Logic**: Automatic retry for failed email deliveries
- **Demo Mode**: Safe testing without sending actual emails

## Architecture

### Core Components

1. **EmailService**: Main service for sending emails
2. **EmailTemplateService**: Template management and rendering
3. **EmailCampaignService**: Campaign creation and execution
4. **Providers**: SMTP and SendGrid implementations

### File Structure

```
src/lib/email/
├── index.ts                    # Main exports
├── types.ts                    # TypeScript interfaces
├── config.ts                   # Configuration utilities
├── email-service.ts            # Core email service
├── template-service.ts         # Template management
├── campaign-service.ts         # Campaign management
├── providers/
│   ├── smtp-provider.ts        # SMTP implementation
│   └── sendgrid-provider.ts    # SendGrid implementation
├── __tests__/
│   ├── email-service.test.ts
│   └── template-service.test.ts
└── README.md
```

## Configuration

### Environment Variables

```bash
# Email Provider Configuration
VITE_EMAIL_PROVIDER=smtp          # 'smtp' or 'sendgrid'
VITE_SMTP_FROM=noreply@clinicboost.com

# SMTP Configuration
VITE_SMTP_HOST=localhost
VITE_SMTP_PORT=1025
VITE_SMTP_USER=
VITE_SMTP_PASS=
VITE_SMTP_SECURE=false

# SendGrid Configuration
VITE_SENDGRID_API_KEY=your_sendgrid_api_key

# Optional
VITE_SMTP_REPLY_TO=support@clinicboost.com
```

### Development Setup

For development, the system uses Mailhog (configured in docker-compose.yml):

```yaml
mailhog:
  image: mailhog/mailhog:latest
  ports:
    - "1025:1025"  # SMTP
    - "8025:8025"  # Web UI
```

Access the Mailhog web interface at http://localhost:8025 to view sent emails.

## Usage

### Basic Email Sending

```typescript
import { getEmailService } from '../lib/email';

const emailService = getEmailService();

// Send a simple email
const result = await emailService.sendEmail({
  to: 'patient@example.com',
  subject: 'Appointment Reminder',
  html: '<p>Your appointment is tomorrow at 2 PM.</p>',
  text: 'Your appointment is tomorrow at 2 PM.',
});

if (result.success) {
  console.log('Email sent:', result.messageId);
} else {
  console.error('Email failed:', result.error);
}
```

### Template-Based Emails

```typescript
// Send using a template
const result = await emailService.sendTemplateEmail(
  'default_appointment_reminder_en',
  'patient@example.com',
  {
    patientName: 'John Doe',
    appointmentDate: new Date(),
    doctorName: 'Dr. Smith',
    treatmentType: 'Dental Cleaning',
    clinicName: 'ClinicBoost',
    clinicAddress: '123 Main St',
    clinicPhone: '+212 5 22 XX XX XX',
  }
);
```

### Convenience Methods

```typescript
// Appointment reminder
await emailService.sendAppointmentReminder('patient@example.com', {
  patientName: 'John Doe',
  appointmentDate: new Date(),
  doctorName: 'Dr. Smith',
  treatmentType: 'Cleaning',
  clinicName: 'ClinicBoost',
  clinicAddress: '123 Main St',
  clinicPhone: '+212 5 22 XX XX XX',
});

// Welcome email
await emailService.sendWelcomeEmail('user@example.com', {
  firstName: 'John',
  lastName: 'Doe',
  email: 'user@example.com',
  portalUrl: 'https://app.clinicboost.com/login',
  clinicName: 'ClinicBoost',
  clinicPhone: '+212 5 22 XX XX XX',
  clinicEmail: 'support@clinicboost.com',
});

// Invoice email
await emailService.sendInvoiceEmail('patient@example.com', {
  patientName: 'John Doe',
  invoiceNumber: 'INV-001',
  invoiceDate: new Date(),
  dueDate: new Date(),
  totalAmount: 150,
  currency: 'MAD',
  status: 'Pending',
  clinicName: 'ClinicBoost',
  clinicPhone: '+212 5 22 XX XX XX',
  clinicEmail: 'billing@clinicboost.com',
});
```

### Campaign Management

```typescript
import { getCampaignService } from '../lib/email';

const campaignService = getCampaignService();

// Create a campaign
const campaign = await campaignService.createCampaign(
  'Monthly Newsletter',
  'Our monthly clinic newsletter',
  'newsletter_template_en',
  [
    { email: 'patient1@example.com', name: 'John Doe' },
    { email: 'patient2@example.com', name: 'Jane Smith' },
  ],
  'admin_user_id'
);

// Execute the campaign
await campaignService.executeCampaign(campaign.id);

// Get campaign statistics
const stats = campaignService.getCampaignStats(campaign.id);
console.log(`Sent: ${stats.sent}, Open Rate: ${stats.openRate}%`);
```

## Template System

### Template Variables

Templates use Handlebars syntax with the following helpers:

- `{{formatDate date 'format'}}` - Format dates (short, medium, long, time)
- `{{formatCurrency amount currency}}` - Format currency amounts
- `{{eq a b}}` - Equality comparison
- `{{ne a b}}` - Not equal comparison
- `{{gt a b}}` - Greater than comparison
- `{{lt a b}}` - Less than comparison

### Default Templates

The system includes default templates for:

- Appointment reminders
- Welcome emails
- Invoice notifications
- Password reset
- System notifications

### Custom Templates

```typescript
import { getEmailService } from '../lib/email';

const templateService = getEmailService().getTemplateService();

const customTemplate = {
  id: 'custom_reminder',
  name: 'Custom Reminder',
  subject: 'Reminder: {{eventName}}',
  htmlContent: `
    <div style="font-family: Arial, sans-serif;">
      <h2>{{eventName}}</h2>
      <p>Dear {{patientName}},</p>
      <p>This is a reminder about {{eventName}} on {{formatDate eventDate 'long'}}.</p>
    </div>
  `,
  textContent: 'Dear {{patientName}}, reminder about {{eventName}} on {{formatDate eventDate "long"}}.',
  variables: ['eventName', 'patientName', 'eventDate'],
  category: 'appointment_reminder',
  language: 'en',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

templateService.addTemplate(customTemplate);
```

## Testing

### Unit Tests

```bash
npm test src/lib/email/__tests__/
```

### Manual Testing

1. Start the development server with Mailhog:
   ```bash
   docker-compose up -d mailhog
   npm run dev
   ```

2. Access the email settings in the application
3. Send test emails
4. Check Mailhog web interface at http://localhost:8025

## Integration Points

The email system is integrated with:

- **Appointment Reminders**: Automatic email reminders for appointments
- **User Management**: Welcome emails for new users
- **GDPR Service**: Email verification for data requests
- **Backup System**: Notification emails for backup status
- **Invoice System**: Invoice delivery via email

## Error Handling

The system includes comprehensive error handling:

- Automatic retries for failed deliveries
- Detailed error logging
- Graceful fallbacks in demo mode
- Validation of email addresses and templates

## Security Considerations

- Email credentials are stored in environment variables
- Templates are validated before compilation
- Input sanitization for template variables
- Rate limiting for bulk email sending

## Performance

- Bulk email sending with batching
- Template compilation caching
- Asynchronous email delivery
- Connection pooling for SMTP

## Monitoring

- Email delivery tracking
- Campaign analytics
- Error rate monitoring
- Performance metrics logging
