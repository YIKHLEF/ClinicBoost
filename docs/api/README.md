# ClinicBoost API Documentation 🔌

Welcome to the ClinicBoost API documentation. This comprehensive guide covers all available endpoints, authentication methods, and integration patterns for the ClinicBoost dental practice management system.

## 🚀 Getting Started

### Base URL
```
Production: https://api.clinicboost.com/v1
Staging: https://staging-api.clinicboost.com/v1
Development: http://localhost:3000/api/v1
```

### Authentication
ClinicBoost uses Supabase authentication with JWT tokens. See [Authentication Guide](./authentication.md) for details.

### Content Type
All API requests should use `application/json` content type unless otherwise specified.

### Rate Limiting
- **Authenticated requests**: 1000 requests per hour
- **Unauthenticated requests**: 100 requests per hour

## 📚 API Reference

### Core Resources

#### 👥 [Patient Management](./patients.md)
Manage patient records, medical history, and personal information.
- `GET /patients` - List patients
- `POST /patients` - Create patient
- `GET /patients/{id}` - Get patient details
- `PUT /patients/{id}` - Update patient
- `DELETE /patients/{id}` - Delete patient

#### 📅 [Appointment Scheduling](./appointments.md)
Handle appointment booking, scheduling, and management.
- `GET /appointments` - List appointments
- `POST /appointments` - Create appointment
- `GET /appointments/{id}` - Get appointment details
- `PUT /appointments/{id}` - Update appointment
- `DELETE /appointments/{id}` - Cancel appointment

#### 💰 [Billing & Invoicing](./billing.md)
Manage invoices, payments, and financial transactions.
- `GET /invoices` - List invoices
- `POST /invoices` - Create invoice
- `GET /invoices/{id}` - Get invoice details
- `PUT /invoices/{id}` - Update invoice
- `POST /invoices/{id}/payments` - Record payment

#### 📢 [Campaign Management](./campaigns.md)
Handle marketing campaigns and patient communications.
- `GET /campaigns` - List campaigns
- `POST /campaigns` - Create campaign
- `GET /campaigns/{id}` - Get campaign details
- `POST /campaigns/{id}/send` - Send campaign

#### 🏥 [Multi-Clinic Support](./multi-clinic.md)
Manage multiple clinic locations and resources.
- `GET /clinics` - List user's clinics
- `POST /clinics` - Create clinic
- `GET /clinics/{id}` - Get clinic details
- `PUT /clinics/{id}` - Update clinic

### Supporting Resources

#### 🔐 [Authentication](./authentication.md)
User authentication, authorization, and session management.

#### ❌ [Error Handling](./errors.md)
Error codes, status messages, and troubleshooting.

#### 🔍 [Search & Filtering](./search.md)
Advanced search capabilities and filtering options.

#### 📊 [Reports & Analytics](./reports.md)
Generate reports and access analytics data.

## 🛠️ Integration Patterns

### Pagination
All list endpoints support pagination using cursor-based pagination:

```json
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6MTIzfQ==",
    "prev_cursor": "eyJpZCI6MTAwfQ==",
    "has_more": true,
    "total_count": 150
  }
}
```

### Filtering
Use query parameters for filtering:
```
GET /patients?status=active&city=Casablanca&limit=25
```

### Sorting
Use the `sort` parameter:
```
GET /appointments?sort=start_time:asc,created_at:desc
```

### Field Selection
Use the `fields` parameter to select specific fields:
```
GET /patients?fields=id,first_name,last_name,email
```

## 📝 Request/Response Format

### Standard Request Headers
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
Accept: application/json
X-Clinic-ID: <clinic_id> (for multi-clinic operations)
```

### Standard Response Format
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "timestamp": "2025-01-02T10:30:00Z"
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    }
  },
  "timestamp": "2025-01-02T10:30:00Z"
}
```

## 🔒 Security

### HTTPS
All API calls must be made over HTTPS in production.

### API Keys
Some endpoints require API keys in addition to JWT tokens.

### Rate Limiting
Implement exponential backoff for rate-limited requests.

### Data Privacy
All patient data is encrypted and complies with GDPR and local privacy laws.

## 📱 SDKs and Libraries

### Official SDKs
- **JavaScript/TypeScript**: `@clinicboost/js-sdk`
- **Python**: `clinicboost-python`
- **PHP**: `clinicboost-php`

### Community Libraries
- **React Hooks**: `react-clinicboost`
- **Vue.js Plugin**: `vue-clinicboost`

## 🧪 Testing

### Sandbox Environment
Use the staging environment for testing:
```
https://staging-api.clinicboost.com/v1
```

### Test Data
Test accounts and sample data are available in the staging environment.

### Webhooks Testing
Use tools like ngrok for local webhook testing.

## 📞 Support

- **API Issues**: api-support@clinicboost.com
- **Documentation**: docs@clinicboost.com
- **Status Page**: https://status.clinicboost.com

## 📋 Changelog

See [API Changelog](./CHANGELOG.md) for version history and breaking changes.

---

*For detailed endpoint documentation, select a specific resource from the navigation above.*
