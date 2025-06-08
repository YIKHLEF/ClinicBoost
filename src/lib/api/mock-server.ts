/**
 * Mock API Server for Development
 * Provides mock endpoints when no backend is available
 */

import { logger } from '../logging-monitoring';

interface MockResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

class MockAPIServer {
  private isEnabled = false;

  constructor() {
    // Enable mock server in development when no backend is available
    this.isEnabled = import.meta.env.DEV && !import.meta.env.VITE_API_URL;

    if (this.isEnabled) {
      this.setupMockEndpoints();
      console.log('🔧 Mock API server enabled for development');
      logger.info('Mock API server enabled for development', 'mock-api');
    } else if (import.meta.env.VITE_API_URL) {
      console.log('🌐 Using real API server:', import.meta.env.VITE_API_URL);
    }
  }

  private setupMockEndpoints() {
    // Intercept fetch requests to API endpoints
    const originalFetch = window.fetch;
    
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.toString();
      
      // Check if this is an API request
      if (url.startsWith('/api/')) {
        return this.handleMockRequest(url, init);
      }
      
      // Pass through non-API requests
      return originalFetch(input, init);
    };
  }

  private async handleMockRequest(url: string, init?: RequestInit): Promise<Response> {
    const method = init?.method || 'GET';
    const path = url.replace('/api', '');

    console.log(`📡 Mock API: ${method} ${path}`);
    logger.debug('Mock API request', 'mock-api', { method, path });

    try {
      const response = await this.routeRequest(method, path, init);
      console.log(`✅ Mock API response: ${response.success ? 'SUCCESS' : 'ERROR'}`);

      return new Response(JSON.stringify(response), {
        status: response.success ? 200 : 500,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error: any) {
      console.error(`❌ Mock API error: ${error.message}`);
      logger.error('Mock API error', 'mock-api', { error: error.message, path });

      return new Response(JSON.stringify({
        success: false,
        error: 'Internal Server Error',
        message: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  private async routeRequest(method: string, path: string, init?: RequestInit): Promise<MockResponse> {
    // Add delay to simulate network
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    switch (true) {
      // User endpoints
      case path === '/user/profile' && method === 'GET':
        return this.getUserProfile();
      
      // Clinic endpoints
      case path === '/clinics/current' && method === 'GET':
        return this.getCurrentClinic();
      
      // Appointment endpoints
      case path === '/appointments/today' && method === 'GET':
        return this.getTodayAppointments();
      
      // Email endpoints
      case path === '/email/send' && method === 'POST':
        return this.sendEmail(init);
      
      case path === '/email/validate-config' && method === 'POST':
        return this.validateEmailConfig(init);
      
      default:
        return {
          success: false,
          error: 'Not Found',
          message: `Mock endpoint not implemented: ${method} ${path}`
        };
    }
  }

  private getUserProfile(): MockResponse {
    return {
      success: true,
      data: {
        id: 'user_123',
        email: 'demo@clinicboost.com',
        firstName: 'Demo',
        lastName: 'User',
        role: 'admin',
        avatar: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
  }

  private getCurrentClinic(): MockResponse {
    return {
      success: true,
      data: {
        id: 'clinic_123',
        name: 'Demo Dental Clinic',
        address: '123 Main Street',
        city: 'Demo City',
        state: 'DC',
        zipCode: '12345',
        phone: '(555) 123-4567',
        email: 'info@democlinic.com',
        website: 'https://democlinic.com',
        timezone: 'America/New_York',
        settings: {
          appointmentDuration: 30,
          workingHours: {
            monday: { start: '09:00', end: '17:00' },
            tuesday: { start: '09:00', end: '17:00' },
            wednesday: { start: '09:00', end: '17:00' },
            thursday: { start: '09:00', end: '17:00' },
            friday: { start: '09:00', end: '17:00' },
            saturday: { start: '09:00', end: '13:00' },
            sunday: { closed: true }
          }
        }
      }
    };
  }

  private getTodayAppointments(): MockResponse {
    const today = new Date();
    const appointments = [
      {
        id: 'apt_1',
        patientName: 'John Doe',
        time: '09:00',
        duration: 30,
        treatment: 'Cleaning',
        status: 'confirmed'
      },
      {
        id: 'apt_2',
        patientName: 'Jane Smith',
        time: '10:30',
        duration: 60,
        treatment: 'Filling',
        status: 'scheduled'
      },
      {
        id: 'apt_3',
        patientName: 'Bob Johnson',
        time: '14:00',
        duration: 45,
        treatment: 'Consultation',
        status: 'confirmed'
      }
    ];

    return {
      success: true,
      data: {
        date: today.toISOString().split('T')[0],
        appointments,
        totalCount: appointments.length
      }
    };
  }

  private sendEmail(init?: RequestInit): MockResponse {
    try {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      
      logger.info('Mock email sent', 'mock-api', {
        to: body.message?.to,
        subject: body.message?.subject,
        provider: body.provider
      });

      return {
        success: true,
        data: {
          messageId: `mock_${Date.now()}`,
          provider: body.provider || 'mock'
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Invalid request body',
        message: error.message
      };
    }
  }

  private validateEmailConfig(init?: RequestInit): MockResponse {
    try {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      
      logger.info('Mock email config validation', 'mock-api', {
        provider: body.provider
      });

      return {
        success: true,
        data: {
          valid: true,
          provider: body.provider || 'mock'
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Invalid configuration',
        message: error.message
      };
    }
  }
}

// Initialize mock server
export const mockAPIServer = new MockAPIServer();
