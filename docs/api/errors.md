# Error Handling & Status Codes ❌

This guide covers error handling patterns, status codes, and troubleshooting for the ClinicBoost API.

## 📋 Overview

ClinicBoost API uses conventional HTTP status codes and provides detailed error information in a consistent format to help developers handle errors gracefully.

## 🔢 HTTP Status Codes

### Success Codes (2xx)
| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 202 | Accepted | Request accepted for processing |
| 204 | No Content | Request successful, no content returned |

### Client Error Codes (4xx)
| Code | Status | Description |
|------|--------|-------------|
| 400 | Bad Request | Invalid request format or parameters |
| 401 | Unauthorized | Authentication required or invalid |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict (duplicate, etc.) |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |

### Server Error Codes (5xx)
| Code | Status | Description |
|------|--------|-------------|
| 500 | Internal Server Error | Unexpected server error |
| 502 | Bad Gateway | Upstream service error |
| 503 | Service Unavailable | Service temporarily unavailable |
| 504 | Gateway Timeout | Request timeout |

## 📝 Error Response Format

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "specific_field",
      "value": "invalid_value",
      "constraint": "validation_rule"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "req_1234567890"
  }
}
```

### Error Response Fields
| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Always `false` for errors |
| `error.code` | string | Machine-readable error code |
| `error.message` | string | Human-readable error description |
| `error.details` | object | Additional error context (optional) |
| `error.timestamp` | string | ISO 8601 timestamp |
| `error.request_id` | string | Unique request identifier |

## 🚨 Common Error Codes

### Authentication Errors

#### INVALID_CREDENTIALS
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password",
    "status": 401
  }
}
```

#### TOKEN_EXPIRED
```json
{
  "success": false,
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Access token has expired",
    "status": 401,
    "details": {
      "expired_at": "2024-01-15T10:00:00Z",
      "refresh_required": true
    }
  }
}
```

#### INSUFFICIENT_PERMISSIONS
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "User does not have permission to access this resource",
    "status": 403,
    "details": {
      "required_role": "admin",
      "user_role": "staff"
    }
  }
}
```

### Validation Errors

#### VALIDATION_ERROR
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "status": 422,
    "details": {
      "errors": [
        {
          "field": "email",
          "message": "Invalid email format",
          "value": "invalid-email"
        },
        {
          "field": "phone",
          "message": "Phone number is required",
          "value": null
        }
      ]
    }
  }
}
```

#### MISSING_REQUIRED_FIELD
```json
{
  "success": false,
  "error": {
    "code": "MISSING_REQUIRED_FIELD",
    "message": "Required field is missing",
    "status": 400,
    "details": {
      "field": "patient_id",
      "type": "string"
    }
  }
}
```

### Resource Errors

#### RESOURCE_NOT_FOUND
```json
{
  "success": false,
  "error": {
    "code": "PATIENT_NOT_FOUND",
    "message": "Patient with ID 'patient-uuid' not found",
    "status": 404,
    "details": {
      "resource_type": "patient",
      "resource_id": "patient-uuid"
    }
  }
}
```

#### DUPLICATE_RESOURCE
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_PATIENT",
    "message": "Patient with this email already exists",
    "status": 409,
    "details": {
      "field": "email",
      "value": "john.doe@example.com",
      "existing_id": "existing-patient-uuid"
    }
  }
}
```

### Business Logic Errors

#### SCHEDULING_CONFLICT
```json
{
  "success": false,
  "error": {
    "code": "SCHEDULING_CONFLICT",
    "message": "Dentist is not available at the requested time",
    "status": 409,
    "details": {
      "conflicting_appointment": {
        "id": "existing-appointment-uuid",
        "start_time": "2024-01-15T09:00:00Z",
        "end_time": "2024-01-15T10:00:00Z"
      },
      "suggested_times": [
        "2024-01-15T10:00:00Z",
        "2024-01-15T11:00:00Z"
      ]
    }
  }
}
```

#### PAYMENT_FAILED
```json
{
  "success": false,
  "error": {
    "code": "PAYMENT_FAILED",
    "message": "Payment processing failed",
    "status": 402,
    "details": {
      "payment_method": "card",
      "decline_code": "insufficient_funds",
      "provider_message": "Your card has insufficient funds"
    }
  }
}
```

### Rate Limiting Errors

#### RATE_LIMIT_EXCEEDED
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later",
    "status": 429,
    "details": {
      "limit": 1000,
      "window": "1h",
      "retry_after": 3600,
      "reset_time": "2024-01-15T11:00:00Z"
    }
  }
}
```

## 🛠️ Error Handling Best Practices

### Client-Side Error Handling

#### JavaScript/TypeScript Example
```typescript
interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    status?: number;
  };
}

async function handleApiCall<T>(apiCall: () => Promise<T>): Promise<T> {
  try {
    const response = await apiCall();
    return response;
  } catch (error) {
    if (error.status === 401) {
      // Handle authentication error
      await refreshToken();
      return apiCall(); // Retry
    } else if (error.status === 422) {
      // Handle validation errors
      displayValidationErrors(error.error.details.errors);
    } else if (error.status === 429) {
      // Handle rate limiting
      const retryAfter = error.error.details.retry_after;
      await delay(retryAfter * 1000);
      return apiCall(); // Retry
    } else {
      // Handle other errors
      showErrorMessage(error.error.message);
    }
    throw error;
  }
}
```

#### React Hook Example
```typescript
import { useQuery } from '@tanstack/react-query';

const usePatients = () => {
  return useQuery({
    queryKey: ['patients'],
    queryFn: getPatients,
    retry: (failureCount, error) => {
      // Don't retry on client errors (4xx)
      if (error.status >= 400 && error.status < 500) {
        return false;
      }
      // Retry up to 3 times for server errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
```

### Error Recovery Strategies

#### Exponential Backoff
```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const delay = Math.min(1000 * 2 ** i, 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}
```

#### Circuit Breaker Pattern
```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > 60000) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= 5) {
      this.state = 'open';
    }
  }
}
```

## 🔍 Debugging and Troubleshooting

### Request ID Tracking
Every API response includes a `request_id` for tracking:

```typescript
// Log request ID for debugging
const response = await fetch('/api/patients');
const data = await response.json();

if (!data.success) {
  console.error('API Error:', {
    requestId: data.error.request_id,
    code: data.error.code,
    message: data.error.message
  });
}
```

### Error Logging
```typescript
// Structured error logging
function logError(error: ApiError, context: any) {
  console.error('API Error', {
    timestamp: new Date().toISOString(),
    requestId: error.error.request_id,
    code: error.error.code,
    message: error.error.message,
    context,
    userAgent: navigator.userAgent,
    url: window.location.href
  });
}
```

### Health Check Endpoint
Monitor API health:

```http
GET /api/health
```

Response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0",
    "services": {
      "database": "healthy",
      "authentication": "healthy",
      "messaging": "healthy"
    }
  }
}
```

## 📊 Error Monitoring

### Error Metrics
Track these metrics for monitoring:
- Error rate by endpoint
- Error rate by status code
- Response time percentiles
- Failed request patterns

### Alerting Thresholds
- Error rate > 5% for 5 minutes
- 5xx errors > 1% for 2 minutes
- Response time > 2 seconds for 95th percentile
- Authentication failures > 10% for 5 minutes

## 🆘 Support and Escalation

### When to Contact Support
- Persistent 5xx errors
- Unexpected authentication failures
- Data inconsistencies
- Performance degradation

### Information to Include
- Request ID from error response
- Timestamp of the error
- Steps to reproduce
- Expected vs actual behavior
- Browser/client information

### Support Channels
- **Critical Issues**: support@clinicboost.com
- **Bug Reports**: GitHub Issues
- **API Questions**: api-support@clinicboost.com
- **Status Updates**: https://status.clinicboost.com

---

*For more information about specific API endpoints and their error responses, see the individual API documentation pages.*
