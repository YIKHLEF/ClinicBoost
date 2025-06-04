import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ChevronRight,
  Home,
  User,
  Calendar,
  MessageSquare,
  Megaphone,
  CreditCard,
  BarChart3,
  Settings,
  Database,
  Sparkles,
  Users,
  Stethoscope,
  FileText,
  Shield,
  Bell
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  current?: boolean;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  separator?: React.ReactNode;
  showHome?: boolean;
  className?: string;
}

// Route to label mapping with icons
const ROUTE_CONFIG: Record<string, { label: string; icon?: React.ReactNode }> = {
  '': { label: 'dashboard', icon: <Home size={14} /> },
  'patients': { label: 'patients', icon: <User size={14} /> },
  'appointments': { label: 'appointments', icon: <Calendar size={14} /> },
  'messaging': { label: 'messaging', icon: <MessageSquare size={14} /> },
  'campaigns': { label: 'campaigns', icon: <Megaphone size={14} /> },
  'billing': { label: 'billing', icon: <CreditCard size={14} /> },
  'reports': { label: 'reports', icon: <BarChart3 size={14} /> },
  'settings': { label: 'settings', icon: <Settings size={14} /> },
  'test-connection': { label: 'testConnection', icon: <Database size={14} /> },
  'onboarding': { label: 'onboarding', icon: <Sparkles size={14} /> },
  'profile': { label: 'profile', icon: <User size={14} /> },
  'team': { label: 'team', icon: <Users size={14} /> },
  'services': { label: 'services', icon: <Stethoscope size={14} /> },
  'integrations': { label: 'integrations', icon: <Settings size={14} /> },
  'invoices': { label: 'invoices', icon: <FileText size={14} /> },
  'payments': { label: 'payments', icon: <CreditCard size={14} /> },
  'claims': { label: 'claims', icon: <Shield size={14} /> },
  'reminders': { label: 'reminders', icon: <Bell size={14} /> },
};

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  separator = <ChevronRight size={16} className="text-gray-400" />,
  showHome = true,
  className = '',
}) => {
  const location = useLocation();
  const { t } = useTranslation();

  // Auto-generate breadcrumbs from current route if items not provided
  const breadcrumbItems = items || generateBreadcrumbsFromRoute(location.pathname, t);

  if (breadcrumbItems.length === 0) {
    return null;
  }

  return (
    <nav className={`flex items-center space-x-2 text-sm ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {showHome && (
          <>
            <li>
              <Link
                to="/"
                className="flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <Home size={16} className="mr-1" />
                <span className="sr-only">{t('navigation.home', 'Home')}</span>
              </Link>
            </li>
            {breadcrumbItems.length > 0 && (
              <li className="flex items-center">
                {separator}
              </li>
            )}
          </>
        )}

        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          const isCurrent = item.current || isLast;

          return (
            <li key={index} className="flex items-center">
              {index > 0 && !showHome && (
                <span className="mr-2">{separator}</span>
              )}
              
              {isCurrent ? (
                <span 
                  className="flex items-center text-gray-900 dark:text-white font-medium"
                  aria-current="page"
                >
                  {item.icon && <span className="mr-1">{item.icon}</span>}
                  {item.label}
                </span>
              ) : (
                <>
                  {item.href ? (
                    <Link
                      to={item.href}
                      className="flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    >
                      {item.icon && <span className="mr-1">{item.icon}</span>}
                      {item.label}
                    </Link>
                  ) : (
                    <span className="flex items-center text-gray-500 dark:text-gray-400">
                      {item.icon && <span className="mr-1">{item.icon}</span>}
                      {item.label}
                    </span>
                  )}
                  
                  {!isLast && (
                    <span className="ml-2">{separator}</span>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

// Helper function to generate breadcrumbs from route
function generateBreadcrumbsFromRoute(pathname: string, t: any): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  let currentPath = '';

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;

    // Get config from route mapping or use segment as fallback
    const routeConfig = ROUTE_CONFIG[segment];
    const labelKey = routeConfig?.label || segment;
    const label = t(`navigation.${labelKey}`, segment.charAt(0).toUpperCase() + segment.slice(1));

    breadcrumbs.push({
      label,
      href: isLast ? undefined : currentPath,
      current: isLast,
      icon: routeConfig?.icon,
    });
  });

  return breadcrumbs;
}

// Enhanced breadcrumb generation with context awareness
export function generateContextualBreadcrumbs(
  pathname: string,
  t: any,
  context?: {
    patientName?: string;
    patientId?: string;
    appointmentTitle?: string;
    appointmentId?: string;
    invoiceNumber?: string;
    invoiceId?: string;
    campaignName?: string;
    campaignId?: string;
  }
): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  let currentPath = '';

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;

    // Handle dynamic segments with context
    let label = segment;
    let icon = undefined;

    if (ROUTE_CONFIG[segment]) {
      const config = ROUTE_CONFIG[segment];
      label = t(`navigation.${config.label}`, segment.charAt(0).toUpperCase() + segment.slice(1));
      icon = config.icon;
    } else if (context) {
      // Handle dynamic segments based on context
      if (segment.match(/^[a-f0-9-]{36}$/)) { // UUID pattern
        if (segments[index - 1] === 'patients' && context.patientName) {
          label = context.patientName;
          icon = <User size={14} />;
        } else if (segments[index - 1] === 'appointments' && context.appointmentTitle) {
          label = context.appointmentTitle;
          icon = <Calendar size={14} />;
        } else if (segments[index - 1] === 'invoices' && context.invoiceNumber) {
          label = `Invoice ${context.invoiceNumber}`;
          icon = <FileText size={14} />;
        } else if (segments[index - 1] === 'campaigns' && context.campaignName) {
          label = context.campaignName;
          icon = <Megaphone size={14} />;
        }
      }
    }

    breadcrumbs.push({
      label,
      href: isLast ? undefined : currentPath,
      current: isLast,
      icon,
    });
  });

  return breadcrumbs;
}

// Hook for programmatic breadcrumb management
export const useBreadcrumbs = () => {
  const location = useLocation();
  const { t } = useTranslation();

  const setBreadcrumbs = (items: BreadcrumbItem[]) => {
    // This could be implemented with a context or state management
    // For now, we'll just return the items
    return items;
  };

  const addBreadcrumb = (item: BreadcrumbItem) => {
    // Add a breadcrumb item
    return item;
  };

  const getCurrentBreadcrumbs = (): BreadcrumbItem[] => {
    return generateBreadcrumbsFromRoute(location.pathname, t);
  };

  return {
    setBreadcrumbs,
    addBreadcrumb,
    getCurrentBreadcrumbs,
  };
};

// Specialized breadcrumb components for common patterns
export const PatientBreadcrumbs: React.FC<{ patientName?: string; patientId?: string }> = ({
  patientName,
  patientId,
}) => {
  const { t } = useTranslation();

  const items: BreadcrumbItem[] = [
    {
      label: t('navigation.patients', 'Patients'),
      href: '/patients',
    },
  ];

  if (patientName) {
    items.push({
      label: patientName,
      href: patientId ? `/patients/${patientId}` : undefined,
      current: true,
    });
  }

  return <Breadcrumbs items={items} />;
};

export const AppointmentBreadcrumbs: React.FC<{ 
  appointmentTitle?: string; 
  appointmentId?: string;
  patientName?: string;
  patientId?: string;
}> = ({
  appointmentTitle,
  appointmentId,
  patientName,
  patientId,
}) => {
  const { t } = useTranslation();

  const items: BreadcrumbItem[] = [
    {
      label: t('navigation.appointments', 'Appointments'),
      href: '/appointments',
    },
  ];

  if (patientName && patientId) {
    items.push({
      label: patientName,
      href: `/patients/${patientId}`,
    });
  }

  if (appointmentTitle) {
    items.push({
      label: appointmentTitle,
      href: appointmentId ? `/appointments/${appointmentId}` : undefined,
      current: true,
    });
  }

  return <Breadcrumbs items={items} />;
};

export const InvoiceBreadcrumbs: React.FC<{ 
  invoiceNumber?: string; 
  invoiceId?: string;
  patientName?: string;
  patientId?: string;
}> = ({
  invoiceNumber,
  invoiceId,
  patientName,
  patientId,
}) => {
  const { t } = useTranslation();

  const items: BreadcrumbItem[] = [
    {
      label: t('navigation.billing', 'Billing'),
      href: '/billing',
    },
  ];

  if (patientName && patientId) {
    items.push({
      label: patientName,
      href: `/patients/${patientId}`,
    });
  }

  if (invoiceNumber) {
    items.push({
      label: `Invoice ${invoiceNumber}`,
      href: invoiceId ? `/billing/invoices/${invoiceId}` : undefined,
      current: true,
    });
  }

  return <Breadcrumbs items={items} />;
};

// Context for managing breadcrumbs globally
interface BreadcrumbContextType {
  breadcrumbs: BreadcrumbItem[];
  setBreadcrumbs: (items: BreadcrumbItem[]) => void;
  addBreadcrumb: (item: BreadcrumbItem) => void;
  removeBreadcrumb: (index: number) => void;
  clearBreadcrumbs: () => void;
}

const BreadcrumbContext = React.createContext<BreadcrumbContextType | undefined>(undefined);

export const BreadcrumbProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [breadcrumbs, setBreadcrumbsState] = React.useState<BreadcrumbItem[]>([]);

  const setBreadcrumbs = React.useCallback((items: BreadcrumbItem[]) => {
    setBreadcrumbsState(items);
  }, []);

  const addBreadcrumb = React.useCallback((item: BreadcrumbItem) => {
    setBreadcrumbsState(prev => [...prev, item]);
  }, []);

  const removeBreadcrumb = React.useCallback((index: number) => {
    setBreadcrumbsState(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearBreadcrumbs = React.useCallback(() => {
    setBreadcrumbsState([]);
  }, []);

  const value = React.useMemo(() => ({
    breadcrumbs,
    setBreadcrumbs,
    addBreadcrumb,
    removeBreadcrumb,
    clearBreadcrumbs,
  }), [breadcrumbs, setBreadcrumbs, addBreadcrumb, removeBreadcrumb, clearBreadcrumbs]);

  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  );
};

export const useBreadcrumbContext = () => {
  const context = React.useContext(BreadcrumbContext);
  if (context === undefined) {
    throw new Error('useBreadcrumbContext must be used within a BreadcrumbProvider');
  }
  return context;
};
