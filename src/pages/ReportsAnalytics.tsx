/**
 * Reports & Analytics Dashboard
 * 
 * Comprehensive reporting and analytics interface with data visualization,
 * export functionality, and custom report builder
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ChartContainer } from '../components/charts/ChartComponents';
import { ReportBuilder } from '../components/reports/ReportBuilder';
import { exportService } from '../lib/export/exportService';
import { analyticsService } from '../lib/analytics/analyticsService';
import useTranslation from '../hooks/useTranslation';
import {
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
  FileText,
  Download,
  Plus,
  Eye,
  Settings,
  Filter,
  RefreshCw,
  Share,
  Clock,
  Activity,
  Target,
  Zap
} from 'lucide-react';
import {
  ClinicAnalytics,
  ChartConfig,
  Report,
  ExportOptions
} from '../lib/analytics/types';

const ReportsAnalytics: React.FC = () => {
  const { t, tCommon, format } = useTranslation();

  // State management
  const [activeView, setActiveView] = useState<'dashboard' | 'builder' | 'report'>('dashboard');
  const [analytics, setAnalytics] = useState<ClinicAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDateRange, setSelectedDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end: new Date()
  });
  const [savedReports, setSavedReports] = useState<Report[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // Load analytics data
  useEffect(() => {
    loadAnalytics();
  }, [selectedDateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const data = await analyticsService.getClinicAnalytics(selectedDateRange);
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle export
  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    if (!analytics) return;

    setIsExporting(true);
    try {
      const options: ExportOptions = {
        format,
        filename: `clinic-report-${new Date().toISOString().split('T')[0]}`,
        includeCharts: true,
        includeData: true,
        dateRange: selectedDateRange
      };

      if (format === 'pdf') {
        await exportService.exportToPDF('reports-dashboard', options);
      } else if (format === 'excel') {
        const exportData = [
          { metric: 'Total Patients', value: analytics.patients.totalPatients },
          { metric: 'New Patients', value: analytics.patients.newPatients },
          { metric: 'Total Appointments', value: analytics.appointments.totalAppointments },
          { metric: 'Total Revenue', value: analytics.financial.totalRevenue },
        ];
        await exportService.exportToExcel(exportData, options);
      } else if (format === 'csv') {
        const exportData = [
          { metric: 'Total Patients', value: analytics.patients.totalPatients },
          { metric: 'New Patients', value: analytics.patients.newPatients },
          { metric: 'Total Appointments', value: analytics.appointments.totalAppointments },
          { metric: 'Total Revenue', value: analytics.financial.totalRevenue },
        ];
        await exportService.exportToCSV(exportData, options);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert(t('reports.export.error'));
    } finally {
      setIsExporting(false);
    }
  };

  // Handle report save
  const handleReportSave = (report: Report) => {
    setSavedReports(prev => [...prev, report]);
    setActiveView('dashboard');
    alert(t('reports.builder.saved'));
  };

  // Handle report preview
  const handleReportPreview = (report: Report) => {
    console.log('Preview report:', report);
    alert(t('reports.builder.previewNotImplemented'));
  };

  // Quick stats data
  const quickStats = analytics ? [
    {
      title: t('reports.stats.totalPatients'),
      value: analytics.patients.totalPatients.toLocaleString(),
      change: '+12%',
      changeType: 'increase' as const,
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: t('reports.stats.thisMonth'),
      value: analytics.appointments.totalAppointments.toLocaleString(),
      change: '+8%',
      changeType: 'increase' as const,
      icon: Calendar,
      color: 'bg-green-500'
    },
    {
      title: t('reports.stats.revenue'),
      value: format({ currency: analytics.financial.totalRevenue }).currency || '$0',
      change: '+15%',
      changeType: 'increase' as const,
      icon: DollarSign,
      color: 'bg-yellow-500'
    },
    {
      title: t('reports.stats.satisfaction'),
      value: `${analytics.operational.patientSatisfaction.average}/5`,
      change: '+0.2',
      changeType: 'increase' as const,
      icon: TrendingUp,
      color: 'bg-purple-500'
    }
  ] : [];

  // Chart configurations
  const chartConfigs: ChartConfig[] = analytics ? [
    {
      type: 'line',
      title: t('reports.charts.patientGrowth'),
      data: analytics.patients.patientsByMonth.map(item => ({
        label: format({ date: item.date }).date || '',
        value: item.value
      }))
    },
    {
      type: 'bar',
      title: t('reports.charts.appointmentsByType'),
      data: analytics.appointments.appointmentsByType
    },
    {
      type: 'pie',
      title: t('reports.charts.revenueByService'),
      data: analytics.financial.revenueByService
    },
    {
      type: 'doughnut',
      title: t('reports.charts.patientSatisfaction'),
      data: analytics.operational.patientSatisfaction.distribution
    }
  ] : [];

  if (activeView === 'builder') {
    return (
      <ReportBuilder
        onSave={handleReportSave}
        onPreview={handleReportPreview}
      />
    );
  }

  return (
    <div id="reports-dashboard" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('reports.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('reports.subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => loadAnalytics()} disabled={loading}>
            <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            {tCommon('refresh')}
          </Button>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('pdf')}
              disabled={isExporting || !analytics}
            >
              <Download size={16} className="mr-1" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('excel')}
              disabled={isExporting || !analytics}
            >
              <Download size={16} className="mr-1" />
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('csv')}
              disabled={isExporting || !analytics}
            >
              <Download size={16} className="mr-1" />
              CSV
            </Button>
          </div>
          <Button onClick={() => setActiveView('builder')}>
            <Plus size={16} className="mr-2" />
            {t('reports.createCustom')}
          </Button>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('reports.dateRange')}:
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={selectedDateRange.start.toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDateRange(prev => ({
                    ...prev,
                    start: new Date(e.target.value)
                  }))}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={selectedDateRange.end.toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDateRange(prev => ({
                    ...prev,
                    end: new Date(e.target.value)
                  }))}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock size={14} />
              {analytics && (
                <span>
                  {t('reports.lastUpdated')}: {format({ time: analytics.generatedAt }).time}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stat.value}
                  </p>
                  <div className="flex items-center mt-2">
                    <TrendingUp size={14} className="text-green-500 mr-1" />
                    <span className="text-sm text-green-500 font-medium">
                      {stat.change}
                    </span>
                    <span className="text-sm text-gray-500 ml-1">
                      {t('reports.fromLastPeriod')}
                    </span>
                  </div>
                </div>
                <div className={`p-3 ${stat.color} rounded-lg`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {chartConfigs.map((config, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 size={20} />
                {config.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={config}
                loading={loading}
                className="h-64"
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Saved Reports */}
      {savedReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText size={20} />
              {t('reports.savedReports')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedReports.map((report) => (
                <div
                  key={report.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {report.name}
                    </h4>
                    <Badge variant="secondary">{report.category}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {report.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {format({ date: report.createdAt }).date}
                    </span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline">
                        <Eye size={14} className="mr-1" />
                        {tCommon('view')}
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReportsAnalytics;
