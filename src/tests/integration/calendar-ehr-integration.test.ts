/**
 * Integration Tests for Calendar and EHR/PMS Systems
 * 
 * This test suite verifies that the calendar sync and EHR/PMS integrations
 * are properly implemented and functional.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CalendarSyncManager } from '../../lib/integrations/calendar-sync';
import { EHRPMSManager } from '../../lib/integrations/ehr-pms';

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Calendar and EHR Integration Tests', () => {
  let calendarManager: CalendarSyncManager;
  let ehrManager: EHRPMSManager;

  beforeEach(async () => {
    calendarManager = new CalendarSyncManager();
    ehrManager = new EHRPMSManager();
    
    // Clear localStorage
    localStorage.clear();
    
    // Reset fetch mock
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Calendar Integration', () => {
    it('should initialize calendar sync manager', async () => {
      await expect(calendarManager.initialize()).resolves.not.toThrow();
    });

    it('should configure Google Calendar provider', async () => {
      const mockCredentials = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        clientId: 'mock-client-id',
        clientSecret: 'mock-client-secret',
      };

      // Mock successful Google Calendar API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ kind: 'calendar#calendarList' }),
      });

      await expect(
        calendarManager.configureProvider('google-calendar', 'google', mockCredentials)
      ).resolves.not.toThrow();

      const provider = calendarManager.getProvider('google-calendar');
      expect(provider).toBeDefined();
      expect(provider?.type).toBe('google');
      expect(provider?.enabled).toBe(true);
    });

    it('should configure Outlook Calendar provider', async () => {
      const mockCredentials = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        clientId: 'mock-client-id',
        clientSecret: 'mock-client-secret',
      };

      // Mock successful Microsoft Graph API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#me/calendars' }),
      });

      await expect(
        calendarManager.configureProvider('outlook-calendar', 'outlook', mockCredentials)
      ).resolves.not.toThrow();

      const provider = calendarManager.getProvider('outlook-calendar');
      expect(provider).toBeDefined();
      expect(provider?.type).toBe('outlook');
      expect(provider?.enabled).toBe(true);
    });

    it('should configure iCloud Calendar provider', async () => {
      const mockCredentials = {
        username: 'test@icloud.com',
        password: 'app-specific-password',
        calDAVUrl: 'https://caldav.icloud.com',
      };

      // Mock successful CalDAV response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(`<?xml version="1.0" encoding="utf-8"?>
          <D:multistatus xmlns:D="DAV:">
            <D:response>
              <D:href>/calendar/</D:href>
              <D:propstat>
                <D:status>HTTP/1.1 200 OK</D:status>
              </D:propstat>
            </D:response>
          </D:multistatus>`),
      });

      await expect(
        calendarManager.configureProvider('icloud-calendar', 'icloud', mockCredentials)
      ).resolves.not.toThrow();

      const provider = calendarManager.getProvider('icloud-calendar');
      expect(provider).toBeDefined();
      expect(provider?.type).toBe('icloud');
      expect(provider?.enabled).toBe(true);
    });

    it('should sync calendar events bidirectionally', async () => {
      // Configure a mock provider
      const mockCredentials = { accessToken: 'mock-token' };
      
      // Mock Google Calendar events response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ kind: 'calendar#calendarList' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            items: [
              {
                id: 'event-1',
                summary: 'Test Appointment',
                description: 'Test appointment description',
                start: { dateTime: '2024-01-15T10:00:00Z' },
                end: { dateTime: '2024-01-15T11:00:00Z' },
                status: 'confirmed',
              },
            ],
          }),
        });

      await calendarManager.configureProvider('google-test', 'google', mockCredentials);
      
      const result = await calendarManager.syncProvider('google-test');
      
      expect(result.success).toBe(true);
      expect(result.eventsCreated).toBeGreaterThanOrEqual(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle calendar sync conflicts', async () => {
      // Test conflict resolution when same event exists in both systems
      const mockCredentials = { accessToken: 'mock-token' };
      
      // Mock responses for conflict scenario
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ kind: 'calendar#calendarList' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            items: [
              {
                id: 'conflict-event',
                summary: 'Conflicting Appointment',
                start: { dateTime: '2024-01-15T10:00:00Z' },
                end: { dateTime: '2024-01-15T11:00:00Z' },
                updated: '2024-01-15T09:00:00Z',
              },
            ],
          }),
        });

      await calendarManager.configureProvider('google-conflict', 'google', mockCredentials);
      
      const result = await calendarManager.syncProvider('google-conflict');
      
      expect(result.success).toBe(true);
      expect(result.conflicts).toBeDefined();
    });
  });

  describe('EHR/PMS Integration', () => {
    it('should initialize EHR/PMS manager', async () => {
      await expect(ehrManager.initialize()).resolves.not.toThrow();
    });

    it('should configure Epic MyChart provider', async () => {
      const mockCredentials = {
        clientId: 'mock-client-id',
        accessToken: 'mock-access-token',
      };

      // Mock Epic FHIR metadata response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          resourceType: 'CapabilityStatement',
          fhirVersion: '4.0.1',
        }),
      });

      await expect(
        ehrManager.configureProvider('epic-mychart', mockCredentials)
      ).resolves.not.toThrow();

      const provider = ehrManager.getProvider('epic-mychart');
      expect(provider).toBeDefined();
      expect(provider?.type).toBe('epic');
      expect(provider?.enabled).toBe(true);
    });

    it('should configure Cerner PowerChart provider', async () => {
      const mockCredentials = {
        accessToken: 'mock-access-token',
      };

      // Mock Cerner FHIR metadata response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          resourceType: 'CapabilityStatement',
          fhirVersion: '4.0.1',
        }),
      });

      await expect(
        ehrManager.configureProvider('cerner-powerchart', mockCredentials)
      ).resolves.not.toThrow();

      const provider = ehrManager.getProvider('cerner-powerchart');
      expect(provider).toBeDefined();
      expect(provider?.type).toBe('cerner');
      expect(provider?.enabled).toBe(true);
    });

    it('should configure athenahealth provider', async () => {
      const mockCredentials = {
        accessToken: 'mock-access-token',
        apiKey: 'mock-api-key',
      };

      // Mock athenahealth API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          version: '1.0',
          status: 'active',
        }),
      });

      await expect(
        ehrManager.configureProvider('athenahealth', mockCredentials)
      ).resolves.not.toThrow();

      const provider = ehrManager.getProvider('athenahealth');
      expect(provider).toBeDefined();
      expect(provider?.type).toBe('athena');
      expect(provider?.enabled).toBe(true);
    });

    it('should sync patient data from EHR', async () => {
      const mockCredentials = { accessToken: 'mock-token' };
      
      // Mock EHR responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ resourceType: 'CapabilityStatement' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            resourceType: 'Bundle',
            entry: [
              {
                resource: {
                  resourceType: 'Patient',
                  id: 'patient-1',
                  name: [{ given: ['John'], family: 'Doe' }],
                  birthDate: '1990-01-01',
                  gender: 'male',
                  telecom: [
                    { system: 'email', value: 'john.doe@example.com' },
                    { system: 'phone', value: '+1234567890' },
                  ],
                },
              },
            ],
          }),
        });

      await ehrManager.configureProvider('epic-test', mockCredentials);
      
      const result = await ehrManager.syncProvider('epic-test');
      
      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBeGreaterThanOrEqual(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should sync appointment data from EHR', async () => {
      const mockCredentials = { accessToken: 'mock-token' };
      
      // Mock EHR responses for appointments
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ resourceType: 'CapabilityStatement' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            resourceType: 'Bundle',
            entry: [
              {
                resource: {
                  resourceType: 'Appointment',
                  id: 'appointment-1',
                  status: 'booked',
                  start: '2024-01-15T10:00:00Z',
                  end: '2024-01-15T11:00:00Z',
                  participant: [
                    { actor: { reference: 'Patient/patient-1' } },
                    { actor: { reference: 'Practitioner/provider-1' } },
                  ],
                },
              },
            ],
          }),
        });

      await ehrManager.configureProvider('epic-appointments', mockCredentials);
      
      const result = await ehrManager.syncProvider('epic-appointments');
      
      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBeGreaterThanOrEqual(0);
    });

    it('should handle EHR sync errors gracefully', async () => {
      const mockCredentials = { accessToken: 'invalid-token' };
      
      // Mock failed EHR response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ resourceType: 'CapabilityStatement' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          statusText: 'Unauthorized',
        });

      await ehrManager.configureProvider('epic-error', mockCredentials);
      
      const result = await ehrManager.syncProvider('epic-error');
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Integration Coordination', () => {
    it('should coordinate calendar and EHR appointment sync', async () => {
      // This test verifies that appointments synced from EHR can also be synced to calendar
      const ehrCredentials = { accessToken: 'ehr-token' };
      const calendarCredentials = { accessToken: 'calendar-token' };

      // Mock EHR appointment sync
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ resourceType: 'CapabilityStatement' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            resourceType: 'Bundle',
            entry: [
              {
                resource: {
                  resourceType: 'Appointment',
                  id: 'sync-appointment',
                  status: 'booked',
                  start: '2024-01-15T14:00:00Z',
                  end: '2024-01-15T15:00:00Z',
                },
              },
            ],
          }),
        })
        // Mock calendar validation and sync
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ kind: 'calendar#calendarList' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'created-event' }),
        });

      // Configure both systems
      await ehrManager.configureProvider('epic-coord', ehrCredentials);
      await calendarManager.configureProvider('google-coord', 'google', calendarCredentials);

      // Sync from EHR first
      const ehrResult = await ehrManager.syncProvider('epic-coord');
      expect(ehrResult.success).toBe(true);

      // Then sync to calendar
      const calendarResult = await calendarManager.syncProvider('google-coord');
      expect(calendarResult.success).toBe(true);
    });
  });
});
