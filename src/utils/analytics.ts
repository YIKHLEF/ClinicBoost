import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter, startOfYear, endOfYear, differenceInDays } from 'date-fns';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface RevenueData {
  date: string;
  amount: number;
  source: string;
  category: string;
}

export interface PatientData {
  date: string;
  newPatients: number;
  activePatients: number;
  inactivePatients: number;
}

export const calculateDateRange = (period: 'week' | 'month' | 'quarter' | 'year', date: Date = new Date()): DateRange => {
  switch (period) {
    case 'week':
      return {
        start: startOfWeek(date),
        end: endOfWeek(date)
      };
    case 'month':
      return {
        start: startOfMonth(date),
        end: endOfMonth(date)
      };
    case 'quarter':
      return {
        start: startOfQuarter(date),
        end: endOfQuarter(date)
      };
    case 'year':
      return {
        start: startOfYear(date),
        end: endOfYear(date)
      };
    default:
      throw new Error(`Unsupported period: ${period}`);
  }
};

export const calculateGrowth = (current: number, previous: number): number => {
  if (previous === 0) return 100;
  return ((current - previous) / previous) * 100;
};

export const formatCurrency = (amount: number, locale: string = 'fr-MA'): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const aggregateRevenueData = (data: RevenueData[], dateRange: DateRange) => {
  const days = differenceInDays(dateRange.end, dateRange.start);
  const aggregated = [];
  
  for (let i = 0; i <= days; i++) {
    const date = format(subDays(dateRange.end, i), 'yyyy-MM-dd');
    const dayData = data.filter(item => item.date === date);
    
    aggregated.unshift({
      date,
      total: dayData.reduce((sum, item) => sum + item.amount, 0),
      bySource: dayData.reduce((acc, item) => {
        acc[item.source] = (acc[item.source] || 0) + item.amount;
        return acc;
      }, {} as Record<string, number>),
      byCategory: dayData.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + item.amount;
        return acc;
      }, {} as Record<string, number>)
    });
  }
  
  return aggregated;
};

export const calculateKPIs = (data: RevenueData[], dateRange: DateRange) => {
  const totalRevenue = data.reduce((sum, item) => sum + item.amount, 0);
  const days = differenceInDays(dateRange.end, dateRange.start) + 1;
  const avgDailyRevenue = totalRevenue / days;

  const revenueBySource = data.reduce((acc, item) => {
    acc[item.source] = (acc[item.source] || 0) + item.amount;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalRevenue,
    avgDailyRevenue,
    revenueBySource
  };
};

export const analyzePatientTrends = (data: PatientData[], dateRange: DateRange) => {
  if (data.length === 0) {
    return {
      totalNewPatients: 0,
      avgNewPatientsPerDay: 0,
      retentionRate: 0
    };
  }

  const totalNewPatients = data.reduce((sum, item) => sum + item.newPatients, 0);
  const days = differenceInDays(dateRange.end, dateRange.start) + 1;
  const avgNewPatientsPerDay = totalNewPatients / days;

  const latestActivePatients = data[data.length - 1]?.activePatients || 0;
  const latestInactivePatients = data[data.length - 1]?.inactivePatients || 0;
  const totalPatients = latestActivePatients + latestInactivePatients;

  const retentionRate = totalPatients > 0 ? (latestActivePatients / totalPatients) * 100 : 0;

  return {
    totalNewPatients,
    avgNewPatientsPerDay,
    retentionRate
  };
};