// Twilio configuration and utilities
// Note: In production, these should be handled by a backend service

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  whatsappNumber?: string;
}

// Twilio configuration - using Vite environment variables
const config: TwilioConfig = {
  accountSid: import.meta.env.VITE_TWILIO_ACCOUNT_SID || '',
  authToken: import.meta.env.VITE_TWILIO_AUTH_TOKEN || '',
  phoneNumber: import.meta.env.VITE_TWILIO_PHONE_NUMBER || '',
  whatsappNumber: import.meta.env.VITE_TWILIO_WHATSAPP_NUMBER || '',
};

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

// Mock functions for development (since we can't use Twilio SDK directly in frontend)
export const sendSMS = async (message: SMSMessage): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    if (!validatePhoneNumber(message.to)) {
      throw new Error('Invalid phone number format');
    }

    const formattedTo = formatPhoneNumber(message.to);

    // In production, this should call your backend API which then calls Twilio
    console.log('Mock SMS:', { ...message, to: formattedTo });

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate 95% success rate
    const success = Math.random() > 0.05;

    if (success) {
      return {
        success: true,
        messageId: `SM${Date.now()}`,
      };
    } else {
      throw new Error('SMS delivery failed');
    }
  } catch (error) {
    console.error('SMS sending error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const sendWhatsApp = async (message: WhatsAppMessage): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    if (!validatePhoneNumber(message.to)) {
      throw new Error('Invalid phone number format');
    }

    const formattedTo = formatPhoneNumber(message.to);

    // In production, this should call your backend API which then calls Twilio
    console.log('Mock WhatsApp:', { ...message, to: formattedTo });

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate 95% success rate
    const success = Math.random() > 0.05;

    if (success) {
      return {
        success: true,
        messageId: `WA${Date.now()}`,
      };
    } else {
      throw new Error('WhatsApp delivery failed');
    }
  } catch (error) {
    console.error('WhatsApp sending error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

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