/**
 * PatientForm Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, generateMockPatient } from '../../test/utils/test-utils';
import { PatientForm } from '../patients/PatientForm';

// Mock the patient service
vi.mock('../../lib/patients', () => ({
  patientService: {
    createPatient: vi.fn(),
    updatePatient: vi.fn(),
  },
}));

describe('PatientForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form fields correctly', () => {
    render(
      <PatientForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    
    render(
      <PatientForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByRole('button', { name: /save/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    
    render(
      <PatientForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');

    const submitButton = screen.getByRole('button', { name: /save/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
    });
  });

  it('validates Moroccan phone number format', async () => {
    const user = userEvent.setup();
    
    render(
      <PatientForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const phoneInput = screen.getByLabelText(/phone/i);
    await user.type(phoneInput, '123456789'); // Invalid format

    const submitButton = screen.getByRole('button', { name: /save/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid phone number/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    
    render(
      <PatientForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Fill in valid data
    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.type(screen.getByLabelText(/email/i), 'john.doe@example.com');
    await user.type(screen.getByLabelText(/phone/i), '+212612345678');
    await user.type(screen.getByLabelText(/date of birth/i), '1990-01-01');
    await user.type(screen.getByLabelText(/address/i), '123 Main St');
    await user.type(screen.getByLabelText(/city/i), 'Casablanca');

    const submitButton = screen.getByRole('button', { name: /save/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        phone: '+212612345678',
        date_of_birth: '1990-01-01',
        address: '123 Main St',
        city: 'Casablanca',
        insurance_provider: '',
        insurance_number: '',
        medical_history: {},
        notes: '',
      });
    });
  });

  it('populates form with initial data for editing', () => {
    const mockPatient = generateMockPatient({
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane.smith@example.com',
    });

    render(
      <PatientForm
        initialData={mockPatient}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByDisplayValue('Jane')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Smith')).toBeInTheDocument();
    expect(screen.getByDisplayValue('jane.smith@example.com')).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <PatientForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    
    // Mock a delayed submission
    const delayedSubmit = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(
      <PatientForm
        onSubmit={delayedSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Fill in required fields
    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.type(screen.getByLabelText(/email/i), 'john.doe@example.com');

    const submitButton = screen.getByRole('button', { name: /save/i });
    await user.click(submitButton);

    // Check for loading state
    expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('handles form submission errors gracefully', async () => {
    const user = userEvent.setup();
    const errorSubmit = vi.fn().mockRejectedValue(new Error('Submission failed'));
    
    render(
      <PatientForm
        onSubmit={errorSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Fill in required fields
    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.type(screen.getByLabelText(/email/i), 'john.doe@example.com');

    const submitButton = screen.getByRole('button', { name: /save/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/submission failed/i)).toBeInTheDocument();
    });
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    
    render(
      <PatientForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const firstNameInput = screen.getByLabelText(/first name/i);
    firstNameInput.focus();

    // Tab through form fields
    await user.tab();
    expect(screen.getByLabelText(/last name/i)).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText(/email/i)).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText(/phone/i)).toHaveFocus();
  });

  it('has proper accessibility attributes', () => {
    render(
      <PatientForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Check for proper labels
    expect(screen.getByLabelText(/first name/i)).toHaveAttribute('required');
    expect(screen.getByLabelText(/last name/i)).toHaveAttribute('required');
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('required');

    // Check for proper ARIA attributes
    const form = screen.getByRole('form');
    expect(form).toBeInTheDocument();
  });
});
