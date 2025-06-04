import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePatients, usePatient } from '../usePatients';
import * as patientsApi from '../../lib/api/patients';

// Mock the API functions
vi.mock('../../lib/api/patients', () => ({
  getPatients: vi.fn(),
  getPatient: vi.fn(),
  createPatient: vi.fn(),
  updatePatient: vi.fn(),
  deletePatient: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('usePatients Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches patients successfully', async () => {
    const mockPatients = [
      {
        id: '1',
        first_name: 'Mohammed',
        last_name: 'Karimi',
        email: 'mohammed@example.com',
        phone: '+212612345678',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        first_name: 'Fatima',
        last_name: 'Benali',
        email: 'fatima@example.com',
        phone: '+212687654321',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    vi.mocked(patientsApi.getPatients).mockResolvedValue(mockPatients);

    const { result } = renderHook(() => usePatients(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockPatients);
    expect(patientsApi.getPatients).toHaveBeenCalledTimes(1);
  });

  it('handles fetch patients error', async () => {
    const mockError = new Error('Failed to fetch patients');
    vi.mocked(patientsApi.getPatients).mockRejectedValue(mockError);

    const { result } = renderHook(() => usePatients(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(mockError);
  });
});

describe('usePatient Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches single patient successfully', async () => {
    const mockPatient = {
      id: '1',
      first_name: 'Mohammed',
      last_name: 'Karimi',
      email: 'mohammed@example.com',
      phone: '+212612345678',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    vi.mocked(patientsApi.getPatient).mockResolvedValue(mockPatient);

    const { result } = renderHook(() => usePatient('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockPatient);
    expect(patientsApi.getPatient).toHaveBeenCalledWith('1');
  });

  it('does not fetch when id is empty', () => {
    const { result } = renderHook(() => usePatient(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.isPending).toBe(false);
    expect(patientsApi.getPatient).not.toHaveBeenCalled();
  });

  it('handles fetch patient error', async () => {
    const mockError = new Error('Patient not found');
    vi.mocked(patientsApi.getPatient).mockRejectedValue(mockError);

    const { result } = renderHook(() => usePatient('999'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(mockError);
  });
});
