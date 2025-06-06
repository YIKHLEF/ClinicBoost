/**
 * Calendar Sync Integration System
 * 
 * This module provides comprehensive calendar synchronization including:
 * - Google Calendar integration
 * - Microsoft Outlook integration
 * - Apple iCloud Calendar integration
 * - CalDAV protocol support
 * - Two-way sync capabilities
 * - Conflict resolution
 * - Real-time updates
 */

import { logger } from '../logging-monitoring';
import { secureConfig } from '../config/secure-config';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees?: CalendarAttendee[];
  reminders?: CalendarReminder[];
  recurrence?: CalendarRecurrence;
  status: 'confirmed' | 'tentative' | 'cancelled';
  visibility: 'public' | 'private' | 'confidential';
  source: 'clinic' | 'external';
  externalId?: string;
  lastModified: Date;
  metadata?: Record<string, any>;
}

export interface CalendarAttendee {
  email: string;
  name?: string;
  status: 'accepted' | 'declined' | 'tentative' | 'needs-action';
  role: 'required' | 'optional' | 'chair';
}

export interface CalendarReminder {
  method: 'email' | 'popup' | 'sms';
  minutes: number;
}

export interface CalendarRecurrence {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: Date;
  count?: number;
  byDay?: string[];
  byMonth?: number[];
}

export interface CalendarProvider {
  id: string;
  name: string;
  type: 'google' | 'outlook' | 'icloud' | 'caldav';
  enabled: boolean;
  credentials?: Record<string, any>;
  settings: CalendarProviderSettings;
}

export interface CalendarProviderSettings {
  syncDirection: 'bidirectional' | 'clinic-to-external' | 'external-to-clinic';
  syncFrequency: number; // minutes
  conflictResolution: 'clinic-wins' | 'external-wins' | 'manual';
  categories: string[];
  autoCreateEvents: boolean;
  syncReminders: boolean;
  syncAttendees: boolean;
}

export interface SyncResult {
  success: boolean;
  eventsCreated: number;
  eventsUpdated: number;
  eventsDeleted: number;
  conflicts: CalendarConflict[];
  errors: string[];
  lastSyncTime: Date;
}

export interface CalendarConflict {
  id: string;
  clinicEvent: CalendarEvent;
  externalEvent: CalendarEvent;
  conflictType: 'time' | 'content' | 'deletion';
  resolution?: 'clinic-wins' | 'external-wins' | 'merge';
  resolved: boolean;
}

export class CalendarSyncManager {
  private providers: Map<string, CalendarProvider> = new Map();
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isInitialized = false;

  constructor() {
    this.setupDefaultProviders();
  }

  /**
   * Initialize calendar sync system
   */
  async initialize(): Promise<void> {
    try {
      await this.loadProviderConfigurations();
      await this.setupSyncSchedules();
      this.isInitialized = true;
      
      logger.info('Calendar sync system initialized', 'calendar-sync');
    } catch (error) {
      logger.error('Failed to initialize calendar sync system', 'calendar-sync', { error });
      throw error;
    }
  }

  /**
   * Setup default calendar providers
   */
  private setupDefaultProviders(): void {
    const defaultProviders: CalendarProvider[] = [
      {
        id: 'google-calendar',
        name: 'Google Calendar',
        type: 'google',
        enabled: false,
        settings: {
          syncDirection: 'bidirectional',
          syncFrequency: 15,
          conflictResolution: 'manual',
          categories: ['appointments', 'meetings'],
          autoCreateEvents: true,
          syncReminders: true,
          syncAttendees: true,
        },
      },
      {
        id: 'outlook-calendar',
        name: 'Microsoft Outlook',
        type: 'outlook',
        enabled: false,
        settings: {
          syncDirection: 'bidirectional',
          syncFrequency: 15,
          conflictResolution: 'manual',
          categories: ['appointments', 'meetings'],
          autoCreateEvents: true,
          syncReminders: true,
          syncAttendees: true,
        },
      },
      {
        id: 'icloud-calendar',
        name: 'Apple iCloud',
        type: 'icloud',
        enabled: false,
        settings: {
          syncDirection: 'bidirectional',
          syncFrequency: 30,
          conflictResolution: 'manual',
          categories: ['appointments'],
          autoCreateEvents: false,
          syncReminders: false,
          syncAttendees: false,
        },
      },
    ];

    defaultProviders.forEach(provider => {
      this.providers.set(provider.id, provider);
    });
  }

  /**
   * Load provider configurations from storage
   */
  private async loadProviderConfigurations(): Promise<void> {
    try {
      // In a real implementation, this would load from database
      const storedConfigs = localStorage.getItem('calendar-providers');
      if (storedConfigs) {
        const configs = JSON.parse(storedConfigs);
        Object.entries(configs).forEach(([id, config]) => {
          if (this.providers.has(id)) {
            this.providers.set(id, { ...this.providers.get(id)!, ...config });
          }
        });
      }
    } catch (error) {
      logger.error('Failed to load provider configurations', 'calendar-sync', { error });
    }
  }

  /**
   * Setup sync schedules for enabled providers
   */
  private async setupSyncSchedules(): Promise<void> {
    this.providers.forEach((provider, id) => {
      if (provider.enabled) {
        this.scheduleSyncForProvider(id);
      }
    });
  }

  /**
   * Schedule sync for a specific provider
   */
  private scheduleSyncForProvider(providerId: string): void {
    const provider = this.providers.get(providerId);
    if (!provider) return;

    // Clear existing interval
    const existingInterval = this.syncIntervals.get(providerId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Setup new interval
    const interval = setInterval(async () => {
      await this.syncProvider(providerId);
    }, provider.settings.syncFrequency * 60 * 1000);

    this.syncIntervals.set(providerId, interval);
  }

  /**
   * Configure calendar provider
   */
  async configureProvider(
    providerId: string,
    credentials: Record<string, any>,
    settings?: Partial<CalendarProviderSettings>
  ): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    try {
      // Validate credentials
      await this.validateProviderCredentials(provider.type, credentials);

      // Update provider configuration
      const updatedProvider: CalendarProvider = {
        ...provider,
        credentials,
        settings: { ...provider.settings, ...settings },
        enabled: true,
      };

      this.providers.set(providerId, updatedProvider);

      // Save configuration
      await this.saveProviderConfiguration(providerId, updatedProvider);

      // Setup sync schedule
      this.scheduleSyncForProvider(providerId);

      logger.info(`Calendar provider ${providerId} configured successfully`, 'calendar-sync');
    } catch (error) {
      logger.error(`Failed to configure provider ${providerId}`, 'calendar-sync', { error });
      throw error;
    }
  }

  /**
   * Validate provider credentials
   */
  private async validateProviderCredentials(
    type: CalendarProvider['type'],
    credentials: Record<string, any>
  ): Promise<void> {
    switch (type) {
      case 'google':
        await this.validateGoogleCredentials(credentials);
        break;
      case 'outlook':
        await this.validateOutlookCredentials(credentials);
        break;
      case 'icloud':
        await this.validateiCloudCredentials(credentials);
        break;
      case 'caldav':
        await this.validateCalDAVCredentials(credentials);
        break;
      default:
        throw new Error(`Unsupported provider type: ${type}`);
    }
  }

  /**
   * Validate Google Calendar credentials
   */
  private async validateGoogleCredentials(credentials: Record<string, any>): Promise<void> {
    if (!credentials.accessToken && !credentials.refreshToken) {
      throw new Error('Google Calendar requires access token or refresh token');
    }

    try {
      // Test API call to validate credentials
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Invalid Google Calendar credentials');
      }
    } catch (error) {
      throw new Error(`Google Calendar validation failed: ${error}`);
    }
  }

  /**
   * Validate Outlook credentials
   */
  private async validateOutlookCredentials(credentials: Record<string, any>): Promise<void> {
    if (!credentials.accessToken) {
      throw new Error('Outlook requires access token');
    }

    try {
      // Test API call to validate credentials
      const response = await fetch('https://graph.microsoft.com/v1.0/me/calendars', {
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Invalid Outlook credentials');
      }
    } catch (error) {
      throw new Error(`Outlook validation failed: ${error}`);
    }
  }

  /**
   * Validate iCloud credentials
   */
  private async validateiCloudCredentials(credentials: Record<string, any>): Promise<void> {
    if (!credentials.username || !credentials.password) {
      throw new Error('iCloud requires username and password');
    }

    // iCloud validation would require CalDAV protocol implementation
    // For now, we'll do basic validation
    if (credentials.username.length === 0 || credentials.password.length === 0) {
      throw new Error('Invalid iCloud credentials');
    }
  }

  /**
   * Validate CalDAV credentials
   */
  private async validateCalDAVCredentials(credentials: Record<string, any>): Promise<void> {
    if (!credentials.url || !credentials.username || !credentials.password) {
      throw new Error('CalDAV requires URL, username, and password');
    }

    try {
      // Test CalDAV connection
      const response = await fetch(credentials.url, {
        method: 'PROPFIND',
        headers: {
          'Authorization': `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`,
          'Content-Type': 'application/xml',
          'Depth': '0',
        },
      });

      if (!response.ok) {
        throw new Error('Invalid CalDAV credentials');
      }
    } catch (error) {
      throw new Error(`CalDAV validation failed: ${error}`);
    }
  }

  /**
   * Sync events with a specific provider
   */
  async syncProvider(providerId: string): Promise<SyncResult> {
    const provider = this.providers.get(providerId);
    if (!provider || !provider.enabled) {
      throw new Error(`Provider ${providerId} not found or disabled`);
    }

    try {
      logger.info(`Starting sync for provider ${providerId}`, 'calendar-sync');

      let result: SyncResult;

      switch (provider.type) {
        case 'google':
          result = await this.syncGoogleCalendar(provider);
          break;
        case 'outlook':
          result = await this.syncOutlookCalendar(provider);
          break;
        case 'icloud':
          result = await this.synciCloudCalendar(provider);
          break;
        case 'caldav':
          result = await this.syncCalDAVCalendar(provider);
          break;
        default:
          throw new Error(`Unsupported provider type: ${provider.type}`);
      }

      logger.info(`Sync completed for provider ${providerId}`, 'calendar-sync', {
        eventsCreated: result.eventsCreated,
        eventsUpdated: result.eventsUpdated,
        eventsDeleted: result.eventsDeleted,
        conflicts: result.conflicts.length,
      });

      return result;
    } catch (error) {
      logger.error(`Sync failed for provider ${providerId}`, 'calendar-sync', { error });
      throw error;
    }
  }

  /**
   * Sync with Google Calendar
   */
  private async syncGoogleCalendar(provider: CalendarProvider): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
      conflicts: [],
      errors: [],
      lastSyncTime: new Date(),
    };

    try {
      // Get events from Google Calendar
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        headers: {
          'Authorization': `Bearer ${provider.credentials?.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${response.statusText}`);
      }

      const data = await response.json();
      const externalEvents = data.items?.map(this.convertGoogleEvent) || [];

      // Get clinic events
      const clinicEvents = await this.getClinicEvents();

      // Perform sync based on direction
      if (provider.settings.syncDirection === 'bidirectional' || 
          provider.settings.syncDirection === 'external-to-clinic') {
        await this.syncExternalToClinic(externalEvents, clinicEvents, result);
      }

      if (provider.settings.syncDirection === 'bidirectional' || 
          provider.settings.syncDirection === 'clinic-to-external') {
        await this.syncClinicToExternal(clinicEvents, externalEvents, provider, result);
      }

      result.success = true;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
    }

    return result;
  }

  /**
   * Sync with Outlook Calendar
   */
  private async syncOutlookCalendar(provider: CalendarProvider): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
      conflicts: [],
      errors: [],
      lastSyncTime: new Date(),
    };

    try {
      // Get events from Outlook
      const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
        headers: {
          'Authorization': `Bearer ${provider.credentials?.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Outlook API error: ${response.statusText}`);
      }

      const data = await response.json();
      const externalEvents = data.value?.map(this.convertOutlookEvent) || [];

      // Get clinic events
      const clinicEvents = await this.getClinicEvents();

      // Perform sync
      if (provider.settings.syncDirection === 'bidirectional' || 
          provider.settings.syncDirection === 'external-to-clinic') {
        await this.syncExternalToClinic(externalEvents, clinicEvents, result);
      }

      if (provider.settings.syncDirection === 'bidirectional' || 
          provider.settings.syncDirection === 'clinic-to-external') {
        await this.syncClinicToExternal(clinicEvents, externalEvents, provider, result);
      }

      result.success = true;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
    }

    return result;
  }

  /**
   * Sync with iCloud Calendar
   */
  private async synciCloudCalendar(provider: CalendarProvider): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
      conflicts: [],
      errors: [],
      lastSyncTime: new Date(),
    };

    try {
      // iCloud uses CalDAV protocol
      const calDAVUrl = provider.credentials?.calDAVUrl || 'https://caldav.icloud.com';
      const username = provider.credentials?.username;
      const password = provider.credentials?.password;

      if (!username || !password) {
        throw new Error('iCloud requires username and password');
      }

      // Fetch calendar data using CalDAV
      const response = await fetch(`${calDAVUrl}/calendar`, {
        method: 'PROPFIND',
        headers: {
          'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
          'Content-Type': 'application/xml',
          'Depth': '1',
        },
        body: `<?xml version="1.0" encoding="utf-8" ?>
          <D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
            <D:prop>
              <D:displayname />
              <C:calendar-data />
            </D:prop>
          </D:propfind>`,
      });

      if (!response.ok) {
        throw new Error(`iCloud CalDAV error: ${response.statusText}`);
      }

      // Parse CalDAV response and convert to events
      const calDAVData = await response.text();
      const externalEvents = this.parseCalDAVEvents(calDAVData);

      // Get clinic events
      const clinicEvents = await this.getClinicEvents();

      // Perform sync based on direction
      if (provider.settings.syncDirection === 'bidirectional' ||
          provider.settings.syncDirection === 'external-to-clinic') {
        await this.syncExternalToClinic(externalEvents, clinicEvents, result);
      }

      if (provider.settings.syncDirection === 'bidirectional' ||
          provider.settings.syncDirection === 'clinic-to-external') {
        await this.syncClinicToExternal(clinicEvents, externalEvents, provider, result);
      }

      result.success = true;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
    }

    return result;
  }

  /**
   * Sync with CalDAV Calendar
   */
  private async syncCalDAVCalendar(provider: CalendarProvider): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
      conflicts: [],
      errors: [],
      lastSyncTime: new Date(),
    };

    try {
      const calDAVUrl = provider.credentials?.url;
      const username = provider.credentials?.username;
      const password = provider.credentials?.password;

      if (!calDAVUrl || !username || !password) {
        throw new Error('CalDAV requires URL, username, and password');
      }

      // Fetch calendar data using CalDAV PROPFIND
      const response = await fetch(calDAVUrl, {
        method: 'PROPFIND',
        headers: {
          'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
          'Content-Type': 'application/xml',
          'Depth': '1',
        },
        body: `<?xml version="1.0" encoding="utf-8" ?>
          <D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
            <D:prop>
              <D:displayname />
              <C:calendar-data />
            </D:prop>
          </D:propfind>`,
      });

      if (!response.ok) {
        throw new Error(`CalDAV error: ${response.statusText}`);
      }

      // Parse CalDAV response
      const calDAVData = await response.text();
      const externalEvents = this.parseCalDAVEvents(calDAVData);

      // Get clinic events
      const clinicEvents = await this.getClinicEvents();

      // Perform sync based on direction
      if (provider.settings.syncDirection === 'bidirectional' ||
          provider.settings.syncDirection === 'external-to-clinic') {
        await this.syncExternalToClinic(externalEvents, clinicEvents, result);
      }

      if (provider.settings.syncDirection === 'bidirectional' ||
          provider.settings.syncDirection === 'clinic-to-external') {
        await this.syncClinicToExternal(clinicEvents, externalEvents, provider, result);
      }

      result.success = true;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
    }

    return result;
  }

  /**
   * Convert Google Calendar event to internal format
   */
  private convertGoogleEvent = (googleEvent: any): CalendarEvent => {
    return {
      id: `google-${googleEvent.id}`,
      title: googleEvent.summary || 'Untitled Event',
      description: googleEvent.description,
      startTime: new Date(googleEvent.start?.dateTime || googleEvent.start?.date),
      endTime: new Date(googleEvent.end?.dateTime || googleEvent.end?.date),
      location: googleEvent.location,
      attendees: googleEvent.attendees?.map((attendee: any) => ({
        email: attendee.email,
        name: attendee.displayName,
        status: attendee.responseStatus,
        role: attendee.optional ? 'optional' : 'required',
      })),
      status: googleEvent.status === 'cancelled' ? 'cancelled' : 'confirmed',
      visibility: googleEvent.visibility || 'public',
      source: 'external',
      externalId: googleEvent.id,
      lastModified: new Date(googleEvent.updated),
    };
  };

  /**
   * Convert Outlook event to internal format
   */
  private convertOutlookEvent = (outlookEvent: any): CalendarEvent => {
    return {
      id: `outlook-${outlookEvent.id}`,
      title: outlookEvent.subject || 'Untitled Event',
      description: outlookEvent.body?.content,
      startTime: new Date(outlookEvent.start?.dateTime),
      endTime: new Date(outlookEvent.end?.dateTime),
      location: outlookEvent.location?.displayName,
      attendees: outlookEvent.attendees?.map((attendee: any) => ({
        email: attendee.emailAddress?.address,
        name: attendee.emailAddress?.name,
        status: attendee.status?.response,
        role: attendee.type === 'required' ? 'required' : 'optional',
      })),
      status: outlookEvent.isCancelled ? 'cancelled' : 'confirmed',
      visibility: outlookEvent.sensitivity === 'private' ? 'private' : 'public',
      source: 'external',
      externalId: outlookEvent.id,
      lastModified: new Date(outlookEvent.lastModifiedDateTime),
    };
  };

  /**
   * Get clinic events from database
   */
  private async getClinicEvents(): Promise<CalendarEvent[]> {
    try {
      // Import supabase here to avoid circular dependencies
      const { supabase } = await import('../supabase');

      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          id,
          title,
          description,
          start_time,
          end_time,
          status,
          notes,
          patients (first_name, last_name),
          users (first_name, last_name)
        `)
        .gte('start_time', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .lte('start_time', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()); // Next 90 days

      if (error) {
        logger.error('Failed to fetch clinic events', 'calendar-sync', { error });
        return [];
      }

      return appointments?.map(appointment => ({
        id: appointment.id,
        title: appointment.title,
        description: appointment.description || '',
        startTime: new Date(appointment.start_time),
        endTime: new Date(appointment.end_time),
        status: appointment.status === 'cancelled' ? 'cancelled' : 'confirmed',
        visibility: 'public',
        source: 'clinic',
        lastModified: new Date(),
        metadata: {
          appointmentId: appointment.id,
          patientName: appointment.patients ?
            `${appointment.patients.first_name} ${appointment.patients.last_name}` : '',
          providerName: appointment.users ?
            `${appointment.users.first_name} ${appointment.users.last_name}` : '',
        },
      })) || [];
    } catch (error) {
      logger.error('Error fetching clinic events', 'calendar-sync', { error });
      return [];
    }
  }

  /**
   * Sync external events to clinic
   */
  private async syncExternalToClinic(
    externalEvents: CalendarEvent[],
    clinicEvents: CalendarEvent[],
    result: SyncResult
  ): Promise<void> {
    try {
      const { supabase } = await import('../supabase');

      for (const externalEvent of externalEvents) {
        // Check if event already exists in clinic
        const existingEvent = clinicEvents.find(ce =>
          ce.externalId === externalEvent.id ||
          (ce.title === externalEvent.title &&
           Math.abs(ce.startTime.getTime() - externalEvent.startTime.getTime()) < 60000) // Within 1 minute
        );

        if (existingEvent) {
          // Update existing event if external is newer
          if (externalEvent.lastModified > existingEvent.lastModified) {
            const { error } = await supabase
              .from('appointments')
              .update({
                title: externalEvent.title,
                description: externalEvent.description,
                start_time: externalEvent.startTime.toISOString(),
                end_time: externalEvent.endTime.toISOString(),
                status: externalEvent.status === 'cancelled' ? 'cancelled' : 'scheduled',
                notes: `Synced from external calendar: ${externalEvent.description || ''}`,
              })
              .eq('id', existingEvent.metadata?.appointmentId);

            if (!error) {
              result.eventsUpdated++;
            } else {
              result.errors.push(`Failed to update event: ${error.message}`);
            }
          }
        } else {
          // Create new appointment from external event
          const { error } = await supabase
            .from('appointments')
            .insert({
              title: externalEvent.title,
              description: externalEvent.description,
              start_time: externalEvent.startTime.toISOString(),
              end_time: externalEvent.endTime.toISOString(),
              status: externalEvent.status === 'cancelled' ? 'cancelled' : 'scheduled',
              notes: `Synced from external calendar: ${externalEvent.description || ''}`,
            });

          if (!error) {
            result.eventsCreated++;
          } else {
            result.errors.push(`Failed to create event: ${error.message}`);
          }
        }
      }
    } catch (error) {
      logger.error('Error syncing external events to clinic', 'calendar-sync', { error });
      result.errors.push(`Sync error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Sync clinic events to external
   */
  private async syncClinicToExternal(
    clinicEvents: CalendarEvent[],
    externalEvents: CalendarEvent[],
    provider: CalendarProvider,
    result: SyncResult
  ): Promise<void> {
    try {
      for (const clinicEvent of clinicEvents) {
        // Check if event already exists in external calendar
        const existingEvent = externalEvents.find(ee =>
          ee.externalId === clinicEvent.id ||
          (ee.title === clinicEvent.title &&
           Math.abs(ee.startTime.getTime() - clinicEvent.startTime.getTime()) < 60000)
        );

        if (existingEvent) {
          // Update existing external event if clinic is newer
          if (clinicEvent.lastModified > existingEvent.lastModified) {
            await this.updateExternalEvent(provider, existingEvent.externalId!, clinicEvent);
            result.eventsUpdated++;
          }
        } else {
          // Create new external event
          await this.createExternalEvent(provider, clinicEvent);
          result.eventsCreated++;
        }
      }
    } catch (error) {
      logger.error('Error syncing clinic events to external', 'calendar-sync', { error });
      result.errors.push(`Sync error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create event in external calendar
   */
  private async createExternalEvent(provider: CalendarProvider, event: CalendarEvent): Promise<void> {
    switch (provider.type) {
      case 'google':
        await this.createGoogleEvent(provider, event);
        break;
      case 'outlook':
        await this.createOutlookEvent(provider, event);
        break;
      case 'icloud':
      case 'caldav':
        await this.createCalDAVEvent(provider, event);
        break;
    }
  }

  /**
   * Update event in external calendar
   */
  private async updateExternalEvent(provider: CalendarProvider, eventId: string, event: CalendarEvent): Promise<void> {
    switch (provider.type) {
      case 'google':
        await this.updateGoogleEvent(provider, eventId, event);
        break;
      case 'outlook':
        await this.updateOutlookEvent(provider, eventId, event);
        break;
      case 'icloud':
      case 'caldav':
        await this.updateCalDAVEvent(provider, eventId, event);
        break;
    }
  }

  /**
   * Parse CalDAV events from XML response
   */
  private parseCalDAVEvents(calDAVData: string): CalendarEvent[] {
    const events: CalendarEvent[] = [];

    try {
      // This is a simplified parser - in production, use DOMParser or xml2js
      const eventMatches = calDAVData.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];

      eventMatches.forEach((eventData, index) => {
        const summary = eventData.match(/SUMMARY:(.*)/)?.[1] || 'Untitled Event';
        const description = eventData.match(/DESCRIPTION:(.*)/)?.[1] || '';
        const dtStart = eventData.match(/DTSTART:(.*)/)?.[1];
        const dtEnd = eventData.match(/DTEND:(.*)/)?.[1];
        const uid = eventData.match(/UID:(.*)/)?.[1] || `caldav-${index}`;

        if (dtStart && dtEnd) {
          events.push({
            id: uid,
            title: summary,
            description,
            startTime: this.parseCalDAVDate(dtStart),
            endTime: this.parseCalDAVDate(dtEnd),
            status: 'confirmed',
            visibility: 'public',
            source: 'external',
            externalId: uid,
            lastModified: new Date(),
          });
        }
      });
    } catch (error) {
      logger.error('Failed to parse CalDAV events', 'calendar-sync', { error });
    }

    return events;
  }

  /**
   * Parse CalDAV date format
   */
  private parseCalDAVDate(dateStr: string): Date {
    // CalDAV dates are typically in format: 20231201T120000Z
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1; // Month is 0-indexed
    const day = parseInt(dateStr.substring(6, 8));
    const hour = parseInt(dateStr.substring(9, 11));
    const minute = parseInt(dateStr.substring(11, 13));
    const second = parseInt(dateStr.substring(13, 15));

    return new Date(Date.UTC(year, month, day, hour, minute, second));
  }

  /**
   * Create Google Calendar event
   */
  private async createGoogleEvent(provider: CalendarProvider, event: CalendarEvent): Promise<void> {
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.credentials?.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: event.title,
        description: event.description,
        start: { dateTime: event.startTime.toISOString() },
        end: { dateTime: event.endTime.toISOString() },
        status: event.status === 'cancelled' ? 'cancelled' : 'confirmed',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create Google event: ${response.statusText}`);
    }
  }

  /**
   * Update Google Calendar event
   */
  private async updateGoogleEvent(provider: CalendarProvider, eventId: string, event: CalendarEvent): Promise<void> {
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${provider.credentials?.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: event.title,
        description: event.description,
        start: { dateTime: event.startTime.toISOString() },
        end: { dateTime: event.endTime.toISOString() },
        status: event.status === 'cancelled' ? 'cancelled' : 'confirmed',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update Google event: ${response.statusText}`);
    }
  }

  /**
   * Create Outlook event
   */
  private async createOutlookEvent(provider: CalendarProvider, event: CalendarEvent): Promise<void> {
    const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.credentials?.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject: event.title,
        body: { content: event.description, contentType: 'text' },
        start: { dateTime: event.startTime.toISOString(), timeZone: 'UTC' },
        end: { dateTime: event.endTime.toISOString(), timeZone: 'UTC' },
        isCancelled: event.status === 'cancelled',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create Outlook event: ${response.statusText}`);
    }
  }

  /**
   * Update Outlook event
   */
  private async updateOutlookEvent(provider: CalendarProvider, eventId: string, event: CalendarEvent): Promise<void> {
    const response = await fetch(`https://graph.microsoft.com/v1.0/me/events/${eventId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${provider.credentials?.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject: event.title,
        body: { content: event.description, contentType: 'text' },
        start: { dateTime: event.startTime.toISOString(), timeZone: 'UTC' },
        end: { dateTime: event.endTime.toISOString(), timeZone: 'UTC' },
        isCancelled: event.status === 'cancelled',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update Outlook event: ${response.statusText}`);
    }
  }

  /**
   * Create CalDAV event
   */
  private async createCalDAVEvent(provider: CalendarProvider, event: CalendarEvent): Promise<void> {
    const calDAVUrl = provider.credentials?.url || provider.credentials?.calDAVUrl;
    const username = provider.credentials?.username;
    const password = provider.credentials?.password;

    if (!calDAVUrl || !username || !password) {
      throw new Error('CalDAV credentials not configured');
    }

    const icalData = this.convertToICalFormat(event);
    const eventUrl = `${calDAVUrl}/${event.id}.ics`;

    const response = await fetch(eventUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
        'Content-Type': 'text/calendar',
      },
      body: icalData,
    });

    if (!response.ok) {
      throw new Error(`Failed to create CalDAV event: ${response.statusText}`);
    }
  }

  /**
   * Update CalDAV event
   */
  private async updateCalDAVEvent(provider: CalendarProvider, eventId: string, event: CalendarEvent): Promise<void> {
    // For CalDAV, update is the same as create with PUT
    await this.createCalDAVEvent(provider, { ...event, id: eventId });
  }

  /**
   * Convert event to iCal format
   */
  private convertToICalFormat(event: CalendarEvent): string {
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ClinicBoost//Calendar Sync//EN
BEGIN:VEVENT
UID:${event.id}
DTSTART:${formatDate(event.startTime)}
DTEND:${formatDate(event.endTime)}
SUMMARY:${event.title}
DESCRIPTION:${event.description || ''}
STATUS:${event.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}
LAST-MODIFIED:${formatDate(event.lastModified)}
END:VEVENT
END:VCALENDAR`;
  }

  /**
   * Save provider configuration
   */
  private async saveProviderConfiguration(
    providerId: string,
    provider: CalendarProvider
  ): Promise<void> {
    try {
      const configs = JSON.parse(localStorage.getItem('calendar-providers') || '{}');
      configs[providerId] = provider;
      localStorage.setItem('calendar-providers', JSON.stringify(configs));
    } catch (error) {
      logger.error('Failed to save provider configuration', 'calendar-sync', { error });
    }
  }

  /**
   * Get all providers
   */
  getProviders(): CalendarProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Toggle provider enabled/disabled
   */
  async toggleProvider(providerId: string, enabled: boolean): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    const updatedProvider = { ...provider, enabled };
    this.providers.set(providerId, updatedProvider);

    // Save configuration
    await this.saveProviderConfiguration(providerId, updatedProvider);

    if (enabled && provider.settings.syncFrequency > 0) {
      this.scheduleSyncForProvider(providerId);
    } else {
      // Clear sync interval if disabled
      const interval = this.syncIntervals.get(providerId);
      if (interval) {
        clearInterval(interval);
        this.syncIntervals.delete(providerId);
      }
    }

    logger.info(`Calendar provider ${providerId} ${enabled ? 'enabled' : 'disabled'}`, 'calendar-sync');
  }

  /**
   * Get provider by ID
   */
  getProvider(providerId: string): CalendarProvider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Test connection to provider
   */
  async testConnection(providerId: string): Promise<boolean> {
    const provider = this.providers.get(providerId);
    if (!provider || !provider.credentials) {
      return false;
    }

    try {
      await this.validateProviderCredentials(provider.type, provider.credentials);
      return true;
    } catch (error) {
      logger.error(`Connection test failed for provider ${providerId}`, 'calendar-sync', { error });
      return false;
    }
  }

  /**
   * Get provider by ID
   */
  getProvider(providerId: string): CalendarProvider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Enable/disable provider
   */
  async toggleProvider(providerId: string, enabled: boolean): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    provider.enabled = enabled;
    this.providers.set(providerId, provider);

    if (enabled) {
      this.scheduleSyncForProvider(providerId);
    } else {
      const interval = this.syncIntervals.get(providerId);
      if (interval) {
        clearInterval(interval);
        this.syncIntervals.delete(providerId);
      }
    }

    await this.saveProviderConfiguration(providerId, provider);
  }

  /**
   * Manual sync trigger
   */
  async triggerSync(providerId?: string): Promise<SyncResult[]> {
    if (providerId) {
      return [await this.syncProvider(providerId)];
    }

    const results: SyncResult[] = [];
    for (const [id, provider] of this.providers) {
      if (provider.enabled) {
        try {
          const result = await this.syncProvider(id);
          results.push(result);
        } catch (error) {
          logger.error(`Failed to sync provider ${id}`, 'calendar-sync', { error });
        }
      }
    }

    return results;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.syncIntervals.forEach(interval => clearInterval(interval));
    this.syncIntervals.clear();
    this.providers.clear();
    this.isInitialized = false;
  }
}

// Export singleton instance
export const calendarSync = new CalendarSyncManager();

// Export utility functions
export const initializeCalendarSync = () => calendarSync.initialize();
export const configureCalendarProvider = (providerId: string, credentials: Record<string, any>, settings?: Partial<CalendarProviderSettings>) =>
  calendarSync.configureProvider(providerId, credentials, settings);
export const syncCalendarProvider = (providerId: string) => calendarSync.syncProvider(providerId);
export const getCalendarProviders = () => calendarSync.getProviders();
export const triggerCalendarSync = (providerId?: string) => calendarSync.triggerSync(providerId);
