/**
 * Analytics and Reporting Types
 * 
 * Comprehensive type definitions for the clinic analytics system
 */

export interface MetricValue {
  value: number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  period?: string;
  target?: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  date?: Date;
  category?: string;
  color?: string;
}

export interface TimeSeriesData {
  date: Date;
  value: number;
  category?: string;
}

export interface ReportMetric {
  id: string;
  name: string;
  description: string;
  value: MetricValue;
  icon?: string;
  format?: 'number' | 'currency' | 'percentage' | 'duration';
  trend?: TimeSeriesData[];
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter';
  title: string;
  description?: string;
  data: ChartDataPoint[];
  options?: {
    responsive?: boolean;
    maintainAspectRatio?: boolean;
    showLegend?: boolean;
    showTooltips?: boolean;
    colors?: string[];
    height?: number;
    width?: number;
  };
}

export interface ReportFilter {
  id: string;
  name: string;
  type: 'date' | 'select' | 'multiselect' | 'number' | 'text';
  value: any;
  options?: { label: string; value: any }[];
  required?: boolean;
}

export interface ReportSection {
  id: string;
  title: string;
  description?: string;
  type: 'metrics' | 'chart' | 'table' | 'text';
  content: ReportMetric[] | ChartConfig | TableData | string;
  layout?: {
    columns?: number;
    height?: number;
    order?: number;
  };
}

export interface TableData {
  headers: string[];
  rows: (string | number)[][];
  sortable?: boolean;
  searchable?: boolean;
  pagination?: boolean;
}

export interface Report {
  id: string;
  name: string;
  description: string;
  category: string;
  filters: ReportFilter[];
  sections: ReportSection[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isPublic: boolean;
  tags: string[];
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    recipients: string[];
    format: 'pdf' | 'excel' | 'email';
  };
}

export interface DashboardWidget {
  id: string;
  title: string;
  type: 'metric' | 'chart' | 'table' | 'list';
  size: 'small' | 'medium' | 'large';
  position: { x: number; y: number; w: number; h: number };
  config: ReportMetric | ChartConfig | TableData;
  refreshInterval?: number;
}

export interface Dashboard {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv' | 'json';
  filename?: string;
  includeCharts?: boolean;
  includeData?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, any>;
}

export interface AnalyticsQuery {
  metric: string;
  dimensions?: string[];
  filters?: Record<string, any>;
  dateRange: {
    start: Date;
    end: Date;
  };
  groupBy?: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

export interface AnalyticsResult {
  data: ChartDataPoint[];
  total: number;
  metadata: {
    query: AnalyticsQuery;
    executionTime: number;
    cached: boolean;
  };
}

// Clinic-specific analytics types
export interface PatientAnalytics {
  totalPatients: number;
  newPatients: number;
  activePatients: number;
  patientRetention: number;
  averageAge: number;
  genderDistribution: { male: number; female: number; other: number };
  riskLevels: { low: number; medium: number; high: number; critical: number };
  referralSources: ChartDataPoint[];
  patientsByMonth: TimeSeriesData[];
}

export interface AppointmentAnalytics {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowRate: number;
  averageDuration: number;
  appointmentsByType: ChartDataPoint[];
  appointmentsByProvider: ChartDataPoint[];
  appointmentsByTime: ChartDataPoint[];
  utilizationRate: number;
}

export interface FinancialAnalytics {
  totalRevenue: number;
  collectedRevenue: number;
  outstandingBalance: number;
  averageTransactionValue: number;
  revenueByService: ChartDataPoint[];
  revenueByMonth: TimeSeriesData[];
  paymentMethods: ChartDataPoint[];
  insuranceClaims: {
    submitted: number;
    approved: number;
    denied: number;
    pending: number;
  };
}

export interface TreatmentAnalytics {
  totalTreatments: number;
  treatmentsByType: ChartDataPoint[];
  treatmentsByProvider: ChartDataPoint[];
  averageTreatmentCost: number;
  treatmentSuccessRate: number;
  treatmentDuration: ChartDataPoint[];
  popularTreatments: ChartDataPoint[];
}

export interface OperationalAnalytics {
  staffUtilization: ChartDataPoint[];
  roomUtilization: ChartDataPoint[];
  equipmentUsage: ChartDataPoint[];
  waitTimes: {
    average: number;
    median: number;
    percentile95: number;
  };
  patientSatisfaction: {
    average: number;
    distribution: ChartDataPoint[];
  };
}

export interface ClinicAnalytics {
  patients: PatientAnalytics;
  appointments: AppointmentAnalytics;
  financial: FinancialAnalytics;
  treatments: TreatmentAnalytics;
  operational: OperationalAnalytics;
  period: {
    start: Date;
    end: Date;
  };
  generatedAt: Date;
}
