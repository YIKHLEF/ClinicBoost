/**
 * Appointment Workflow Integration Tests
 * 
 * Tests the complete appointment management workflow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, mockUser } from '../utils/test-utils';
import { Appointments } from '../../pages/Appointments';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

describe('Appointment Workflow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('completes appointment booking workflow', async () => {
    const user = userEvent.setup();
    
    // Mock patients and available slots
    server.use(
      http.get('https://test.supabase.co/rest/v1/patients', () => {
        return HttpResponse.json([
          {
            id: '1',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john.doe@example.com',
            phone: '+212612345678',
          },
        ]);
      }),
      http.get('https://test.supabase.co/rest/v1/appointments', () => {
        return HttpResponse.json([]);
      })
    );

    render(<Appointments />, { initialUser: mockUser });

    await waitFor(() => {
      expect(screen.getByText(/appointments/i)).toBeInTheDocument();
    });

    // Step 1: Start booking process
    const bookButton = screen.getByRole('button', { name: /book appointment/i });
    await user.click(bookButton);

    // Step 2: Select patient
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const patientSelect = screen.getByLabelText(/patient/i);
    await user.selectOptions(patientSelect, '1');

    // Step 3: Select date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateInput = screen.getByLabelText(/date/i);
    await user.type(dateInput, tomorrow.toISOString().split('T')[0]);

    // Step 4: Select time slot
    await waitFor(() => {
      expect(screen.getByText('09:00')).toBeInTheDocument();
    });

    const timeSlot = screen.getByRole('button', { name: '09:00' });
    await user.click(timeSlot);

    // Step 5: Set appointment details
    const durationSelect = screen.getByLabelText(/duration/i);
    await user.selectOptions(durationSelect, '60');

    const typeSelect = screen.getByLabelText(/type/i);
    await user.selectOptions(typeSelect, 'consultation');

    const notesInput = screen.getByLabelText(/notes/i);
    await user.type(notesInput, 'Regular checkup appointment');

    // Step 6: Confirm booking
    const confirmButton = screen.getByRole('button', { name: /confirm booking/i });
    await user.click(confirmButton);

    // Step 7: Verify appointment appears in calendar
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('09:00')).toBeInTheDocument();
      expect(screen.getByText('consultation')).toBeInTheDocument();
    });
  });

  it('handles appointment rescheduling', async () => {
    const user = userEvent.setup();
    
    // Mock existing appointment
    server.use(
      http.get('https://test.supabase.co/rest/v1/appointments', () => {
        return HttpResponse.json([
          {
            id: '1',
            patient_id: '1',
            appointment_date: '2024-12-20T10:00:00Z',
            duration: 60,
            type: 'consultation',
            status: 'scheduled',
            notes: 'Regular checkup',
          },
        ]);
      })
    );

    render(<Appointments />, { initialUser: mockUser });

    await waitFor(() => {
      expect(screen.getByText(/regular checkup/i)).toBeInTheDocument();
    });

    // Click reschedule
    const rescheduleButton = screen.getByRole('button', { name: /reschedule/i });
    await user.click(rescheduleButton);

    // Select new date
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + 2);
    const dateInput = screen.getByLabelText(/new date/i);
    await user.clear(dateInput);
    await user.type(dateInput, newDate.toISOString().split('T')[0]);

    // Select new time
    const newTimeSlot = screen.getByRole('button', { name: '14:00' });
    await user.click(newTimeSlot);

    // Confirm reschedule
    const confirmReschedule = screen.getByRole('button', { name: /confirm reschedule/i });
    await user.click(confirmReschedule);

    // Verify appointment is updated
    await waitFor(() => {
      expect(screen.getByText('14:00')).toBeInTheDocument();
    });
  });

  it('handles appointment cancellation with notifications', async () => {
    const user = userEvent.setup();
    
    render(<Appointments />, { initialUser: mockUser });

    await waitFor(() => {
      expect(screen.getByText(/regular checkup/i)).toBeInTheDocument();
    });

    // Cancel appointment
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    // Select cancellation reason
    const reasonSelect = screen.getByLabelText(/cancellation reason/i);
    await user.selectOptions(reasonSelect, 'patient_request');

    // Add cancellation note
    const noteInput = screen.getByLabelText(/cancellation note/i);
    await user.type(noteInput, 'Patient requested cancellation');

    // Choose notification options
    const notifyPatient = screen.getByLabelText(/notify patient/i);
    await user.click(notifyPatient);

    // Confirm cancellation
    const confirmCancel = screen.getByRole('button', { name: /confirm cancellation/i });
    await user.click(confirmCancel);

    // Verify appointment is cancelled
    await waitFor(() => {
      expect(screen.getByText(/cancelled/i)).toBeInTheDocument();
    });
  });

  it('manages appointment reminders', async () => {
    const user = userEvent.setup();
    
    render(<Appointments />, { initialUser: mockUser });

    await waitFor(() => {
      expect(screen.getByText(/regular checkup/i)).toBeInTheDocument();
    });

    // Open reminder settings
    const reminderButton = screen.getByRole('button', { name: /reminders/i });
    await user.click(reminderButton);

    // Configure SMS reminder
    const smsReminder = screen.getByLabelText(/sms reminder/i);
    await user.click(smsReminder);

    const smsTime = screen.getByLabelText(/sms time/i);
    await user.selectOptions(smsTime, '24'); // 24 hours before

    // Configure email reminder
    const emailReminder = screen.getByLabelText(/email reminder/i);
    await user.click(emailReminder);

    const emailTime = screen.getByLabelText(/email time/i);
    await user.selectOptions(emailTime, '2'); // 2 hours before

    // Save reminder settings
    const saveReminders = screen.getByRole('button', { name: /save reminders/i });
    await user.click(saveReminders);

    // Verify reminders are configured
    await waitFor(() => {
      expect(screen.getByText(/reminders configured/i)).toBeInTheDocument();
    });
  });

  it('handles recurring appointments', async () => {
    const user = userEvent.setup();
    
    render(<Appointments />, { initialUser: mockUser });

    const bookButton = screen.getByRole('button', { name: /book appointment/i });
    await user.click(bookButton);

    // Enable recurring appointments
    const recurringCheckbox = screen.getByLabelText(/recurring appointment/i);
    await user.click(recurringCheckbox);

    // Set recurrence pattern
    const frequencySelect = screen.getByLabelText(/frequency/i);
    await user.selectOptions(frequencySelect, 'weekly');

    const occurrences = screen.getByLabelText(/number of occurrences/i);
    await user.type(occurrences, '4');

    // Fill in other details
    const patientSelect = screen.getByLabelText(/patient/i);
    await user.selectOptions(patientSelect, '1');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateInput = screen.getByLabelText(/date/i);
    await user.type(dateInput, tomorrow.toISOString().split('T')[0]);

    const timeSlot = screen.getByRole('button', { name: '09:00' });
    await user.click(timeSlot);

    // Confirm recurring appointments
    const confirmButton = screen.getByRole('button', { name: /create recurring appointments/i });
    await user.click(confirmButton);

    // Verify multiple appointments are created
    await waitFor(() => {
      const appointments = screen.getAllByText('09:00');
      expect(appointments).toHaveLength(4);
    });
  });

  it('integrates with patient records', async () => {
    const user = userEvent.setup();
    
    render(<Appointments />, { initialUser: mockUser });

    await waitFor(() => {
      expect(screen.getByText(/regular checkup/i)).toBeInTheDocument();
    });

    // View patient details from appointment
    const patientLink = screen.getByRole('link', { name: /john doe/i });
    await user.click(patientLink);

    // Verify navigation to patient profile
    await waitFor(() => {
      expect(screen.getByText(/patient profile/i)).toBeInTheDocument();
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    });

    // Verify appointment history is shown
    expect(screen.getByText(/appointment history/i)).toBeInTheDocument();
    expect(screen.getByText(/regular checkup/i)).toBeInTheDocument();
  });

  it('handles appointment conflicts and double-booking prevention', async () => {
    const user = userEvent.setup();
    
    // Mock existing appointment at the same time
    server.use(
      http.post('https://test.supabase.co/rest/v1/appointments', () => {
        return HttpResponse.json(
          { error: 'Time slot is already booked' },
          { status: 409 }
        );
      })
    );

    render(<Appointments />, { initialUser: mockUser });

    const bookButton = screen.getByRole('button', { name: /book appointment/i });
    await user.click(bookButton);

    // Try to book conflicting appointment
    const patientSelect = screen.getByLabelText(/patient/i);
    await user.selectOptions(patientSelect, '1');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateInput = screen.getByLabelText(/date/i);
    await user.type(dateInput, tomorrow.toISOString().split('T')[0]);

    const timeSlot = screen.getByRole('button', { name: '10:00' });
    await user.click(timeSlot);

    const confirmButton = screen.getByRole('button', { name: /confirm booking/i });
    await user.click(confirmButton);

    // Verify conflict error
    await waitFor(() => {
      expect(screen.getByText(/time slot is already booked/i)).toBeInTheDocument();
    });

    // Suggest alternative times
    expect(screen.getByText(/suggested alternatives/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '11:00' })).toBeInTheDocument();
  });

  it('supports appointment status workflow', async () => {
    const user = userEvent.setup();
    
    render(<Appointments />, { initialUser: mockUser });

    await waitFor(() => {
      expect(screen.getByText(/scheduled/i)).toBeInTheDocument();
    });

    // Mark appointment as confirmed
    const statusButton = screen.getByRole('button', { name: /change status/i });
    await user.click(statusButton);

    const confirmStatus = screen.getByRole('button', { name: /confirmed/i });
    await user.click(confirmStatus);

    await waitFor(() => {
      expect(screen.getByText(/confirmed/i)).toBeInTheDocument();
    });

    // Mark as in progress
    await user.click(statusButton);
    const inProgressStatus = screen.getByRole('button', { name: /in progress/i });
    await user.click(inProgressStatus);

    await waitFor(() => {
      expect(screen.getByText(/in progress/i)).toBeInTheDocument();
    });

    // Complete appointment
    await user.click(statusButton);
    const completedStatus = screen.getByRole('button', { name: /completed/i });
    await user.click(completedStatus);

    // Add completion notes
    const completionNotes = screen.getByLabelText(/completion notes/i);
    await user.type(completionNotes, 'Appointment completed successfully');

    const saveCompletion = screen.getByRole('button', { name: /save completion/i });
    await user.click(saveCompletion);

    await waitFor(() => {
      expect(screen.getByText(/completed/i)).toBeInTheDocument();
    });
  });
});
