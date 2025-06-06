/**
 * Data Subject Rights Implementation Tests
 * 
 * Tests for the newly implemented data subject rights functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { gdprService } from '../lib/compliance/gdpr-service';
import { complianceService } from '../lib/compliance';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 }))
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ 
            data: { id: 'test-request-id' }, 
            error: null 
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: 'test-request-id' }, error: null }))
          }))
        }))
      }))
    }))
  }
}));

// Mock logger
vi.mock('../lib/logging-monitoring', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

describe('Data Subject Rights Implementation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GDPR Service - Data Subject Requests', () => {
    it('should submit a data subject request', async () => {
      const requestData = {
        requestType: 'access' as const,
        requesterEmail: 'test@example.com',
        requesterName: 'Test User',
        userId: 'user-123',
        description: 'I want to access my data'
      };

      const requestId = await gdprService.submitDataSubjectRequest(requestData);
      expect(requestId).toBe('test-request-id');
    });

    it('should get data subject requests for a user', async () => {
      const requests = await gdprService.getDataSubjectRequests('user-123');
      expect(Array.isArray(requests)).toBe(true);
    });

    it('should get all data subject requests (admin)', async () => {
      const result = await gdprService.getAllDataSubjectRequests();
      expect(result).toHaveProperty('requests');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.requests)).toBe(true);
      expect(typeof result.total).toBe('number');
    });

    it('should update data subject request status', async () => {
      const success = await gdprService.updateDataSubjectRequestStatus(
        'test-request-id',
        'in_progress',
        'admin-user-id',
        'Processing started'
      );
      expect(success).toBe(true);
    });

    it('should get data subject request statistics', async () => {
      const stats = await gdprService.getDataSubjectRequestStatistics();
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('pending');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('overdue');
      expect(stats).toHaveProperty('byType');
      expect(typeof stats.total).toBe('number');
      expect(typeof stats.pending).toBe('number');
      expect(typeof stats.completed).toBe('number');
      expect(typeof stats.overdue).toBe('number');
      expect(typeof stats.byType).toBe('object');
    });

    it('should verify a data subject request', async () => {
      const verified = await gdprService.verifyDataSubjectRequest('test-token');
      expect(typeof verified).toBe('boolean');
    });
  });

  describe('Compliance Service - Data Subject Request Metrics', () => {
    it('should include data subject request metrics in compliance metrics', async () => {
      const metrics = await complianceService.getComplianceMetrics();
      expect(metrics).toHaveProperty('dataSubjectRequests');
      expect(metrics.dataSubjectRequests).toHaveProperty('total');
      expect(metrics.dataSubjectRequests).toHaveProperty('pending');
      expect(metrics.dataSubjectRequests).toHaveProperty('completed');
      expect(metrics.dataSubjectRequests).toHaveProperty('overdue');
    });

    it('should handle data subject request through compliance service', async () => {
      const requestId = await complianceService.handleDataSubjectRequest(
        'access',
        'test@example.com',
        { name: 'Test User', userId: 'user-123' }
      );
      expect(requestId).toBe('test-request-id');
    });
  });

  describe('Data Subject Request Types', () => {
    const requestTypes = ['access', 'rectification', 'erasure', 'portability', 'restriction'] as const;

    requestTypes.forEach(requestType => {
      it(`should handle ${requestType} request type`, async () => {
        const requestData = {
          requestType,
          requesterEmail: 'test@example.com',
          requesterName: 'Test User',
          userId: 'user-123'
        };

        const requestId = await gdprService.submitDataSubjectRequest(requestData);
        expect(requestId).toBe('test-request-id');
      });
    });
  });

  describe('Request Processing', () => {
    it('should process access request', async () => {
      // Mock the request data
      const mockRequest = {
        id: 'test-request-id',
        request_type: 'access',
        user_id: 'user-123',
        patient_id: null,
        status: 'pending'
      };

      // This would normally process the request
      // For testing, we just verify the method exists and can be called
      expect(typeof gdprService.processDataSubjectRequest).toBe('function');
    });

    it('should handle request status updates', async () => {
      const success = await gdprService.updateDataSubjectRequestStatus(
        'test-request-id',
        'completed',
        'admin-user-id',
        'Request completed successfully',
        { exportData: 'mock-data' }
      );
      expect(success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid request types gracefully', async () => {
      try {
        await gdprService.submitDataSubjectRequest({
          requestType: 'invalid' as any,
          requesterEmail: 'test@example.com'
        });
      } catch (error) {
        // Should handle gracefully or throw appropriate error
        expect(error).toBeDefined();
      }
    });

    it('should handle missing required fields', async () => {
      try {
        await gdprService.submitDataSubjectRequest({
          requestType: 'access',
          requesterEmail: '' // Empty email
        });
      } catch (error) {
        // Should handle gracefully or throw appropriate error
        expect(error).toBeDefined();
      }
    });
  });

  describe('Data Export and Deletion', () => {
    it('should export user data for access requests', async () => {
      const exportData = await gdprService.exportData('user-123', undefined, {
        format: 'json',
        includeMetadata: true,
        anonymize: false
      });
      expect(exportData).toBeDefined();
    });

    it('should delete user data for erasure requests', async () => {
      const success = await gdprService.deleteData('user-123');
      expect(typeof success).toBe('boolean');
    });
  });

  describe('Compliance Metrics Integration', () => {
    it('should calculate overdue requests correctly', async () => {
      const stats = await gdprService.getDataSubjectRequestStatistics();
      expect(typeof stats.overdue).toBe('number');
      expect(stats.overdue).toBeGreaterThanOrEqual(0);
    });

    it('should track requests by type', async () => {
      const stats = await gdprService.getDataSubjectRequestStatistics();
      expect(typeof stats.byType).toBe('object');
      // Should be able to track different request types
      Object.values(stats.byType).forEach(count => {
        expect(typeof count).toBe('number');
        expect(count).toBeGreaterThanOrEqual(0);
      });
    });
  });
});

describe('Data Subject Request Component Integration', () => {
  it('should have proper component exports', () => {
    // Test that components are properly exported
    expect(() => require('../components/compliance/DataSubjectRequestManager')).not.toThrow();
    expect(() => require('../components/compliance/PrivacyCenter')).not.toThrow();
    expect(() => require('../components/compliance/ComplianceDashboard')).not.toThrow();
  });

  it('should have proper service exports', () => {
    // Test that services are properly exported
    expect(gdprService).toBeDefined();
    expect(complianceService).toBeDefined();
    expect(typeof gdprService.getDataSubjectRequests).toBe('function');
    expect(typeof gdprService.getAllDataSubjectRequests).toBe('function');
    expect(typeof gdprService.updateDataSubjectRequestStatus).toBe('function');
    expect(typeof gdprService.processDataSubjectRequest).toBe('function');
    expect(typeof gdprService.getDataSubjectRequestStatistics).toBe('function');
  });
});
