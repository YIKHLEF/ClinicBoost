/**
 * AppointmentScheduler Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, generateMockAppointment, generateMockPatient } from '../../test/utils/test-utils';
import { AppointmentScheduler } from '../appointments/AppointmentScheduler';

// Mock the appointment service
vi.mock('../../lib/appointments', () => ({
  appointmentService: {
    createAppointment: vi.fn(),
    updateAppointment: vi.fn(),
    getAvailableSlots: vi.fn(),
  },
}));

// Mock the patient service
vi.mock('../../lib/patients', () => ({
  patientService: {
    getPatients: vi.fn(),
  },
}));

describe('AppointmentScheduler', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders scheduler form correctly', () => {
    render(
      <AppointmentScheduler
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByLabelText(/patient/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/duration/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    
    render(
      <AppointmentScheduler
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByRole('button', { name: /schedule/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/patient is required/i)).toBeInTheDocument();
      expect(screen.getByText(/date is required/i)).toBeInTheDocument();
      expect(screen.getByText(/time is required/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('prevents scheduling appointments in the past', async () => {
    const user = userEvent.setup();
    
    render(
      <AppointmentScheduler
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const dateInput = screen.getByLabelText(/date/i);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    await user.type(dateInput, yesterday.toISOString().split('T')[0]);

    const submitButton = screen.getByRole('button', { name: /schedule/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/cannot schedule appointments in the past/i)).toBeInTheDocument();
    });
  });

  it('shows available time slots for selected date', async () => {
    const user = userEvent.setup();
    const mockAvailableSlots = ['09:00', '10:00', '11:00', '14:00', '15:00'];
    
    const { appointmentService } = await import('../../lib/appointments');
    vi.mocked(appointmentService.getAvailableSlots).mockResolvedValue(mockAvailableSlots);

    render(
      <AppointmentScheduler
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const dateInput = screen.getByLabelText(/date/i);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    await user.type(dateInput, tomorrow.toISOString().split('T')[0]);

    await waitFor(() => {
      mockAvailableSlots.forEach(slot => {
        expect(screen.getByText(slot)).toBeInTheDocument();
      });
    });
  });

  it('calculates appointment end time based on duration', async () => {
    const user = userEvent.setup();
    
    render(
      <AppointmentScheduler
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const timeInput = screen.getByLabelText(/time/i);
    const durationSelect = screen.getByLabelText(/duration/i);

    await user.type(timeInput, '10:00');
    await user.selectOptions(durationSelect, '60');

    await waitFor(() => {
      expect(screen.getByText(/ends at 11:00/i)).toBeInTheDocument();
    });
  });

  it('submits appointment with correct data', async () => {
    const user = userEvent.setup();
    const mockPatients = [generateMockPatient({ id: '1', first_name: 'John', last_name: 'Doe' })];
    
    const { patientService } = await import('../../lib/patients');
    vi.mocked(patientService.getPatients).mockResolvedValue(mockPatients);

    render(
      <AppointmentScheduler
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Wait for patients to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Fill in form
    await user.selectOptions(screen.getByLabelText(/patient/i), '1');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await user.type(screen.getByLabelText(/date/i), tomorrow.toISOString().split('T')[0]);
    
    await user.type(screen.getByLabelText(/time/i), '10:00');
    await user.selectOptions(screen.getByLabelText(/duration/i), '60');
    await user.selectOptions(screen.getByLabelText(/type/i), 'consultation');
    await user.type(screen.getByLabelText(/notes/i), 'Regular checkup');

    const submitButton = screen.getByRole('button', { name: /schedule/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        patient_id: '1',
        appointment_date: expect.stringContaining(tomorrow.toISOString().split('T')[0]),
        duration: 60,
        type: 'consultation',
        notes: 'Regular checkup',
        status: 'scheduled',
      });
    });
  });

  it('handles conflicts with existing appointments', async () => {
    const user = userEvent.setup();
    const conflictError = new Error('Time slot is already booked');
    conflictError.name = 'ConflictError';
    
    const conflictSubmit = vi.fn().mockRejectedValue(conflictError);
    
    render(
      <AppointmentScheduler
        onSubmit={conflictSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Fill in form with conflicting time
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    await user.type(screen.getByLabelText(/date/i), tomorrow.toISOString().split('T')[0]);
    await user.type(screen.getByLabelText(/time/i), '10:00');

    const submitButton = screen.getByRole('button', { name: /schedule/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/time slot is already booked/i)).toBeInTheDocument();
    });
  });

  it('supports recurring appointments', async () => {
    const user = userEvent.setup();
    
    render(
      <AppointmentScheduler
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        allowRecurring={true}
      />
    );

    expect(screen.getByLabelText(/recurring/i)).toBeInTheDocument();
    
    const recurringCheckbox = screen.getByLabelText(/recurring/i);
    await user.click(recurringCheckbox);

    await waitFor(() => {
      expect(screen.getByLabelText(/frequency/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
    });
  });

  it('shows appointment reminders configuration', async () => {
    const user = userEvent.setup();
    
    render(
      <AppointmentScheduler
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        showReminders={true}
      />
    );

    expect(screen.getByText(/reminders/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sms reminder/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email reminder/i)).toBeInTheDocument();
  });

  it('handles timezone considerations', () => {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    render(
      <AppointmentScheduler
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(new RegExp(userTimezone, 'i'))).toBeInTheDocument();
  });

  it('supports appointment editing mode', () => {
    const mockAppointment = generateMockAppointment({
      patient_id: '1',
      appointment_date: '2024-12-20T10:00:00Z',
      duration: 60,
      type: 'consultation',
      notes: 'Regular checkup',
    });

    render(
      <AppointmentScheduler
        initialData={mockAppointment}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        mode="edit"
      />
    );

    expect(screen.getByDisplayValue('Regular checkup')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();
  });

  it('has proper accessibility features', () => {
    render(
      <AppointmentScheduler
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Check for proper labels and ARIA attributes
    expect(screen.getByLabelText(/patient/i)).toHaveAttribute('required');
    expect(screen.getByLabelText(/date/i)).toHaveAttribute('required');
    expect(screen.getByLabelText(/time/i)).toHaveAttribute('required');

    // Check for form structure
    const form = screen.getByRole('form');
    expect(form).toBeInTheDocument();
  });
});
