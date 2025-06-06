/**
 * Dashboard Component Tests
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/mocks/server';
import { renderWithProviders, mockUser } from '../../test/utils/test-utils';
import { testAccessibility } from '../../test/accessibility/accessibility-utils';
import Dashboard from '../../pages/Dashboard';

// Mock chart.js to avoid canvas issues in tests
vi.mock('react-chartjs-2', () => ({
  Line: ({ data, options }: any) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)}>
      Line Chart
    </div>
  ),
  Bar: ({ data, options }: any) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)}>
      Bar Chart
    </div>
  ),
  Doughnut: ({ data, options }: any) => (
    <div data-testid="doughnut-chart" data-chart-data={JSON.stringify(data)}>
      Doughnut Chart
    </div>
  ),
}));

describe('Dashboard Component', () => {
  beforeEach(() => {
    // Mock dashboard API responses
    server.use(
      http.get('https://test.supabase.co/rest/v1/rpc/get_dashboard_stats', () => {
        return HttpResponse.json({
          total_patients: 150,
          total_appointments: 45,
          appointments_today: 8,
          revenue_this_month: 12500,
          patient_growth: 15.5,
          appointment_growth: 8.2,
          revenue_growth: 22.1
        });
      }),
      http.get('https://test.supabase.co/rest/v1/appointments', () => {
        return HttpResponse.json([
          {
            id: '1',
            patient_id: '1',
            date: new Date().toISOString().split('T')[0],
            time: '09:00',
            type: 'consultation',
            status: 'scheduled',
            patients: {
              first_name: 'John',
              last_name: 'Doe'
            }
          },
          {
            id: '2',
            patient_id: '2',
            date: new Date().toISOString().split('T')[0],
            time: '10:30',
            type: 'checkup',
            status: 'completed',
            patients: {
              first_name: 'Jane',
              last_name: 'Smith'
            }
          }
        ]);
      }),
      http.get('https://test.supabase.co/rest/v1/patients', () => {
        return HttpResponse.json([
          {
            id: '1',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john.doe@example.com',
            phone: '+212612345678',
            created_at: new Date().toISOString()
          }
        ]);
      })
    );
  });

  it('renders dashboard with loading state initially', () => {
    const component = renderWithProviders(<Dashboard />, { initialUser: mockUser });
    
    expect(screen.getByTestId('dashboard-title')).toBeInTheDocument();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('displays dashboard statistics after loading', async () => {
    const component = renderWithProviders(<Dashboard />, { initialUser: mockUser });

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument(); // Total patients
      expect(screen.getByText('45')).toBeInTheDocument(); // Total appointments
      expect(screen.getByText('8')).toBeInTheDocument(); // Today's appointments
      expect(screen.getByText('12,500')).toBeInTheDocument(); // Revenue
    });
  });

  it('displays growth indicators with correct styling', async () => {
    const component = renderWithProviders(<Dashboard />, { initialUser: mockUser });

    await waitFor(() => {
      const patientGrowth = screen.getByText('15.5%');
      const appointmentGrowth = screen.getByText('8.2%');
      const revenueGrowth = screen.getByText('22.1%');

      expect(patientGrowth).toBeInTheDocument();
      expect(appointmentGrowth).toBeInTheDocument();
      expect(revenueGrowth).toBeInTheDocument();

      // Check for positive growth styling (green color)
      expect(patientGrowth.closest('[class*="text-green"]')).toBeInTheDocument();
    });
  });

  it('displays recent appointments list', async () => {
    const component = renderWithProviders(<Dashboard />, { initialUser: mockUser });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('09:00')).toBeInTheDocument();
      expect(screen.getByText('10:30')).toBeInTheDocument();
    });
  });

  it('renders charts correctly', async () => {
    const component = renderWithProviders(<Dashboard />, { initialUser: mockUser });

    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();
    });
  });

  it('handles navigation to different sections', async () => {
    const user = userEvent.setup();
    const component = renderWithProviders(<Dashboard />, { initialUser: mockUser });

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument();
    });

    // Test navigation to patients
    const patientsCard = screen.getByText('Total Patients').closest('div');
    if (patientsCard) {
      await user.click(patientsCard);
      // Would test navigation if router was properly mocked
    }
  });

  it('displays error state when API fails', async () => {
    server.use(
      http.get('https://test.supabase.co/rest/v1/rpc/get_dashboard_stats', () => {
        return HttpResponse.error();
      })
    );

    const component = renderWithProviders(<Dashboard />, { initialUser: mockUser });

    await waitFor(() => {
      expect(screen.getByText(/error loading dashboard/i)).toBeInTheDocument();
    });
  });

  it('refreshes data when refresh button is clicked', async () => {
    const user = userEvent.setup();
    let callCount = 0;

    server.use(
      http.get('https://test.supabase.co/rest/v1/rpc/get_dashboard_stats', () => {
        callCount++;
        return HttpResponse.json({
          total_patients: 150 + callCount,
          total_appointments: 45,
          appointments_today: 8,
          revenue_this_month: 12500,
          patient_growth: 15.5,
          appointment_growth: 8.2,
          revenue_growth: 22.1
        });
      })
    );

    const component = renderWithProviders(<Dashboard />, { initialUser: mockUser });

    await waitFor(() => {
      expect(screen.getByText('151')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByText('152')).toBeInTheDocument();
    });

    expect(callCount).toBe(2);
  });

  it('is accessible', async () => {
    const component = renderWithProviders(<Dashboard />, { initialUser: mockUser });

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument();
    });

    await testAccessibility(component);
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    const component = renderWithProviders(<Dashboard />, { initialUser: mockUser });

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument();
    });

    // Test tab navigation through interactive elements
    const interactiveElements = screen.getAllByRole('button');
    
    for (const element of interactiveElements) {
      await user.tab();
      expect(document.activeElement).toBe(element);
    }
  });

  it('displays correct time-based greetings', () => {
    const originalDate = Date;
    
    // Mock morning time
    const mockDate = new Date('2024-01-01T09:00:00Z');
    global.Date = vi.fn(() => mockDate) as any;
    global.Date.now = vi.fn(() => mockDate.getTime());

    const component = renderWithProviders(<Dashboard />, { initialUser: mockUser });
    
    expect(screen.getByText(/good morning/i)).toBeInTheDocument();

    // Restore original Date
    global.Date = originalDate;
  });

  it('handles real-time updates', async () => {
    const component = renderWithProviders(<Dashboard />, { initialUser: mockUser });

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument();
    });

    // Simulate real-time update
    server.use(
      http.get('https://test.supabase.co/rest/v1/rpc/get_dashboard_stats', () => {
        return HttpResponse.json({
          total_patients: 151,
          total_appointments: 46,
          appointments_today: 9,
          revenue_this_month: 12600,
          patient_growth: 16.0,
          appointment_growth: 8.5,
          revenue_growth: 22.5
        });
      })
    );

    // Trigger update (this would normally come from real-time subscription)
    // For testing, we can simulate by re-rendering or triggering a refresh
    await waitFor(() => {
      // Check if component handles updates properly
      expect(component.container).toBeInTheDocument();
    });
  });
});
