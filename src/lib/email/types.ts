export interface EmailConfig {
  provider: 'smtp' | 'sendgrid';
  smtp?: {
    host: string;
    port: number;
    secure?: boolean;
    auth?: {
      user: string;
      pass: string;
    };
  };
  sendgrid?: {
    apiKey: string;
  };
  from: string;
  replyTo?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
  encoding?: string;
  cid?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables: string[];
  category: EmailCategory;
  language: 'en' | 'fr' | 'ar';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailMessage {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
  templateId?: string;
  templateData?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: any;
}

export interface EmailDeliveryStatus {
  messageId: string;
  status: 'pending' | 'sent' | 'delivered' | 'bounced' | 'failed' | 'opened' | 'clicked';
  timestamp: Date;
  details?: any;
}

export interface EmailCampaign {
  id: string;
  name: string;
  description?: string;
  templateId: string;
  recipients: EmailRecipient[];
  scheduledAt?: Date;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface EmailRecipient {
  email: string;
  name?: string;
  variables?: Record<string, any>;
  status?: 'pending' | 'sent' | 'delivered' | 'bounced' | 'failed';
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
}

export interface EmailStats {
  sent: number;
  delivered: number;
  bounced: number;
  failed: number;
  opened: number;
  clicked: number;
  unsubscribed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
}

export interface EmailCampaignExecution {
  campaignId: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed' | 'paused';
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  errors: string[];
}

export type EmailCategory = 
  | 'appointment_reminder'
  | 'appointment_confirmation'
  | 'appointment_cancellation'
  | 'welcome'
  | 'password_reset'
  | 'account_verification'
  | 'invoice'
  | 'payment_confirmation'
  | 'treatment_followup'
  | 'marketing'
  | 'newsletter'
  | 'system_notification'
  | 'backup_notification'
  | 'security_alert';

export interface EmailProvider {
  name: string;
  sendEmail(message: EmailMessage): Promise<EmailSendResult>;
  sendBulkEmail(messages: EmailMessage[]): Promise<EmailSendResult[]>;
  getDeliveryStatus?(messageId: string): Promise<EmailDeliveryStatus>;
  validateConfig(): Promise<boolean>;
}

export interface EmailServiceConfig {
  provider: EmailProvider;
  templates: Map<string, EmailTemplate>;
  defaultFrom: string;
  defaultReplyTo?: string;
  trackOpens?: boolean;
  trackClicks?: boolean;
  enableRetries?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export interface EmailAnalytics {
  campaignId?: string;
  templateId?: string;
  period: {
    start: Date;
    end: Date;
  };
  stats: EmailStats;
  trends: {
    date: string;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
  }[];
}
