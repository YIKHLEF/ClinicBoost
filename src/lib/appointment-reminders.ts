import { supabase } from './supabase';
import { sendSMS, sendWhatsApp, validatePhoneNumber, formatPhoneNumber } from '../utils/twilio';
import { handleError, logError } from './error-handling';
import type { Database } from './database.types';

type Appointment = Database['public']['Tables']['appointments']['Row'];
type Patient = Database['public']['Tables']['patients']['Row'];

export interface ReminderSettings {
  enabled: boolean;
  methods: ('sms' | 'whatsapp' | 'email')[];
  timings: {
    days_before?: number;
    hours_before?: number;
    minutes_before?: number;
  }[];
  templates: {
    sms: string;
    whatsapp: string;
    email: string;
  };
  business_hours: {
    start: string; // HH:MM format
    end: string;   // HH:MM format
    timezone: string;
  };
}

export interface ReminderExecution {
  appointmentId: string;
  patientId: string;
  reminderType: 'days_before' | 'hours_before' | 'minutes_before';
  reminderValue: number;
  method: 'sms' | 'whatsapp' | 'email';
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  scheduledTime: Date;
  sentTime?: Date;
  error?: string;
  messageId?: string;
}

export class AppointmentReminderEngine {
  private defaultSettings: ReminderSettings = {
    enabled: true,
    methods: ['sms', 'whatsapp'],
    timings: [
      { days_before: 1 },
      { hours_before: 2 },
    ],
    templates: {
      sms: 'Hi {firstName}, this is a reminder that you have a dental appointment tomorrow at {time} with {dentist}. Please call {clinicPhone} if you need to reschedule.',
      whatsapp: '🦷 Hi {firstName}! \n\nReminder: You have a dental appointment tomorrow at {time} with {dentist}.\n\nPlease reply CONFIRM to confirm or call {clinicPhone} to reschedule.\n\nThank you!',
      email: 'Dear {firstName},\n\nThis is a friendly reminder about your upcoming dental appointment:\n\nDate: {date}\nTime: {time}\nDentist: {dentist}\nLocation: {clinicAddress}\n\nPlease arrive 15 minutes early. If you need to reschedule, please call us at {clinicPhone}.\n\nThank you!'
    },
    business_hours: {
      start: '08:00',
      end: '18:00',
      timezone: 'Africa/Casablanca',
    },
  };

  private reminderQueue: Map<string, ReminderExecution[]> = new Map();

  /**
   * Schedule reminders for an appointment
   */
  async scheduleReminders(appointmentId: string, settings?: Partial<ReminderSettings>): Promise<void> {
    try {
      const reminderSettings = { ...this.defaultSettings, ...settings };

      if (!reminderSettings.enabled) {
        console.log(`Reminders disabled for appointment ${appointmentId}`);
        return;
      }

      // Get appointment details with patient info
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          *,
          patients (*)
        `)
        .eq('id', appointmentId)
        .single();

      if (appointmentError || !appointment) {
        throw new Error(`Appointment not found: ${appointmentError?.message}`);
      }

      const patient = appointment.patients as any;
      if (!patient) {
        throw new Error('Patient information not found');
      }

      // Validate patient has contact information
      if (!patient.phone || !validatePhoneNumber(patient.phone)) {
        console.warn(`Invalid phone number for patient ${patient.id}, skipping SMS/WhatsApp reminders`);
      }

      const appointmentTime = new Date(appointment.start_time);
      const reminders: ReminderExecution[] = [];

      // Create reminders for each timing and method
      for (const timing of reminderSettings.timings) {
        for (const method of reminderSettings.methods) {
          // Skip SMS/WhatsApp if no valid phone
          if ((method === 'sms' || method === 'whatsapp') && 
              (!patient.phone || !validatePhoneNumber(patient.phone))) {
            continue;
          }

          // Skip email if no email
          if (method === 'email' && !patient.email) {
            continue;
          }

          const reminderTime = this.calculateReminderTime(appointmentTime, timing, reminderSettings.business_hours);
          
          if (reminderTime > new Date()) { // Only schedule future reminders
            const reminder: ReminderExecution = {
              appointmentId,
              patientId: patient.id,
              reminderType: timing.days_before ? 'days_before' : timing.hours_before ? 'hours_before' : 'minutes_before',
              reminderValue: timing.days_before || timing.hours_before || timing.minutes_before || 0,
              method,
              status: 'pending',
              scheduledTime: reminderTime,
            };

            reminders.push(reminder);
          }
        }
      }

      // Store reminders in queue
      this.reminderQueue.set(appointmentId, reminders);

      // In a real implementation, you would store these in a database and use a job scheduler
      console.log(`Scheduled ${reminders.length} reminders for appointment ${appointmentId}`);

      // Schedule the actual sending (mock implementation)
      this.scheduleReminderExecution(reminders);

    } catch (error: any) {
      logError(handleError(error), `Failed to schedule reminders for appointment ${appointmentId}`);
      throw error;
    }
  }

  /**
   * Calculate when to send a reminder based on timing and business hours
   */
  private calculateReminderTime(
    appointmentTime: Date,
    timing: { days_before?: number; hours_before?: number; minutes_before?: number },
    businessHours: { start: string; end: string; timezone: string }
  ): Date {
    let reminderTime = new Date(appointmentTime);

    // Subtract the specified time
    if (timing.days_before) {
      reminderTime.setDate(reminderTime.getDate() - timing.days_before);
    }
    if (timing.hours_before) {
      reminderTime.setHours(reminderTime.getHours() - timing.hours_before);
    }
    if (timing.minutes_before) {
      reminderTime.setMinutes(reminderTime.getMinutes() - timing.minutes_before);
    }

    // Adjust to business hours if needed
    const [startHour, startMinute] = businessHours.start.split(':').map(Number);
    const [endHour, endMinute] = businessHours.end.split(':').map(Number);

    const reminderHour = reminderTime.getHours();
    const reminderMinute = reminderTime.getMinutes();

    // If reminder time is outside business hours, adjust it
    if (reminderHour < startHour || (reminderHour === startHour && reminderMinute < startMinute)) {
      // Too early - move to start of business hours
      reminderTime.setHours(startHour, startMinute, 0, 0);
    } else if (reminderHour > endHour || (reminderHour === endHour && reminderMinute > endMinute)) {
      // Too late - move to start of next business day
      reminderTime.setDate(reminderTime.getDate() + 1);
      reminderTime.setHours(startHour, startMinute, 0, 0);
    }

    return reminderTime;
  }

  /**
   * Schedule the actual execution of reminders (mock implementation)
   */
  private scheduleReminderExecution(reminders: ReminderExecution[]): void {
    reminders.forEach(reminder => {
      const delay = reminder.scheduledTime.getTime() - Date.now();
      
      if (delay > 0) {
        // In a real implementation, you would use a proper job scheduler like Bull, Agenda, or cron
        setTimeout(() => {
          this.sendReminder(reminder);
        }, Math.min(delay, 2147483647)); // Max setTimeout value
      }
    });
  }

  /**
   * Send a specific reminder
   */
  async sendReminder(reminder: ReminderExecution): Promise<void> {
    try {
      // Get fresh appointment and patient data
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          *,
          patients (*),
          users!appointments_dentist_id_fkey (first_name, last_name)
        `)
        .eq('id', reminder.appointmentId)
        .single();

      if (appointmentError || !appointment) {
        throw new Error(`Appointment not found: ${appointmentError?.message}`);
      }

      // Check if appointment is still valid (not cancelled)
      if (appointment.status === 'cancelled') {
        reminder.status = 'cancelled';
        console.log(`Reminder cancelled - appointment ${reminder.appointmentId} was cancelled`);
        return;
      }

      const patient = appointment.patients as any;
      const dentist = appointment.users as any;

      // Personalize message
      const message = this.personalizeReminderMessage(
        this.defaultSettings.templates[reminder.method],
        appointment,
        patient,
        dentist
      );

      let sendResult;

      // Send reminder based on method
      switch (reminder.method) {
        case 'sms':
          sendResult = await sendSMS({
            to: formatPhoneNumber(patient.phone),
            body: message,
          });
          break;

        case 'whatsapp':
          sendResult = await sendWhatsApp({
            to: formatPhoneNumber(patient.phone),
            body: message,
          });
          break;

        case 'email':
          // Email sending would be implemented here
          sendResult = { success: true, messageId: `email_${Date.now()}` };
          break;

        default:
          throw new Error(`Unsupported reminder method: ${reminder.method}`);
      }

      if (sendResult.success) {
        reminder.status = 'sent';
        reminder.sentTime = new Date();
        reminder.messageId = sendResult.messageId;

        console.log(`Reminder sent successfully: ${reminder.method} to ${patient.first_name} ${patient.last_name}`);
      } else {
        throw new Error(sendResult.error || 'Failed to send reminder');
      }

    } catch (error: any) {
      reminder.status = 'failed';
      reminder.error = error.message;

      logError(handleError(error), `Failed to send reminder for appointment ${reminder.appointmentId}`);
      console.error(`Reminder failed:`, error.message);
    }
  }

  /**
   * Personalize reminder message with appointment and patient data
   */
  private personalizeReminderMessage(
    template: string,
    appointment: any,
    patient: any,
    dentist: any
  ): string {
    const appointmentDate = new Date(appointment.start_time);
    const appointmentTime = appointmentDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    return template
      .replace(/\{firstName\}/g, patient.first_name)
      .replace(/\{lastName\}/g, patient.last_name)
      .replace(/\{fullName\}/g, `${patient.first_name} ${patient.last_name}`)
      .replace(/\{date\}/g, appointmentDate.toLocaleDateString())
      .replace(/\{time\}/g, appointmentTime)
      .replace(/\{dentist\}/g, dentist ? `Dr. ${dentist.first_name} ${dentist.last_name}` : 'your dentist')
      .replace(/\{clinicPhone\}/g, '+212 5 22 XX XX XX') // Replace with actual clinic phone
      .replace(/\{clinicAddress\}/g, 'Clinic Address') // Replace with actual clinic address
      .replace(/\{appointmentTitle\}/g, appointment.title || 'Dental Appointment');
  }

  /**
   * Cancel reminders for an appointment
   */
  async cancelReminders(appointmentId: string): Promise<void> {
    const reminders = this.reminderQueue.get(appointmentId);
    
    if (reminders) {
      reminders.forEach(reminder => {
        if (reminder.status === 'pending') {
          reminder.status = 'cancelled';
        }
      });

      console.log(`Cancelled reminders for appointment ${appointmentId}`);
    }
  }

  /**
   * Get reminder status for an appointment
   */
  getReminderStatus(appointmentId: string): ReminderExecution[] {
    return this.reminderQueue.get(appointmentId) || [];
  }

  /**
   * Process all pending reminders (called by scheduler)
   */
  async processPendingReminders(): Promise<void> {
    const now = new Date();
    
    for (const [appointmentId, reminders] of this.reminderQueue.entries()) {
      for (const reminder of reminders) {
        if (reminder.status === 'pending' && reminder.scheduledTime <= now) {
          await this.sendReminder(reminder);
        }
      }
    }
  }

  /**
   * Bulk schedule reminders for multiple appointments
   */
  async bulkScheduleReminders(appointmentIds: string[], settings?: Partial<ReminderSettings>): Promise<void> {
    const promises = appointmentIds.map(id => this.scheduleReminders(id, settings));
    await Promise.allSettled(promises);
  }

  /**
   * Get reminder statistics
   */
  getReminderStatistics(): {
    totalScheduled: number;
    totalSent: number;
    totalFailed: number;
    totalCancelled: number;
    byMethod: Record<string, number>;
  } {
    let totalScheduled = 0;
    let totalSent = 0;
    let totalFailed = 0;
    let totalCancelled = 0;
    const byMethod: Record<string, number> = {};

    for (const reminders of this.reminderQueue.values()) {
      for (const reminder of reminders) {
        totalScheduled++;
        
        switch (reminder.status) {
          case 'sent':
            totalSent++;
            break;
          case 'failed':
            totalFailed++;
            break;
          case 'cancelled':
            totalCancelled++;
            break;
        }

        byMethod[reminder.method] = (byMethod[reminder.method] || 0) + 1;
      }
    }

    return {
      totalScheduled,
      totalSent,
      totalFailed,
      totalCancelled,
      byMethod,
    };
  }
}

// Export singleton instance
export const reminderEngine = new AppointmentReminderEngine();

// Auto-schedule reminders when appointments are created/updated
export const setupAppointmentReminderTriggers = () => {
  // Listen for appointment changes
  const appointmentChannel = supabase
    .channel('appointment-reminders')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'appointments',
      },
      (payload) => {
        const appointment = payload.new as Appointment;
        
        // Only schedule reminders for future appointments
        if (new Date(appointment.start_time) > new Date()) {
          reminderEngine.scheduleReminders(appointment.id);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'appointments',
      },
      (payload) => {
        const appointment = payload.new as Appointment;
        
        // Cancel existing reminders and reschedule if appointment is still valid
        reminderEngine.cancelReminders(appointment.id);
        
        if (appointment.status !== 'cancelled' && new Date(appointment.start_time) > new Date()) {
          reminderEngine.scheduleReminders(appointment.id);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'appointments',
      },
      (payload) => {
        const appointment = payload.old as Appointment;
        reminderEngine.cancelReminders(appointment.id);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(appointmentChannel);
  };
};
