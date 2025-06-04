import { describe, it, expect, vi } from 'vitest';
import { createCampaign, analyzeCampaignPerformance } from './campaign';

describe('Campaign Utils', () => {
  describe('createCampaign', () => {
    it('should create a campaign with default values', () => {
      const campaign = createCampaign({
        name: 'Test Campaign'
      });

      expect(campaign.name).toBe('Test Campaign');
      expect(campaign.status).toBe('draft');
      expect(campaign.metrics.sent).toBe(0);
    });

    it('should merge provided data with defaults', () => {
      const campaign = createCampaign({
        name: 'Test Campaign',
        type: 'promotional',
        status: 'scheduled'
      });

      expect(campaign.name).toBe('Test Campaign');
      expect(campaign.type).toBe('promotional');
      expect(campaign.status).toBe('scheduled');
    });
  });

  describe('analyzeCampaignPerformance', () => {
    it('should calculate correct performance metrics', () => {
      const campaign = createCampaign({
        name: 'Test Campaign',
        metrics: {
          sent: 100,
          delivered: 90,
          opened: 45,
          responded: 30,
          converted: 15
        }
      });

      const performance = analyzeCampaignPerformance(campaign);

      expect(performance.deliveryRate).toBe(90);
      expect(performance.openRate).toBe(50);
      expect(performance.responseRate).toBeCloseTo(33.33, 2);
      expect(performance.conversionRate).toBe(16.666666666666668);
    });
  });
});