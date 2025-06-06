import React, { useEffect, Suspense, lazy, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import useTranslation from './hooks/useTranslation';
import { queryClient } from './lib/react-query';

// Layouts (not lazy loaded as they're always needed)
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';

// Lazy load pages for better performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Patients = lazy(() => import('./pages/Patients'));
const Appointments = lazy(() => import('./pages/Appointments'));
const Messaging = lazy(() => import('./pages/Messaging'));
const Campaigns = lazy(() => import('./pages/Campaigns'));
const Billing = lazy(() => import('./pages/Billing'));
const Reports = lazy(() => import('./pages/Reports'));
const ReportsAnalytics = lazy(() => import('./pages/ReportsAnalytics'));
const BackupRecovery = lazy(() => import('./pages/BackupRecovery'));
const Settings = lazy(() => import('./pages/Settings'));
const Compliance = lazy(() => import('./pages/Compliance'));
const Login = lazy(() => import('./pages/Login'));
const NotFound = lazy(() => import('./pages/NotFound'));
const TestConnection = lazy(() => import('./pages/TestConnection'));
const ClinicManagement = lazy(() => import('./pages/ClinicManagement'));
const ResourceSharing = lazy(() => import('./pages/ResourceSharing'));
const Search = lazy(() => import('./pages/Search'));

// Context providers
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ClinicProvider } from './contexts/ClinicContext';
import { ToastProvider } from './components/ui/Toast';
import ErrorBoundary from './components/ErrorBoundary';

// Onboarding components
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { OnboardingProvider, useOnboardingCheck } from './hooks/useOnboarding';

// Accessibility components
import { AccessibilityDashboard } from './components/accessibility/AccessibilityDashboard';

// Integration components
import { IntegrationDashboard } from './components/integrations/IntegrationDashboard';

// User management components
import { UserManagement } from './components/users/UserManagement';

// Mobile components
import { MobileTestingDashboard } from './components/mobile/MobileTestingDashboard';
import { ResponsiveProvider } from './hooks/useResponsive';

// Test components
import { ConfigTest } from './components/test/ConfigTest';
import { AuthTest } from './components/test/AuthTest';
import { EnvTest } from './components/test/EnvTest';
import I18nTest from './components/test/I18nTest';
import ReportsTest from './components/test/ReportsTest';
import BackupTest from './components/test/BackupTest';

// UI components
import { DemoModeIndicator } from './components/ui/DemoModeIndicator';
import { ConsentBanner } from './components/compliance/ConsentBanner';

// Initialize accessibility features
import { ariaManager } from './lib/accessibility/aria-attributes';
import { keyboardNavigation } from './lib/accessibility/keyboard-navigation';
import { focusManager } from './lib/accessibility/focus-management';
import { colorContrastManager } from './lib/accessibility/color-contrast';

// Initialize integration features
import { calendarSync } from './lib/integrations/calendar-sync';
import { ehrPMS } from './lib/integrations/ehr-pms';
import { analyticsCore } from './lib/integrations/analytics-core';

// Main app content with onboarding integration
const AppContent: React.FC = () => {
  const { user } = useAuth();

  // Initialize integration systems
  React.useEffect(() => {
    const initializeIntegrations = async () => {
      try {
        // Initialize calendar sync
        await calendarSync.initialize();

        // Initialize EHR/PMS
        await ehrPMS.initialize();

        // Initialize analytics
        await analyticsCore.initialize();

        console.log('Integration systems initialized successfully');
      } catch (error) {
        console.error('Failed to initialize integration systems:', error);
      }
    };

    initializeIntegrations();
  }, []);
  const { needsOnboarding, isChecking } = useOnboardingCheck();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (user && needsOnboarding && !isChecking) {
      setShowOnboarding(true);
    }
  }, [user, needsOnboarding, isChecking]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <DemoModeIndicator />
      <Routes>
        <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />

        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="patients" element={<Patients />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="search" element={<Search />} />
          <Route path="messaging" element={<Messaging />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="billing" element={<Billing />} />
          <Route path="reports" element={<Reports />} />
          <Route path="reports-analytics" element={<ReportsAnalytics />} />
          <Route path="clinic-management" element={<ClinicManagement />} />
          <Route path="resource-sharing" element={<ResourceSharing />} />
          <Route path="backup-recovery" element={<BackupRecovery />} />
          <Route path="compliance" element={<Compliance />} />
          <Route path="settings" element={<Settings />} />
          <Route path="accessibility" element={<AccessibilityDashboard />} />
          <Route path="integrations" element={<IntegrationDashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="mobile-testing" element={<MobileTestingDashboard />} />
          <Route path="config-test" element={<ConfigTest />} />
          <Route path="auth-test" element={<AuthTest />} />
          <Route path="env-test" element={<EnvTest />} />
          <Route path="i18n-test" element={<I18nTest />} />
          <Route path="reports-test" element={<ReportsTest />} />
          <Route path="backup-test" element={<BackupTest />} />
          <Route path="test-connection" element={<TestConnection />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Onboarding Wizard */}
      {user && showOnboarding && (
        <OnboardingWizard
          isOpen={showOnboarding}
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}

      {/* Consent Banner */}
      <ConsentBanner />
    </>
  );
};

function App() {
  const location = useLocation();
  const { i18n, getDirection } = useTranslation();

  // Set document direction based on language
  useEffect(() => {
    document.documentElement.dir = getDirection();
    document.documentElement.lang = i18n.language;
  }, [i18n.language, getDirection]);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider>
            <ResponsiveProvider>
              <AuthProvider>
                <ClinicProvider>
                  <OnboardingProvider>
                <Suspense fallback={
                  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
                      <p className="text-gray-600 dark:text-gray-400">Loading...</p>
                    </div>
                  </div>
                }>
                  <AppContent />
                </Suspense>
                  </OnboardingProvider>
                </ClinicProvider>
              </AuthProvider>
            </ResponsiveProvider>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;