# Authentication & Authorization 🔐

ClinicBoost uses Supabase authentication with JWT tokens for secure API access. This guide covers authentication methods, token management, and authorization patterns.

## 🚀 Quick Start

### 1. Sign Up/Sign In
```javascript
import { supabase } from '@supabase/supabase-js';

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure-password',
  options: {
    data: {
      first_name: 'John',
      last_name: 'Doe',
      role: 'dentist'
    }
  }
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure-password'
});
```

### 2. Get Access Token
```javascript
const { data: { session } } = await supabase.auth.getSession();
const accessToken = session?.access_token;
```

### 3. Make Authenticated Requests
```javascript
const response = await fetch('/api/patients', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
```

## 🔑 Authentication Methods

### Email/Password Authentication
Standard email and password authentication with email verification.

```javascript
// Sign up with email verification
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure-password'
});

// Verify email
const { data, error } = await supabase.auth.verifyOtp({
  email: 'user@example.com',
  token: '123456',
  type: 'signup'
});
```

### Magic Link Authentication
Passwordless authentication via email magic links.

```javascript
const { data, error } = await supabase.auth.signInWithOtp({
  email: 'user@example.com',
  options: {
    emailRedirectTo: 'https://yourapp.com/auth/callback'
  }
});
```

### Social Authentication
OAuth integration with popular providers.

```javascript
// Google OAuth
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: 'https://yourapp.com/auth/callback'
  }
});

// Microsoft OAuth
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'azure',
  options: {
    scopes: 'email profile'
  }
});
```

## 🎫 Token Management

### JWT Token Structure
```json
{
  "aud": "authenticated",
  "exp": 1672531200,
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "authenticated",
  "app_metadata": {
    "provider": "email",
    "providers": ["email"]
  },
  "user_metadata": {
    "first_name": "John",
    "last_name": "Doe",
    "role": "dentist"
  }
}
```

### Token Refresh
```javascript
// Automatic refresh (handled by Supabase client)
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('Token refreshed:', session);
  }
});

// Manual refresh
const { data, error } = await supabase.auth.refreshSession();
```

### Token Validation
```javascript
// Validate current session
const { data: { user }, error } = await supabase.auth.getUser();

if (error || !user) {
  // Token is invalid or expired
  console.log('Authentication required');
}
```

## 🛡️ Authorization & Roles

### User Roles
ClinicBoost supports role-based access control (RBAC):

- **admin**: Full system access
- **dentist**: Clinical operations and patient management
- **staff**: Limited patient and appointment management
- **billing**: Billing and financial operations only

### Role-Based Permissions

#### Admin Role
```javascript
// Full access to all resources
const permissions = {
  patients: ['create', 'read', 'update', 'delete'],
  appointments: ['create', 'read', 'update', 'delete'],
  billing: ['create', 'read', 'update', 'delete'],
  campaigns: ['create', 'read', 'update', 'delete'],
  users: ['create', 'read', 'update', 'delete'],
  clinics: ['create', 'read', 'update', 'delete']
};
```

#### Dentist Role
```javascript
const permissions = {
  patients: ['create', 'read', 'update'],
  appointments: ['create', 'read', 'update'],
  billing: ['read'],
  campaigns: ['read'],
  users: ['read'],
  clinics: ['read']
};
```

#### Staff Role
```javascript
const permissions = {
  patients: ['create', 'read', 'update'],
  appointments: ['create', 'read', 'update'],
  billing: ['read'],
  campaigns: ['read'],
  users: [],
  clinics: ['read']
};
```

#### Billing Role
```javascript
const permissions = {
  patients: ['read'],
  appointments: ['read'],
  billing: ['create', 'read', 'update'],
  campaigns: [],
  users: [],
  clinics: ['read']
};
```

### Multi-Clinic Authorization
For multi-clinic setups, include the clinic ID in requests:

```javascript
const response = await fetch('/api/patients', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'X-Clinic-ID': 'clinic-uuid',
    'Content-Type': 'application/json'
  }
});
```

## 🔒 Security Best Practices

### Token Storage
```javascript
// ✅ Secure storage (recommended)
// Supabase client handles this automatically
const { data: { session } } = await supabase.auth.getSession();

// ❌ Avoid storing in localStorage for sensitive apps
// localStorage.setItem('token', accessToken);
```

### Request Security
```javascript
// Always use HTTPS in production
const apiUrl = process.env.NODE_ENV === 'production' 
  ? 'https://api.clinicboost.com'
  : 'http://localhost:3000';

// Include CSRF protection
const response = await fetch(`${apiUrl}/api/patients`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
});
```

### Session Management
```javascript
// Monitor auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  switch (event) {
    case 'SIGNED_IN':
      console.log('User signed in:', session.user);
      break;
    case 'SIGNED_OUT':
      console.log('User signed out');
      // Redirect to login page
      break;
    case 'TOKEN_REFRESHED':
      console.log('Token refreshed');
      break;
    case 'USER_UPDATED':
      console.log('User updated:', session.user);
      break;
  }
});
```

## ❌ Error Handling

### Common Authentication Errors

#### Invalid Credentials
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

#### Expired Token
```json
{
  "success": false,
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Access token has expired",
    "status": 401
  }
}
```

#### Insufficient Permissions
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "User does not have permission to access this resource",
    "status": 403
  }
}
```

### Error Handling Example
```javascript
try {
  const response = await fetch('/api/patients', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (response.status === 401) {
    // Token expired or invalid
    await supabase.auth.refreshSession();
    // Retry request
  } else if (response.status === 403) {
    // Insufficient permissions
    console.error('Access denied');
  }
} catch (error) {
  console.error('Authentication error:', error);
}
```

## 🧪 Testing Authentication

### Test Users
Use these test accounts in the staging environment:

```javascript
// Admin user
{
  email: 'admin@test.clinicboost.com',
  password: 'test-admin-123',
  role: 'admin'
}

// Dentist user
{
  email: 'dentist@test.clinicboost.com',
  password: 'test-dentist-123',
  role: 'dentist'
}

// Staff user
{
  email: 'staff@test.clinicboost.com',
  password: 'test-staff-123',
  role: 'staff'
}
```

### Mock Authentication
For testing purposes:

```javascript
// Mock authentication in tests
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'dentist',
  clinic_id: 'test-clinic-id'
};

// Mock Supabase auth
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: mockUser } }),
      getSession: () => Promise.resolve({ data: { session: { access_token: 'mock-token' } } })
    }
  })
}));
```

## 📚 Related Documentation

- [User Management API](./users.md)
- [Multi-Clinic Support](./multi-clinic.md)
- [Error Handling](./errors.md)
- [Security Best Practices](../developer/security.md)

---

*For more information about Supabase authentication, visit the [official documentation](https://supabase.com/docs/guides/auth).*
