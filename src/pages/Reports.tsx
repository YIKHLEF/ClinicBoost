import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter 
} from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { BarChart3, LineChart as LineChartIcon, Download, Calendar, FileText, File as FilePdf, FileSpreadsheet, FileDown, FileUp, ArrowUpRight, ArrowDownRight, Info, Users, UserCheck, User, UserMinus, DollarSign, CalendarCheck } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// Mock data for revenue report
const revenueData = [
  { name: 'Jan', revenue: 35000, target: 30000 },
  { name: 'Feb', revenue: 28000, target: 30000 },
  { name: 'Mar', revenue: 32000, target: 30000 },
  { name: 'Apr', revenue: 37000, target: 35000 },
  { name: 'May', revenue: 42000, target: 35000 },
  { name: 'Jun', revenue: 45000, target: 40000 },
];

// Mock data for patient report
const patientData = [
  { name: 'Jan', new: 12, returning: 48 },
  { name: 'Feb', new: 9, returning: 45 },
  { name: 'Mar', new: 15, returning: 52 },
  { name: 'Apr', new: 18, returning: 57 },
  { name: 'May', new: 21, returning: 55 },
  { name: 'Jun', new: 14, returning: 62 },
];

// Mock data for recall performance
const recallData = [
  { name: 'Jan', rate: 62 },
  { name: 'Feb', rate: 58 },
  { name: 'Mar', rate: 65 },
  { name: 'Apr', rate: 72 },
  { name: 'May', rate: 78 },
  { name: 'Jun', rate: 82 },
];

// Mock data for patient segments
const patientSegmentsData = [
  { name: 'Active', value: 65 },
  { name: 'At Risk', value: 15 },
  { name: 'Inactive', value: 20 },
];

const COLORS = ['#10B981', '#F59E0B', '#EF4444'];

const Reports: React.FC = () => {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState('month'); // 'week', 'month', 'quarter', 'year'

  const renderDateRangeSelector = () => (
    <div className="inline-flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
      <button 
        className={`px-3 py-1 text-xs font-medium rounded-md ${dateRange === 'week' ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}
        onClick={() => setDateRange('week')}
      >
        {t('reports.week')}
      </button>
      <button 
        className={`px-3 py-1 text-xs font-medium rounded-md ${dateRange === 'month' ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}
        onClick={() => setDateRange('month')}
      >
        {t('reports.month')}
      </button>
      <button 
        className={`px-3 py-1 text-xs font-medium rounded-md ${dateRange === 'quarter' ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}
        onClick={() => setDateRange('quarter')}
      >
        {t('reports.quarter')}
      </button>
      <button 
        className={`px-3 py-1 text-xs font-medium rounded-md ${dateRange === 'year' ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}
        onClick={() => setDateRange('year')}
      >
        {t('reports.year')}
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('reports.title')}
        </h1>
        <div className="flex items-center space-x-3">
          {renderDateRangeSelector()}
          <Button variant="outline">
            <Calendar size={16} className="mr-2" />
            {t('reports.customDate')}
          </Button>
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('reports.totalRevenue')}
                </p>
                <h3 className="text-2xl font-bold mt-1">45,000 MAD</h3>
              </div>
              <div className="p-2 bg-green-100 dark:bg-green-900/20 text-green-500 rounded-full">
                <DollarSign size={20} />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <ArrowUpRight size={16} className="text-green-500 mr-1" />
              <span className="text-green-500 font-medium">+12%</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1.5">{t('common.fromLastMonth')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('reports.totalAppointments')}
                </p>
                <h3 className="text-2xl font-bold mt-1">128</h3>
              </div>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 text-blue-500 rounded-full">
                <CalendarCheck size={20} />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <ArrowUpRight size={16} className="text-green-500 mr-1" />
              <span className="text-green-500 font-medium">+8%</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1.5">{t('common.fromLastMonth')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('reports.newPatients')}
                </p>
                <h3 className="text-2xl font-bold mt-1">14</h3>
              </div>
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 text-purple-500 rounded-full">
                <UserCheck size={20} />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <ArrowUpRight size={16} className="text-green-500 mr-1" />
              <span className="text-green-500 font-medium">+25%</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1.5">{t('common.fromLastMonth')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('reports.noShowRate')}
                </p>
                <h3 className="text-2xl font-bold mt-1">4.2%</h3>
              </div>
              <div className="p-2 bg-amber-100 dark:bg-amber-900/20 text-amber-500 rounded-full">
                <UserMinus size={20} />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <ArrowDownRight size={16} className="text-green-500 mr-1" />
              <span className="text-green-500 font-medium">-2.1%</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1.5">{t('common.fromLastMonth')}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Report */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t('reports.revenueReport')}</CardTitle>
              <CardDescription>
                {t('reports.revenueDesc', 'Monthly revenue vs target')}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download size={16} className="mr-2" />
              {t('reports.export')}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={revenueData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" name={t('reports.actualRevenue')} fill="#3B82F6" />
                  <Bar dataKey="target" name={t('reports.targetRevenue')} fill="#93C5FD" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Patient Report */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t('reports.patientReport')}</CardTitle>
              <CardDescription>
                {t('reports.patientDesc', 'New vs returning patients')}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download size={16} className="mr-2" />
              {t('reports.export')}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={patientData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="new" name={t('reports.newPatients')} fill="#10B981" stackId="a" />
                  <Bar dataKey="returning" name={t('reports.returningPatients')} fill="#6EE7B7" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recall Performance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t('reports.recallReport')}</CardTitle>
              <CardDescription>
                {t('reports.recallDesc', 'Recall success rate over time')}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download size={16} className="mr-2" />
              {t('reports.export')}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={recallData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    name={t('reports.responseRate')}
                    stroke="#F97316"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Patient Segments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t('reports.patientSegments')}</CardTitle>
              <CardDescription>
                {t('reports.patientSegmentsDesc', 'Distribution of patient statuses')}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download size={16} className="mr-2" />
              {t('reports.export')}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={patientSegmentsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {patientSegmentsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Reports */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reports.availableReports')}</CardTitle>
          <CardDescription>
            {t('reports.availableReportsDesc', 'Generate and download detailed reports')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
              <div className="flex items-center mb-3">
                <FileText size={20} className="text-primary-500 mr-3" />
                <h3 className="text-base font-medium text-gray-900 dark:text-white">
                  {t('reports.monthlyRevenueFull')}
                </h3>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                {t('reports.monthlyRevenueDesc', 'Detailed breakdown of all revenue sources and trends')}
              </p>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  <FilePdf size={16} className="mr-2" />
                  PDF
                </Button>
                <Button variant="outline" size="sm">
                  <FileSpreadsheet size={16} className="mr-2" />
                  Excel
                </Button>
              </div>
            </div>
            
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
              <div className="flex items-center mb-3">
                <FileText size={20} className="text-secondary-500 mr-3" />
                <h3 className="text-base font-medium text-gray-900 dark:text-white">
                  {t('reports.patientActivityFull')}
                </h3>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                {t('reports.patientActivityDesc', 'Complete analysis of patient engagement and retention')}
              </p>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  <FilePdf size={16} className="mr-2" />
                  PDF
                </Button>
                <Button variant="outline" size="sm">
                  <FileSpreadsheet size={16} className="mr-2" />
                  Excel
                </Button>
              </div>
            </div>
            
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
              <div className="flex items-center mb-3">
                <FileText size={20} className="text-accent-500 mr-3" />
                <h3 className="text-base font-medium text-gray-900 dark:text-white">
                  {t('reports.insuranceClaimsFull')}
                </h3>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                {t('reports.insuranceClaimsDesc', 'Status and performance of all insurance claims')}
              </p>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  <FilePdf size={16} className="mr-2" />
                  PDF
                </Button>
                <Button variant="outline" size="sm">
                  <FileSpreadsheet size={16} className="mr-2" />
                  Excel
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;