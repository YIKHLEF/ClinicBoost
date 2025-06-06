/**
 * Consent Management Service
 * 
 * Manages user consent for various data processing activities including:
 * - Cookie consent
 * - Analytics consent
 * - Marketing consent
 * - Data processing consent
 * - Third-party sharing consent
 */

import { supabase } from '../supabase';
import { logger } from '../logging-monitoring';
import { auditService } from './audit-service';
import type { Database } from '../database.types';

type ConsentRecord = Database['public']['Tables']['consent_records']['Row'];

export type ConsentType = 'cookies' | 'analytics' | 'marketing' | 'data_processing' | 'third_party_sharing';
export type ConsentStatus = 'granted' | 'denied' | 'pending' | 'withdrawn';

export interface ConsentRequest {
  userId?: string;
  patientId?: string;
  consentType: ConsentType;
  status: ConsentStatus;
  ipAddress?: string;
  userAgent?: string;
  consentText?: string;
  version?: string;
}

export interface ConsentPreferences {
  cookies: boolean;
  analytics: boolean;
  marketing: boolean;
  dataProcessing: boolean;
  thirdPartySharing: boolean;
}

export interface ConsentBannerConfig {
  showBanner: boolean;
  title: string;
  description: string;
  acceptAllText: string;
  rejectAllText: string;
  customizeText: string;
  privacyPolicyUrl: string;
  cookiePolicyUrl: string;
  position: 'top' | 'bottom';
  theme: 'light' | 'dark';
}

export interface ConsentHistory {
  consentType: ConsentType;
  status: ConsentStatus;
  grantedAt?: string;
  withdrawnAt?: string;
  version: string;
  ipAddress?: string;
  userAgent?: string;
}

export class ConsentService {
  private static instance: ConsentService;
  private consentCache = new Map<string, ConsentPreferences>();

  public static getInstance(): ConsentService {
    if (!ConsentService.instance) {
      ConsentService.instance = new ConsentService();
    }
    return ConsentService.instance;
  }

  /**
   * Record consent for a specific type
   */
  async recordConsent(consentRequest: ConsentRequest): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('record_consent', {
        p_user_id: consentRequest.userId || null,
        p_patient_id: consentRequest.patientId || null,
        p_consent_type: consentRequest.consentType,
        p_status: consentRequest.status,
        p_ip_address: consentRequest.ipAddress || null,
        p_user_agent: consentRequest.userAgent || null,
        p_consent_text: consentRequest.consentText || null,
        p_version: consentRequest.version || '1.0'
      });

      if (error) throw error;

      // Clear cache for this user/patient
      const cacheKey = consentRequest.userId || consentRequest.patientId || '';
      this.consentCache.delete(cacheKey);

      // Log the consent action
      await auditService.logEvent({
        userId: consentRequest.userId,
        action: `consent_${consentRequest.status}`,
        resourceType: 'consent',
        resourceId: data,
        newData: {
          consentType: consentRequest.consentType,
          status: consentRequest.status,
          version: consentRequest.version
        },
        ipAddress: consentRequest.ipAddress,
        userAgent: consentRequest.userAgent,
        complianceFlags: ['gdpr', 'consent_management'],
        riskLevel: consentRequest.status === 'withdrawn' ? 'medium' : 'low'
      });

      logger.info('Consent recorded successfully', 'consent-service', {
        consentId: data,
        consentType: consentRequest.consentType,
        status: consentRequest.status,
        userId: consentRequest.userId,
        patientId: consentRequest.patientId
      });

      return data;
    } catch (error) {
      logger.error('Failed to record consent', 'consent-service', { error, consentRequest });
      throw error;
    }
  }

  /**
   * Check if consent is granted for a specific type
   */
  async hasConsent(
    userId?: string,
    patientId?: string,
    consentType?: ConsentType
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
      logger.error('Failed to check consent', 'consent-service', { error, userId, patientId, consentType });
      return false;
    }
  }

  /**
   * Get all consent preferences for a user/patient
   */
  async getConsentPreferences(userId?: string, patientId?: string): Promise<ConsentPreferences> {
    try {
      const cacheKey = userId || patientId || '';
      
      // Check cache first
      if (this.consentCache.has(cacheKey)) {
        return this.consentCache.get(cacheKey)!;
      }

      // Fetch from database
      const consentTypes: ConsentType[] = ['cookies', 'analytics', 'marketing', 'data_processing', 'third_party_sharing'];
      const preferences: ConsentPreferences = {
        cookies: false,
        analytics: false,
        marketing: false,
        dataProcessing: false,
        thirdPartySharing: false
      };

      for (const type of consentTypes) {
        const hasConsentForType = await this.hasConsent(userId, patientId, type);
        switch (type) {
          case 'cookies':
            preferences.cookies = hasConsentForType;
            break;
          case 'analytics':
            preferences.analytics = hasConsentForType;
            break;
          case 'marketing':
            preferences.marketing = hasConsentForType;
            break;
          case 'data_processing':
            preferences.dataProcessing = hasConsentForType;
            break;
          case 'third_party_sharing':
            preferences.thirdPartySharing = hasConsentForType;
            break;
        }
      }

      // Cache the result
      this.consentCache.set(cacheKey, preferences);

      return preferences;
    } catch (error) {
      logger.error('Failed to get consent preferences', 'consent-service', { error, userId, patientId });
      return {
        cookies: false,
        analytics: false,
        marketing: false,
        dataProcessing: false,
        thirdPartySharing: false
      };
    }
  }

  /**
   * Update multiple consent preferences at once
   */
  async updateConsentPreferences(
    preferences: Partial<ConsentPreferences>,
    userId?: string,
    patientId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<boolean> {
    try {
      const consentMappings: Array<{ type: ConsentType; granted: boolean }> = [];

      if (preferences.cookies !== undefined) {
        consentMappings.push({ type: 'cookies', granted: preferences.cookies });
      }
      if (preferences.analytics !== undefined) {
        consentMappings.push({ type: 'analytics', granted: preferences.analytics });
      }
      if (preferences.marketing !== undefined) {
        consentMappings.push({ type: 'marketing', granted: preferences.marketing });
      }
      if (preferences.dataProcessing !== undefined) {
        consentMappings.push({ type: 'data_processing', granted: preferences.dataProcessing });
      }
      if (preferences.thirdPartySharing !== undefined) {
        consentMappings.push({ type: 'third_party_sharing', granted: preferences.thirdPartySharing });
      }

      // Record each consent
      for (const mapping of consentMappings) {
        await this.recordConsent({
          userId,
          patientId,
          consentType: mapping.type,
          status: mapping.granted ? 'granted' : 'denied',
          ipAddress,
          userAgent
        });
      }

      // Clear cache
      const cacheKey = userId || patientId || '';
      this.consentCache.delete(cacheKey);

      logger.info('Consent preferences updated', 'consent-service', {
        userId,
        patientId,
        updatedPreferences: preferences
      });

      return true;
    } catch (error) {
      logger.error('Failed to update consent preferences', 'consent-service', { error, preferences, userId, patientId });
      throw error;
    }
  }

  /**
   * Get consent history for a user/patient
   */
  async getConsentHistory(userId?: string, patientId?: string): Promise<ConsentHistory[]> {
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

      return (data || []).map(record => ({
        consentType: record.consent_type,
        status: record.status,
        grantedAt: record.granted_at,
        withdrawnAt: record.withdrawn_at,
        version: record.version,
        ipAddress: record.ip_address,
        userAgent: record.user_agent
      }));
    } catch (error) {
      logger.error('Failed to get consent history', 'consent-service', { error, userId, patientId });
      throw error;
    }
  }

  /**
   * Withdraw all consents for a user/patient
   */
  async withdrawAllConsents(
    userId?: string,
    patientId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<boolean> {
    try {
      const consentTypes: ConsentType[] = ['cookies', 'analytics', 'marketing', 'data_processing', 'third_party_sharing'];

      for (const type of consentTypes) {
        await this.recordConsent({
          userId,
          patientId,
          consentType: type,
          status: 'withdrawn',
          ipAddress,
          userAgent
        });
      }

      // Clear cache
      const cacheKey = userId || patientId || '';
      this.consentCache.delete(cacheKey);

      logger.info('All consents withdrawn', 'consent-service', { userId, patientId });
      return true;
    } catch (error) {
      logger.error('Failed to withdraw all consents', 'consent-service', { error, userId, patientId });
      throw error;
    }
  }

  /**
   * Get consent banner configuration
   */
  getConsentBannerConfig(): ConsentBannerConfig {
    return {
      showBanner: true,
      title: 'We value your privacy',
      description: 'We use cookies and similar technologies to provide, protect and improve our services. By clicking "Accept All", you consent to our use of cookies.',
      acceptAllText: 'Accept All',
      rejectAllText: 'Reject All',
      customizeText: 'Customize',
      privacyPolicyUrl: '/privacy-policy',
      cookiePolicyUrl: '/cookie-policy',
      position: 'bottom',
      theme: 'light'
    };
  }

  /**
   * Check if consent banner should be shown
   */
  async shouldShowConsentBanner(userId?: string, patientId?: string): Promise<boolean> {
    try {
      // Check if user has any consent records
      let query = supabase
        .from('consent_records')
        .select('id', { count: 'exact', head: true });

      if (userId) {
        query = query.eq('user_id', userId);
      } else if (patientId) {
        query = query.eq('patient_id', patientId);
      } else {
        // For anonymous users, check localStorage or show banner
        return !localStorage.getItem('consent-banner-dismissed');
      }

      const { count, error } = await query;
      if (error) throw error;

      // Show banner if no consent records exist
      return (count || 0) === 0;
    } catch (error) {
      logger.error('Failed to check if consent banner should be shown', 'consent-service', { error, userId, patientId });
      return true; // Show banner on error to be safe
    }
  }

  /**
   * Dismiss consent banner for anonymous users
   */
  dismissConsentBanner(): void {
    localStorage.setItem('consent-banner-dismissed', 'true');
  }

  /**
   * Clear consent cache
   */
  clearCache(): void {
    this.consentCache.clear();
  }

  /**
   * Get consent statistics for compliance reporting
   */
  async getConsentStatistics(): Promise<{
    totalConsents: number;
    consentsByType: Record<ConsentType, number>;
    consentsByStatus: Record<ConsentStatus, number>;
    recentConsents: ConsentRecord[];
  }> {
    try {
      const { data: allConsents, error } = await supabase
        .from('consent_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const consents = allConsents || [];
      
      // Count by type
      const consentsByType: Record<ConsentType, number> = {
        cookies: 0,
        analytics: 0,
        marketing: 0,
        data_processing: 0,
        third_party_sharing: 0
      };

      // Count by status
      const consentsByStatus: Record<ConsentStatus, number> = {
        granted: 0,
        denied: 0,
        pending: 0,
        withdrawn: 0
      };

      consents.forEach(consent => {
        consentsByType[consent.consent_type]++;
        consentsByStatus[consent.status]++;
      });

      return {
        totalConsents: consents.length,
        consentsByType,
        consentsByStatus,
        recentConsents: consents.slice(0, 10)
      };
    } catch (error) {
      logger.error('Failed to get consent statistics', 'consent-service', { error });
      throw error;
    }
  }
}

export const consentService = ConsentService.getInstance();
