/**
 * Compliance Services Test
 * 
 * Basic tests to verify compliance services are properly configured
 */

import { describe, it, expect } from 'vitest';
import { 
  gdprService, 
  auditService, 
  dataRetentionService, 
  consentService,
  complianceService 
} from '../lib/compliance';

describe('Compliance Services', () => {
  it('should have GDPR service instance', () => {
    expect(gdprService).toBeDefined();
    expect(typeof gdprService.hasConsent).toBe('function');
    expect(typeof gdprService.recordConsent).toBe('function');
    expect(typeof gdprService.exportData).toBe('function');
  });

  it('should have Audit service instance', () => {
    expect(auditService).toBeDefined();
    expect(typeof auditService.logEvent).toBe('function');
    expect(typeof auditService.searchLogs).toBe('function');
    expect(typeof auditService.getStatistics).toBe('function');
  });

  it('should have Data Retention service instance', () => {
    expect(dataRetentionService).toBeDefined();
    expect(typeof dataRetentionService.createRetentionPolicy).toBe('function');
    expect(typeof dataRetentionService.executeRetentionPolicies).toBe('function');
    expect(typeof dataRetentionService.getDataLifecycleReport).toBe('function');
  });

  it('should have Consent service instance', () => {
    expect(consentService).toBeDefined();
    expect(typeof consentService.recordConsent).toBe('function');
    expect(typeof consentService.hasConsent).toBe('function');
    expect(typeof consentService.getConsentPreferences).toBe('function');
  });

  it('should have main Compliance service instance', () => {
    expect(complianceService).toBeDefined();
    expect(typeof complianceService.getComplianceStatus).toBe('function');
    expect(typeof complianceService.getComplianceMetrics).toBe('function');
    expect(typeof complianceService.runHealthCheck).toBe('function');
  });

  it('should have proper consent types', () => {
    const consentBannerConfig = consentService.getConsentBannerConfig();
    expect(consentBannerConfig).toBeDefined();
    expect(consentBannerConfig.showBanner).toBe(true);
    expect(consentBannerConfig.title).toBeDefined();
    expect(consentBannerConfig.description).toBeDefined();
  });
});
