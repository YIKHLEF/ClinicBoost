/**
 * Patient Management Integration Tests
 * 
 * Tests the complete patient management workflow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, mockUser } from '../utils/test-utils';
import { Patients } from '../../pages/Patients';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

describe('Patient Management Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('completes full patient lifecycle: create, view, edit, delete', async () => {
    const user = userEvent.setup();
    
    render(<Patients />, { initialUser: mockUser });

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByText(/patients/i)).toBeInTheDocument();
    });

    // Step 1: Create a new patient
    const addButton = screen.getByRole('button', { name: /add patient/i });
    await user.click(addButton);

    // Fill in patient form
    await user.type(screen.getByLabelText(/first name/i), 'Integration');
    await user.type(screen.getByLabelText(/last name/i), 'Test');
    await user.type(screen.getByLabelText(/email/i), 'integration.test@example.com');
    await user.type(screen.getByLabelText(/phone/i), '+212612345678');
    await user.type(screen.getByLabelText(/date of birth/i), '1990-01-01');
    await user.type(screen.getByLabelText(/address/i), '123 Test St');
    await user.type(screen.getByLabelText(/city/i), 'Test City');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    // Step 2: Verify patient appears in list
    await waitFor(() => {
      expect(screen.getByText('Integration Test')).toBeInTheDocument();
      expect(screen.getByText('integration.test@example.com')).toBeInTheDocument();
    });

    // Step 3: Edit the patient
    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);

    const firstNameInput = screen.getByDisplayValue('Integration');
    await user.clear(firstNameInput);
    await user.type(firstNameInput, 'Updated');

    const updateButton = screen.getByRole('button', { name: /save/i });
    await user.click(updateButton);

    // Step 4: Verify update
    await waitFor(() => {
      expect(screen.getByText('Updated Test')).toBeInTheDocument();
    });

    // Step 5: Delete the patient
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);

    // Step 6: Verify patient is removed
    await waitFor(() => {
      expect(screen.queryByText('Updated Test')).not.toBeInTheDocument();
    });
  });

  it('handles patient search and filtering', async () => {
    const user = userEvent.setup();
    
    // Mock multiple patients
    server.use(
      http.get('https://test.supabase.co/rest/v1/patients', () => {
        return HttpResponse.json([
          {
            id: '1',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john.doe@example.com',
            phone: '+212612345678',
            city: 'Casablanca',
          },
          {
            id: '2',
            first_name: 'Jane',
            last_name: 'Smith',
            email: 'jane.smith@example.com',
            phone: '+212612345679',
            city: 'Rabat',
          },
          {
            id: '3',
            first_name: 'Ahmed',
            last_name: 'Hassan',
            email: 'ahmed.hassan@example.com',
            phone: '+212612345680',
            city: 'Casablanca',
          },
        ]);
      })
    );

    render(<Patients />, { initialUser: mockUser });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Ahmed Hassan')).toBeInTheDocument();
    });

    // Test search functionality
    const searchInput = screen.getByPlaceholderText(/search patients/i);
    await user.type(searchInput, 'John');

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      expect(screen.queryByText('Ahmed Hassan')).not.toBeInTheDocument();
    });

    // Clear search
    await user.clear(searchInput);

    // Test city filter
    const cityFilter = screen.getByLabelText(/filter by city/i);
    await user.selectOptions(cityFilter, 'Casablanca');

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Ahmed Hassan')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  it('handles patient data validation and error states', async () => {
    const user = userEvent.setup();
    
    // Mock server error
    server.use(
      http.post('https://test.supabase.co/rest/v1/patients', () => {
        return HttpResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        );
      })
    );

    render(<Patients />, { initialUser: mockUser });

    const addButton = screen.getByRole('button', { name: /add patient/i });
    await user.click(addButton);

    // Fill in form with duplicate email
    await user.type(screen.getByLabelText(/first name/i), 'Duplicate');
    await user.type(screen.getByLabelText(/last name/i), 'Email');
    await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
    await user.type(screen.getByLabelText(/phone/i), '+212612345678');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    // Verify error message
    await waitFor(() => {
      expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
    });
  });

  it('handles network errors gracefully', async () => {
    const user = userEvent.setup();
    
    // Mock network error
    server.use(
      http.get('https://test.supabase.co/rest/v1/patients', () => {
        return HttpResponse.error();
      })
    );

    render(<Patients />, { initialUser: mockUser });

    await waitFor(() => {
      expect(screen.getByText(/failed to load patients/i)).toBeInTheDocument();
    });

    // Test retry functionality
    const retryButton = screen.getByRole('button', { name: /retry/i });
    
    // Reset handler to success
    server.use(
      http.get('https://test.supabase.co/rest/v1/patients', () => {
        return HttpResponse.json([]);
      })
    );

    await user.click(retryButton);

    await waitFor(() => {
      expect(screen.queryByText(/failed to load patients/i)).not.toBeInTheDocument();
    });
  });

  it('supports bulk operations', async () => {
    const user = userEvent.setup();
    
    // Mock multiple patients
    server.use(
      http.get('https://test.supabase.co/rest/v1/patients', () => {
        return HttpResponse.json([
          { id: '1', first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
          { id: '2', first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' },
          { id: '3', first_name: 'Bob', last_name: 'Johnson', email: 'bob@example.com' },
        ]);
      })
    );

    render(<Patients />, { initialUser: mockUser });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Select multiple patients
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]); // First patient
    await user.click(checkboxes[2]); // Second patient

    // Verify bulk actions are available
    expect(screen.getByRole('button', { name: /bulk delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export selected/i })).toBeInTheDocument();

    // Test bulk delete
    const bulkDeleteButton = screen.getByRole('button', { name: /bulk delete/i });
    await user.click(bulkDeleteButton);

    const confirmButton = screen.getByRole('button', { name: /confirm delete/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });
  });

  it('integrates with appointment scheduling', async () => {
    const user = userEvent.setup();
    
    render(<Patients />, { initialUser: mockUser });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Click schedule appointment for a patient
    const scheduleButton = screen.getByRole('button', { name: /schedule appointment/i });
    await user.click(scheduleButton);

    // Verify appointment scheduler opens with patient pre-selected
    await waitFor(() => {
      expect(screen.getByText(/schedule appointment/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    });
  });

  it('maintains data consistency across operations', async () => {
    const user = userEvent.setup();
    
    render(<Patients />, { initialUser: mockUser });

    // Create patient
    const addButton = screen.getByRole('button', { name: /add patient/i });
    await user.click(addButton);

    await user.type(screen.getByLabelText(/first name/i), 'Consistency');
    await user.type(screen.getByLabelText(/last name/i), 'Test');
    await user.type(screen.getByLabelText(/email/i), 'consistency@example.com');
    await user.type(screen.getByLabelText(/phone/i), '+212612345678');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    // Verify patient appears in list
    await waitFor(() => {
      expect(screen.getByText('Consistency Test')).toBeInTheDocument();
    });

    // Navigate away and back
    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    await user.click(dashboardLink);

    const patientsLink = screen.getByRole('link', { name: /patients/i });
    await user.click(patientsLink);

    // Verify patient data persists
    await waitFor(() => {
      expect(screen.getByText('Consistency Test')).toBeInTheDocument();
    });
  });
});
