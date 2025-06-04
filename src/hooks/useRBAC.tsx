/**
 * Role-Based Access Control Hook
 * 
 * This hook provides role-based access control functionality including:
 * - Permission checking
 * - Role validation
 * - Component-level access control
 * - Route protection
 * - UI element visibility control
 */

import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  type User, 
  type Permission, 
  type UserRole,
  PermissionAction,
  hasPermission,
  hasAnyPermission,
  userService 
} from '../lib/user-management/user-service';

export interface RBACHookReturn {
  // User information
  user: User | null;
  role: UserRole | null;
  permissions: Permission[];
  
  // Permission checking functions
  can: (resource: string, action: PermissionAction) => boolean;
  canAny: (resource: string) => boolean;
  canAll: (checks: Array<{ resource: string; action: PermissionAction }>) => boolean;
  
  // Role checking functions
  hasRole: (roleId: string) => boolean;
  hasAnyRole: (roleIds: string[]) => boolean;
  hasMinimumRole: (minimumLevel: number) => boolean;
  
  // Resource-specific permission checks
  canManageUsers: boolean;
  canViewUsers: boolean;
  canCreateUsers: boolean;
  canEditUsers: boolean;
  canDeleteUsers: boolean;
  
  canManagePatients: boolean;
  canViewPatients: boolean;
  canCreatePatients: boolean;
  canEditPatients: boolean;
  canDeletePatients: boolean;
  
  canManageAppointments: boolean;
  canViewAppointments: boolean;
  canCreateAppointments: boolean;
  canEditAppointments: boolean;
  canDeleteAppointments: boolean;
  
  canManageBilling: boolean;
  canViewBilling: boolean;
  canCreateBilling: boolean;
  canEditBilling: boolean;
  canDeleteBilling: boolean;
  
  canManageReports: boolean;
  canViewReports: boolean;
  canCreateReports: boolean;
  
  canManageSettings: boolean;
  canViewSettings: boolean;
  canEditSettings: boolean;
  
  canManageIntegrations: boolean;
  canViewIntegrations: boolean;
  canEditIntegrations: boolean;
  
  canManageCampaigns: boolean;
  canViewCampaigns: boolean;
  canCreateCampaigns: boolean;
  canEditCampaigns: boolean;
  canDeleteCampaigns: boolean;
  
  canManageMessaging: boolean;
  canViewMessaging: boolean;
  canSendMessages: boolean;
  
  // Administrative permissions
  isAdmin: boolean;
  isSuperAdmin: boolean;
  canAccessAdminPanel: boolean;
  canManageSystem: boolean;
  
  // UI helpers
  showIfCan: (resource: string, action: PermissionAction) => boolean;
  hideIfCannot: (resource: string, action: PermissionAction) => boolean;
  disableIfCannot: (resource: string, action: PermissionAction) => boolean;
}

export const useRBAC = (): RBACHookReturn => {
  const { user: authUser } = useAuth();
  const [userData, setUserData] = useState<User | null>(null);

  // Load user data when auth user changes
  useEffect(() => {
    const loadUserData = async () => {
      if (!authUser) {
        setUserData(null);
        return;
      }

      // Try to get user from userService first
      let user = await userService.getUserById(authUser.id);

      // If not found, create a mock user based on auth user
      if (!user) {
        // For demo purposes, assign admin role to the first user
        const isAdmin = authUser.email === 'admin@clinicboost.com' || authUser.profile?.role === 'admin';
        const roleId = isAdmin ? 'super-admin' : 'doctor';

        // Get the role
        const role = await userService.getRoleById(roleId);
        if (!role) {
          setUserData(null);
          return;
        }

        // Create a mock user object
        user = {
          id: authUser.id,
          email: authUser.email || '',
          firstName: authUser.profile?.first_name || 'User',
          lastName: authUser.profile?.last_name || 'Name',
          phone: authUser.profile?.phone,
          role,
          permissions: role.permissions,
          department: authUser.profile?.department,
          title: authUser.profile?.title,
          status: 'active' as const,
          createdAt: new Date(authUser.created_at || Date.now()),
          updatedAt: new Date(),
          createdBy: 'system',
          settings: {
            theme: 'system' as const,
            language: 'en',
            timezone: 'America/New_York',
            dateFormat: 'MM/DD/YYYY',
            timeFormat: '12h' as const,
            notifications: {
              email: true,
              sms: false,
              push: true,
              appointments: true,
              reminders: true,
              marketing: false,
              security: true,
            },
            privacy: {
              profileVisibility: 'team' as const,
              activityTracking: true,
              dataSharing: false,
              analyticsOptOut: false,
            },
          },
          preferences: {
            dashboardLayout: 'default',
            defaultView: 'dashboard',
            itemsPerPage: 25,
            autoSave: true,
            shortcuts: {},
          },
        };
      }

      setUserData(user);
    };

    loadUserData();
  }, [authUser]);

  // Memoize permission checking functions
  const rbacFunctions = useMemo(() => {
    if (!userData) {
      // Return default functions that always return false when no user
      return {
        can: () => false,
        canAny: () => false,
        canAll: () => false,
        hasRole: () => false,
        hasAnyRole: () => false,
        hasMinimumRole: () => false,
      };
    }

    return {
      can: (resource: string, action: PermissionAction): boolean => {
        return hasPermission(userData, resource, action);
      },
      
      canAny: (resource: string): boolean => {
        return hasAnyPermission(userData, resource);
      },
      
      canAll: (checks: Array<{ resource: string; action: PermissionAction }>): boolean => {
        return checks.every(check => hasPermission(userData, check.resource, check.action));
      },
      
      hasRole: (roleId: string): boolean => {
        return userData.role.id === roleId;
      },
      
      hasAnyRole: (roleIds: string[]): boolean => {
        return roleIds.includes(userData.role.id);
      },
      
      hasMinimumRole: (minimumLevel: number): boolean => {
        return userData.role.level >= minimumLevel;
      },
    };
  }, [userData]);

  // Memoize resource-specific permissions
  const resourcePermissions = useMemo(() => {
    if (!userData) {
      return {
        // Users
        canManageUsers: false,
        canViewUsers: false,
        canCreateUsers: false,
        canEditUsers: false,
        canDeleteUsers: false,
        
        // Patients
        canManagePatients: false,
        canViewPatients: false,
        canCreatePatients: false,
        canEditPatients: false,
        canDeletePatients: false,
        
        // Appointments
        canManageAppointments: false,
        canViewAppointments: false,
        canCreateAppointments: false,
        canEditAppointments: false,
        canDeleteAppointments: false,
        
        // Billing
        canManageBilling: false,
        canViewBilling: false,
        canCreateBilling: false,
        canEditBilling: false,
        canDeleteBilling: false,
        
        // Reports
        canManageReports: false,
        canViewReports: false,
        canCreateReports: false,
        
        // Settings
        canManageSettings: false,
        canViewSettings: false,
        canEditSettings: false,
        
        // Integrations
        canManageIntegrations: false,
        canViewIntegrations: false,
        canEditIntegrations: false,
        
        // Campaigns
        canManageCampaigns: false,
        canViewCampaigns: false,
        canCreateCampaigns: false,
        canEditCampaigns: false,
        canDeleteCampaigns: false,
        
        // Messaging
        canManageMessaging: false,
        canViewMessaging: false,
        canSendMessages: false,
        
        // Administrative
        isAdmin: false,
        isSuperAdmin: false,
        canAccessAdminPanel: false,
        canManageSystem: false,
      };
    }

    return {
      // Users
      canManageUsers: rbacFunctions.can('users', PermissionAction.MANAGE),
      canViewUsers: rbacFunctions.can('users', PermissionAction.READ),
      canCreateUsers: rbacFunctions.can('users', PermissionAction.CREATE),
      canEditUsers: rbacFunctions.can('users', PermissionAction.UPDATE),
      canDeleteUsers: rbacFunctions.can('users', PermissionAction.DELETE),
      
      // Patients
      canManagePatients: rbacFunctions.can('patients', PermissionAction.MANAGE),
      canViewPatients: rbacFunctions.can('patients', PermissionAction.READ),
      canCreatePatients: rbacFunctions.can('patients', PermissionAction.CREATE),
      canEditPatients: rbacFunctions.can('patients', PermissionAction.UPDATE),
      canDeletePatients: rbacFunctions.can('patients', PermissionAction.DELETE),
      
      // Appointments
      canManageAppointments: rbacFunctions.can('appointments', PermissionAction.MANAGE),
      canViewAppointments: rbacFunctions.can('appointments', PermissionAction.READ),
      canCreateAppointments: rbacFunctions.can('appointments', PermissionAction.CREATE),
      canEditAppointments: rbacFunctions.can('appointments', PermissionAction.UPDATE),
      canDeleteAppointments: rbacFunctions.can('appointments', PermissionAction.DELETE),
      
      // Billing
      canManageBilling: rbacFunctions.can('billing', PermissionAction.MANAGE),
      canViewBilling: rbacFunctions.can('billing', PermissionAction.READ),
      canCreateBilling: rbacFunctions.can('billing', PermissionAction.CREATE),
      canEditBilling: rbacFunctions.can('billing', PermissionAction.UPDATE),
      canDeleteBilling: rbacFunctions.can('billing', PermissionAction.DELETE),
      
      // Reports
      canManageReports: rbacFunctions.can('reports', PermissionAction.MANAGE),
      canViewReports: rbacFunctions.can('reports', PermissionAction.READ),
      canCreateReports: rbacFunctions.can('reports', PermissionAction.CREATE),
      
      // Settings
      canManageSettings: rbacFunctions.can('settings', PermissionAction.MANAGE),
      canViewSettings: rbacFunctions.can('settings', PermissionAction.READ),
      canEditSettings: rbacFunctions.can('settings', PermissionAction.UPDATE),
      
      // Integrations
      canManageIntegrations: rbacFunctions.can('integrations', PermissionAction.MANAGE),
      canViewIntegrations: rbacFunctions.can('integrations', PermissionAction.READ),
      canEditIntegrations: rbacFunctions.can('integrations', PermissionAction.UPDATE),
      
      // Campaigns
      canManageCampaigns: rbacFunctions.can('campaigns', PermissionAction.MANAGE),
      canViewCampaigns: rbacFunctions.can('campaigns', PermissionAction.READ),
      canCreateCampaigns: rbacFunctions.can('campaigns', PermissionAction.CREATE),
      canEditCampaigns: rbacFunctions.can('campaigns', PermissionAction.UPDATE),
      canDeleteCampaigns: rbacFunctions.can('campaigns', PermissionAction.DELETE),
      
      // Messaging
      canManageMessaging: rbacFunctions.can('messaging', PermissionAction.MANAGE),
      canViewMessaging: rbacFunctions.can('messaging', PermissionAction.READ),
      canSendMessages: rbacFunctions.can('messaging', PermissionAction.CREATE),
      
      // Administrative
      isAdmin: rbacFunctions.hasAnyRole(['admin', 'super-admin']),
      isSuperAdmin: rbacFunctions.hasRole('super-admin'),
      canAccessAdminPanel: rbacFunctions.hasMinimumRole(8),
      canManageSystem: rbacFunctions.hasRole('super-admin'),
    };
  }, [userData, rbacFunctions]);

  // UI helper functions
  const uiHelpers = useMemo(() => ({
    showIfCan: (resource: string, action: PermissionAction): boolean => {
      return rbacFunctions.can(resource, action);
    },
    
    hideIfCannot: (resource: string, action: PermissionAction): boolean => {
      return !rbacFunctions.can(resource, action);
    },
    
    disableIfCannot: (resource: string, action: PermissionAction): boolean => {
      return !rbacFunctions.can(resource, action);
    },
  }), [rbacFunctions]);

  return {
    // User information
    user: userData,
    role: userData?.role || null,
    permissions: userData?.permissions || [],
    
    // Permission checking functions
    ...rbacFunctions,
    
    // Resource-specific permissions
    ...resourcePermissions,
    
    // UI helpers
    ...uiHelpers,
  };
};

// Higher-order component for protecting components based on permissions
export interface ProtectedComponentProps {
  children: React.ReactNode;
  resource?: string;
  action?: PermissionAction;
  role?: string;
  roles?: string[];
  minimumLevel?: number;
  fallback?: React.ReactNode;
  requireAll?: boolean; // If true, all conditions must be met
}

export const ProtectedComponent: React.FC<ProtectedComponentProps> = ({
  children,
  resource,
  action,
  role,
  roles,
  minimumLevel,
  fallback = null,
  requireAll = false,
}) => {
  const rbac = useRBAC();

  const hasAccess = useMemo(() => {
    const conditions: boolean[] = [];

    // Check permission
    if (resource && action) {
      conditions.push(rbac.can(resource, action));
    }

    // Check specific role
    if (role) {
      conditions.push(rbac.hasRole(role));
    }

    // Check any of multiple roles
    if (roles && roles.length > 0) {
      conditions.push(rbac.hasAnyRole(roles));
    }

    // Check minimum role level
    if (minimumLevel !== undefined) {
      conditions.push(rbac.hasMinimumRole(minimumLevel));
    }

    // If no conditions specified, allow access
    if (conditions.length === 0) {
      return true;
    }

    // Return based on requireAll flag
    return requireAll 
      ? conditions.every(condition => condition)
      : conditions.some(condition => condition);
  }, [rbac, resource, action, role, roles, minimumLevel, requireAll]);

  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

// Hook for checking if current route is accessible
export const useRouteAccess = (routePermissions?: {
  resource?: string;
  action?: PermissionAction;
  role?: string;
  roles?: string[];
  minimumLevel?: number;
}) => {
  const rbac = useRBAC();

  return useMemo(() => {
    if (!routePermissions) return true;

    const { resource, action, role, roles, minimumLevel } = routePermissions;

    // Check permission
    if (resource && action && !rbac.can(resource, action)) {
      return false;
    }

    // Check specific role
    if (role && !rbac.hasRole(role)) {
      return false;
    }

    // Check any of multiple roles
    if (roles && roles.length > 0 && !rbac.hasAnyRole(roles)) {
      return false;
    }

    // Check minimum role level
    if (minimumLevel !== undefined && !rbac.hasMinimumRole(minimumLevel)) {
      return false;
    }

    return true;
  }, [rbac, routePermissions]);
};
