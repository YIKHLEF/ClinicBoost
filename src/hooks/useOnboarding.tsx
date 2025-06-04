import React, { useState, useEffect, createContext, useContext } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export interface OnboardingStatus {
  isCompleted: boolean;
  isSkipped: boolean;
  currentStep: number;
  completedAt?: string;
  data?: any;
}

export const useOnboarding = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<OnboardingStatus>({
    isCompleted: false,
    isSkipped: false,
    currentStep: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check onboarding status
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('onboarding_completed, onboarding_skipped, onboarding_step, onboarding_completed_at, onboarding_data')
          .eq('user_id', user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        if (profile) {
          setStatus({
            isCompleted: profile.onboarding_completed || false,
            isSkipped: profile.onboarding_skipped || false,
            currentStep: profile.onboarding_step || 0,
            completedAt: profile.onboarding_completed_at,
            data: profile.onboarding_data,
          });
        } else {
          // Create initial profile if it doesn't exist
          await supabase
            .from('user_profiles')
            .insert({
              user_id: user.id,
              onboarding_completed: false,
              onboarding_skipped: false,
              onboarding_step: 0,
            });
        }
      } catch (err: any) {
        console.error('Error checking onboarding status:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [user]);

  // Complete onboarding
  const completeOnboarding = async (data?: any) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
          onboarding_data: data,
        });

      if (error) throw error;

      setStatus(prev => ({
        ...prev,
        isCompleted: true,
        completedAt: new Date().toISOString(),
        data,
      }));
    } catch (err: any) {
      console.error('Error completing onboarding:', err);
      setError(err.message);
      throw err;
    }
  };

  // Skip onboarding
  const skipOnboarding = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          onboarding_completed: true,
          onboarding_skipped: true,
          onboarding_completed_at: new Date().toISOString(),
        });

      if (error) throw error;

      setStatus(prev => ({
        ...prev,
        isCompleted: true,
        isSkipped: true,
        completedAt: new Date().toISOString(),
      }));
    } catch (err: any) {
      console.error('Error skipping onboarding:', err);
      setError(err.message);
      throw err;
    }
  };

  // Update onboarding step
  const updateStep = async (step: number, stepData?: any) => {
    if (!user) return;

    try {
      const updatedData = stepData 
        ? { ...status.data, [`step_${step}`]: stepData }
        : status.data;

      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          onboarding_step: step,
          onboarding_data: updatedData,
        });

      if (error) throw error;

      setStatus(prev => ({
        ...prev,
        currentStep: step,
        data: updatedData,
      }));
    } catch (err: any) {
      console.error('Error updating onboarding step:', err);
      setError(err.message);
      throw err;
    }
  };

  // Reset onboarding (for testing or re-onboarding)
  const resetOnboarding = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          onboarding_completed: false,
          onboarding_skipped: false,
          onboarding_step: 0,
          onboarding_completed_at: null,
          onboarding_data: null,
        });

      if (error) throw error;

      setStatus({
        isCompleted: false,
        isSkipped: false,
        currentStep: 0,
      });
    } catch (err: any) {
      console.error('Error resetting onboarding:', err);
      setError(err.message);
      throw err;
    }
  };

  // Check if user should see onboarding
  const shouldShowOnboarding = () => {
    return user && !status.isCompleted && !isLoading;
  };

  // Get onboarding progress percentage
  const getProgress = () => {
    const totalSteps = 7; // Total number of onboarding steps
    return Math.round((status.currentStep / totalSteps) * 100);
  };

  // Check if specific feature was configured during onboarding
  const isFeatureConfigured = (feature: string) => {
    return status.data?.[feature] !== undefined;
  };

  // Get clinic information from onboarding data
  const getClinicInfo = () => {
    return status.data?.['clinic-info'] || null;
  };

  // Get user profile from onboarding data
  const getUserProfile = () => {
    return status.data?.profile || null;
  };

  // Get team members from onboarding data
  const getTeamMembers = () => {
    return status.data?.team?.team_members || [];
  };

  // Get services from onboarding data
  const getServices = () => {
    return status.data?.services?.services || [];
  };

  // Get integrations from onboarding data
  const getIntegrations = () => {
    return status.data?.integrations || {};
  };

  return {
    status,
    isLoading,
    error,
    completeOnboarding,
    skipOnboarding,
    updateStep,
    resetOnboarding,
    shouldShowOnboarding,
    getProgress,
    isFeatureConfigured,
    getClinicInfo,
    getUserProfile,
    getTeamMembers,
    getServices,
    getIntegrations,
  };
};

// Hook for checking if user needs onboarding
export const useOnboardingCheck = () => {
  const { user } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) {
        setIsChecking(false);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('onboarding_completed')
          .eq('user_id', user.id)
          .single();

        setNeedsOnboarding(!profile?.onboarding_completed);
      } catch (error) {
        console.error('Error checking onboarding:', error);
        setNeedsOnboarding(true); // Default to showing onboarding on error
      } finally {
        setIsChecking(false);
      }
    };

    checkOnboarding();
  }, [user]);

  return { needsOnboarding, isChecking };
};

// Context for onboarding state management

interface OnboardingContextType {
  status: OnboardingStatus;
  isLoading: boolean;
  error: string | null;
  completeOnboarding: (data?: any) => Promise<void>;
  skipOnboarding: () => Promise<void>;
  updateStep: (step: number, stepData?: any) => Promise<void>;
  resetOnboarding: () => Promise<void>;
  shouldShowOnboarding: () => boolean;
  getProgress: () => number;
  isFeatureConfigured: (feature: string) => boolean;
  getClinicInfo: () => any;
  getUserProfile: () => any;
  getTeamMembers: () => any[];
  getServices: () => any[];
  getIntegrations: () => any;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const onboarding = useOnboarding();

  return (
    <OnboardingContext.Provider value={onboarding}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboardingContext = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboardingContext must be used within an OnboardingProvider');
  }
  return context;
};
