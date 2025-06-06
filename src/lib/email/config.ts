import type { EmailConfig } from './types';
import { logger } from '../logging-monitoring';

export function getEmailConfig(): EmailConfig {
  const provider = import.meta.env.VITE_EMAIL_PROVIDER || 'smtp';
  
  const config: EmailConfig = {
    provider: provider as 'smtp' | 'sendgrid',
    from: import.meta.env.VITE_SMTP_FROM || 'noreply@clinicboost.com',
    replyTo: import.meta.env.VITE_SMTP_REPLY_TO,
  };

  if (provider === 'smtp') {
    config.smtp = {
      host: import.meta.env.VITE_SMTP_HOST || 'localhost',
      port: parseInt(import.meta.env.VITE_SMTP_PORT || '587'),
      secure: import.meta.env.VITE_SMTP_SECURE === 'true',
      auth: import.meta.env.VITE_SMTP_USER ? {
        user: import.meta.env.VITE_SMTP_USER,
        pass: import.meta.env.VITE_SMTP_PASS || '',
      } : undefined,
    };
  } else if (provider === 'sendgrid') {
    config.sendgrid = {
      apiKey: import.meta.env.VITE_SENDGRID_API_KEY || '',
    };
  }

  // Validate configuration
  validateEmailConfig(config);

  return config;
}

function validateEmailConfig(config: EmailConfig): void {
  if (!config.from) {
    throw new Error('Email from address is required');
  }

  if (config.provider === 'smtp') {
    if (!config.smtp?.host) {
      throw new Error('SMTP host is required for SMTP provider');
    }
    if (!config.smtp?.port) {
      throw new Error('SMTP port is required for SMTP provider');
    }
  } else if (config.provider === 'sendgrid') {
    if (!config.sendgrid?.apiKey) {
      logger.warn('SendGrid API key not configured', 'email-config');
    }
  }

  logger.info('Email configuration validated', 'email-config', {
    provider: config.provider,
    from: config.from,
    hasAuth: config.provider === 'smtp' ? !!config.smtp?.auth : !!config.sendgrid?.apiKey,
  });
}

export function isDemoMode(): boolean {
  return import.meta.env.VITE_DEMO_MODE === 'true';
}

export function getEmailConfigForEnvironment(env: 'development' | 'staging' | 'production'): EmailConfig {
  switch (env) {
    case 'development':
      return {
        provider: 'smtp',
        smtp: {
          host: 'localhost',
          port: 1025,
          secure: false,
        },
        from: 'noreply@clinicboost.local',
      };
    
    case 'staging':
      return {
        provider: 'smtp',
        smtp: {
          host: 'smtp.staging.clinicboost.com',
          port: 587,
          secure: false,
          auth: {
            user: 'noreply@staging.clinicboost.com',
            pass: process.env.STAGING_SMTP_PASSWORD || '',
          },
        },
        from: 'noreply@staging.clinicboost.com',
      };
    
    case 'production':
      return {
        provider: 'sendgrid',
        sendgrid: {
          apiKey: process.env.SENDGRID_API_KEY || '',
        },
        from: 'noreply@clinicboost.com',
        replyTo: 'support@clinicboost.com',
      };
    
    default:
      throw new Error(`Unknown environment: ${env}`);
  }
}
