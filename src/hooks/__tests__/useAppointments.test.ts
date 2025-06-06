/**
 * useAppointments Hook Tests
 */

import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/mocks/server';
import { createTestQueryClient } from '../../test/utils/test-utils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppointments } from '../useAppointments';
import React from 'react';

// Test wrapper for React Query
const createWrapper = (queryClient: QueryClient) => {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useAppointments Hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    
    // Mock successful API response
    server.use(
      http.get('https://test.supabase.co/rest/v1/appointments', () => {
        return HttpResponse.json([
          {
            id: '1',
            patient_id: '1',
            date: '2024-01-15',
            time: '09:00',
            type: 'consultation',
            status: 'scheduled',
            duration: 60,
            notes: 'Regular checkup',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            patients: {
              id: '1',
              first_name: 'John',
              last_name: 'Doe',
              email: 'john.doe@example.com',
              phone: '+212612345678'
            }
          },
          {
            id: '2',
            patient_id: '2',
            date: '2024-01-15',
            time: '10:30',
            type: 'treatment',
            status: 'completed',
            duration: 90,
            notes: 'Dental cleaning',
            created_at: '2024-01-02T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z',
            patients: {
              id: '2',
              first_name: 'Jane',
              last_name: 'Smith',
              email: 'jane.smith@example.com',
              phone: '+212612345679'
            }
          }
        ]);
      })
    );
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('fetches appointments successfully', async () => {
    const { result } = renderHook(() => useAppointments(), {
      wrapper: createWrapper(queryClient)
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0]).toMatchObject({
      id: '1',
      patient_id: '1',
      date: '2024-01-15',
      time: '09:00',
      type: 'consultation',
      status: 'scheduled'
    });
  });

  it('handles API errors gracefully', async () => {
    server.use(
      http.get('https://test.supabase.co/rest/v1/appointments', () => {
        return HttpResponse.error();
      })
    );

    const { result } = renderHook(() => useAppointments(), {
      wrapper: createWrapper(queryClient)
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.data).toBeUndefined();
  });

  it('supports date filtering', async () => {
    server.use(
      http.get('https://test.supabase.co/rest/v1/appointments', ({ request }) => {
        const url = new URL(request.url);
        const dateFilter = url.searchParams.get('date');
        
        if (dateFilter === 'eq.2024-01-15') {
          return HttpResponse.json([
            {
              id: '1',
              patient_id: '1',
              date: '2024-01-15',
              time: '09:00',
              type: 'consultation',
              status: 'scheduled',
              created_at: '2024-01-01T00:00:00Z'
            }
          ]);
        }
        
        return HttpResponse.json([]);
      })
    );

    const { result } = renderHook(() => useAppointments({ 
      date: '2024-01-15' 
    }), {
      wrapper: createWrapper(queryClient)
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].date).toBe('2024-01-15');
  });

  it('supports status filtering', async () => {
    server.use(
      http.get('https://test.supabase.co/rest/v1/appointments', ({ request }) => {
        const url = new URL(request.url);
        const statusFilter = url.searchParams.get('status');
        
        if (statusFilter === 'eq.scheduled') {
          return HttpResponse.json([
            {
              id: '1',
              patient_id: '1',
              date: '2024-01-15',
              time: '09:00',
              status: 'scheduled',
              created_at: '2024-01-01T00:00:00Z'
            }
          ]);
        }
        
        return HttpResponse.json([]);
      })
    );

    const { result } = renderHook(() => useAppointments({ 
      status: 'scheduled' 
    }), {
      wrapper: createWrapper(queryClient)
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].status).toBe('scheduled');
  });

  it('supports patient filtering', async () => {
    server.use(
      http.get('https://test.supabase.co/rest/v1/appointments', ({ request }) => {
        const url = new URL(request.url);
        const patientFilter = url.searchParams.get('patient_id');
        
        if (patientFilter === 'eq.1') {
          return HttpResponse.json([
            {
              id: '1',
              patient_id: '1',
              date: '2024-01-15',
              time: '09:00',
              created_at: '2024-01-01T00:00:00Z'
            }
          ]);
        }
        
        return HttpResponse.json([]);
      })
    );

    const { result } = renderHook(() => useAppointments({ 
      patientId: '1' 
    }), {
      wrapper: createWrapper(queryClient)
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].patient_id).toBe('1');
  });

  it('supports date range filtering', async () => {
    server.use(
      http.get('https://test.supabase.co/rest/v1/appointments', ({ request }) => {
        const url = new URL(request.url);
        const dateGte = url.searchParams.get('date');
        
        if (dateGte?.includes('gte.2024-01-01')) {
          return HttpResponse.json([
            {
              id: '1',
              patient_id: '1',
              date: '2024-01-15',
              time: '09:00',
              created_at: '2024-01-01T00:00:00Z'
            },
            {
              id: '2',
              patient_id: '2',
              date: '2024-01-20',
              time: '10:30',
              created_at: '2024-01-02T00:00:00Z'
            }
          ]);
        }
        
        return HttpResponse.json([]);
      })
    );

    const { result } = renderHook(() => useAppointments({ 
      startDate: '2024-01-01',
      endDate: '2024-01-31'
    }), {
      wrapper: createWrapper(queryClient)
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(2);
  });

  it('supports sorting', async () => {
    server.use(
      http.get('https://test.supabase.co/rest/v1/appointments', ({ request }) => {
        const url = new URL(request.url);
        const order = url.searchParams.get('order');
        
        expect(order).toBe('date.asc,time.asc');
        
        return HttpResponse.json([
          {
            id: '1',
            date: '2024-01-15',
            time: '09:00',
            created_at: '2024-01-01T00:00:00Z'
          },
          {
            id: '2',
            date: '2024-01-15',
            time: '10:30',
            created_at: '2024-01-02T00:00:00Z'
          }
        ]);
      })
    );

    const { result } = renderHook(() => useAppointments({ 
      sortBy: 'date',
      sortOrder: 'asc'
    }), {
      wrapper: createWrapper(queryClient)
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(2);
  });

  it('includes patient data when requested', async () => {
    server.use(
      http.get('https://test.supabase.co/rest/v1/appointments', ({ request }) => {
        const url = new URL(request.url);
        const select = url.searchParams.get('select');
        
        if (select?.includes('patients(*)')) {
          return HttpResponse.json([
            {
              id: '1',
              patient_id: '1',
              date: '2024-01-15',
              time: '09:00',
              patients: {
                id: '1',
                first_name: 'John',
                last_name: 'Doe',
                email: 'john.doe@example.com'
              }
            }
          ]);
        }
        
        return HttpResponse.json([
          {
            id: '1',
            patient_id: '1',
            date: '2024-01-15',
            time: '09:00'
          }
        ]);
      })
    );

    const { result } = renderHook(() => useAppointments({ 
      includePatients: true 
    }), {
      wrapper: createWrapper(queryClient)
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.[0].patients).toBeDefined();
    expect(result.current.data?.[0].patients?.first_name).toBe('John');
  });

  it('handles real-time updates', async () => {
    const { result } = renderHook(() => useAppointments(), {
      wrapper: createWrapper(queryClient)
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(2);

    // Simulate real-time update
    server.use(
      http.get('https://test.supabase.co/rest/v1/appointments', () => {
        return HttpResponse.json([
          {
            id: '1',
            patient_id: '1',
            date: '2024-01-15',
            time: '09:00',
            status: 'completed', // Status changed
            created_at: '2024-01-01T00:00:00Z'
          },
          {
            id: '3', // New appointment
            patient_id: '3',
            date: '2024-01-16',
            time: '11:00',
            status: 'scheduled',
            created_at: '2024-01-03T00:00:00Z'
          }
        ]);
      })
    );

    // Invalidate and refetch
    await queryClient.invalidateQueries({ queryKey: ['appointments'] });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.[0].status).toBe('completed');
      expect(result.current.data?.[1].id).toBe('3');
    });
  });

  it('caches data correctly', async () => {
    let requestCount = 0;
    
    server.use(
      http.get('https://test.supabase.co/rest/v1/appointments', () => {
        requestCount++;
        return HttpResponse.json([
          {
            id: '1',
            patient_id: '1',
            date: '2024-01-15',
            time: '09:00',
            created_at: '2024-01-01T00:00:00Z'
          }
        ]);
      })
    );

    // First render
    const { result: result1 } = renderHook(() => useAppointments(), {
      wrapper: createWrapper(queryClient)
    });

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
    });

    // Second render with same parameters should use cache
    const { result: result2 } = renderHook(() => useAppointments(), {
      wrapper: createWrapper(queryClient)
    });

    await waitFor(() => {
      expect(result2.current.isLoading).toBe(false);
    });

    expect(requestCount).toBe(1); // Only one request made
    expect(result2.current.data).toEqual(result1.current.data);
  });

  it('handles pagination', async () => {
    server.use(
      http.get('https://test.supabase.co/rest/v1/appointments', ({ request }) => {
        const url = new URL(request.url);
        const limit = url.searchParams.get('limit');
        const offset = url.searchParams.get('offset');
        
        expect(limit).toBe('10');
        expect(offset).toBe('10');
        
        return HttpResponse.json([
          {
            id: '11',
            patient_id: '11',
            date: '2024-01-25',
            time: '09:00',
            created_at: '2024-01-11T00:00:00Z'
          }
        ]);
      })
    );

    const { result } = renderHook(() => useAppointments({ 
      page: 2, 
      limit: 10 
    }), {
      wrapper: createWrapper(queryClient)
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].id).toBe('11');
  });
});
