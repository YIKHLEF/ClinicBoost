/**
 * useAuth Hook Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { AuthProvider } from '../../contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock Supabase
const mockSupabase = {
  auth: {
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
};

vi.mock('../../lib/supabase', () => ({
  supabase: mockSupabase,
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it('should initialize with no user', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should login successfully', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      user_metadata: {
        first_name: 'Test',
        last_name: 'User',
      },
    };

    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: mockUser,
        session: { access_token: 'token' },
      },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });

    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
    });
  });

  it('should handle login errors', async () => {
    const loginError = new Error('Invalid credentials');
    
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: loginError,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.login('test@example.com', 'wrongpassword');
      })
    ).rejects.toThrow('Invalid credentials');
  });

  it('should logout successfully', async () => {
    mockSupabase.auth.signOut.mockResolvedValue({
      error: null,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });

  it('should handle logout errors', async () => {
    const logoutError = new Error('Logout failed');
    
    mockSupabase.auth.signOut.mockResolvedValue({
      error: logoutError,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.logout();
      })
    ).rejects.toThrow('Logout failed');
  });

  it('should restore session on initialization', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      user_metadata: {
        first_name: 'Test',
        last_name: 'User',
      },
    };

    mockSupabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: mockUser,
          access_token: 'token',
        },
      },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should handle session restoration errors', async () => {
    const sessionError = new Error('Session expired');
    
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: sessionError,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should listen to auth state changes', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
    };

    let authStateCallback: (event: string, session: any) => void;

    mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback;
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      };
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    // Simulate auth state change
    act(() => {
      authStateCallback('SIGNED_IN', {
        user: mockUser,
        access_token: 'token',
      });
    });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    // Simulate sign out
    act(() => {
      authStateCallback('SIGNED_OUT', null);
    });

    await waitFor(() => {
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  it('should provide user role information', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'admin@example.com',
      user_metadata: {
        role: 'admin',
      },
      app_metadata: {
        role: 'admin',
      },
    };

    mockSupabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: mockUser,
          access_token: 'token',
        },
      },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.userRole).toBe('admin');
    expect(result.current.isAdmin).toBe(true);
  });

  it('should handle missing role information', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'user@example.com',
      user_metadata: {},
      app_metadata: {},
    };

    mockSupabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: mockUser,
          access_token: 'token',
        },
      },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.userRole).toBe('user'); // Default role
    expect(result.current.isAdmin).toBe(false);
  });

  it('should update profile successfully', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      user_metadata: {
        first_name: 'Test',
        last_name: 'User',
      },
    };

    const updatedUser = {
      ...mockUser,
      user_metadata: {
        first_name: 'Updated',
        last_name: 'User',
      },
    };

    // Mock the update profile API call
    mockSupabase.auth.updateUser = vi.fn().mockResolvedValue({
      data: { user: updatedUser },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    // Set initial user
    act(() => {
      result.current.setUser(mockUser);
    });

    await act(async () => {
      await result.current.updateProfile({
        first_name: 'Updated',
      });
    });

    expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
      data: { first_name: 'Updated' },
    });
  });

  it('should handle profile update errors', async () => {
    const updateError = new Error('Update failed');
    
    mockSupabase.auth.updateUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: updateError,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.updateProfile({
          first_name: 'Updated',
        });
      })
    ).rejects.toThrow('Update failed');
  });

  it('should cleanup auth listener on unmount', () => {
    const unsubscribeMock = vi.fn();
    
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: unsubscribeMock } },
    });

    const { unmount } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    unmount();

    expect(unsubscribeMock).toHaveBeenCalled();
  });
});
