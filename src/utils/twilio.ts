// Enhanced Twilio configuration and utilities with production validation and rate limiting
// Note: In production, these should be handled by a backend service

import { secureConfig } from '../lib/config/secure-config';
import { logger } from '../lib/logging-monitoring';
import { handleError } from '../lib/error-handling';
import { handleIntegrationError } from '../lib/error-handling/integration-errors';
import { checkRateLimit, getRateLimitStatus } from '../lib/rate-limiting/advanced-rate-limiter';
import { backendAPI } from '../lib/api/backend-endpoints';

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  whatsappNumber?: string;
}

interface RateLimitConfig {
  smsPerMinute: number;
  smsPerHour: number;
  whatsappPerMinute: number;
  whatsappPerHour: number;
  callsPerMinute: number;
  callsPerHour: number;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

class TwilioService {
  private config: TwilioConfig;
  private rateLimitConfig: RateLimitConfig;
  private rateLimitTracker = new Map<string, { count: number; resetTime: number }>();
  private initialized = false;

  constructor() {
    this.rateLimitConfig = {
      smsPerMinute: 10,
      smsPerHour: 100,
      whatsappPerMinute: 5,
      whatsappPerHour: 50,
      callsPerMinute: 3,
      callsPerHour: 20,
    };

    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  private loadConfiguration(): TwilioConfig {
    const appConfig = secureConfig.getAppConfig();
    const twilioConfig = appConfig.integrations.twilio;

    return {
      accountSid: twilioConfig.accountSid || '',
      authToken: twilioConfig.authToken || '',
      phoneNumber: twilioConfig.fromNumber || '',
      whatsappNumber: import.meta.env.VITE_TWILIO_WHATSAPP_NUMBER || '',
    };
  }

  private validateConfiguration(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!this.config.accountSid) {
      errors.push('Twilio Account SID is required');
    } else if (!this.config.accountSid.startsWith('AC')) {
      errors.push('Invalid Twilio Account SID format');
    }

    if (!this.config.authToken) {
      errors.push('Twilio Auth Token is required');
    } else if (this.config.authToken.length < 32) {
      errors.push('Invalid Twilio Auth Token format');
    }

    if (!this.config.phoneNumber) {
      errors.push('Twilio phone number is required');
    } else if (!this.validatePhoneNumber(this.config.phoneNumber)) {
      errors.push('Invalid Twilio phone number format');
    }

    // Production-specific validations
    if (secureConfig.isProduction()) {
      if (this.config.accountSid.includes('test') || this.config.accountSid.includes('demo')) {
        warnings.push('Using test credentials in production environment');
      }

      if (!this.config.whatsappNumber) {
        warnings.push('WhatsApp number not configured for production');
      }
    }

    const result = {
      isValid: errors.length === 0,
      errors,
      warnings,
    };

    if (result.isValid) {
      this.initialized = true;
      logger.info('Twilio configuration validated successfully', 'twilio');
    } else {
      logger.error('Twilio configuration validation failed', 'twilio', { errors, warnings });
    }

    if (warnings.length > 0) {
      logger.warn('Twilio configuration warnings', 'twilio', { warnings });
    }

    return result;
  }

  private checkRateLimit(operation: 'sms' | 'whatsapp' | 'call', timeWindow: 'minute' | 'hour'): boolean {
    const now = Date.now();
    const windowMs = timeWindow === 'minute' ? 60000 : 3600000;
    const key = `${operation}-${timeWindow}-${Math.floor(now / windowMs)}`;

    let limit: number;
    switch (operation) {
      case 'sms':
        limit = timeWindow === 'minute' ? this.rateLimitConfig.smsPerMinute : this.rateLimitConfig.smsPerHour;
        break;
      case 'whatsapp':
        limit = timeWindow === 'minute' ? this.rateLimitConfig.whatsappPerMinute : this.rateLimitConfig.whatsappPerHour;
        break;
      case 'call':
        limit = timeWindow === 'minute' ? this.rateLimitConfig.callsPerMinute : this.rateLimitConfig.callsPerHour;
        break;
    }

    const current = this.rateLimitTracker.get(key) || { count: 0, resetTime: now + windowMs };

    if (current.count >= limit) {
      logger.warn(`Rate limit exceeded for ${operation} (${timeWindow})`, 'twilio', {
        operation,
        timeWindow,
        count: current.count,
        limit
      });
      return false;
    }

    current.count++;
    this.rateLimitTracker.set(key, current);

    // Clean up old entries
    for (const [k, v] of this.rateLimitTracker.entries()) {
      if (v.resetTime < now) {
        this.rateLimitTracker.delete(k);
      }
    }

    return true;
  }

  isConfigurationValid(): boolean {
    return this.initialized;
  }

  getConfigurationStatus(): ValidationResult & { initialized: boolean } {
    const validation = this.validateConfiguration();
    return {
      ...validation,
      initialized: this.initialized,
    };
  }

  getRateLimitStatus(): Record<string, { current: number; limit: number; resetTime: number }> {
    const status: Record<string, { current: number; limit: number; resetTime: number }> = {};
    const now = Date.now();

    for (const [key, value] of this.rateLimitTracker.entries()) {
      if (value.resetTime > now) {
        const [operation, timeWindow] = key.split('-');
        let limit: number;

        switch (operation) {
          case 'sms':
            limit = timeWindow === 'minute' ? this.rateLimitConfig.smsPerMinute : this.rateLimitConfig.smsPerHour;
            break;
          case 'whatsapp':
            limit = timeWindow === 'minute' ? this.rateLimitConfig.whatsappPerMinute : this.rateLimitConfig.whatsappPerHour;
            break;
          case 'call':
            limit = timeWindow === 'minute' ? this.rateLimitConfig.callsPerMinute : this.rateLimitConfig.callsPerHour;
            break;
          default:
            continue;
        }

        status[key] = {
          current: value.count,
          limit,
          resetTime: value.resetTime,
        };
      }
    }

    return status;
  }

export interface SMSMessage {
  to: string;
  body: string;
  from?: string;
  mediaUrl?: string[];
}

export interface WhatsAppMessage {
  to: string;
  body: string;
  from?: string;
  mediaUrl?: string[];
}

export interface CallOptions {
  to: string;
  url?: string;
  record?: boolean;
  timeout?: number;
}

// Format phone number to international format
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\s/g, '');

  // If already in international format
  if (cleaned.startsWith('+212')) {
    return cleaned;
  }

  // If starts with 0, replace with +212
  if (cleaned.startsWith('0')) {
    return `+212${cleaned.substring(1)}`;
  }

  // If just the number without country code
  if (/^[5-7]\d{8}$/.test(cleaned)) {
    return `+212${cleaned}`;
  }

  return cleaned;
};

  async sendSMS(message: SMSMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.initialized) {
        throw new Error('Twilio service not properly configured');
      }

      if (!validatePhoneNumber(message.to)) {
        throw new Error('Invalid phone number format');
      }

      // Check rate limits using advanced rate limiter
      const rateLimitStatus = checkRateLimit('twilio-sms', message.to);
      if (!rateLimitStatus.allowed) {
        const error = new Error('SMS rate limit exceeded');
        await handleIntegrationError(error, 'twilio-sms', {
          phoneNumber: message.to,
          retryAfter: rateLimitStatus.retryAfter,
          remaining: rateLimitStatus.remaining
        });
        throw error;
      }

      const formattedTo = formatPhoneNumber(message.to);

      // Log the attempt
      logger.info('Sending SMS', 'twilio', {
        to: formattedTo,
        bodyLength: message.body.length,
        hasMedia: !!message.mediaUrl?.length
      });

      // In production, this should call your backend API which then calls Twilio
      if (secureConfig.isDevelopment()) {
        console.log('Mock SMS:', { ...message, to: formattedTo });

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Simulate 95% success rate
        const success = Math.random() > 0.05;

        if (success) {
          const messageId = `SM${Date.now()}`;
          logger.info('SMS sent successfully', 'twilio', { messageId, to: formattedTo });
          return {
            success: true,
            messageId,
          };
        } else {
          throw new Error('SMS delivery failed (simulated)');
        }
      } else {
        // Production: Use backend API
        const response = await backendAPI.sendSMS({
          to: formattedTo,
          message: message.body,
        });

        logger.info('SMS sent successfully', 'twilio', {
          messageId: response.messageId,
          to: formattedTo
        });

        return {
          success: true,
          messageId: response.messageId,
        };
      }
    } catch (error: any) {
      logger.error('SMS sending failed', 'twilio', { error: error.message, to: message.to });

      await handleIntegrationError(error, 'twilio-sms', {
        phoneNumber: message.to,
        messageLength: message.body.length,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendWhatsApp(message: WhatsAppMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.initialized) {
        throw new Error('Twilio service not properly configured');
      }

      if (!validatePhoneNumber(message.to)) {
        throw new Error('Invalid phone number format');
      }

      // Check rate limits
      if (!this.checkRateLimit('whatsapp', 'minute') || !this.checkRateLimit('whatsapp', 'hour')) {
        throw new Error('WhatsApp rate limit exceeded');
      }

      const formattedTo = formatPhoneNumber(message.to);

      // Log the attempt
      logger.info('Sending WhatsApp message', 'twilio', {
        to: formattedTo,
        bodyLength: message.body.length,
        hasMedia: !!message.mediaUrl?.length
      });

      // In production, this should call your backend API which then calls Twilio
      if (secureConfig.isDevelopment()) {
        console.log('Mock WhatsApp:', { ...message, to: formattedTo });

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Simulate 95% success rate
        const success = Math.random() > 0.05;

        if (success) {
          const messageId = `WA${Date.now()}`;
          logger.info('WhatsApp message sent successfully', 'twilio', { messageId, to: formattedTo });
          return {
            success: true,
            messageId,
          };
        } else {
          throw new Error('WhatsApp delivery failed (simulated)');
        }
      } else {
        // Production: Call backend API
        const response = await fetch('/api/twilio/whatsapp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: formattedTo,
            body: message.body,
            from: message.from || this.config.whatsappNumber,
            mediaUrl: message.mediaUrl,
          }),
        });

        if (!response.ok) {
          throw new Error(`WhatsApp API error: ${response.status}`);
        }

        const result = await response.json();
        logger.info('WhatsApp message sent successfully', 'twilio', { messageId: result.messageId, to: formattedTo });

        return {
          success: true,
          messageId: result.messageId,
        };
      }
    } catch (error: any) {
      logger.error('WhatsApp sending failed', 'twilio', { error: error.message, to: message.to });
      handleError(error, 'twilio-whatsapp');
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// Create singleton instance
const twilioService = new TwilioService();

// Export enhanced functions
export const sendSMS = (message: SMSMessage) => twilioService.sendSMS(message);
export const sendWhatsApp = (message: WhatsAppMessage) => twilioService.sendWhatsApp(message);
export const getTwilioStatus = () => twilioService.getConfigurationStatus();
export const getTwilioRateLimitStatus = () => twilioService.getRateLimitStatus();

export const validatePhoneNumber = (phoneNumber: string): boolean => {
  // Validate Moroccan phone numbers
  const moroccanPatterns = [
    /^\+212[5-7]\d{8}$/, // International format
    /^0[5-7]\d{8}$/, // National format
    /^[5-7]\d{8}$/, // Without leading 0
  ];

  return moroccanPatterns.some(pattern => pattern.test(phoneNumber.replace(/\s/g, '')));
};

export const makeCall = async (options: CallOptions): Promise<{ success: boolean; callId?: string; error?: string }> => {
  try {
    if (!validatePhoneNumber(options.to)) {
      throw new Error('Invalid phone number format');
    }

    const formattedTo = formatPhoneNumber(options.to);

    // In production, this should call your backend API which then calls Twilio
    console.log('Mock Call:', { ...options, to: formattedTo });

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate 90% success rate
    const success = Math.random() > 0.1;

    if (success) {
      return {
        success: true,
        callId: `CA${Date.now()}`,
      };
    } else {
      throw new Error('Call failed');
    }
  } catch (error) {
    console.error('Call making error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};