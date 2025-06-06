/**
 * Patient Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { patientService } from '../patients';
import { server } from '../../test/mocks/server';
import { http, HttpResponse } from 'msw';

describe('Patient Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPatients', () => {
    it('should fetch patients successfully', async () => {
      const mockPatients = [
        {
          id: '1',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          phone: '+212612345678',
        },
      ];

      server.use(
        http.get('https://test.supabase.co/rest/v1/patients', () => {
          return HttpResponse.json(mockPatients);
        })
      );

      const patients = await patientService.getPatients();
      expect(patients).toEqual(mockPatients);
    });

    it('should handle API errors', async () => {
      server.use(
        http.get('https://test.supabase.co/rest/v1/patients', () => {
          return HttpResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      await expect(patientService.getPatients()).rejects.toThrow();
    });

    it('should apply search filters', async () => {
      const searchTerm = 'John';
      
      server.use(
        http.get('https://test.supabase.co/rest/v1/patients', ({ request }) => {
          const url = new URL(request.url);
          const search = url.searchParams.get('or');
          
          expect(search).toContain('first_name.ilike');
          expect(search).toContain(searchTerm);
          
          return HttpResponse.json([]);
        })
      );

      await patientService.getPatients({ search: searchTerm });
    });
  });

  describe('createPatient', () => {
    it('should create patient successfully', async () => {
      const newPatient = {
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@example.com',
        phone: '+212612345679',
        date_of_birth: '1985-05-15',
        address: '456 Oak Ave',
        city: 'Rabat',
        insurance_provider: 'CNOPS',
        insurance_number: 'INS789012',
      };

      const createdPatient = {
        id: '2',
        ...newPatient,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      server.use(
        http.post('https://test.supabase.co/rest/v1/patients', async ({ request }) => {
          const body = await request.json();
          expect(body).toEqual(newPatient);
          return HttpResponse.json(createdPatient, { status: 201 });
        })
      );

      const result = await patientService.createPatient(newPatient);
      expect(result).toEqual(createdPatient);
    });

    it('should validate required fields', async () => {
      const invalidPatient = {
        first_name: '',
        last_name: 'Smith',
        email: 'invalid-email',
        phone: '123',
      };

      await expect(patientService.createPatient(invalidPatient as any))
        .rejects.toThrow('Validation error');
    });

    it('should handle duplicate email error', async () => {
      server.use(
        http.post('https://test.supabase.co/rest/v1/patients', () => {
          return HttpResponse.json(
            { error: 'Email already exists' },
            { status: 400 }
          );
        })
      );

      const patient = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'existing@example.com',
        phone: '+212612345678',
      };

      await expect(patientService.createPatient(patient as any))
        .rejects.toThrow('Email already exists');
    });
  });

  describe('updatePatient', () => {
    it('should update patient successfully', async () => {
      const patientId = '1';
      const updates = {
        first_name: 'Updated',
        phone: '+212612345999',
      };

      const updatedPatient = {
        id: patientId,
        first_name: 'Updated',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        phone: '+212612345999',
        updated_at: '2024-01-02T00:00:00Z',
      };

      server.use(
        http.patch('https://test.supabase.co/rest/v1/patients', async ({ request }) => {
          const url = new URL(request.url);
          const id = url.searchParams.get('id');
          const body = await request.json();
          
          expect(id).toBe(patientId);
          expect(body).toEqual(updates);
          
          return HttpResponse.json(updatedPatient);
        })
      );

      const result = await patientService.updatePatient(patientId, updates);
      expect(result).toEqual(updatedPatient);
    });

    it('should handle patient not found', async () => {
      server.use(
        http.patch('https://test.supabase.co/rest/v1/patients', () => {
          return HttpResponse.json(
            { error: 'Patient not found' },
            { status: 404 }
          );
        })
      );

      await expect(patientService.updatePatient('999', { first_name: 'Test' }))
        .rejects.toThrow('Patient not found');
    });
  });

  describe('deletePatient', () => {
    it('should delete patient successfully', async () => {
      const patientId = '1';

      server.use(
        http.delete('https://test.supabase.co/rest/v1/patients', ({ request }) => {
          const url = new URL(request.url);
          const id = url.searchParams.get('id');
          
          expect(id).toBe(patientId);
          
          return HttpResponse.json({}, { status: 204 });
        })
      );

      await expect(patientService.deletePatient(patientId)).resolves.not.toThrow();
    });

    it('should handle patient not found during deletion', async () => {
      server.use(
        http.delete('https://test.supabase.co/rest/v1/patients', () => {
          return HttpResponse.json(
            { error: 'Patient not found' },
            { status: 404 }
          );
        })
      );

      await expect(patientService.deletePatient('999'))
        .rejects.toThrow('Patient not found');
    });
  });

  describe('searchPatients', () => {
    it('should search patients by name', async () => {
      const searchTerm = 'John';
      const mockResults = [
        {
          id: '1',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
        },
      ];

      server.use(
        http.get('https://test.supabase.co/rest/v1/patients', ({ request }) => {
          const url = new URL(request.url);
          const search = url.searchParams.get('or');
          
          expect(search).toContain(searchTerm);
          
          return HttpResponse.json(mockResults);
        })
      );

      const results = await patientService.searchPatients(searchTerm);
      expect(results).toEqual(mockResults);
    });

    it('should search patients by email', async () => {
      const email = 'john@example.com';
      
      server.use(
        http.get('https://test.supabase.co/rest/v1/patients', ({ request }) => {
          const url = new URL(request.url);
          const search = url.searchParams.get('or');
          
          expect(search).toContain(email);
          
          return HttpResponse.json([]);
        })
      );

      await patientService.searchPatients(email);
    });

    it('should handle empty search results', async () => {
      server.use(
        http.get('https://test.supabase.co/rest/v1/patients', () => {
          return HttpResponse.json([]);
        })
      );

      const results = await patientService.searchPatients('nonexistent');
      expect(results).toEqual([]);
    });
  });

  describe('getPatientById', () => {
    it('should fetch patient by ID', async () => {
      const patientId = '1';
      const mockPatient = {
        id: patientId,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
      };

      server.use(
        http.get('https://test.supabase.co/rest/v1/patients', ({ request }) => {
          const url = new URL(request.url);
          const id = url.searchParams.get('id');
          
          expect(id).toBe(patientId);
          
          return HttpResponse.json([mockPatient]);
        })
      );

      const result = await patientService.getPatientById(patientId);
      expect(result).toEqual(mockPatient);
    });

    it('should return null for non-existent patient', async () => {
      server.use(
        http.get('https://test.supabase.co/rest/v1/patients', () => {
          return HttpResponse.json([]);
        })
      );

      const result = await patientService.getPatientById('999');
      expect(result).toBeNull();
    });
  });

  describe('validatePatientData', () => {
    it('should validate required fields', () => {
      const invalidData = {
        first_name: '',
        last_name: '',
        email: '',
      };

      expect(() => patientService.validatePatientData(invalidData as any))
        .toThrow('First name is required');
    });

    it('should validate email format', () => {
      const invalidData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'invalid-email',
      };

      expect(() => patientService.validatePatientData(invalidData as any))
        .toThrow('Invalid email format');
    });

    it('should validate Moroccan phone number', () => {
      const invalidData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone: '123456789',
      };

      expect(() => patientService.validatePatientData(invalidData as any))
        .toThrow('Invalid phone number format');
    });

    it('should pass validation for valid data', () => {
      const validData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        phone: '+212612345678',
        date_of_birth: '1990-01-01',
        address: '123 Main St',
        city: 'Casablanca',
      };

      expect(() => patientService.validatePatientData(validData))
        .not.toThrow();
    });
  });
});
