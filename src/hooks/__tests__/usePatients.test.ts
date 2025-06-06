/**
 * usePatients Hook Tests
 */

import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/mocks/server';
import { createTestQueryClient } from '../../test/utils/test-utils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePatients } from '../usePatients';
import React from 'react';

// Test wrapper for React Query
const createWrapper = (queryClient: QueryClient) => {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('usePatients Hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    
    // Mock successful API response
    server.use(
      http.get('https://test.supabase.co/rest/v1/patients', () => {
        return HttpResponse.json([
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
            updated_at: '2024-01-01T00:00:00Z'
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
            updated_at: '2024-01-02T00:00:00Z'
          }
        ]);
      })
    );
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('fetches patients successfully', async () => {
    const { result } = renderHook(() => usePatients(), {
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
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com'
    });
  });

  it('handles API errors gracefully', async () => {
    server.use(
      http.get('https://test.supabase.co/rest/v1/patients', () => {
        return HttpResponse.error();
      })
    );

    const { result } = renderHook(() => usePatients(), {
      wrapper: createWrapper(queryClient)
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.data).toBeUndefined();
  });

  it('supports search functionality', async () => {
    server.use(
      http.get('https://test.supabase.co/rest/v1/patients', ({ request }) => {
        const url = new URL(request.url);
        const search = url.searchParams.get('or');
        
        if (search?.includes('John')) {
          return HttpResponse.json([
            {
              id: '1',
              first_name: 'John',
              last_name: 'Doe',
              email: 'john.doe@example.com',
              phone: '+212612345678',
              date_of_birth: '1990-01-01',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            }
          ]);
        }
        
        return HttpResponse.json([]);
      })
    );

    const { result } = renderHook(() => usePatients({ search: 'John' }), {
      wrapper: createWrapper(queryClient)
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].first_name).toBe('John');
  });

  it('supports pagination', async () => {
    server.use(
      http.get('https://test.supabase.co/rest/v1/patients', ({ request }) => {
        const url = new URL(request.url);
        const limit = url.searchParams.get('limit');
        const offset = url.searchParams.get('offset');
        
        expect(limit).toBe('10');
        expect(offset).toBe('10');
        
        return HttpResponse.json([
          {
            id: '11',
            first_name: 'Patient',
            last_name: 'Eleven',
            email: 'patient11@example.com',
            phone: '+212612345680',
            created_at: '2024-01-11T00:00:00Z',
            updated_at: '2024-01-11T00:00:00Z'
          }
        ]);
      })
    );

    const { result } = renderHook(() => usePatients({ 
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

  it('supports sorting', async () => {
    server.use(
      http.get('https://test.supabase.co/rest/v1/patients', ({ request }) => {
        const url = new URL(request.url);
        const order = url.searchParams.get('order');
        
        expect(order).toBe('last_name.asc');
        
        return HttpResponse.json([
          {
            id: '1',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john.doe@example.com',
            created_at: '2024-01-01T00:00:00Z'
          },
          {
            id: '2',
            first_name: 'Jane',
            last_name: 'Smith',
            email: 'jane.smith@example.com',
            created_at: '2024-01-02T00:00:00Z'
          }
        ]);
      })
    );

    const { result } = renderHook(() => usePatients({ 
      sortBy: 'last_name',
      sortOrder: 'asc'
    }), {
      wrapper: createWrapper(queryClient)
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(2);
  });

  it('supports filtering by insurance provider', async () => {
    server.use(
      http.get('https://test.supabase.co/rest/v1/patients', ({ request }) => {
        const url = new URL(request.url);
        const insurance = url.searchParams.get('insurance_provider');
        
        if (insurance === 'eq.CNSS') {
          return HttpResponse.json([
            {
              id: '1',
              first_name: 'John',
              last_name: 'Doe',
              insurance_provider: 'CNSS',
              created_at: '2024-01-01T00:00:00Z'
            }
          ]);
        }
        
        return HttpResponse.json([]);
      })
    );

    const { result } = renderHook(() => usePatients({ 
      insuranceProvider: 'CNSS'
    }), {
      wrapper: createWrapper(queryClient)
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].insurance_provider).toBe('CNSS');
  });

  it('caches data correctly', async () => {
    let requestCount = 0;
    
    server.use(
      http.get('https://test.supabase.co/rest/v1/patients', () => {
        requestCount++;
        return HttpResponse.json([
          {
            id: '1',
            first_name: 'John',
            last_name: 'Doe',
            created_at: '2024-01-01T00:00:00Z'
          }
        ]);
      })
    );

    // First render
    const { result: result1 } = renderHook(() => usePatients(), {
      wrapper: createWrapper(queryClient)
    });

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
    });

    // Second render with same parameters should use cache
    const { result: result2 } = renderHook(() => usePatients(), {
      wrapper: createWrapper(queryClient)
    });

    await waitFor(() => {
      expect(result2.current.isLoading).toBe(false);
    });

    expect(requestCount).toBe(1); // Only one request made
    expect(result2.current.data).toEqual(result1.current.data);
  });

  it('invalidates cache when parameters change', async () => {
    let requestCount = 0;
    
    server.use(
      http.get('https://test.supabase.co/rest/v1/patients', ({ request }) => {
        requestCount++;
        const url = new URL(request.url);
        const search = url.searchParams.get('or');
        
        if (search?.includes('John')) {
          return HttpResponse.json([{ id: '1', first_name: 'John' }]);
        }
        
        return HttpResponse.json([{ id: '2', first_name: 'Jane' }]);
      })
    );

    const { result, rerender } = renderHook(
      ({ search }) => usePatients({ search }),
      {
        wrapper: createWrapper(queryClient),
        initialProps: { search: undefined }
      }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Change search parameter
    rerender({ search: 'John' });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(requestCount).toBe(2); // Two requests made
    expect(result.current.data?.[0].first_name).toBe('John');
  });

  it('handles network errors with retry', async () => {
    let attemptCount = 0;
    
    server.use(
      http.get('https://test.supabase.co/rest/v1/patients', () => {
        attemptCount++;
        if (attemptCount < 3) {
          return HttpResponse.error();
        }
        return HttpResponse.json([{ id: '1', first_name: 'John' }]);
      })
    );

    const { result } = renderHook(() => usePatients(), {
      wrapper: createWrapper(queryClient)
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 10000 });

    expect(attemptCount).toBe(3);
    expect(result.current.data).toHaveLength(1);
  });
});
