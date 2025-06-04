import { describe, it, expect } from 'vitest';
import {
  calculateDateRange,
  calculateGrowth,
  formatCurrency,
  aggregateRevenueData,
  calculateKPIs,
  analyzePatientTrends
} from './analytics';

describe('Analytics Utils', () => {
  describe('calculateDateRange', () => {
    it('should return correct date range for week', () => {
      const testDate = new Date('2024-03-15'); // Friday
      const range = calculateDateRange('week', testDate);
      expect(range.start).toBeDefined();
      expect(range.end).toBeDefined();
      // Week should be approximately 7 days (allowing for timezone differences)
      const days = (range.end.getTime() - range.start.getTime()) / (24 * 60 * 60 * 1000);
      expect(days).toBeGreaterThan(6.9);
      expect(days).toBeLessThan(7.1);
    });

    it('should return correct date range for month', () => {
      const testDate = new Date('2024-03-15');
      const range = calculateDateRange('month', testDate);
      expect(range.start).toBeDefined();
      expect(range.end).toBeDefined();
      expect(range.start.getMonth()).toBe(range.end.getMonth());
    });

    it('should return correct date range for quarter', () => {
      const testDate = new Date('2024-03-15');
      const range = calculateDateRange('quarter', testDate);
      expect(range.start).toBeDefined();
      expect(range.end).toBeDefined();
      // Quarter length varies, so just check it's reasonable (80-95 days)
      const days = (range.end.getTime() - range.start.getTime()) / (24 * 60 * 60 * 1000);
      expect(days).toBeGreaterThan(80);
      expect(days).toBeLessThan(95);
    });

    it('should return correct date range for year', () => {
      const testDate = new Date('2024-03-15');
      const range = calculateDateRange('year', testDate);
      expect(range.start).toBeDefined();
      expect(range.end).toBeDefined();
      // Year length varies (365-366 days), so check it's reasonable
      const days = (range.end.getTime() - range.start.getTime()) / (24 * 60 * 60 * 1000);
      expect(days).toBeGreaterThan(364);
      expect(days).toBeLessThan(367);
    });
  });

  describe('calculateGrowth', () => {
    it('should calculate positive growth correctly', () => {
      expect(calculateGrowth(110, 100)).toBe(10);
    });

    it('should calculate negative growth correctly', () => {
      expect(calculateGrowth(90, 100)).toBe(-10);
    });

    it('should handle zero previous value', () => {
      expect(calculateGrowth(100, 0)).toBe(100);
    });

    it('should handle zero current value', () => {
      expect(calculateGrowth(0, 100)).toBe(-100);
    });
  });

  describe('formatCurrency', () => {
    it('should format currency correctly for Morocco', () => {
      expect(formatCurrency(1000)).toMatch(/1[,.]000/);
      expect(formatCurrency(1000)).toContain('MAD');
    });

    it('should format large numbers correctly', () => {
      expect(formatCurrency(1000000)).toMatch(/1[,.]000[,.]000/);
    });

    it('should handle zero', () => {
      expect(formatCurrency(0)).toMatch(/0/);
    });

    it('should handle negative numbers', () => {
      expect(formatCurrency(-1000)).toMatch(/-/);
    });
  });

  describe('aggregateRevenueData', () => {
    const mockData = [
      { date: '2024-03-01', amount: 1000, source: 'direct', category: 'treatment' },
      { date: '2024-03-01', amount: 500, source: 'insurance', category: 'checkup' },
      { date: '2024-03-02', amount: 750, source: 'direct', category: 'treatment' }
    ];

    it('should aggregate revenue data correctly', () => {
      const range = {
        start: new Date('2024-03-01'),
        end: new Date('2024-03-02')
      };

      const result = aggregateRevenueData(mockData, range);
      expect(result).toHaveLength(2);
      expect(result[0].total).toBe(1500);
      expect(result[1].total).toBe(750);
    });

    it('should calculate source breakdowns correctly', () => {
      const range = {
        start: new Date('2024-03-01'),
        end: new Date('2024-03-01')
      };

      const result = aggregateRevenueData(mockData, range);
      expect(result[0].bySource.direct).toBe(1000);
      expect(result[0].bySource.insurance).toBe(500);
    });

    it('should calculate category breakdowns correctly', () => {
      const range = {
        start: new Date('2024-03-01'),
        end: new Date('2024-03-01')
      };

      const result = aggregateRevenueData(mockData, range);
      expect(result[0].byCategory.treatment).toBe(1000);
      expect(result[0].byCategory.checkup).toBe(500);
    });
  });

  describe('calculateKPIs', () => {
    const mockData = [
      { date: '2024-03-01', amount: 1000, source: 'direct', category: 'treatment' },
      { date: '2024-03-01', amount: 500, source: 'insurance', category: 'checkup' },
      { date: '2024-03-02', amount: 750, source: 'direct', category: 'treatment' }
    ];

    it('should calculate total revenue correctly', () => {
      const range = {
        start: new Date('2024-03-01'),
        end: new Date('2024-03-02')
      };

      const kpis = calculateKPIs(mockData, range);
      expect(kpis.totalRevenue).toBe(2250);
    });

    it('should calculate average daily revenue correctly', () => {
      const range = {
        start: new Date('2024-03-01'),
        end: new Date('2024-03-02')
      };

      const kpis = calculateKPIs(mockData, range);
      expect(kpis.avgDailyRevenue).toBe(1125);
    });

    it('should calculate revenue by source correctly', () => {
      const range = {
        start: new Date('2024-03-01'),
        end: new Date('2024-03-02')
      };

      const kpis = calculateKPIs(mockData, range);
      expect(kpis.revenueBySource.direct).toBe(1750);
      expect(kpis.revenueBySource.insurance).toBe(500);
    });
  });

  describe('analyzePatientTrends', () => {
    const mockData = [
      { date: '2024-03-01', newPatients: 5, activePatients: 100, inactivePatients: 20 },
      { date: '2024-03-02', newPatients: 3, activePatients: 102, inactivePatients: 21 }
    ];

    it('should calculate total new patients correctly', () => {
      const range = {
        start: new Date('2024-03-01'),
        end: new Date('2024-03-02')
      };

      const trends = analyzePatientTrends(mockData, range);
      expect(trends.totalNewPatients).toBe(8);
    });

    it('should calculate average new patients per day correctly', () => {
      const range = {
        start: new Date('2024-03-01'),
        end: new Date('2024-03-02')
      };

      const trends = analyzePatientTrends(mockData, range);
      expect(trends.avgNewPatientsPerDay).toBe(4);
    });

    it('should calculate retention rate correctly', () => {
      const range = {
        start: new Date('2024-03-01'),
        end: new Date('2024-03-02')
      };

      const trends = analyzePatientTrends(mockData, range);
      expect(trends.retentionRate).toBeCloseTo(82.93, 2);
    });

    it('should handle empty data correctly', () => {
      const range = {
        start: new Date('2024-03-01'),
        end: new Date('2024-03-02')
      };

      const trends = analyzePatientTrends([], range);
      expect(trends.totalNewPatients).toBe(0);
      expect(trends.avgNewPatientsPerDay).toBe(0);
      expect(trends.retentionRate).toBe(0);
    });
  });
});