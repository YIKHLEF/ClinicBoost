/**
 * MSW Request Handlers
 * 
 * Mock API responses for testing
 */

import { http, HttpResponse } from 'msw';

// Mock data
const mockPatients = [
  {
    id: '1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone: '+212612345678',
    date_of_birth: '1990-01-01',
    address: '123 Main St',
    city: 'Casablanca',
    insurance_provider: 'CNSS',
    insurance_number: 'INS123456',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane.smith@example.com',
    phone: '+212612345679',
    date_of_birth: '1985-05-15',
    address: '456 Oak Ave',
    city: 'Rabat',
    insurance_provider: 'CNOPS',
    insurance_number: 'INS789012',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
];

const mockAppointments = [
  {
    id: '1',
    patient_id: '1',
    dentist_id: 'dentist-1',
    appointment_date: '2024-12-20T10:00:00Z',
    duration: 60,
    status: 'scheduled',
    type: 'consultation',
    notes: 'Regular checkup',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    patient_id: '2',
    dentist_id: 'dentist-1',
    appointment_date: '2024-12-21T14:00:00Z',
    duration: 90,
    status: 'scheduled',
    type: 'treatment',
    notes: 'Dental cleaning',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
];

const mockTreatments = [
  {
    id: '1',
    patient_id: '1',
    appointment_id: '1',
    treatment_type: 'cleaning',
    description: 'Professional dental cleaning',
    cost: 500,
    status: 'completed',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockInvoices = [
  {
    id: '1',
    patient_id: '1',
    amount: 500,
    status: 'paid',
    due_date: '2024-01-15',
    items: [
      {
        description: 'Dental cleaning',
        quantity: 1,
        unit_price: 500,
        total: 500,
      },
    ],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockUsers = [
  {
    id: 'user-1',
    email: 'admin@clinicboost.com',
    role: 'admin',
    first_name: 'Admin',
    last_name: 'User',
    phone: '+212612345680',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

export const handlers = [
  // Supabase Auth endpoints
  http.post('https://test.supabase.co/auth/v1/token', () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'mock-refresh-token',
      user: {
        id: 'user-1',
        email: 'test@example.com',
        user_metadata: {
          first_name: 'Test',
          last_name: 'User',
        },
      },
    });
  }),

  // Patients endpoints
  http.get('https://test.supabase.co/rest/v1/patients', () => {
    return HttpResponse.json(mockPatients);
  }),

  http.post('https://test.supabase.co/rest/v1/patients', async ({ request }) => {
    const newPatient = await request.json() as any;
    const patient = {
      id: String(mockPatients.length + 1),
      ...newPatient,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockPatients.push(patient);
    return HttpResponse.json(patient, { status: 201 });
  }),

  http.patch('https://test.supabase.co/rest/v1/patients', async ({ request }) => {
    const updates = await request.json() as any;
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    const patientIndex = mockPatients.findIndex(p => p.id === id);
    if (patientIndex !== -1) {
      mockPatients[patientIndex] = {
        ...mockPatients[patientIndex],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      return HttpResponse.json(mockPatients[patientIndex]);
    }
    return HttpResponse.json({ error: 'Patient not found' }, { status: 404 });
  }),

  http.delete('https://test.supabase.co/rest/v1/patients', ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    const patientIndex = mockPatients.findIndex(p => p.id === id);
    if (patientIndex !== -1) {
      mockPatients.splice(patientIndex, 1);
      return HttpResponse.json({}, { status: 204 });
    }
    return HttpResponse.json({ error: 'Patient not found' }, { status: 404 });
  }),

  // Appointments endpoints
  http.get('https://test.supabase.co/rest/v1/appointments', () => {
    return HttpResponse.json(mockAppointments);
  }),

  http.post('https://test.supabase.co/rest/v1/appointments', async ({ request }) => {
    const newAppointment = await request.json() as any;
    const appointment = {
      id: String(mockAppointments.length + 1),
      ...newAppointment,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockAppointments.push(appointment);
    return HttpResponse.json(appointment, { status: 201 });
  }),

  // Treatments endpoints
  http.get('https://test.supabase.co/rest/v1/treatments', () => {
    return HttpResponse.json(mockTreatments);
  }),

  http.post('https://test.supabase.co/rest/v1/treatments', async ({ request }) => {
    const newTreatment = await request.json() as any;
    const treatment = {
      id: String(mockTreatments.length + 1),
      ...newTreatment,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockTreatments.push(treatment);
    return HttpResponse.json(treatment, { status: 201 });
  }),

  // Invoices endpoints
  http.get('https://test.supabase.co/rest/v1/invoices', () => {
    return HttpResponse.json(mockInvoices);
  }),

  http.post('https://test.supabase.co/rest/v1/invoices', async ({ request }) => {
    const newInvoice = await request.json() as any;
    const invoice = {
      id: String(mockInvoices.length + 1),
      ...newInvoice,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockInvoices.push(invoice);
    return HttpResponse.json(invoice, { status: 201 });
  }),

  // Users endpoints
  http.get('https://test.supabase.co/rest/v1/users', () => {
    return HttpResponse.json(mockUsers);
  }),

  // Compliance endpoints
  http.get('https://test.supabase.co/rest/v1/consent_records', () => {
    return HttpResponse.json([]);
  }),

  http.get('https://test.supabase.co/rest/v1/compliance_audit_logs', () => {
    return HttpResponse.json([]);
  }),

  http.get('https://test.supabase.co/rest/v1/data_retention_policies', () => {
    return HttpResponse.json([]);
  }),

  // Twilio endpoints
  http.post('https://api.twilio.com/2010-04-01/Accounts/:accountSid/Messages.json', () => {
    return HttpResponse.json({
      sid: 'SM' + Math.random().toString(36).substr(2, 32),
      status: 'queued',
      to: '+212612345678',
      from: '+1234567890',
      body: 'Test message',
    });
  }),

  // Stripe endpoints
  http.post('https://api.stripe.com/v1/payment_intents', () => {
    return HttpResponse.json({
      id: 'pi_' + Math.random().toString(36).substr(2, 24),
      client_secret: 'pi_test_client_secret',
      status: 'requires_payment_method',
      amount: 50000,
      currency: 'mad',
    });
  }),

  // Azure AI endpoints
  http.post('https://test.cognitiveservices.azure.com/text/analytics/v3.1/sentiment', () => {
    return HttpResponse.json({
      documents: [
        {
          id: '1',
          sentiment: 'positive',
          confidenceScores: {
            positive: 0.9,
            neutral: 0.05,
            negative: 0.05,
          },
        },
      ],
    });
  }),

  // Fallback handler for unhandled requests
  http.all('*', ({ request }) => {
    console.warn(`Unhandled ${request.method} request to ${request.url}`);
    return HttpResponse.json(
      { error: `Unhandled ${request.method} request to ${request.url}` },
      { status: 404 }
    );
  }),
];
