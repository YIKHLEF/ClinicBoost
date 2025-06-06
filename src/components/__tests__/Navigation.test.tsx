/**
 * Navigation Component Tests
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, mockUser } from '../../test/utils/test-utils';
import { testAccessibility } from '../../test/accessibility/accessibility-utils';
import DashboardLayout from '../../layouts/DashboardLayout';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/' }),
  };
});

describe('Navigation Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders navigation menu correctly', () => {
    renderWithProviders(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>, 
      { initialUser: mockUser }
    );

    // Check for main navigation items
    expect(screen.getByTestId('nav-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('nav-patients')).toBeInTheDocument();
    expect(screen.getByTestId('nav-appointments')).toBeInTheDocument();
    expect(screen.getByTestId('nav-billing')).toBeInTheDocument();
    expect(screen.getByTestId('nav-reports')).toBeInTheDocument();
  });

  it('highlights active navigation item', () => {
    renderWithProviders(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>, 
      { initialUser: mockUser }
    );

    const dashboardNav = screen.getByTestId('nav-dashboard');
    expect(dashboardNav).toHaveClass('active'); // Assuming active class is applied
  });

  it('handles navigation clicks', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>, 
      { initialUser: mockUser }
    );

    const patientsNav = screen.getByTestId('nav-patients');
    await user.click(patientsNav);

    expect(mockNavigate).toHaveBeenCalledWith('/patients');
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>, 
      { initialUser: mockUser }
    );

    // Tab through navigation items
    const navItems = [
      screen.getByTestId('nav-dashboard'),
      screen.getByTestId('nav-patients'),
      screen.getByTestId('nav-appointments'),
      screen.getByTestId('nav-billing'),
      screen.getByTestId('nav-reports')
    ];

    for (const item of navItems) {
      await user.tab();
      expect(document.activeElement).toBe(item);
    }
  });

  it('shows user menu when clicked', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>, 
      { initialUser: mockUser }
    );

    const userMenuButton = screen.getByTestId('user-menu-button');
    await user.click(userMenuButton);

    expect(screen.getByTestId('user-menu')).toBeVisible();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('handles logout correctly', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>, 
      { initialUser: mockUser }
    );

    const userMenuButton = screen.getByTestId('user-menu-button');
    await user.click(userMenuButton);

    const logoutButton = screen.getByText('Logout');
    await user.click(logoutButton);

    // Should navigate to login
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('displays user information correctly', () => {
    renderWithProviders(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>, 
      { initialUser: mockUser }
    );

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('shows mobile menu on small screens', async () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    const user = userEvent.setup();
    
    renderWithProviders(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>, 
      { initialUser: mockUser }
    );

    const mobileMenuButton = screen.getByTestId('mobile-menu-button');
    expect(mobileMenuButton).toBeInTheDocument();

    await user.click(mobileMenuButton);

    const mobileMenu = screen.getByTestId('mobile-menu');
    expect(mobileMenu).toBeVisible();
  });

  it('closes mobile menu when navigation item is clicked', async () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    const user = userEvent.setup();
    
    renderWithProviders(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>, 
      { initialUser: mockUser }
    );

    const mobileMenuButton = screen.getByTestId('mobile-menu-button');
    await user.click(mobileMenuButton);

    const mobileMenu = screen.getByTestId('mobile-menu');
    expect(mobileMenu).toBeVisible();

    const patientsNav = screen.getByTestId('nav-patients');
    await user.click(patientsNav);

    expect(mobileMenu).not.toBeVisible();
  });

  it('shows notification badge when there are notifications', () => {
    const userWithNotifications = {
      ...mockUser,
      notifications: [
        { id: '1', message: 'New appointment', read: false },
        { id: '2', message: 'Payment received', read: false }
      ]
    };

    renderWithProviders(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>, 
      { initialUser: userWithNotifications }
    );

    const notificationBadge = screen.getByTestId('notification-badge');
    expect(notificationBadge).toBeInTheDocument();
    expect(notificationBadge).toHaveTextContent('2');
  });

  it('opens notification panel when notification icon is clicked', async () => {
    const user = userEvent.setup();
    const userWithNotifications = {
      ...mockUser,
      notifications: [
        { id: '1', message: 'New appointment', read: false }
      ]
    };

    renderWithProviders(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>, 
      { initialUser: userWithNotifications }
    );

    const notificationButton = screen.getByTestId('notification-button');
    await user.click(notificationButton);

    expect(screen.getByTestId('notification-panel')).toBeVisible();
    expect(screen.getByText('New appointment')).toBeInTheDocument();
  });

  it('supports breadcrumb navigation', () => {
    renderWithProviders(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>, 
      { initialUser: mockUser }
    );

    const breadcrumb = screen.getByTestId('breadcrumb');
    expect(breadcrumb).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('shows search functionality', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>, 
      { initialUser: mockUser }
    );

    const searchButton = screen.getByTestId('search-button');
    await user.click(searchButton);

    expect(screen.getByTestId('global-search')).toBeVisible();
  });

  it('handles theme toggle', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>, 
      { initialUser: mockUser }
    );

    const themeToggle = screen.getByTestId('theme-toggle');
    await user.click(themeToggle);

    // Check if theme class is applied to document
    expect(document.documentElement).toHaveClass('dark');
  });

  it('handles language switching', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>, 
      { initialUser: mockUser }
    );

    const languageSwitcher = screen.getByTestId('language-switcher');
    await user.click(languageSwitcher);

    expect(screen.getByTestId('language-menu')).toBeVisible();
    
    const frenchOption = screen.getByTestId('language-fr');
    await user.click(frenchOption);

    // Check if language changed (this would depend on i18n implementation)
    expect(document.documentElement).toHaveAttribute('lang', 'fr');
  });

  it('is accessible', async () => {
    const component = renderWithProviders(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>, 
      { initialUser: mockUser }
    );

    await testAccessibility(component);
  });

  it('has proper ARIA attributes', () => {
    renderWithProviders(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>, 
      { initialUser: mockUser }
    );

    const navigation = screen.getByRole('navigation');
    expect(navigation).toHaveAttribute('aria-label');

    const userMenuButton = screen.getByTestId('user-menu-button');
    expect(userMenuButton).toHaveAttribute('aria-expanded');
    expect(userMenuButton).toHaveAttribute('aria-haspopup');
  });

  it('handles role-based navigation visibility', () => {
    const limitedUser = {
      ...mockUser,
      user_metadata: {
        ...mockUser.user_metadata,
        role: 'receptionist'
      }
    };

    renderWithProviders(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>, 
      { initialUser: limitedUser }
    );

    // Billing should not be visible for receptionist
    expect(screen.queryByTestId('nav-billing')).not.toBeInTheDocument();
    
    // But patients and appointments should be visible
    expect(screen.getByTestId('nav-patients')).toBeInTheDocument();
    expect(screen.getByTestId('nav-appointments')).toBeInTheDocument();
  });
});
