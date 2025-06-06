# Patient Management API 👥

The Patient Management API provides comprehensive CRUD operations for managing patient records, medical history, and personal information in ClinicBoost.

## 📋 Overview

### Base Endpoint
```
/api/patients
```

### Authentication
All endpoints require authentication. See [Authentication Guide](./authentication.md).

### Permissions
- **admin**: Full access
- **dentist**: Create, read, update patients
- **staff**: Create, read, update patients
- **billing**: Read-only access

## 📚 Endpoints

### List Patients
Retrieve a paginated list of patients.

```http
GET /api/patients
```

#### Query Parameters
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `limit` | integer | Number of results per page (1-100) | 25 |
| `cursor` | string | Pagination cursor | - |
| `search` | string | Search in name, email, phone | - |
| `status` | string | Filter by status (`active`, `inactive`) | - |
| `risk_level` | string | Filter by risk level (`low`, `medium`, `high`) | - |
| `city` | string | Filter by city | - |
| `insurance_provider` | string | Filter by insurance provider | - |
| `sort` | string | Sort order (`created_at:desc`, `name:asc`) | `created_at:desc` |

#### Example Request
```javascript
const response = await fetch('/api/patients?limit=10&search=John&status=active', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'X-Clinic-ID': 'clinic-uuid'
  }
});
```

#### Example Response
```json
{
  "success": true,
  "data": [
    {
      "id": "patient-uuid",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "phone": "+212 6 12 34 56 78",
      "date_of_birth": "1985-03-15",
      "gender": "male",
      "address": "123 Main St",
      "city": "Casablanca",
      "postal_code": "20000",
      "emergency_contact_name": "Jane Doe",
      "emergency_contact_phone": "+212 6 87 65 43 21",
      "insurance_provider": "CNSS",
      "insurance_number": "123456789",
      "medical_history": ["diabetes", "hypertension"],
      "allergies": ["penicillin"],
      "current_medications": ["metformin"],
      "status": "active",
      "risk_level": "medium",
      "notes": "Regular checkup patient",
      "clinic_id": "clinic-uuid",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-20T14:45:00Z"
    }
  ],
  "pagination": {
    "next_cursor": "eyJpZCI6MTIzfQ==",
    "has_more": true,
    "total_count": 150
  }
}
```

### Get Patient
Retrieve a specific patient by ID.

```http
GET /api/patients/{id}
```

#### Path Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Patient UUID |

#### Example Request
```javascript
const response = await fetch('/api/patients/patient-uuid', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'X-Clinic-ID': 'clinic-uuid'
  }
});
```

#### Example Response
```json
{
  "success": true,
  "data": {
    "id": "patient-uuid",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "phone": "+212 6 12 34 56 78",
    "date_of_birth": "1985-03-15",
    "gender": "male",
    "address": "123 Main St",
    "city": "Casablanca",
    "postal_code": "20000",
    "emergency_contact_name": "Jane Doe",
    "emergency_contact_phone": "+212 6 87 65 43 21",
    "insurance_provider": "CNSS",
    "insurance_number": "123456789",
    "medical_history": ["diabetes", "hypertension"],
    "allergies": ["penicillin"],
    "current_medications": ["metformin"],
    "status": "active",
    "risk_level": "medium",
    "notes": "Regular checkup patient",
    "clinic_id": "clinic-uuid",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-20T14:45:00Z",
    "appointments_count": 5,
    "last_visit": "2024-01-10T09:00:00Z",
    "next_appointment": "2024-02-15T14:00:00Z"
  }
}
```

### Create Patient
Create a new patient record.

```http
POST /api/patients
```

#### Request Body
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "phone": "+212 6 12 34 56 78",
  "date_of_birth": "1985-03-15",
  "gender": "male",
  "address": "123 Main St",
  "city": "Casablanca",
  "postal_code": "20000",
  "emergency_contact_name": "Jane Doe",
  "emergency_contact_phone": "+212 6 87 65 43 21",
  "insurance_provider": "CNSS",
  "insurance_number": "123456789",
  "medical_history": ["diabetes", "hypertension"],
  "allergies": ["penicillin"],
  "current_medications": ["metformin"],
  "status": "active",
  "risk_level": "medium",
  "notes": "Regular checkup patient"
}
```

#### Required Fields
- `first_name`
- `last_name`
- `phone`
- `date_of_birth`

#### Example Request
```javascript
const response = await fetch('/api/patients', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'X-Clinic-ID': 'clinic-uuid',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone: '+212 6 12 34 56 78',
    date_of_birth: '1985-03-15',
    gender: 'male'
  })
});
```

#### Example Response
```json
{
  "success": true,
  "data": {
    "id": "new-patient-uuid",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "phone": "+212 6 12 34 56 78",
    "date_of_birth": "1985-03-15",
    "gender": "male",
    "status": "active",
    "risk_level": "low",
    "clinic_id": "clinic-uuid",
    "created_at": "2024-01-25T10:30:00Z",
    "updated_at": "2024-01-25T10:30:00Z"
  },
  "message": "Patient created successfully"
}
```

### Update Patient
Update an existing patient record.

```http
PUT /api/patients/{id}
```

#### Path Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Patient UUID |

#### Request Body
```json
{
  "email": "john.newemail@example.com",
  "phone": "+212 6 98 76 54 32",
  "address": "456 New Street",
  "risk_level": "high",
  "notes": "Updated patient information"
}
```

#### Example Request
```javascript
const response = await fetch('/api/patients/patient-uuid', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'X-Clinic-ID': 'clinic-uuid',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'john.newemail@example.com',
    risk_level: 'high'
  })
});
```

#### Example Response
```json
{
  "success": true,
  "data": {
    "id": "patient-uuid",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.newemail@example.com",
    "phone": "+212 6 12 34 56 78",
    "risk_level": "high",
    "updated_at": "2024-01-25T15:45:00Z"
  },
  "message": "Patient updated successfully"
}
```

### Delete Patient
Soft delete a patient record (sets status to inactive).

```http
DELETE /api/patients/{id}
```

#### Path Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Patient UUID |

#### Example Request
```javascript
const response = await fetch('/api/patients/patient-uuid', {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'X-Clinic-ID': 'clinic-uuid'
  }
});
```

#### Example Response
```json
{
  "success": true,
  "message": "Patient deleted successfully"
}
```

## 🔍 Advanced Search

### Search Patients
Advanced search with multiple filters and full-text search.

```http
POST /api/patients/search
```

#### Request Body
```json
{
  "query": "John Doe",
  "filters": {
    "status": ["active"],
    "risk_level": ["medium", "high"],
    "age_range": {
      "min": 18,
      "max": 65
    },
    "city": ["Casablanca", "Rabat"],
    "insurance_provider": ["CNSS", "CNOPS"],
    "has_allergies": true,
    "last_visit_range": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    }
  },
  "sort": [
    { "field": "last_visit", "order": "desc" },
    { "field": "created_at", "order": "asc" }
  ],
  "limit": 50,
  "cursor": "eyJpZCI6MTIzfQ=="
}
```

## 📊 Patient Statistics

### Get Patient Statistics
Retrieve statistics for patients in a clinic.

```http
GET /api/patients/statistics
```

#### Example Response
```json
{
  "success": true,
  "data": {
    "total_patients": 1250,
    "active_patients": 1100,
    "inactive_patients": 150,
    "new_patients_this_month": 45,
    "risk_level_distribution": {
      "low": 800,
      "medium": 350,
      "high": 100
    },
    "age_distribution": {
      "0-18": 200,
      "19-35": 400,
      "36-50": 350,
      "51-65": 200,
      "65+": 100
    },
    "gender_distribution": {
      "male": 600,
      "female": 650
    },
    "insurance_distribution": {
      "CNSS": 500,
      "CNOPS": 300,
      "Private": 250,
      "None": 200
    }
  }
}
```

## ❌ Error Responses

### Validation Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "email": "Invalid email format",
      "phone": "Phone number is required"
    }
  }
}
```

### Patient Not Found
```json
{
  "success": false,
  "error": {
    "code": "PATIENT_NOT_FOUND",
    "message": "Patient with ID 'patient-uuid' not found",
    "status": 404
  }
}
```

### Duplicate Patient
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_PATIENT",
    "message": "Patient with this email already exists",
    "status": 409
  }
}
```

## 🔗 Related Endpoints

- [Appointments API](./appointments.md) - Manage patient appointments
- [Billing API](./billing.md) - Patient billing and invoices
- [Medical Records API](./medical-records.md) - Patient medical history

---

*For more examples and integration patterns, see the [API Examples](./examples.md) section.*
