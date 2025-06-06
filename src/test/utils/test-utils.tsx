/**
 * Test Utilities
 * 
 * Custom render functions and testing utilities
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../contexts/AuthContext';
import { ToastProvider } from '../../contexts/ToastContext';
import { I18nextProvider } from 'react-i18next';
import i18n from '../mocks/i18n';

// Create a test query client
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

// Mock user for testing
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: {
    first_name: 'Test',
    last_name: 'User',
    role: 'admin',
  },
  app_metadata: {
    role: 'admin',
  },
};

// Test wrapper component
interface TestWrapperProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
  initialUser?: any;
}

const TestWrapper: React.FC<TestWrapperProps> = ({ 
  children, 
  queryClient = createTestQueryClient(),
  initialUser = null 
}) => {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18n}>
          <AuthProvider initialUser={initialUser}>
            <ToastProvider>
              {children}
            </ToastProvider>
          </AuthProvider>
        </I18nextProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

// Custom render function
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  initialUser?: any;
}

export const renderWithProviders = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { queryClient, initialUser, ...renderOptions } = options;

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestWrapper queryClient={queryClient} initialUser={initialUser}>
      {children}
    </TestWrapper>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { renderWithProviders as render };

// Custom matchers and utilities
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0));
};

// Mock data generators
export const generateMockPatient = (overrides = {}) => ({
  id: 'patient-' + Math.random().toString(36).substr(2, 9),
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  phone: '+212612345678',
  date_of_birth: '1990-01-01',
  address: '123 Main St',
  city: 'Casablanca',
  insurance_provider: 'CNSS',
  insurance_number: 'INS123456',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const generateMockAppointment = (overrides = {}) => ({
  id: 'appointment-' + Math.random().toString(36).substr(2, 9),
  patient_id: 'patient-1',
  dentist_id: 'dentist-1',
  appointment_date: new Date().toISOString(),
  duration: 60,
  status: 'scheduled',
  type: 'consultation',
  notes: 'Regular checkup',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const generateMockTreatment = (overrides = {}) => ({
  id: 'treatment-' + Math.random().toString(36).substr(2, 9),
  patient_id: 'patient-1',
  appointment_id: 'appointment-1',
  treatment_type: 'cleaning',
  description: 'Professional dental cleaning',
  cost: 500,
  status: 'completed',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const generateMockInvoice = (overrides = {}) => ({
  id: 'invoice-' + Math.random().toString(36).substr(2, 9),
  patient_id: 'patient-1',
  amount: 500,
  status: 'pending',
  due_date: new Date().toISOString(),
  items: [
    {
      description: 'Dental cleaning',
      quantity: 1,
      unit_price: 500,
      total: 500,
    },
  ],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// Performance testing utilities
export const measureRenderTime = async (renderFn: () => void) => {
  const start = performance.now();
  renderFn();
  await waitForLoadingToFinish();
  const end = performance.now();
  return end - start;
};

// Accessibility testing utilities
export const checkAccessibility = async (container: HTMLElement) => {
  // Basic accessibility checks
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const results = {
    focusableElementsCount: focusableElements.length,
    hasProperLabels: true,
    hasProperHeadings: true,
  };

  // Check for proper labels
  const inputs = container.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    const hasLabel = input.getAttribute('aria-label') || 
                    input.getAttribute('aria-labelledby') ||
                    container.querySelector(`label[for="${input.id}"]`);
    if (!hasLabel) {
      results.hasProperLabels = false;
    }
  });

  // Check for proper heading hierarchy
  const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
  if (headings.length === 0) {
    results.hasProperHeadings = false;
  }

  return results;
};

// Network simulation utilities
export const simulateSlowNetwork = () => {
  // Mock slow network conditions
  const originalFetch = global.fetch;
  global.fetch = async (...args) => {
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2s delay
    return originalFetch(...args);
  };
  
  return () => {
    global.fetch = originalFetch;
  };
};

export const simulateNetworkError = () => {
  const originalFetch = global.fetch;
  global.fetch = async () => {
    throw new Error('Network error');
  };
  
  return () => {
    global.fetch = originalFetch;
  };
};
