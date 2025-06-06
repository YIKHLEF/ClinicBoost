/**
 * Analytics Service
 * 
 * Core service for generating clinic analytics and reports
 */

import {
  AnalyticsQuery,
  AnalyticsResult,
  ClinicAnalytics,
  PatientAnalytics,
  AppointmentAnalytics,
  FinancialAnalytics,
  TreatmentAnalytics,
  OperationalAnalytics,
  ChartDataPoint,
  TimeSeriesData,
  MetricValue
} from './types';

class AnalyticsService {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get comprehensive clinic analytics
   */
  async getClinicAnalytics(dateRange: { start: Date; end: Date }): Promise<ClinicAnalytics> {
    const cacheKey = `clinic-analytics-${dateRange.start.getTime()}-${dateRange.end.getTime()}`;
    
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const analytics: ClinicAnalytics = {
      patients: await this.getPatientAnalytics(dateRange),
      appointments: await this.getAppointmentAnalytics(dateRange),
      financial: await this.getFinancialAnalytics(dateRange),
      treatments: await this.getTreatmentAnalytics(dateRange),
      operational: await this.getOperationalAnalytics(dateRange),
      period: dateRange,
      generatedAt: new Date()
    };

    this.setCache(cacheKey, analytics);
    return analytics;
  }

  /**
   * Get patient analytics
   */
  async getPatientAnalytics(dateRange: { start: Date; end: Date }): Promise<PatientAnalytics> {
    // In a real implementation, this would query the database
    // For demo purposes, we'll generate realistic sample data
    
    const totalPatients = Math.floor(Math.random() * 1000) + 500;
    const newPatients = Math.floor(Math.random() * 50) + 20;
    
    return {
      totalPatients,
      newPatients,
      activePatients: Math.floor(totalPatients * 0.8),
      patientRetention: 0.85,
      averageAge: 42,
      genderDistribution: {
        male: Math.floor(totalPatients * 0.45),
        female: Math.floor(totalPatients * 0.52),
        other: Math.floor(totalPatients * 0.03)
      },
      riskLevels: {
        low: Math.floor(totalPatients * 0.6),
        medium: Math.floor(totalPatients * 0.25),
        high: Math.floor(totalPatients * 0.12),
        critical: Math.floor(totalPatients * 0.03)
      },
      referralSources: [
        { label: 'Online Search', value: 35 },
        { label: 'Referral', value: 28 },
        { label: 'Social Media', value: 15 },
        { label: 'Walk-in', value: 12 },
        { label: 'Insurance', value: 10 }
      ],
      patientsByMonth: this.generateTimeSeriesData(dateRange, 'patients')
    };
  }

  /**
   * Get appointment analytics
   */
  async getAppointmentAnalytics(dateRange: { start: Date; end: Date }): Promise<AppointmentAnalytics> {
    const totalAppointments = Math.floor(Math.random() * 500) + 200;
    
    return {
      totalAppointments,
      completedAppointments: Math.floor(totalAppointments * 0.85),
      cancelledAppointments: Math.floor(totalAppointments * 0.10),
      noShowRate: 0.05,
      averageDuration: 45,
      utilizationRate: 0.78,
      appointmentsByType: [
        { label: 'Cleaning', value: 35 },
        { label: 'Checkup', value: 25 },
        { label: 'Filling', value: 15 },
        { label: 'Extraction', value: 10 },
        { label: 'Root Canal', value: 8 },
        { label: 'Crown', value: 7 }
      ],
      appointmentsByProvider: [
        { label: 'Dr. Smith', value: 45 },
        { label: 'Dr. Johnson', value: 35 },
        { label: 'Dr. Williams', value: 20 }
      ],
      appointmentsByTime: [
        { label: '8:00-10:00', value: 15 },
        { label: '10:00-12:00', value: 25 },
        { label: '12:00-14:00', value: 20 },
        { label: '14:00-16:00', value: 25 },
        { label: '16:00-18:00', value: 15 }
      ]
    };
  }

  /**
   * Get financial analytics
   */
  async getFinancialAnalytics(dateRange: { start: Date; end: Date }): Promise<FinancialAnalytics> {
    const totalRevenue = Math.floor(Math.random() * 100000) + 50000;
    
    return {
      totalRevenue,
      collectedRevenue: Math.floor(totalRevenue * 0.92),
      outstandingBalance: Math.floor(totalRevenue * 0.08),
      averageTransactionValue: 285,
      revenueByService: [
        { label: 'Cleanings', value: 25000 },
        { label: 'Fillings', value: 18000 },
        { label: 'Crowns', value: 15000 },
        { label: 'Root Canals', value: 12000 },
        { label: 'Extractions', value: 8000 },
        { label: 'Orthodontics', value: 22000 }
      ],
      revenueByMonth: this.generateTimeSeriesData(dateRange, 'revenue'),
      paymentMethods: [
        { label: 'Insurance', value: 45 },
        { label: 'Credit Card', value: 30 },
        { label: 'Cash', value: 15 },
        { label: 'Check', value: 10 }
      ],
      insuranceClaims: {
        submitted: 150,
        approved: 135,
        denied: 8,
        pending: 7
      }
    };
  }

  /**
   * Get treatment analytics
   */
  async getTreatmentAnalytics(dateRange: { start: Date; end: Date }): Promise<TreatmentAnalytics> {
    return {
      totalTreatments: 450,
      averageTreatmentCost: 285,
      treatmentSuccessRate: 0.96,
      treatmentsByType: [
        { label: 'Preventive', value: 40 },
        { label: 'Restorative', value: 30 },
        { label: 'Cosmetic', value: 15 },
        { label: 'Surgical', value: 10 },
        { label: 'Orthodontic', value: 5 }
      ],
      treatmentsByProvider: [
        { label: 'Dr. Smith', value: 180 },
        { label: 'Dr. Johnson', value: 150 },
        { label: 'Dr. Williams', value: 120 }
      ],
      treatmentDuration: [
        { label: '< 30 min', value: 25 },
        { label: '30-60 min', value: 45 },
        { label: '60-90 min', value: 20 },
        { label: '> 90 min', value: 10 }
      ],
      popularTreatments: [
        { label: 'Dental Cleaning', value: 120 },
        { label: 'Composite Filling', value: 85 },
        { label: 'Dental Crown', value: 45 },
        { label: 'Root Canal', value: 35 },
        { label: 'Tooth Extraction', value: 30 }
      ]
    };
  }

  /**
   * Get operational analytics
   */
  async getOperationalAnalytics(dateRange: { start: Date; end: Date }): Promise<OperationalAnalytics> {
    return {
      staffUtilization: [
        { label: 'Dr. Smith', value: 85 },
        { label: 'Dr. Johnson', value: 78 },
        { label: 'Dr. Williams', value: 82 },
        { label: 'Hygienist A', value: 90 },
        { label: 'Hygienist B', value: 88 }
      ],
      roomUtilization: [
        { label: 'Room 1', value: 92 },
        { label: 'Room 2', value: 88 },
        { label: 'Room 3', value: 85 },
        { label: 'Room 4', value: 78 }
      ],
      equipmentUsage: [
        { label: 'X-Ray Machine', value: 75 },
        { label: 'Ultrasonic Scaler', value: 85 },
        { label: 'Dental Drill', value: 90 },
        { label: 'Autoclave', value: 95 }
      ],
      waitTimes: {
        average: 12,
        median: 8,
        percentile95: 25
      },
      patientSatisfaction: {
        average: 4.6,
        distribution: [
          { label: '5 Stars', value: 65 },
          { label: '4 Stars', value: 25 },
          { label: '3 Stars', value: 8 },
          { label: '2 Stars', value: 1 },
          { label: '1 Star', value: 1 }
        ]
      }
    };
  }

  /**
   * Execute custom analytics query
   */
  async executeQuery(query: AnalyticsQuery): Promise<AnalyticsResult> {
    const startTime = Date.now();
    
    // Simulate query execution
    const data = this.generateQueryData(query);
    
    return {
      data,
      total: data.length,
      metadata: {
        query,
        executionTime: Date.now() - startTime,
        cached: false
      }
    };
  }

  /**
   * Generate time series data for charts
   */
  private generateTimeSeriesData(dateRange: { start: Date; end: Date }, type: string): TimeSeriesData[] {
    const data: TimeSeriesData[] = [];
    const days = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i < days; i++) {
      const date = new Date(dateRange.start);
      date.setDate(date.getDate() + i);
      
      let value: number;
      switch (type) {
        case 'patients':
          value = Math.floor(Math.random() * 10) + 5;
          break;
        case 'revenue':
          value = Math.floor(Math.random() * 5000) + 2000;
          break;
        default:
          value = Math.floor(Math.random() * 100);
      }
      
      data.push({ date, value });
    }
    
    return data;
  }

  /**
   * Generate data for custom queries
   */
  private generateQueryData(query: AnalyticsQuery): ChartDataPoint[] {
    const data: ChartDataPoint[] = [];
    const count = Math.floor(Math.random() * 20) + 10;
    
    for (let i = 0; i < count; i++) {
      data.push({
        label: `Item ${i + 1}`,
        value: Math.floor(Math.random() * 1000) + 100,
        category: query.dimensions?.[0] || 'default'
      });
    }
    
    return data;
  }

  /**
   * Cache management
   */
  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any, ttl: number = this.CACHE_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const analyticsService = new AnalyticsService();
