import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

export type Permission = 
  // Patient permissions
  | 'patients:read'
  | 'patients:create'
  | 'patients:update'
  | 'patients:delete'
  | 'patients:view_medical_history'
  | 'patients:edit_medical_history'
  
  // Appointment permissions
  | 'appointments:read'
  | 'appointments:create'
  | 'appointments:update'
  | 'appointments:delete'
  | 'appointments:reschedule'
  
  // Billing permissions
  | 'billing:read'
  | 'billing:create'
  | 'billing:update'
  | 'billing:delete'
  | 'billing:process_payments'
  | 'billing:view_financial_reports'
  
  // Campaign permissions
  | 'campaigns:read'
  | 'campaigns:create'
  | 'campaigns:update'
  | 'campaigns:delete'
  | 'campaigns:send'
  
  // Report permissions
  | 'reports:read'
  | 'reports:export'
  | 'reports:financial'
  | 'reports:patient_analytics'
  
  // User management permissions
  | 'users:read'
  | 'users:create'
  | 'users:update'
  | 'users:delete'
  | 'users:manage_roles'
  
  // System permissions
  | 'system:settings'
  | 'system:backup'
  | 'system:audit_logs';

export type Role = 'admin' | 'dentist' | 'staff' | 'billing';

// Define permissions for each role
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    // Full access to everything
    'patients:read',
    'patients:create',
    'patients:update',
    'patients:delete',
    'patients:view_medical_history',
    'patients:edit_medical_history',
    'appointments:read',
    'appointments:create',
    'appointments:update',
    'appointments:delete',
    'appointments:reschedule',
    'billing:read',
    'billing:create',
    'billing:update',
    'billing:delete',
    'billing:process_payments',
    'billing:view_financial_reports',
    'campaigns:read',
    'campaigns:create',
    'campaigns:update',
    'campaigns:delete',
    'campaigns:send',
    'reports:read',
    'reports:export',
    'reports:financial',
    'reports:patient_analytics',
    'users:read',
    'users:create',
    'users:update',
    'users:delete',
    'users:manage_roles',
    'system:settings',
    'system:backup',
    'system:audit_logs',
  ],
  
  dentist: [
    // Patient management
    'patients:read',
    'patients:create',
    'patients:update',
    'patients:view_medical_history',
    'patients:edit_medical_history',
    
    // Appointment management
    'appointments:read',
    'appointments:create',
    'appointments:update',
    'appointments:reschedule',
    
    // Limited billing access
    'billing:read',
    'billing:create',
    
    // Campaign access
    'campaigns:read',
    'campaigns:create',
    'campaigns:send',
    
    // Reports
    'reports:read',
    'reports:patient_analytics',
  ],
  
  staff: [
    // Patient management (limited)
    'patients:read',
    'patients:create',
    'patients:update',
    'patients:view_medical_history',
    
    // Appointment management
    'appointments:read',
    'appointments:create',
    'appointments:update',
    'appointments:reschedule',
    
    // Basic billing
    'billing:read',
    
    // Campaign access
    'campaigns:read',
    'campaigns:send',
    
    // Basic reports
    'reports:read',
  ],
  
  billing: [
    // Limited patient access
    'patients:read',
    
    // No appointment management
    'appointments:read',
    
    // Full billing access
    'billing:read',
    'billing:create',
    'billing:update',
    'billing:delete',
    'billing:process_payments',
    'billing:view_financial_reports',
    
    // Campaign access for billing-related campaigns
    'campaigns:read',
    'campaigns:create',
    'campaigns:send',
    
    // Financial reports
    'reports:read',
    'reports:export',
    'reports:financial',
  ],
};

export const usePermissions = () => {
  const { user } = useAuth();

  const userRole = useMemo(() => {
    return user?.profile?.role as Role || 'staff';
  }, [user]);

  const permissions = useMemo(() => {
    return ROLE_PERMISSIONS[userRole] || [];
  }, [userRole]);

  const hasPermission = (permission: Permission): boolean => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissionList: Permission[]): boolean => {
    return permissionList.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissionList: Permission[]): boolean => {
    return permissionList.every(permission => hasPermission(permission));
  };

  const canAccess = {
    // Patient access
    viewPatients: () => hasPermission('patients:read'),
    createPatients: () => hasPermission('patients:create'),
    editPatients: () => hasPermission('patients:update'),
    deletePatients: () => hasPermission('patients:delete'),
    viewMedicalHistory: () => hasPermission('patients:view_medical_history'),
    editMedicalHistory: () => hasPermission('patients:edit_medical_history'),

    // Appointment access
    viewAppointments: () => hasPermission('appointments:read'),
    createAppointments: () => hasPermission('appointments:create'),
    editAppointments: () => hasPermission('appointments:update'),
    deleteAppointments: () => hasPermission('appointments:delete'),
    rescheduleAppointments: () => hasPermission('appointments:reschedule'),

    // Billing access
    viewBilling: () => hasPermission('billing:read'),
    createInvoices: () => hasPermission('billing:create'),
    editBilling: () => hasPermission('billing:update'),
    deleteBilling: () => hasPermission('billing:delete'),
    processPayments: () => hasPermission('billing:process_payments'),
    viewFinancialReports: () => hasPermission('billing:view_financial_reports'),

    // Campaign access
    viewCampaigns: () => hasPermission('campaigns:read'),
    createCampaigns: () => hasPermission('campaigns:create'),
    editCampaigns: () => hasPermission('campaigns:update'),
    deleteCampaigns: () => hasPermission('campaigns:delete'),
    sendCampaigns: () => hasPermission('campaigns:send'),

    // Report access
    viewReports: () => hasPermission('reports:read'),
    exportReports: () => hasPermission('reports:export'),
    viewFinancialReports: () => hasPermission('reports:financial'),
    viewPatientAnalytics: () => hasPermission('reports:patient_analytics'),

    // User management access
    viewUsers: () => hasPermission('users:read'),
    createUsers: () => hasPermission('users:create'),
    editUsers: () => hasPermission('users:update'),
    deleteUsers: () => hasPermission('users:delete'),
    manageRoles: () => hasPermission('users:manage_roles'),

    // System access
    systemSettings: () => hasPermission('system:settings'),
    systemBackup: () => hasPermission('system:backup'),
    auditLogs: () => hasPermission('system:audit_logs'),
  };

  return {
    userRole,
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccess,
  };
};

// Higher-order component for protecting routes/components
export const withPermission = <P extends object>(
  Component: React.ComponentType<P>,
  requiredPermission: Permission | Permission[],
  fallback?: React.ComponentType
) => {
  return (props: P) => {
    const { hasPermission, hasAnyPermission } = usePermissions();
    
    const hasAccess = Array.isArray(requiredPermission)
      ? hasAnyPermission(requiredPermission)
      : hasPermission(requiredPermission);

    if (!hasAccess) {
      if (fallback) {
        const FallbackComponent = fallback;
        return <FallbackComponent />;
      }
      
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Access Denied
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              You don't have permission to access this resource.
            </p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
};

// Hook for conditional rendering based on permissions
export const useConditionalRender = () => {
  const { hasPermission, hasAnyPermission, canAccess } = usePermissions();

  const renderIf = (
    permission: Permission | Permission[],
    component: React.ReactNode,
    fallback?: React.ReactNode
  ) => {
    const hasAccess = Array.isArray(permission)
      ? hasAnyPermission(permission)
      : hasPermission(permission);

    return hasAccess ? component : (fallback || null);
  };

  return { renderIf, canAccess };
};
