/**
 * Component Accessibility Tests
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, mockUser } from '../utils/test-utils';
import { 
  testAccessibility, 
  testKeyboardNavigation, 
  testAriaAttributes,
  testFormAccessibility,
  testModalAccessibility,
  testTableAccessibility
} from './accessibility-utils';
import Dashboard from '../../pages/Dashboard';
import PatientForm from '../../components/patients/PatientForm';
import AppointmentScheduler from '../../components/appointments/AppointmentScheduler';

describe('Component Accessibility Tests', () => {
  describe('Dashboard Accessibility', () => {
    it('meets accessibility standards', async () => {
      const component = renderWithProviders(<Dashboard />, { initialUser: mockUser });
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-title')).toBeInTheDocument();
      });

      await testAccessibility(component);
    });

    it('has proper heading structure', async () => {
      const component = renderWithProviders(<Dashboard />, { initialUser: mockUser });
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-title')).toBeInTheDocument();
      });

      // Check heading hierarchy
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toBeInTheDocument();

      const h2s = screen.getAllByRole('heading', { level: 2 });
      expect(h2s.length).toBeGreaterThan(0);
    });

    it('supports keyboard navigation', async () => {
      const component = renderWithProviders(<Dashboard />, { initialUser: mockUser });
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-title')).toBeInTheDocument();
      });

      const focusableElements = [
        'button',
        '[href]',
        'input',
        'select',
        'textarea',
        '[tabindex]:not([tabindex="-1"])'
      ];

      await testKeyboardNavigation(component, focusableElements);
    });

    it('has proper ARIA landmarks', async () => {
      const component = renderWithProviders(<Dashboard />, { initialUser: mockUser });
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-title')).toBeInTheDocument();
      });

      // Check for main landmark
      expect(screen.getByRole('main')).toBeInTheDocument();

      // Check for navigation landmark
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('provides screen reader announcements', async () => {
      const component = renderWithProviders(<Dashboard />, { initialUser: mockUser });
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-title')).toBeInTheDocument();
      });

      // Check for live regions
      const liveRegions = component.container.querySelectorAll('[aria-live], [role="status"]');
      expect(liveRegions.length).toBeGreaterThan(0);
    });
  });

  describe('PatientForm Accessibility', () => {
    it('meets accessibility standards', async () => {
      const component = renderWithProviders(
        <PatientForm 
          isOpen={true} 
          onClose={() => {}} 
          onSubmit={() => {}} 
        />, 
        { initialUser: mockUser }
      );

      await testAccessibility(component);
    });

    it('has proper form accessibility', async () => {
      const component = renderWithProviders(
        <PatientForm 
          isOpen={true} 
          onClose={() => {}} 
          onSubmit={() => {}} 
        />, 
        { initialUser: mockUser }
      );

      await testFormAccessibility(component);
    });

    it('has proper modal accessibility', async () => {
      const component = renderWithProviders(
        <PatientForm 
          isOpen={true} 
          onClose={() => {}} 
          onSubmit={() => {}} 
        />, 
        { initialUser: mockUser }
      );

      await testModalAccessibility(component);
    });

    it('handles form validation errors accessibly', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      
      const component = renderWithProviders(
        <PatientForm 
          isOpen={true} 
          onClose={() => {}} 
          onSubmit={onSubmit} 
        />, 
        { initialUser: mockUser }
      );

      // Submit form without filling required fields
      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessages = screen.getAllByRole('alert');
        expect(errorMessages.length).toBeGreaterThan(0);
      });

      // Check that error messages are properly associated with inputs
      const errorMessages = screen.getAllByRole('alert');
      errorMessages.forEach(error => {
        const errorId = error.getAttribute('id');
        if (errorId) {
          const associatedInput = component.container.querySelector(`[aria-describedby*="${errorId}"]`);
          expect(associatedInput).toBeTruthy();
        }
      });
    });

    it('supports keyboard navigation within form', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <PatientForm 
          isOpen={true} 
          onClose={() => {}} 
          onSubmit={() => {}} 
        />, 
        { initialUser: mockUser }
      );

      // Test tab navigation through form fields
      const formInputs = screen.getAllByRole('textbox');
      const buttons = screen.getAllByRole('button');
      const allFocusable = [...formInputs, ...buttons];

      for (const element of allFocusable) {
        await user.tab();
        expect(document.activeElement).toBe(element);
      }
    });
  });

  describe('AppointmentScheduler Accessibility', () => {
    it('meets accessibility standards', async () => {
      const component = renderWithProviders(
        <AppointmentScheduler 
          isOpen={true} 
          onClose={() => {}} 
          onSubmit={() => {}} 
        />, 
        { initialUser: mockUser }
      );

      await testAccessibility(component);
    });

    it('has accessible date picker', async () => {
      const component = renderWithProviders(
        <AppointmentScheduler 
          isOpen={true} 
          onClose={() => {}} 
          onSubmit={() => {}} 
        />, 
        { initialUser: mockUser }
      );

      // Check for date picker accessibility
      const datePicker = screen.getByLabelText(/date/i);
      expect(datePicker).toHaveAttribute('aria-label');
      expect(datePicker).toHaveAttribute('role');
    });

    it('has accessible time slots', async () => {
      const component = renderWithProviders(
        <AppointmentScheduler 
          isOpen={true} 
          onClose={() => {}} 
          onSubmit={() => {}} 
        />, 
        { initialUser: mockUser }
      );

      // Check for time slot accessibility
      const timeSlots = screen.getAllByRole('button', { name: /time slot/i });
      timeSlots.forEach(slot => {
        expect(slot).toHaveAttribute('aria-label');
        expect(slot).toHaveAttribute('aria-pressed');
      });
    });
  });

  describe('Navigation Accessibility', () => {
    it('has accessible navigation menu', async () => {
      const component = renderWithProviders(<Dashboard />, { initialUser: mockUser });
      
      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument();
      });

      const nav = screen.getByRole('navigation');
      
      // Check for proper ARIA attributes
      expect(nav).toHaveAttribute('aria-label');
      
      // Check for navigation items
      const navItems = screen.getAllByRole('link');
      navItems.forEach(item => {
        expect(item).toHaveAttribute('href');
        expect(item).toHaveAccessibleName();
      });
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<Dashboard />, { initialUser: mockUser });
      
      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument();
      });

      const navItems = screen.getAllByRole('link');
      
      // Test keyboard navigation
      for (const item of navItems) {
        await user.tab();
        expect(document.activeElement).toBe(item);
      }
    });

    it('has proper focus indicators', async () => {
      const component = renderWithProviders(<Dashboard />, { initialUser: mockUser });
      
      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument();
      });

      // Check that focusable elements have visible focus indicators
      const focusableElements = component.container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      focusableElements.forEach(element => {
        // Focus the element
        element.focus();
        
        // Check for focus styles (this would need to be implemented in CSS)
        const computedStyle = window.getComputedStyle(element);
        expect(
          computedStyle.outline !== 'none' || 
          computedStyle.boxShadow !== 'none' ||
          element.classList.contains('focus:ring')
        ).toBe(true);
      });
    });
  });

  describe('Table Accessibility', () => {
    it('has accessible patient table', async () => {
      // This would test the patients table component
      const component = renderWithProviders(<Dashboard />, { initialUser: mockUser });
      
      await waitFor(() => {
        const table = component.container.querySelector('table');
        if (table) {
          testTableAccessibility(component);
        }
      });
    });
  });

  describe('Color and Contrast', () => {
    it('meets color contrast requirements', async () => {
      const component = renderWithProviders(<Dashboard />, { initialUser: mockUser });
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-title')).toBeInTheDocument();
      });

      // Test color contrast (this would require actual color analysis)
      await testAccessibility(component, {
        includedImpacts: ['serious', 'critical'],
        excludedRules: [] // Include color-contrast rule
      });
    });

    it('does not rely solely on color for information', async () => {
      const component = renderWithProviders(<Dashboard />, { initialUser: mockUser });
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-title')).toBeInTheDocument();
      });

      // Check for status indicators that use more than just color
      const statusElements = component.container.querySelectorAll('[data-status]');
      statusElements.forEach(element => {
        // Should have text, icon, or other non-color indicator
        const hasText = element.textContent && element.textContent.trim().length > 0;
        const hasIcon = element.querySelector('svg, .icon');
        const hasAriaLabel = element.getAttribute('aria-label');
        
        expect(hasText || hasIcon || hasAriaLabel).toBe(true);
      });
    });
  });

  describe('Responsive Accessibility', () => {
    it('maintains accessibility on mobile', async () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });

      const component = renderWithProviders(<Dashboard />, { initialUser: mockUser });
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-title')).toBeInTheDocument();
      });

      await testAccessibility(component);
    });

    it('has accessible mobile navigation', async () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const component = renderWithProviders(<Dashboard />, { initialUser: mockUser });
      
      await waitFor(() => {
        const mobileMenuButton = screen.queryByTestId('mobile-menu-button');
        if (mobileMenuButton) {
          expect(mobileMenuButton).toHaveAttribute('aria-expanded');
          expect(mobileMenuButton).toHaveAttribute('aria-controls');
        }
      });
    });
  });
});
