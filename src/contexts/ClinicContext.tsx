import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { clinicService, type ClinicWithMembership } from '../lib/clinic-management/clinic-service';
import { logger } from '../lib/logging-monitoring';

interface ClinicContextType {
  currentClinic: ClinicWithMembership | null;
  userClinics: ClinicWithMembership[];
  isLoading: boolean;
  error: string | null;
  switchClinic: (clinicId: string) => Promise<void>;
  refreshClinics: () => Promise<void>;
  hasMultipleClinics: boolean;
  canManageClinic: boolean;
  canManageResources: boolean;
  canManageMembers: boolean;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

interface ClinicProviderProps {
  children: ReactNode;
}

export const ClinicProvider: React.FC<ClinicProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [currentClinic, setCurrentClinic] = useState<ClinicWithMembership | null>(null);
  const [userClinics, setUserClinics] = useState<ClinicWithMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user clinics when user changes
  useEffect(() => {
    if (user?.id) {
      loadUserClinics();
    } else {
      setCurrentClinic(null);
      setUserClinics([]);
      setIsLoading(false);
    }
  }, [user?.id]);

  // Load current clinic from localStorage
  useEffect(() => {
    if (userClinics.length > 0) {
      const savedClinicId = localStorage.getItem('currentClinicId');
      if (savedClinicId) {
        const savedClinic = userClinics.find(clinic => clinic.id === savedClinicId);
        if (savedClinic) {
          setCurrentClinic(savedClinic);
          setIsLoading(false);
          return;
        }
      }
      
      // Default to first clinic if no saved clinic or saved clinic not found
      setCurrentClinic(userClinics[0]);
      localStorage.setItem('currentClinicId', userClinics[0].id);
      setIsLoading(false);
    }
  }, [userClinics]);

  const loadUserClinics = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      const clinics = await clinicService.getUserClinics(user.id);
      setUserClinics(clinics);

      logger.info('Loaded user clinics', 'clinic-context', {
        userId: user.id,
        clinicCount: clinics.length
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load clinics';
      setError(errorMessage);
      logger.error('Failed to load user clinics', 'clinic-context', {
        userId: user.id,
        error: err
      });
    } finally {
      setIsLoading(false);
    }
  };

  const switchClinic = async (clinicId: string) => {
    try {
      const clinic = userClinics.find(c => c.id === clinicId);
      if (!clinic) {
        throw new Error('Clinic not found');
      }

      setCurrentClinic(clinic);
      localStorage.setItem('currentClinicId', clinicId);

      logger.info('Switched clinic', 'clinic-context', {
        userId: user?.id,
        clinicId,
        clinicName: clinic.name
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to switch clinic';
      setError(errorMessage);
      logger.error('Failed to switch clinic', 'clinic-context', {
        userId: user?.id,
        clinicId,
        error: err
      });
      throw err;
    }
  };

  const refreshClinics = async () => {
    await loadUserClinics();
  };

  // Computed properties
  const hasMultipleClinics = userClinics.length > 1;
  
  const canManageClinic = currentClinic?.membership?.role === 'admin' || 
                         currentClinic?.owner_id === user?.id;
  
  const canManageResources = currentClinic?.membership?.role === 'admin' || 
                            currentClinic?.membership?.role === 'dentist' ||
                            currentClinic?.owner_id === user?.id;
  
  const canManageMembers = currentClinic?.membership?.role === 'admin' || 
                          currentClinic?.owner_id === user?.id;

  const value: ClinicContextType = {
    currentClinic,
    userClinics,
    isLoading,
    error,
    switchClinic,
    refreshClinics,
    hasMultipleClinics,
    canManageClinic,
    canManageResources,
    canManageMembers
  };

  return (
    <ClinicContext.Provider value={value}>
      {children}
    </ClinicContext.Provider>
  );
};

export const useClinic = (): ClinicContextType => {
  const context = useContext(ClinicContext);
  if (context === undefined) {
    throw new Error('useClinic must be used within a ClinicProvider');
  }
  return context;
};

// Hook for getting current clinic ID (useful for API calls)
export const useCurrentClinicId = (): string | null => {
  const { currentClinic } = useClinic();
  return currentClinic?.id || null;
};

// Hook for checking clinic permissions
export const useClinicPermissions = () => {
  const { 
    canManageClinic, 
    canManageResources, 
    canManageMembers,
    currentClinic 
  } = useClinic();

  return {
    canManageClinic,
    canManageResources,
    canManageMembers,
    isOwner: currentClinic?.owner_id === currentClinic?.membership?.user_id,
    isAdmin: currentClinic?.membership?.role === 'admin',
    isDentist: currentClinic?.membership?.role === 'dentist',
    isStaff: currentClinic?.membership?.role === 'staff',
    isBilling: currentClinic?.membership?.role === 'billing'
  };
};
