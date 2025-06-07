/**
 * Twilio Webhook Handler for ClinicBoost
 * Handles incoming SMS, WhatsApp, and voice call webhooks from Twilio
 */

import { securityMiddleware } from '../../lib/middleware/security-middleware';
import { logger } from '../../lib/logging-monitoring';
import { handleError } from '../../lib/error-handling';
import { supabase } from '../../lib/supabase';
import { z } from 'zod';

// Twilio webhook event schemas
const twilioSMSWebhookSchema = z.object({
  MessageSid: z.string(),
  AccountSid: z.string(),
  From: z.string(),
  To: z.string(),
  Body: z.string().optional(),
  NumMedia: z.string().optional(),
  MediaUrl0: z.string().optional(),
  MessageStatus: z.enum(['queued', 'sending', 'sent', 'failed', 'delivered', 'undelivered', 'receiving', 'received']),
  ErrorCode: z.string().optional(),
  ErrorMessage: z.string().optional(),
  ApiVersion: z.string().optional(),
  SmsSid: z.string().optional(),
  SmsStatus: z.string().optional(),
});

const twilioCallWebhookSchema = z.object({
  CallSid: z.string(),
  AccountSid: z.string(),
  From: z.string(),
  To: z.string(),
  CallStatus: z.enum(['queued', 'ringing', 'in-progress', 'completed', 'busy', 'failed', 'no-answer', 'canceled']),
  Direction: z.enum(['inbound', 'outbound-api', 'outbound-dial']),
  Duration: z.string().optional(),
  RecordingUrl: z.string().optional(),
  ErrorCode: z.string().optional(),
  ErrorMessage: z.string().optional(),
});

export interface TwilioWebhookEvent {
  type: 'sms' | 'whatsapp' | 'call';
  data: any;
  timestamp: Date;
  signature?: string;
}

class TwilioWebhookHandler {
  private authToken: string;

  constructor() {
    this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
  }

  /**
   * Verify Twilio webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, url: string): boolean {
    if (!this.authToken) {
      logger.warn('Twilio auth token not configured for webhook verification', 'twilio-webhook');
      return false;
    }

    try {
      // In production, use Twilio's webhook signature verification
      // This is a simplified version for demonstration
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha1', this.authToken)
        .update(url + payload)
        .digest('base64');

      return signature === expectedSignature;
    } catch (error) {
      logger.error('Webhook signature verification failed', 'twilio-webhook', { error });
      return false;
    }
  }

  /**
   * Handle incoming SMS webhook
   */
  async handleSMSWebhook(data: any): Promise<{ success: boolean; error?: string }> {
    try {
      const validatedData = twilioSMSWebhookSchema.parse(data);
      
      logger.info('Processing SMS webhook', 'twilio-webhook', {
        messageSid: validatedData.MessageSid,
        from: validatedData.From,
        to: validatedData.To,
        status: validatedData.MessageStatus,
      });

      // Store message in database
      const { error: dbError } = await supabase
        .from('sms_messages')
        .upsert({
          message_sid: validatedData.MessageSid,
          account_sid: validatedData.AccountSid,
          from_number: validatedData.From,
          to_number: validatedData.To,
          body: validatedData.Body || '',
          status: validatedData.MessageStatus,
          direction: 'inbound',
          num_media: parseInt(validatedData.NumMedia || '0'),
          media_url: validatedData.MediaUrl0,
          error_code: validatedData.ErrorCode,
          error_message: validatedData.ErrorMessage,
          received_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'message_sid'
        });

      if (dbError) {
        throw dbError;
      }

      // Handle different message statuses
      await this.processSMSStatus(validatedData);

      // Auto-reply logic for specific scenarios
      await this.handleAutoReply(validatedData);

      return { success: true };
    } catch (error) {
      logger.error('SMS webhook processing failed', 'twilio-webhook', { error, data });
      handleError(error as Error, 'twilio-sms-webhook');
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Handle incoming WhatsApp webhook
   */
  async handleWhatsAppWebhook(data: any): Promise<{ success: boolean; error?: string }> {
    try {
      const validatedData = twilioSMSWebhookSchema.parse(data);
      
      logger.info('Processing WhatsApp webhook', 'twilio-webhook', {
        messageSid: validatedData.MessageSid,
        from: validatedData.From,
        to: validatedData.To,
        status: validatedData.MessageStatus,
      });

      // Store WhatsApp message in database
      const { error: dbError } = await supabase
        .from('whatsapp_messages')
        .upsert({
          message_sid: validatedData.MessageSid,
          account_sid: validatedData.AccountSid,
          from_number: validatedData.From,
          to_number: validatedData.To,
          body: validatedData.Body || '',
          status: validatedData.MessageStatus,
          direction: 'inbound',
          num_media: parseInt(validatedData.NumMedia || '0'),
          media_url: validatedData.MediaUrl0,
          error_code: validatedData.ErrorCode,
          error_message: validatedData.ErrorMessage,
          received_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'message_sid'
        });

      if (dbError) {
        throw dbError;
      }

      // Process WhatsApp-specific features
      await this.processWhatsAppMessage(validatedData);

      return { success: true };
    } catch (error) {
      logger.error('WhatsApp webhook processing failed', 'twilio-webhook', { error, data });
      handleError(error as Error, 'twilio-whatsapp-webhook');
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Handle incoming call webhook
   */
  async handleCallWebhook(data: any): Promise<{ success: boolean; error?: string }> {
    try {
      const validatedData = twilioCallWebhookSchema.parse(data);
      
      logger.info('Processing call webhook', 'twilio-webhook', {
        callSid: validatedData.CallSid,
        from: validatedData.From,
        to: validatedData.To,
        status: validatedData.CallStatus,
        direction: validatedData.Direction,
      });

      // Store call record in database
      const { error: dbError } = await supabase
        .from('call_logs')
        .upsert({
          call_sid: validatedData.CallSid,
          account_sid: validatedData.AccountSid,
          from_number: validatedData.From,
          to_number: validatedData.To,
          status: validatedData.CallStatus,
          direction: validatedData.Direction,
          duration: validatedData.Duration ? parseInt(validatedData.Duration) : null,
          recording_url: validatedData.RecordingUrl,
          error_code: validatedData.ErrorCode,
          error_message: validatedData.ErrorMessage,
          received_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'call_sid'
        });

      if (dbError) {
        throw dbError;
      }

      // Handle call completion and follow-up actions
      await this.processCallStatus(validatedData);

      return { success: true };
    } catch (error) {
      logger.error('Call webhook processing failed', 'twilio-webhook', { error, data });
      handleError(error as Error, 'twilio-call-webhook');
      return { success: false, error: (error as Error).message };
    }
  }

  private async processSMSStatus(data: z.infer<typeof twilioSMSWebhookSchema>): Promise<void> {
    switch (data.MessageStatus) {
      case 'delivered':
        logger.info('SMS delivered successfully', 'twilio-webhook', { messageSid: data.MessageSid });
        break;
      case 'failed':
      case 'undelivered':
        logger.warn('SMS delivery failed', 'twilio-webhook', {
          messageSid: data.MessageSid,
          errorCode: data.ErrorCode,
          errorMessage: data.ErrorMessage,
        });
        // Trigger retry logic or notification
        break;
      case 'received':
        // Handle incoming message - could trigger auto-responses or notifications
        await this.handleIncomingSMS(data);
        break;
    }
  }

  private async processWhatsAppMessage(data: z.infer<typeof twilioSMSWebhookSchema>): Promise<void> {
    // WhatsApp-specific processing
    if (data.MessageStatus === 'received') {
      // Handle incoming WhatsApp message
      await this.handleIncomingWhatsApp(data);
    }
  }

  private async processCallStatus(data: z.infer<typeof twilioCallWebhookSchema>): Promise<void> {
    switch (data.CallStatus) {
      case 'completed':
        logger.info('Call completed', 'twilio-webhook', {
          callSid: data.CallSid,
          duration: data.Duration,
        });
        // Update appointment status if this was an appointment reminder call
        break;
      case 'failed':
      case 'no-answer':
        logger.warn('Call failed or not answered', 'twilio-webhook', {
          callSid: data.CallSid,
          status: data.CallStatus,
        });
        // Trigger follow-up actions
        break;
    }
  }

  private async handleIncomingSMS(data: z.infer<typeof twilioSMSWebhookSchema>): Promise<void> {
    // Check if this is from a known patient
    const { data: patient } = await supabase
      .from('patients')
      .select('id, first_name, last_name, phone')
      .eq('phone', data.From)
      .single();

    if (patient) {
      // Create a communication record
      await supabase
        .from('patient_communications')
        .insert({
          patient_id: patient.id,
          type: 'sms_inbound',
          content: data.Body,
          phone_number: data.From,
          message_sid: data.MessageSid,
          created_at: new Date().toISOString(),
        });

      logger.info('Incoming SMS from known patient', 'twilio-webhook', {
        patientId: patient.id,
        patientName: `${patient.first_name} ${patient.last_name}`,
      });
    }
  }

  private async handleIncomingWhatsApp(data: z.infer<typeof twilioSMSWebhookSchema>): Promise<void> {
    // Similar to SMS but for WhatsApp
    const cleanNumber = data.From.replace('whatsapp:', '');
    
    const { data: patient } = await supabase
      .from('patients')
      .select('id, first_name, last_name, phone')
      .eq('phone', cleanNumber)
      .single();

    if (patient) {
      await supabase
        .from('patient_communications')
        .insert({
          patient_id: patient.id,
          type: 'whatsapp_inbound',
          content: data.Body,
          phone_number: cleanNumber,
          message_sid: data.MessageSid,
          created_at: new Date().toISOString(),
        });
    }
  }

  private async handleAutoReply(data: z.infer<typeof twilioSMSWebhookSchema>): Promise<void> {
    // Simple auto-reply logic
    const body = data.Body?.toLowerCase() || '';
    
    if (body.includes('hours') || body.includes('open')) {
      // Send clinic hours
      // This would integrate with your SMS sending service
      logger.info('Auto-reply triggered for clinic hours', 'twilio-webhook', {
        from: data.From,
      });
    }
  }
}

// Export singleton instance
export const twilioWebhookHandler = new TwilioWebhookHandler();

// Express.js route handlers
export const handleTwilioWebhook = async (req: any, res: any) => {
  try {
    // Apply security middleware
    const rateLimiter = securityMiddleware.createRateLimiter({
      windowMs: 60000, // 1 minute
      maxRequests: 100, // Allow high volume for webhooks
    });

    await new Promise((resolve, reject) => {
      rateLimiter(req, res, (err: any) => {
        if (err) reject(err);
        else resolve(void 0);
      });
    });

    // Verify webhook signature
    const signature = req.headers['x-twilio-signature'];
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    
    if (!twilioWebhookHandler.verifyWebhookSignature(req.body, signature, url)) {
      return res.status(403).json({ error: 'Invalid webhook signature' });
    }

    // Determine webhook type and route accordingly
    let result;
    if (req.body.From?.startsWith('whatsapp:') || req.body.To?.startsWith('whatsapp:')) {
      result = await twilioWebhookHandler.handleWhatsAppWebhook(req.body);
    } else if (req.body.CallSid) {
      result = await twilioWebhookHandler.handleCallWebhook(req.body);
    } else {
      result = await twilioWebhookHandler.handleSMSWebhook(req.body);
    }

    if (result.success) {
      res.status(200).json({ success: true });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    logger.error('Twilio webhook handler error', 'twilio-webhook', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
};
