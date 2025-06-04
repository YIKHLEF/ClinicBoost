import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { demoAuth, type DemoUser, DEMO_CREDENTIALS } from '../lib/demo-auth';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { Database } from '../lib/database.types';

type UserProfile = Database['public']['Tables']['users']['Row'];

interface User extends SupabaseUser {
  profile?: UserProfile;
}

interface DemoUserExtended extends DemoUser {
  id: string;
  email: string;
  user_metadata?: any;
  app_metadata?: any;
}

interface AuthContextType {
  user: User | DemoUserExtended | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signUp: (email: string, password: string, userData: {
    firstName: string;
    lastName: string;
    role?: 'admin' | 'dentist' | 'staff' | 'billing';
  }) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  loading: boolean;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  demoCredentials: typeof DEMO_CREDENTIALS;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | DemoUserExtended | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Check if we should use demo mode
  const shouldUseDemoMode = import.meta.env.VITE_DEMO_MODE === 'true' ||
                           !import.meta.env.VITE_SUPABASE_URL ||
                           import.meta.env.VITE_SUPABASE_URL === 'https://demo.supabase.co' ||
                           import.meta.env.VITE_SUPABASE_URL === 'https://mock.supabase.co';

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth:', { shouldUseDemoMode, env: import.meta.env.VITE_DEMO_MODE });

        if (shouldUseDemoMode) {
          // Demo mode initialization
          console.log('Setting up demo mode');
          setIsDemoMode(true);
          const demoUser = demoAuth.getCurrentUser();
          if (demoUser && demoAuth.getIsAuthenticated()) {
            console.log('Found existing demo user:', demoUser);
            setUser(demoUser as DemoUserExtended);
          }
          setLoading(false);
        } else {
          // Supabase mode initialization
          console.log('Setting up Supabase mode');
          setIsDemoMode(false);
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error) throw error;

          if (session) {
            await setUserWithProfile(session.user);
            setSession(session);
          }
          setLoading(false);

          // Listen for auth changes
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
              console.log('Auth state changed:', event, session);

              if (session) {
                await setUserWithProfile(session.user);
                setSession(session);
              } else {
                setUser(null);
                setSession(null);
              }
              setLoading(false);
            }
          );

          return () => subscription.unsubscribe();
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setLoading(false);
      }
    };

    initializeAuth();
  }, [shouldUseDemoMode]);

  const setUserWithProfile = async (supabaseUser: SupabaseUser) => {
    try {
      // Fetch user profile from our users table
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching user profile:', error);
      }

      setUser({
        ...supabaseUser,
        profile: profile || undefined
      });
    } catch (error) {
      console.error('Error setting user with profile:', error);
      setUser(supabaseUser);
    }
  };

  const login = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      console.log('Login attempt:', { email, isDemoMode, shouldUseDemoMode });

      if (shouldUseDemoMode || isDemoMode) {
        // Demo mode login
        console.log('Using demo mode login');
        const demoUser = await demoAuth.login(email, password);
        setUser(demoUser as DemoUserExtended);
        setLoading(false);
        console.log('Demo login successful:', demoUser);
      } else {
        // Supabase login
        console.log('Using Supabase login');
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        // User will be set via the auth state change listener
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoading(false);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    if (isDemoMode) {
      // Demo mode logout
      await demoAuth.logout();
      setUser(null);
    } else {
      // Supabase logout
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // User will be cleared via the auth state change listener
    }
  };

  const signUp = async (
    email: string,
    password: string,
    userData: {
      firstName: string;
      lastName: string;
      role?: 'admin' | 'dentist' | 'staff' | 'billing';
    }
  ): Promise<void> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    // Create user profile
    if (data.user) {
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: userData.role || 'staff',
        });

      if (profileError) throw profileError;
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    if (isDemoMode) {
      // Demo mode reset password
      await demoAuth.resetPassword(email);
    } else {
      // Supabase reset password
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<void> => {
    if (!user) throw new Error('No user logged in');

    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id);

    if (error) throw error;

    // Refresh user profile
    await setUserWithProfile(user);
  };

  const value = {
    user,
    session,
    login,
    logout,
    signUp,
    resetPassword,
    updateProfile,
    loading,
    isAuthenticated: !!user,
    isDemoMode,
    demoCredentials: DEMO_CREDENTIALS,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}