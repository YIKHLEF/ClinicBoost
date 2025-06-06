# Appointment Scheduling API 📅

The Appointment Scheduling API provides comprehensive functionality for managing dental appointments, including booking, rescheduling, cancellation, and conflict detection.

## 📋 Overview

### Base Endpoint
```
/api/appointments
```

### Authentication
All endpoints require authentication. See [Authentication Guide](./authentication.md).

### Permissions
- **admin**: Full access
- **dentist**: Create, read, update appointments
- **staff**: Create, read, update appointments
- **billing**: Read-only access

## 📚 Endpoints

### List Appointments
Retrieve a paginated list of appointments.

```http
GET /api/appointments
```

#### Query Parameters
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `limit` | integer | Number of results per page (1-100) | 25 |
| `cursor` | string | Pagination cursor | - |
| `date_start` | string | Start date filter (ISO 8601) | - |
| `date_end` | string | End date filter (ISO 8601) | - |
| `status` | string | Filter by status | - |
| `patient_id` | string | Filter by patient ID | - |
| `dentist_id` | string | Filter by dentist ID | - |
| `treatment_type` | string | Filter by treatment type | - |
| `sort` | string | Sort order | `start_time:asc` |

#### Appointment Status Values
- `scheduled` - Appointment is scheduled
- `confirmed` - Patient has confirmed
- `in_progress` - Currently in session
- `completed` - Appointment finished
- `cancelled` - Cancelled by patient/clinic
- `no_show` - Patient didn't show up

#### Example Request
```javascript
const response = await fetch('/api/appointments?date_start=2024-01-01&status=scheduled', {
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
      "id": "appointment-uuid",
      "patient_id": "patient-uuid",
      "dentist_id": "dentist-uuid",
      "start_time": "2024-01-15T09:00:00Z",
      "end_time": "2024-01-15T10:00:00Z",
      "duration": 60,
      "status": "scheduled",
      "treatment_type": "cleaning",
      "notes": "Regular cleaning appointment",
      "reminder_sent": false,
      "clinic_id": "clinic-uuid",
      "created_at": "2024-01-10T14:30:00Z",
      "updated_at": "2024-01-10T14:30:00Z",
      "patient": {
        "id": "patient-uuid",
        "first_name": "John",
        "last_name": "Doe"
      },
      "dentist": {
        "id": "dentist-uuid",
        "first_name": "Dr. Sarah",
        "last_name": "Smith"
      }
    }
  ],
  "pagination": {
    "next_cursor": "eyJpZCI6MTIzfQ==",
    "has_more": true,
    "total_count": 45
  }
}
```

### Get Appointment
Retrieve a specific appointment by ID.

```http
GET /api/appointments/{id}
```

#### Path Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Appointment UUID |

#### Example Response
```json
{
  "success": true,
  "data": {
    "id": "appointment-uuid",
    "patient_id": "patient-uuid",
    "dentist_id": "dentist-uuid",
    "start_time": "2024-01-15T09:00:00Z",
    "end_time": "2024-01-15T10:00:00Z",
    "duration": 60,
    "status": "scheduled",
    "treatment_type": "cleaning",
    "notes": "Regular cleaning appointment",
    "reminder_sent": false,
    "clinic_id": "clinic-uuid",
    "created_at": "2024-01-10T14:30:00Z",
    "updated_at": "2024-01-10T14:30:00Z",
    "patient": {
      "id": "patient-uuid",
      "first_name": "John",
      "last_name": "Doe",
      "phone": "+212 6 12 34 56 78",
      "email": "john.doe@example.com"
    },
    "dentist": {
      "id": "dentist-uuid",
      "first_name": "Dr. Sarah",
      "last_name": "Smith",
      "specialization": "General Dentistry"
    }
  }
}
```

### Create Appointment
Schedule a new appointment.

```http
POST /api/appointments
```

#### Request Body
```json
{
  "patient_id": "patient-uuid",
  "dentist_id": "dentist-uuid",
  "start_time": "2024-01-15T09:00:00Z",
  "duration": 60,
  "treatment_type": "cleaning",
  "notes": "Regular cleaning appointment",
  "send_reminder": true
}
```

#### Required Fields
- `patient_id`
- `dentist_id`
- `start_time`
- `duration`

#### Treatment Types
- `consultation` - Initial consultation
- `cleaning` - Dental cleaning
- `filling` - Dental filling
- `extraction` - Tooth extraction
- `root_canal` - Root canal treatment
- `crown` - Crown placement
- `implant` - Dental implant
- `orthodontics` - Orthodontic treatment
- `emergency` - Emergency appointment

#### Example Request
```javascript
const response = await fetch('/api/appointments', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'X-Clinic-ID': 'clinic-uuid',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    patient_id: 'patient-uuid',
    dentist_id: 'dentist-uuid',
    start_time: '2024-01-15T09:00:00Z',
    duration: 60,
    treatment_type: 'cleaning'
  })
});
```

#### Example Response
```json
{
  "success": true,
  "data": {
    "id": "new-appointment-uuid",
    "patient_id": "patient-uuid",
    "dentist_id": "dentist-uuid",
    "start_time": "2024-01-15T09:00:00Z",
    "end_time": "2024-01-15T10:00:00Z",
    "duration": 60,
    "status": "scheduled",
    "treatment_type": "cleaning",
    "clinic_id": "clinic-uuid",
    "created_at": "2024-01-10T14:30:00Z",
    "updated_at": "2024-01-10T14:30:00Z"
  },
  "message": "Appointment scheduled successfully"
}
```

### Update Appointment
Update an existing appointment.

```http
PUT /api/appointments/{id}
```

#### Path Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Appointment UUID |

#### Request Body
```json
{
  "start_time": "2024-01-15T10:00:00Z",
  "duration": 90,
  "status": "confirmed",
  "notes": "Extended cleaning session"
}
```

#### Example Response
```json
{
  "success": true,
  "data": {
    "id": "appointment-uuid",
    "start_time": "2024-01-15T10:00:00Z",
    "end_time": "2024-01-15T11:30:00Z",
    "duration": 90,
    "status": "confirmed",
    "notes": "Extended cleaning session",
    "updated_at": "2024-01-12T16:20:00Z"
  },
  "message": "Appointment updated successfully"
}
```

### Cancel Appointment
Cancel an appointment.

```http
DELETE /api/appointments/{id}
```

#### Query Parameters
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `reason` | string | Cancellation reason | - |
| `notify_patient` | boolean | Send cancellation notification | true |

#### Example Request
```javascript
const response = await fetch('/api/appointments/appointment-uuid?reason=patient_request', {
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
  "message": "Appointment cancelled successfully"
}
```

## 🔍 Advanced Features

### Check Availability
Check dentist availability for a specific time slot.

```http
POST /api/appointments/check-availability
```

#### Request Body
```json
{
  "dentist_id": "dentist-uuid",
  "start_time": "2024-01-15T09:00:00Z",
  "duration": 60
}
```

#### Example Response
```json
{
  "success": true,
  "data": {
    "available": true,
    "conflicts": [],
    "suggested_times": [
      "2024-01-15T10:00:00Z",
      "2024-01-15T11:00:00Z",
      "2024-01-15T14:00:00Z"
    ]
  }
}
```

### Bulk Operations
Perform bulk operations on appointments.

```http
POST /api/appointments/bulk
```

#### Request Body
```json
{
  "operation": "update_status",
  "appointment_ids": ["uuid1", "uuid2", "uuid3"],
  "data": {
    "status": "confirmed"
  }
}
```

### Recurring Appointments
Create recurring appointment series.

```http
POST /api/appointments/recurring
```

#### Request Body
```json
{
  "patient_id": "patient-uuid",
  "dentist_id": "dentist-uuid",
  "start_time": "2024-01-15T09:00:00Z",
  "duration": 60,
  "treatment_type": "cleaning",
  "recurrence": {
    "frequency": "monthly",
    "interval": 6,
    "end_date": "2024-12-31"
  }
}
```

## 📊 Appointment Statistics

### Get Appointment Statistics
Retrieve appointment statistics for a clinic.

```http
GET /api/appointments/statistics
```

#### Query Parameters
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `date_start` | string | Start date for statistics | Current month |
| `date_end` | string | End date for statistics | Current month |
| `dentist_id` | string | Filter by specific dentist | - |

#### Example Response
```json
{
  "success": true,
  "data": {
    "total_appointments": 150,
    "by_status": {
      "scheduled": 45,
      "confirmed": 30,
      "completed": 60,
      "cancelled": 10,
      "no_show": 5
    },
    "by_treatment_type": {
      "cleaning": 50,
      "filling": 30,
      "consultation": 25,
      "extraction": 15,
      "other": 30
    },
    "completion_rate": 85.7,
    "no_show_rate": 3.3,
    "average_duration": 75,
    "busiest_hours": [
      { "hour": 9, "count": 25 },
      { "hour": 14, "count": 22 },
      { "hour": 10, "count": 20 }
    ]
  }
}
```

## 🔔 Notifications and Reminders

### Send Reminder
Send appointment reminder to patient.

```http
POST /api/appointments/{id}/reminder
```

#### Request Body
```json
{
  "type": "sms",
  "message": "Reminder: You have an appointment tomorrow at 9:00 AM",
  "send_time": "2024-01-14T18:00:00Z"
}
```

### Notification Types
- `sms` - SMS text message
- `email` - Email notification
- `whatsapp` - WhatsApp message
- `push` - Push notification (mobile app)

## ❌ Error Responses

### Scheduling Conflict
```json
{
  "success": false,
  "error": {
    "code": "SCHEDULING_CONFLICT",
    "message": "Dentist is not available at the requested time",
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

### Invalid Time Slot
```json
{
  "success": false,
  "error": {
    "code": "INVALID_TIME_SLOT",
    "message": "Appointment time is outside clinic operating hours",
    "details": {
      "clinic_hours": {
        "monday": { "open": "08:00", "close": "18:00" },
        "tuesday": { "open": "08:00", "close": "18:00" }
      }
    }
  }
}
```

### Appointment Not Found
```json
{
  "success": false,
  "error": {
    "code": "APPOINTMENT_NOT_FOUND",
    "message": "Appointment with ID 'appointment-uuid' not found",
    "status": 404
  }
}
```

## 🔗 Related Endpoints

- [Patient Management API](./patients.md) - Manage appointment patients
- [Billing API](./billing.md) - Create invoices for appointments
- [Calendar Integration API](./calendar.md) - Sync with external calendars

---

*For webhook integration and real-time updates, see the [Webhooks Documentation](./webhooks.md).*
