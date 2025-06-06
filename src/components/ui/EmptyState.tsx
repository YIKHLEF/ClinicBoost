import React from 'react';
import { Button } from './Button';
import useTranslation from '../../hooks/useTranslation';
import { 
  Users, 
  Calendar, 
  FileText, 
  CreditCard, 
  MessageSquare, 
  Search,
  Plus,
  Database,
  Inbox,
  BarChart3,
  Settings,
  Shield,
  Heart,
  Stethoscope,
  UserPlus,
  CalendarPlus,
  FileTextIcon,
  Megaphone
} from 'lucide-react';

export interface EmptyStateProps {
  type: 'patients' | 'appointments' | 'invoices' | 'campaigns' | 'reports' | 'search' | 'messages' | 'treatments' | 'payments' | 'general';
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  showIllustration?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// SVG Illustrations for different empty states
const EmptyStateIllustrations = {
  patients: () => (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      <defs>
        <linearGradient id="patientGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      
      {/* Background */}
      <rect width="200" height="160" fill="url(#patientGradient)" rx="8" />
      
      {/* Medical cross */}
      <g transform="translate(85, 40)">
        <rect x="12" y="0" width="6" height="30" fill="#3B82F6" rx="3" />
        <rect x="0" y="12" width="30" height="6" fill="#3B82F6" rx="3" />
      </g>
      
      {/* Patient figures */}
      <g transform="translate(60, 80)">
        {/* Person 1 */}
        <circle cx="20" cy="15" r="8" fill="#E5E7EB" />
        <rect x="12" y="25" width="16" height="20" fill="#E5E7EB" rx="8" />
        
        {/* Person 2 */}
        <circle cx="50" cy="15" r="8" fill="#D1D5DB" />
        <rect x="42" y="25" width="16" height="20" fill="#D1D5DB" rx="8" />
        
        {/* Person 3 */}
        <circle cx="80" cy="15" r="8" fill="#F3F4F6" />
        <rect x="72" y="25" width="16" height="20" fill="#F3F4F6" rx="8" />
      </g>
      
      {/* Dotted lines suggesting more */}
      <g transform="translate(100, 120)">
        <circle cx="0" cy="0" r="2" fill="#9CA3AF" opacity="0.5" />
        <circle cx="8" cy="0" r="2" fill="#9CA3AF" opacity="0.3" />
        <circle cx="16" cy="0" r="2" fill="#9CA3AF" opacity="0.1" />
      </g>
    </svg>
  ),

  appointments: () => (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      <defs>
        <linearGradient id="appointmentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#059669" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      
      {/* Background */}
      <rect width="200" height="160" fill="url(#appointmentGradient)" rx="8" />
      
      {/* Calendar */}
      <g transform="translate(70, 30)">
        <rect x="0" y="10" width="60" height="50" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="2" rx="4" />
        <rect x="0" y="10" width="60" height="15" fill="#10B981" rx="4" />
        <rect x="10" y="0" width="4" height="20" fill="#6B7280" rx="2" />
        <rect x="46" y="0" width="4" height="20" fill="#6B7280" rx="2" />
        
        {/* Calendar grid */}
        <g fill="#E5E7EB">
          <rect x="8" y="30" width="8" height="6" rx="1" />
          <rect x="20" y="30" width="8" height="6" rx="1" />
          <rect x="32" y="30" width="8" height="6" rx="1" />
          <rect x="44" y="30" width="8" height="6" rx="1" />
          <rect x="8" y="40" width="8" height="6" rx="1" />
          <rect x="20" y="40" width="8" height="6" rx="1" />
        </g>
        
        {/* Highlighted date */}
        <rect x="32" y="40" width="8" height="6" fill="#10B981" rx="1" />
      </g>
      
      {/* Clock */}
      <g transform="translate(140, 80)">
        <circle cx="15" cy="15" r="12" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="2" />
        <line x1="15" y1="15" x2="15" y2="8" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" />
        <line x1="15" y1="15" x2="20" y2="15" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  ),

  invoices: () => (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      <defs>
        <linearGradient id="invoiceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#D97706" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      
      {/* Background */}
      <rect width="200" height="160" fill="url(#invoiceGradient)" rx="8" />
      
      {/* Invoice document */}
      <g transform="translate(60, 20)">
        <rect x="0" y="0" width="80" height="100" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="2" rx="4" />
        
        {/* Header */}
        <rect x="10" y="10" width="30" height="4" fill="#F59E0B" rx="2" />
        <rect x="10" y="18" width="20" height="3" fill="#E5E7EB" rx="1" />
        
        {/* Lines */}
        <rect x="10" y="30" width="60" height="2" fill="#E5E7EB" rx="1" />
        <rect x="10" y="36" width="50" height="2" fill="#E5E7EB" rx="1" />
        <rect x="10" y="42" width="55" height="2" fill="#E5E7EB" rx="1" />
        <rect x="10" y="48" width="45" height="2" fill="#E5E7EB" rx="1" />
        
        {/* Total */}
        <rect x="10" y="60" width="60" height="3" fill="#F59E0B" rx="1" />
        <rect x="10" y="67" width="40" height="2" fill="#D97706" rx="1" />
      </g>
      
      {/* Dollar sign */}
      <g transform="translate(150, 40)">
        <circle cx="15" cy="15" r="12" fill="#F59E0B" opacity="0.2" />
        <text x="15" y="20" textAnchor="middle" fill="#F59E0B" fontSize="16" fontWeight="bold">$</text>
      </g>
    </svg>
  ),

  campaigns: () => (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      <defs>
        <linearGradient id="campaignGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      
      {/* Background */}
      <rect width="200" height="160" fill="url(#campaignGradient)" rx="8" />
      
      {/* Megaphone */}
      <g transform="translate(70, 60)">
        <path d="M0 20 L30 10 L30 30 Z" fill="#8B5CF6" />
        <rect x="30" y="15" width="20" height="10" fill="#A78BFA" rx="5" />
        <path d="M50 20 Q60 15 60 25 Q60 35 50 30" fill="#C4B5FD" />
      </g>
      
      {/* Message bubbles */}
      <g transform="translate(120, 40)">
        <ellipse cx="15" cy="10" rx="12" ry="8" fill="#E0E7FF" />
        <ellipse cx="25" cy="25" rx="10" ry="6" fill="#C7D2FE" />
        <ellipse cx="35" cy="40" rx="8" ry="5" fill="#A5B4FC" />
      </g>
      
      {/* Target audience */}
      <g transform="translate(40, 100)">
        <circle cx="10" cy="10" r="6" fill="#DDD6FE" />
        <circle cx="25" cy="10" r="6" fill="#DDD6FE" />
        <circle cx="40" cy="10" r="6" fill="#DDD6FE" />
        <circle cx="55" cy="10" r="6" fill="#DDD6FE" />
      </g>
    </svg>
  ),

  search: () => (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      <defs>
        <linearGradient id="searchGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6B7280" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#4B5563" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      
      {/* Background */}
      <rect width="200" height="160" fill="url(#searchGradient)" rx="8" />
      
      {/* Magnifying glass */}
      <g transform="translate(80, 50)">
        <circle cx="20" cy="20" r="15" fill="none" stroke="#6B7280" strokeWidth="3" />
        <line x1="32" y1="32" x2="42" y2="42" stroke="#6B7280" strokeWidth="3" strokeLinecap="round" />
      </g>
      
      {/* Question marks */}
      <g transform="translate(60, 100)" fill="#9CA3AF" opacity="0.5">
        <text x="0" y="0" fontSize="20">?</text>
        <text x="20" y="10" fontSize="16">?</text>
        <text x="40" y="5" fontSize="18">?</text>
        <text x="60" y="15" fontSize="14">?</text>
        <text x="80" y="8" fontSize="16">?</text>
      </g>
    </svg>
  ),

  general: () => (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      <defs>
        <linearGradient id="generalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E5E7EB" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#D1D5DB" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      
      {/* Background */}
      <rect width="200" height="160" fill="url(#generalGradient)" rx="8" />
      
      {/* Empty box */}
      <g transform="translate(70, 50)">
        <rect x="0" y="0" width="60" height="40" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeDasharray="5,5" rx="4" />
        <circle cx="30" cy="20" r="8" fill="#D1D5DB" />
        <rect x="26" y="16" width="8" height="8" fill="#FFFFFF" rx="1" />
      </g>
    </svg>
  ),
};

const getEmptyStateConfig = (type: EmptyStateProps['type']) => {
  const configs = {
    patients: {
      icon: Users,
      title: 'No patients yet',
      description: 'Start building your patient database by adding your first patient.',
      actionLabel: 'Add Patient',
      illustration: EmptyStateIllustrations.patients,
    },
    appointments: {
      icon: Calendar,
      title: 'No appointments scheduled',
      description: 'Your calendar is empty. Schedule your first appointment to get started.',
      actionLabel: 'Schedule Appointment',
      illustration: EmptyStateIllustrations.appointments,
    },
    invoices: {
      icon: CreditCard,
      title: 'No invoices found',
      description: 'You haven\'t created any invoices yet. Create your first invoice to start billing.',
      actionLabel: 'Create Invoice',
      illustration: EmptyStateIllustrations.invoices,
    },
    campaigns: {
      icon: Megaphone,
      title: 'No campaigns created',
      description: 'Reach out to your patients with targeted campaigns. Create your first campaign.',
      actionLabel: 'Create Campaign',
      illustration: EmptyStateIllustrations.campaigns,
    },
    reports: {
      icon: BarChart3,
      title: 'No data to display',
      description: 'Reports will appear here once you have patient data and appointments.',
      actionLabel: 'View Dashboard',
      illustration: EmptyStateIllustrations.general,
    },
    search: {
      icon: Search,
      title: 'No results found',
      description: 'Try adjusting your search terms or filters to find what you\'re looking for.',
      actionLabel: 'Clear Filters',
      illustration: EmptyStateIllustrations.search,
    },
    messages: {
      icon: MessageSquare,
      title: 'No messages',
      description: 'Your message history will appear here once you start communicating with patients.',
      actionLabel: 'Send Message',
      illustration: EmptyStateIllustrations.general,
    },
    treatments: {
      icon: Heart,
      title: 'No treatments configured',
      description: 'Set up your treatment catalog to start scheduling and billing procedures.',
      actionLabel: 'Add Treatment',
      illustration: EmptyStateIllustrations.general,
    },
    payments: {
      icon: CreditCard,
      title: 'No payments recorded',
      description: 'Payment history will appear here once you start processing payments.',
      actionLabel: 'Process Payment',
      illustration: EmptyStateIllustrations.general,
    },
    general: {
      icon: Database,
      title: 'No data available',
      description: 'This section will populate with data as you use the system.',
      actionLabel: 'Get Started',
      illustration: EmptyStateIllustrations.general,
    },
  };

  return configs[type];
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  title,
  description,
  actionLabel,
  onAction,
  showIllustration = true,
  size = 'md',
  className = '',
}) => {
  const { t } = useTranslation();
  const config = getEmptyStateConfig(type);
  const Icon = config.icon;
  const Illustration = config.illustration;

  const sizeClasses = {
    sm: 'py-8',
    md: 'py-12',
    lg: 'py-16',
  };

  const illustrationSizes = {
    sm: 'w-32 h-24',
    md: 'w-48 h-36',
    lg: 'w-64 h-48',
  };

  const iconSizes = {
    sm: 32,
    md: 48,
    lg: 64,
  };

  return (
    <div className={`text-center ${sizeClasses[size]} ${className}`}>
      <div className="max-w-md mx-auto">
        {/* Illustration or Icon */}
        <div className="mb-6">
          {showIllustration ? (
            <div className={`mx-auto ${illustrationSizes[size]}`}>
              <Illustration />
            </div>
          ) : (
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full">
                <Icon 
                  size={iconSizes[size]} 
                  className="text-gray-400 dark:text-gray-500" 
                />
              </div>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {title || t(`emptyState.${type}.title`, config.title)}
        </h3>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {description || t(`emptyState.${type}.description`, config.description)}
        </p>

        {/* Action Button */}
        {onAction && (
          <Button onClick={onAction} className="inline-flex items-center">
            <Plus size={16} className="mr-2" />
            {actionLabel || t(`emptyState.${type}.actionLabel`, config.actionLabel)}
          </Button>
        )}
      </div>
    </div>
  );
};

// Specialized empty state components for common use cases
export const PatientsEmptyState: React.FC<{ onAddPatient?: () => void }> = ({ onAddPatient }) => (
  <EmptyState
    type="patients"
    onAction={onAddPatient}
    size="lg"
  />
);

export const AppointmentsEmptyState: React.FC<{ onScheduleAppointment?: () => void }> = ({ onScheduleAppointment }) => (
  <EmptyState
    type="appointments"
    onAction={onScheduleAppointment}
    size="lg"
  />
);

export const SearchEmptyState: React.FC<{ searchTerm?: string; onClearSearch?: () => void }> = ({ 
  searchTerm, 
  onClearSearch 
}) => (
  <EmptyState
    type="search"
    title={searchTerm ? `No results for "${searchTerm}"` : undefined}
    onAction={onClearSearch}
    actionLabel="Clear Search"
    size="md"
  />
);

export const InvoicesEmptyState: React.FC<{ onCreateInvoice?: () => void }> = ({ onCreateInvoice }) => (
  <EmptyState
    type="invoices"
    onAction={onCreateInvoice}
    size="lg"
  />
);

export const CampaignsEmptyState: React.FC<{ onCreateCampaign?: () => void }> = ({ onCreateCampaign }) => (
  <EmptyState
    type="campaigns"
    onAction={onCreateCampaign}
    size="lg"
  />
);
