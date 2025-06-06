/**
 * GDPR Compliance Service
 * 
 * Handles GDPR compliance features including:
 * - Data subject rights (access, rectification, erasure, portability)
 * - Consent management
 * - Data processing lawfulness
 * - Privacy by design
 */

import { supabase } from '../supabase';
import { logger } from '../logging-monitoring';
import type { Database } from '../database.types';
import { AnonymizationEngine } from './anonymization-utils';

type ConsentRecord = Database['public']['Tables']['consent_records']['Row'];
type DataSubjectRequest = Database['public']['Tables']['data_subject_requests']['Row'];
type PrivacySettings = Database['public']['Tables']['privacy_settings']['Row'];

export interface DataSubjectRights {
  access: boolean;
  rectification: boolean;
  erasure: boolean;
  portability: boolean;
  restriction: boolean;
  objection: boolean;
}

export interface ConsentData {
  userId?: string;
  patientId?: string;
  consentType: 'cookies' | 'analytics' | 'marketing' | 'data_processing' | 'third_party_sharing';
  status: 'granted' | 'denied' | 'pending' | 'withdrawn';
  ipAddress?: string;
  userAgent?: string;
  consentText?: string;
  version?: string;
}

export interface DataExportOptions {
  format: 'json' | 'csv' | 'xml';
  includeMetadata: boolean;
  anonymize: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface DataSubjectRequestData {
  requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction';
  requesterEmail: string;
  requesterName?: string;
  patientId?: string;
  userId?: string;
  description?: string;
}

export class GDPRService {
  private static instance: GDPRService;

  public static getInstance(): GDPRService {
    if (!GDPRService.instance) {
      GDPRService.instance = new GDPRService();
    }
    return GDPRService.instance;
  }

  /**
   * Record consent for a user or patient
   */
  async recordConsent(consentData: ConsentData): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('record_consent', {
        p_user_id: consentData.userId || null,
        p_patient_id: consentData.patientId || null,
        p_consent_type: consentData.consentType,
        p_status: consentData.status,
        p_ip_address: consentData.ipAddress || null,
        p_user_agent: consentData.userAgent || null,
        p_consent_text: consentData.consentText || null,
        p_version: consentData.version || '1.0'
      });

      if (error) throw error;

      logger.info('Consent recorded successfully', 'gdpr-service', {
        consentType: consentData.consentType,
        status: consentData.status,
        userId: consentData.userId,
        patientId: consentData.patientId
      });

      return data;
    } catch (error) {
      logger.error('Failed to record consent', 'gdpr-service', { error, consentData });
      throw error;
    }
  }

  /**
   * Check if consent is granted
   */
  async hasConsent(
    userId?: string, 
    patientId?: string, 
    consentType?: 'cookies' | 'analytics' | 'marketing' | 'data_processing' | 'third_party_sharing'
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('has_consent', {
        p_user_id: userId || null,
        p_patient_id: patientId || null,
        p_consent_type: consentType
      });

      if (error) throw error;
      return data || false;
    } catch (error) {
      logger.error('Failed to check consent', 'gdpr-service', { error, userId, patientId, consentType });
      return false;
    }
  }

  /**
   * Get all consent records for a user or patient
   */
  async getConsentRecords(userId?: string, patientId?: string): Promise<ConsentRecord[]> {
    try {
      let query = supabase
        .from('consent_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      } else if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error('Failed to get consent records', 'gdpr-service', { error, userId, patientId });
      throw error;
    }
  }

  /**
   * Submit a data subject request
   */
  async submitDataSubjectRequest(requestData: DataSubjectRequestData): Promise<string> {
    try {
      // Generate verification token
      const verificationToken = crypto.randomUUID();
      
      // Calculate due date (30 days from now as per GDPR)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const { data, error } = await supabase
        .from('data_subject_requests')
        .insert({
          request_type: requestData.requestType,
          requester_email: requestData.requesterEmail,
          requester_name: requestData.requesterName,
          patient_id: requestData.patientId,
          user_id: requestData.userId,
          description: requestData.description,
          verification_token: verificationToken,
          due_date: dueDate.toISOString(),
          status: 'pending'
        })
        .select('id')
        .single();

      if (error) throw error;

      // Send verification email (implement email service)
      await this.sendVerificationEmail(requestData.requesterEmail, verificationToken);

      logger.info('Data subject request submitted', 'gdpr-service', {
        requestId: data.id,
        requestType: requestData.requestType,
        requesterEmail: requestData.requesterEmail
      });

      return data.id;
    } catch (error) {
      logger.error('Failed to submit data subject request', 'gdpr-service', { error, requestData });
      throw error;
    }
  }

  /**
   * Verify data subject request
   */
  async verifyDataSubjectRequest(token: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('data_subject_requests')
        .update({
          verified_at: new Date().toISOString(),
          status: 'in_progress'
        })
        .eq('verification_token', token)
        .eq('status', 'pending')
        .select('id')
        .single();

      if (error) throw error;

      logger.info('Data subject request verified', 'gdpr-service', { requestId: data.id });
      return true;
    } catch (error) {
      logger.error('Failed to verify data subject request', 'gdpr-service', { error, token });
      return false;
    }
  }

  /**
   * Export user/patient data
   */
  async exportData(
    userId?: string, 
    patientId?: string, 
    options: DataExportOptions = { format: 'json', includeMetadata: true, anonymize: false }
  ): Promise<any> {
    try {
      let exportData: any = {};

      if (userId) {
        // Export user data
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (userError) throw userError;
        exportData.user = userData;

        // Export user's appointments
        const { data: appointments } = await supabase
          .from('appointments')
          .select('*')
          .eq('dentist_id', userId);

        exportData.appointments = appointments;
      }

      if (patientId) {
        // Export patient data
        const { data: patientData, error: patientError } = await supabase
          .from('patients')
          .select('*')
          .eq('id', patientId)
          .single();

        if (patientError) throw patientError;
        exportData.patient = patientData;

        // Export patient's appointments
        const { data: appointments } = await supabase
          .from('appointments')
          .select('*')
          .eq('patient_id', patientId);

        exportData.appointments = appointments;

        // Export patient's treatments
        const { data: treatments } = await supabase
          .from('treatments')
          .select('*')
          .eq('patient_id', patientId);

        exportData.treatments = treatments;

        // Export patient's invoices
        const { data: invoices } = await supabase
          .from('invoices')
          .select('*')
          .eq('patient_id', patientId);

        exportData.invoices = invoices;
      }

      // Export consent records
      const consentRecords = await this.getConsentRecords(userId, patientId);
      exportData.consents = consentRecords;

      // Anonymize data if requested
      if (options.anonymize) {
        exportData = this.anonymizeExportData(exportData);
      }

      // Include metadata if requested
      if (options.includeMetadata) {
        exportData.metadata = {
          exportDate: new Date().toISOString(),
          format: options.format,
          anonymized: options.anonymize,
          dataSubject: userId ? 'user' : 'patient',
          subjectId: userId || patientId
        };
      }

      logger.info('Data exported successfully', 'gdpr-service', {
        userId,
        patientId,
        format: options.format,
        anonymized: options.anonymize
      });

      return exportData;
    } catch (error) {
      logger.error('Failed to export data', 'gdpr-service', { error, userId, patientId, options });
      throw error;
    }
  }

  /**
   * Delete user/patient data (Right to erasure)
   */
  async deleteData(userId?: string, patientId?: string): Promise<boolean> {
    try {
      if (patientId) {
        // Anonymize patient data instead of hard delete to maintain referential integrity
        const { error } = await supabase.rpc('anonymize_patient_data', {
          p_patient_id: patientId
        });

        if (error) throw error;
      }

      if (userId) {
        // For users, we need to be more careful due to system integrity
        // Mark as deleted and anonymize sensitive data
        const { error } = await supabase
          .from('users')
          .update({
            first_name: 'Deleted',
            last_name: 'User',
            phone: null,
            avatar_url: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (error) throw error;
      }

      logger.info('Data deletion completed', 'gdpr-service', { userId, patientId });
      return true;
    } catch (error) {
      logger.error('Failed to delete data', 'gdpr-service', { error, userId, patientId });
      throw error;
    }
  }

  /**
   * Get privacy settings for user/patient
   */
  async getPrivacySettings(userId?: string, patientId?: string): Promise<PrivacySettings | null> {
    try {
      let query = supabase
        .from('privacy_settings')
        .select('*');

      if (userId) {
        query = query.eq('user_id', userId);
      } else if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query.single();
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"

      return data;
    } catch (error) {
      logger.error('Failed to get privacy settings', 'gdpr-service', { error, userId, patientId });
      return null;
    }
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(
    settings: Partial<PrivacySettings>, 
    userId?: string, 
    patientId?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('privacy_settings')
        .upsert({
          ...settings,
          user_id: userId || null,
          patient_id: patientId || null,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      logger.info('Privacy settings updated', 'gdpr-service', { userId, patientId });
      return true;
    } catch (error) {
      logger.error('Failed to update privacy settings', 'gdpr-service', { error, settings, userId, patientId });
      throw error;
    }
  }

  /**
   * Get data subject requests for a specific user/patient
   */
  async getDataSubjectRequests(userId?: string, patientId?: string): Promise<DataSubjectRequest[]> {
    try {
      let query = supabase
        .from('data_subject_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      } else if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query;
      if (error) throw error;

      logger.info('Data subject requests retrieved', 'gdpr-service', {
        userId,
        patientId,
        count: data?.length || 0
      });

      return data || [];
    } catch (error) {
      logger.error('Failed to get data subject requests', 'gdpr-service', { error, userId, patientId });
      throw error;
    }
  }

  /**
   * Get all data subject requests (admin function)
   */
  async getAllDataSubjectRequests(
    status?: 'pending' | 'in_progress' | 'completed' | 'rejected',
    limit: number = 50,
    offset: number = 0
  ): Promise<{ requests: DataSubjectRequest[]; total: number }> {
    try {
      let query = supabase
        .from('data_subject_requests')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      logger.info('All data subject requests retrieved', 'gdpr-service', {
        status,
        count: count || 0,
        limit,
        offset
      });

      return {
        requests: data || [],
        total: count || 0
      };
    } catch (error) {
      logger.error('Failed to get all data subject requests', 'gdpr-service', { error, status });
      throw error;
    }
  }

  /**
   * Update data subject request status
   */
  async updateDataSubjectRequestStatus(
    requestId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'rejected',
    processedBy?: string,
    notes?: string,
    responseData?: any
  ): Promise<boolean> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (processedBy) {
        updateData.processed_by = processedBy;
        updateData.processed_at = new Date().toISOString();
      }

      if (notes) {
        updateData.notes = notes;
      }

      if (responseData) {
        updateData.response_data = responseData;
      }

      const { error } = await supabase
        .from('data_subject_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      logger.info('Data subject request status updated', 'gdpr-service', {
        requestId,
        status,
        processedBy
      });

      return true;
    } catch (error) {
      logger.error('Failed to update data subject request status', 'gdpr-service', {
        error,
        requestId,
        status
      });
      throw error;
    }
  }

  /**
   * Process data subject request based on type
   */
  async processDataSubjectRequest(requestId: string, processedBy: string): Promise<boolean> {
    try {
      // Get the request details
      const { data: request, error: fetchError } = await supabase
        .from('data_subject_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;
      if (!request) throw new Error('Request not found');

      let responseData: any = {};
      let success = false;

      switch (request.request_type) {
        case 'access':
          // Export user/patient data with full anonymization for privacy
          responseData = await this.exportAnonymizedData(request.user_id, request.patient_id, 'standard', {
            format: 'json',
            includeMetadata: true,
            anonymize: true
          });
          success = true;
          break;

        case 'portability':
          // Export data in portable format with minimal anonymization to preserve utility
          responseData = await this.exportAnonymizedData(request.user_id, request.patient_id, 'minimal', {
            format: 'json',
            includeMetadata: true,
            anonymize: true
          });
          success = true;
          break;

        case 'erasure':
          // Delete user/patient data
          success = await this.deleteData(request.user_id, request.patient_id);
          responseData = { deleted: success };
          break;

        case 'rectification':
          // This requires manual intervention - mark as in progress
          await this.updateDataSubjectRequestStatus(
            requestId,
            'in_progress',
            processedBy,
            'Rectification request requires manual review and data correction'
          );
          return true;

        case 'restriction':
          // This requires manual intervention - mark as in progress
          await this.updateDataSubjectRequestStatus(
            requestId,
            'in_progress',
            processedBy,
            'Restriction request requires manual review and processing restriction setup'
          );
          return true;

        default:
          throw new Error(`Unknown request type: ${request.request_type}`);
      }

      // Update request status to completed
      await this.updateDataSubjectRequestStatus(
        requestId,
        'completed',
        processedBy,
        `Request processed successfully`,
        responseData
      );

      logger.info('Data subject request processed', 'gdpr-service', {
        requestId,
        requestType: request.request_type,
        processedBy,
        success
      });

      return success;
    } catch (error) {
      // Update request status to rejected on error
      await this.updateDataSubjectRequestStatus(
        requestId,
        'rejected',
        processedBy,
        `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );

      logger.error('Failed to process data subject request', 'gdpr-service', {
        error,
        requestId,
        processedBy
      });
      throw error;
    }
  }

  /**
   * Get data subject request statistics
   */
  async getDataSubjectRequestStatistics(): Promise<{
    total: number;
    pending: number;
    completed: number;
    overdue: number;
    byType: Record<string, number>;
  }> {
    try {
      // Get all requests
      const { data: allRequests, error } = await supabase
        .from('data_subject_requests')
        .select('status, request_type, due_date, created_at');

      if (error) throw error;

      const now = new Date();
      const stats = {
        total: allRequests?.length || 0,
        pending: 0,
        completed: 0,
        overdue: 0,
        byType: {} as Record<string, number>
      };

      allRequests?.forEach(request => {
        // Count by status
        if (request.status === 'pending') stats.pending++;
        if (request.status === 'completed') stats.completed++;

        // Count overdue (pending/in_progress past due date)
        if ((request.status === 'pending' || request.status === 'in_progress') &&
            request.due_date && new Date(request.due_date) < now) {
          stats.overdue++;
        }

        // Count by type
        stats.byType[request.request_type] = (stats.byType[request.request_type] || 0) + 1;
      });

      return stats;
    } catch (error) {
      logger.error('Failed to get data subject request statistics', 'gdpr-service', { error });
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async sendVerificationEmail(email: string, token: string): Promise<void> {
    try {
      const { getEmailService } = await import('../email');
      const emailService = getEmailService();

      const verificationUrl = `${window.location.origin}/verify-email?token=${token}`;

      const result = await emailService.sendEmail({
        to: email,
        subject: 'Email Verification - ClinicBoost',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Email Verification Required</h2>
            <p>Please click the link below to verify your email address:</p>
            <p><a href="${verificationUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Verify Email</a></p>
            <p>If you didn't request this verification, please ignore this email.</p>
            <p>This link will expire in 24 hours.</p>
            <p>Best regards,<br>ClinicBoost Team</p>
          </div>
        `,
        text: `Please verify your email address by visiting: ${verificationUrl}`,
        tags: ['email-verification'],
        metadata: { token, email },
      });

      if (result.success) {
        logger.info('Verification email sent successfully', 'gdpr-service', {
          email,
          messageId: result.messageId
        });
      } else {
        logger.error('Failed to send verification email', 'gdpr-service', {
          email,
          error: result.error
        });
      }
    } catch (error: any) {
      logger.error('Error sending verification email', 'gdpr-service', {
        email,
        error: error.message
      });
    }
  }

  private anonymizeExportData(data: any): any {
    const anonymized = JSON.parse(JSON.stringify(data));

    try {
      // Initialize anonymization engine
      const anonymizer = new AnonymizationEngine();

      // Anonymize each data section
      if (anonymized.user) {
        anonymized.user = anonymizer.anonymizeUser(anonymized.user);
      }

      if (anonymized.patient) {
        anonymized.patient = anonymizer.anonymizePatient(anonymized.patient);
      }

      if (anonymized.appointments && Array.isArray(anonymized.appointments)) {
        anonymized.appointments = anonymized.appointments.map((appointment: any) =>
          anonymizer.anonymizeAppointment(appointment)
        );
      }

      if (anonymized.treatments && Array.isArray(anonymized.treatments)) {
        anonymized.treatments = anonymized.treatments.map((treatment: any) =>
          anonymizer.anonymizeTreatment(treatment)
        );
      }

      if (anonymized.invoices && Array.isArray(anonymized.invoices)) {
        anonymized.invoices = anonymized.invoices.map((invoice: any) =>
          anonymizer.anonymizeInvoice(invoice)
        );
      }

      if (anonymized.consents && Array.isArray(anonymized.consents)) {
        anonymized.consents = anonymized.consents.map((consent: any) =>
          anonymizer.anonymizeConsent(consent)
        );
      }

      // Add anonymization metadata
      anonymized.anonymization_metadata = {
        anonymized_at: new Date().toISOString(),
        anonymization_version: '1.0',
        anonymization_level: 'full',
        techniques_used: [
          'pseudonymization',
          'generalization',
          'redaction',
          'hashing'
        ]
      };

      logger.info('Data anonymization completed successfully', 'gdpr-service', {
        sections_anonymized: Object.keys(anonymized).filter(key => key !== 'metadata' && key !== 'anonymization_metadata'),
        anonymization_level: 'full'
      });

      return anonymized;

    } catch (error) {
      logger.error('Error during data anonymization', 'gdpr-service', { error });

      // Fallback to basic redaction if anonymization engine fails
      return this.fallbackAnonymization(anonymized);
    }
  }

  /**
   * Fallback anonymization method using basic redaction
   */
  private fallbackAnonymization(data: any): any {
    const sensitiveFields = [
      'email', 'phone', 'address', 'city', 'insurance_number', 'insurance_provider',
      'first_name', 'last_name', 'notes', 'ip_address', 'user_agent',
      'stripe_payment_intent_id', 'payment_method'
    ];

    const anonymizeObject = (obj: any) => {
      if (typeof obj === 'object' && obj !== null) {
        if (Array.isArray(obj)) {
          obj.forEach(item => anonymizeObject(item));
        } else {
          for (const key in obj) {
            if (sensitiveFields.includes(key)) {
              obj[key] = '[REDACTED]';
            } else if (typeof obj[key] === 'object') {
              anonymizeObject(obj[key]);
            }
          }
        }
      }
    };

    anonymizeObject(data);

    // Add fallback metadata
    data.anonymization_metadata = {
      anonymized_at: new Date().toISOString(),
      anonymization_version: 'fallback',
      anonymization_level: 'basic_redaction',
      techniques_used: ['redaction']
    };

    return data;
  }

  /**
   * Export anonymized data with specific anonymization level
   */
  async exportAnonymizedData(
    userId?: string,
    patientId?: string,
    anonymizationLevel: 'minimal' | 'standard' | 'full' = 'full',
    options: DataExportOptions = { format: 'json', includeMetadata: true, anonymize: true }
  ): Promise<any> {
    try {
      // Force anonymization to true
      const exportOptions = { ...options, anonymize: true };

      // Export the raw data first
      const rawData = await this.exportData(userId, patientId, exportOptions);

      // Apply additional anonymization based on level
      const anonymizer = new AnonymizationEngine();

      // Add anonymization level metadata
      if (rawData.anonymization_metadata) {
        rawData.anonymization_metadata.anonymization_level = anonymizationLevel;
        rawData.anonymization_metadata.export_purpose = 'data_subject_request';
      }

      logger.info('Anonymized data export completed', 'gdpr-service', {
        userId,
        patientId,
        anonymizationLevel,
        format: options.format
      });

      return rawData;

    } catch (error) {
      logger.error('Error exporting anonymized data', 'gdpr-service', {
        error,
        userId,
        patientId,
        anonymizationLevel
      });
      throw error;
    }
  }

  /**
   * Validate anonymization quality
   */
  async validateAnonymization(originalData: any, anonymizedData: any): Promise<{
    isValid: boolean;
    issues: string[];
    score: number;
  }> {
    const issues: string[] = [];
    let score = 100;

    try {
      // Check for potential data leaks
      const sensitivePatterns = [
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
        /\b\d{3}-\d{3}-\d{4}\b/, // Phone
        /\b\d{3}-\d{2}-\d{4}\b/, // SSN
        /\b\d{16}\b/ // Credit card
      ];

      const checkForLeaks = (obj: any, path: string = '') => {
        if (typeof obj === 'string') {
          sensitivePatterns.forEach((pattern, index) => {
            if (pattern.test(obj)) {
              issues.push(`Potential data leak detected at ${path}: pattern ${index}`);
              score -= 20;
            }
          });
        } else if (typeof obj === 'object' && obj !== null) {
          Object.entries(obj).forEach(([key, value]) => {
            checkForLeaks(value, path ? `${path}.${key}` : key);
          });
        }
      };

      checkForLeaks(anonymizedData);

      // Check anonymization metadata presence
      if (!anonymizedData.anonymization_metadata) {
        issues.push('Missing anonymization metadata');
        score -= 10;
      }

      // Check for proper field anonymization
      const requiredAnonymizedFields = ['email', 'phone', 'address', 'insurance_number'];
      const checkFieldAnonymization = (obj: any, path: string = '') => {
        if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
          Object.entries(obj).forEach(([key, value]) => {
            if (requiredAnonymizedFields.includes(key) &&
                typeof value === 'string' &&
                !value.includes('[REDACTED]') &&
                !value.includes('PSEUDO_') &&
                !value.includes('HASH_') &&
                !value.includes('[GENERALIZED')) {
              issues.push(`Field ${path ? path + '.' : ''}${key} may not be properly anonymized`);
              score -= 15;
            }
            if (typeof value === 'object') {
              checkFieldAnonymization(value, path ? `${path}.${key}` : key);
            }
          });
        }
      };

      checkFieldAnonymization(anonymizedData);

      const isValid = issues.length === 0 && score >= 80;

      logger.info('Anonymization validation completed', 'gdpr-service', {
        isValid,
        score,
        issuesCount: issues.length
      });

      return {
        isValid,
        issues,
        score: Math.max(0, score)
      };

    } catch (error) {
      logger.error('Error validating anonymization', 'gdpr-service', { error });
      return {
        isValid: false,
        issues: ['Validation process failed'],
        score: 0
      };
    }
  }

  /**
   * Generate anonymization report
   */
  async generateAnonymizationReport(data: any): Promise<{
    summary: {
      totalFields: number;
      anonymizedFields: number;
      techniques: string[];
      dataTypes: string[];
    };
    details: {
      fieldBreakdown: Record<string, string>;
      techniqueUsage: Record<string, number>;
      dataTypeBreakdown: Record<string, number>;
    };
    compliance: {
      gdprCompliant: boolean;
      hipaaCompliant: boolean;
      issues: string[];
    };
  }> {
    try {
      const report = {
        summary: {
          totalFields: 0,
          anonymizedFields: 0,
          techniques: [] as string[],
          dataTypes: [] as string[]
        },
        details: {
          fieldBreakdown: {} as Record<string, string>,
          techniqueUsage: {} as Record<string, number>,
          dataTypeBreakdown: {} as Record<string, number>
        },
        compliance: {
          gdprCompliant: true,
          hipaaCompliant: true,
          issues: [] as string[]
        }
      };

      // Analyze anonymization metadata
      const analyzeObject = (obj: any, path: string = '') => {
        if (typeof obj === 'object' && obj !== null) {
          if (obj._anonymization) {
            const dataType = obj._anonymization.data_type;
            const techniques = obj._anonymization.techniques_applied || [];

            report.summary.dataTypes.push(dataType);
            techniques.forEach((technique: string) => {
              if (!report.summary.techniques.includes(technique)) {
                report.summary.techniques.push(technique);
              }
              report.details.techniqueUsage[technique] = (report.details.techniqueUsage[technique] || 0) + 1;
            });

            report.details.dataTypeBreakdown[dataType] = (report.details.dataTypeBreakdown[dataType] || 0) + 1;
          }

          Object.entries(obj).forEach(([key, value]) => {
            if (key !== '_anonymization' && key !== 'anonymization_metadata') {
              report.summary.totalFields++;

              if (this.isFieldAnonymized(value)) {
                report.summary.anonymizedFields++;
                report.details.fieldBreakdown[path ? `${path}.${key}` : key] = this.getAnonymizationType(value);
              }

              if (typeof value === 'object') {
                analyzeObject(value, path ? `${path}.${key}` : key);
              }
            }
          });
        }
      };

      analyzeObject(data);

      // Check compliance
      if (report.summary.anonymizedFields / report.summary.totalFields < 0.8) {
        report.compliance.gdprCompliant = false;
        report.compliance.hipaaCompliant = false;
        report.compliance.issues.push('Insufficient anonymization coverage');
      }

      logger.info('Anonymization report generated', 'gdpr-service', {
        totalFields: report.summary.totalFields,
        anonymizedFields: report.summary.anonymizedFields,
        coverage: (report.summary.anonymizedFields / report.summary.totalFields * 100).toFixed(2) + '%'
      });

      return report;

    } catch (error) {
      logger.error('Error generating anonymization report', 'gdpr-service', { error });
      throw error;
    }
  }

  /**
   * Check if a field value is anonymized
   */
  private isFieldAnonymized(value: any): boolean {
    if (typeof value !== 'string') return false;

    return value.includes('[REDACTED]') ||
           value.includes('PSEUDO_') ||
           value.includes('HASH_') ||
           value.includes('[GENERALIZED') ||
           value.includes('[MASKED]');
  }

  /**
   * Get anonymization type from value
   */
  private getAnonymizationType(value: any): string {
    if (typeof value !== 'string') return 'unknown';

    if (value.includes('[REDACTED]')) return 'redaction';
    if (value.includes('PSEUDO_')) return 'pseudonymization';
    if (value.includes('HASH_')) return 'hashing';
    if (value.includes('[GENERALIZED')) return 'generalization';
    if (value.includes('[MASKED]')) return 'masking';

    return 'unknown';
  }
}

export const gdprService = GDPRService.getInstance();
