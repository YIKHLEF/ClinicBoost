import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter 
} from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  Users, CalendarClock, ArrowUpRight, Banknote, 
  BellRing, PhoneCall, AlertTriangle, BarChart3,
  ArrowRight, TrendingUp, Clock
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

// Mock data for revenue chart
const revenueData = [
  { name: 'Jan', value: 24000 },
  { name: 'Feb', value: 18000 },
  { name: 'Mar', value: 28000 },
  { name: 'Apr', value: 32000 },
  { name: 'May', value: 27000 },
  { name: 'Jun', value: 35000 },
  { name: 'Jul', value: 40000 }
];

// Mock data for patient activity
const patientActivityData = [
  { name: 'New', value: 12 },
  { name: 'Returning', value: 28 },
  { name: 'Inactive', value: 7 },
  { name: 'At Risk', value: 5 }
];

// Mock data for recall performance
const recallPerformanceData = [
  { name: 'SMS', sent: 35, responded: 24 },
  { name: 'WhatsApp', sent: 42, responded: 38 },
  { name: 'Email', sent: 28, responded: 15 },
  { name: 'Call', sent: 15, responded: 12 }
];

// Mock data for upcoming appointments
const upcomingAppointments = [
  { id: 1, patient: 'Mohammed Karimi', time: '09:00 AM', type: 'Checkup', noShowRisk: 'Low' },
  { id: 2, patient: 'Fatima Benali', time: '10:30 AM', type: 'Root Canal', noShowRisk: 'High' },
  { id: 3, patient: 'Omar Saidi', time: '11:45 AM', type: 'Cleaning', noShowRisk: 'Low' },
  { id: 4, patient: 'Layla Tazi', time: '01:15 PM', type: 'Consultation', noShowRisk: 'Medium' }
];

// Colors for pie chart
const COLORS = ['#3B82F6', '#10B981', '#F97316', '#EF4444'];

const Dashboard: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('dashboard.title')}
        </h1>
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>
      
      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('dashboard.todayAppointments', "Today's Appointments")}
                </p>
                <h3 className="text-2xl font-bold mt-1">12</h3>
              </div>
              <div className="p-2 bg-primary-100 dark:bg-primary-900 text-primary-500 rounded-full">
                <CalendarClock size={20} />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <ArrowUpRight size={16} className="text-green-500 mr-1" />
              <span className="text-green-500 font-medium">+8%</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1.5">{t('common.fromLastWeek')}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('dashboard.activePatients', "Active Patients")}
                </p>
                <h3 className="text-2xl font-bold mt-1">1,248</h3>
              </div>
              <div className="p-2 bg-secondary-100 dark:bg-secondary-900 text-secondary-500 rounded-full">
                <Users size={20} />
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
                  {t('dashboard.monthlyRevenue', "Monthly Revenue")}
                </p>
                <h3 className="text-2xl font-bold mt-1">42,500 MAD</h3>
              </div>
              <div className="p-2 bg-green-100 dark:bg-green-900 text-green-500 rounded-full">
                <Banknote size={20} />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <ArrowUpRight size={16} className="text-green-500 mr-1" />
              <span className="text-green-500 font-medium">+18%</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1.5">{t('common.fromLastMonth')}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('dashboard.pendingRecalls', "Pending Recalls")}
                </p>
                <h3 className="text-2xl font-bold mt-1">27</h3>
              </div>
              <div className="p-2 bg-amber-100 dark:bg-amber-900 text-amber-500 rounded-full">
                <BellRing size={20} />
              </div>
            </div>
            <div className="mt-4">
              <Button variant="outline" size="sm" className="w-full">
                <PhoneCall size={16} className="mr-2" />
                {t('dashboard.sendRecalls', "Send Recalls")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('dashboard.revenueOverview')}</CardTitle>
            <CardDescription>
              {t('dashboard.revenueDescription', "Monthly revenue trend for the current year")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
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
                  <Line
                    type="monotone"
                    dataKey="value"
                    name={t('dashboard.revenue', "Revenue")}
                    stroke="#3B82F6"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        {/* Patient activity */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.patientActivity')}</CardTitle>
            <CardDescription>
              {t('dashboard.patientBreakdown', "Patient activity breakdown")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={patientActivityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {patientActivityData.map((entry, index) => (
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
      
      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appointments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t('dashboard.upcomingAppointments')}</CardTitle>
              <CardDescription>
                {t('dashboard.todaysAppointments', "Today's scheduled appointments")}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Clock size={16} className="mr-2" />
              {t('common.viewAll')}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingAppointments.map(appointment => (
                <div
                  key={appointment.id}
                  className="flex items-center p-3 rounded-md border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {appointment.patient}
                    </p>
                    <div className="flex items-center text-sm mt-1">
                      <Clock size={14} className="text-gray-500 mr-1" />
                      <span className="text-gray-500">{appointment.time}</span>
                      <span className="mx-2 text-gray-300 dark:text-gray-600">•</span>
                      <span className="text-gray-500">{appointment.type}</span>
                    </div>
                  </div>
                  <div className={cn(
                    "text-xs font-medium px-2 py-1 rounded",
                    appointment.noShowRisk === 'High' ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400" : 
                    appointment.noShowRisk === 'Medium' ? "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400" :
                    "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                  )}>
                    {appointment.noShowRisk} {t('dashboard.risk')}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Recall Performance */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.recallPerformance')}</CardTitle>
            <CardDescription>
              {t('dashboard.recallEffectiveness', "Message delivery and response effectiveness")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={recallPerformanceData}
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
                  <Bar dataKey="sent" name={t('messaging.messagesSent')} fill="#3B82F6" />
                  <Bar dataKey="responded" name={t('messaging.messagesResponded', "Responded")} fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        {/* Revenue Opportunities */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t('dashboard.revenueOpportunities')}</CardTitle>
              <CardDescription>
                {t('dashboard.missedRevenue', "Potential missed revenue opportunities")}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <TrendingUp size={16} className="mr-2" />
              {t('dashboard.optimize', "Optimize")}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900/20">
                <div className="flex items-center">
                  <AlertTriangle size={18} className="text-amber-500 mr-2" />
                  <p className="font-medium text-amber-800 dark:text-amber-500">
                    {t('dashboard.unfinishedTreatments', "Unfinished Treatment Plans")}
                  </p>
                </div>
                <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                  {t('dashboard.unfinishedTreatmentsDesc', "15 patients with incomplete treatments worth ~20,000 MAD")}
                </p>
                <Button variant="ghost" size="sm" className="mt-2 text-amber-600 dark:text-amber-400 p-0 h-auto">
                  {t('dashboard.viewPatients', "View Patients")} <ArrowRight size={14} className="ml-1" />
                </Button>
              </div>
              
              <div className="p-3 rounded-md border border-primary-200 bg-primary-50 dark:bg-primary-900/10 dark:border-primary-900/20">
                <div className="flex items-center">
                  <BarChart3 size={18} className="text-primary-500 mr-2" />
                  <p className="font-medium text-primary-800 dark:text-primary-500">
                    {t('dashboard.insuranceClaims', "Unbilled Insurance Claims")}
                  </p>
                </div>
                <p className="mt-1 text-sm text-primary-700 dark:text-primary-400">
                  {t('dashboard.unbilledClaimsDesc', "8 procedures with missing insurance claims (5,200 MAD)")}
                </p>
                <Button variant="ghost" size="sm" className="mt-2 text-primary-600 dark:text-primary-400 p-0 h-auto">
                  {t('dashboard.reviewClaims', "Review Claims")} <ArrowRight size={14} className="ml-1" />
                </Button>
              </div>
              
              <div className="p-3 rounded-md border border-secondary-200 bg-secondary-50 dark:bg-secondary-900/10 dark:border-secondary-900/20">
                <div className="flex items-center">
                  <PhoneCall size={18} className="text-secondary-500 mr-2" />
                  <p className="font-medium text-secondary-800 dark:text-secondary-500">
                    {t('dashboard.recallOpportunity', "6-Month Recall Opportunity")}
                  </p>
                </div>
                <p className="mt-1 text-sm text-secondary-700 dark:text-secondary-400">
                  {t('dashboard.recallOpportunityDesc', "32 patients due for check-up this month")}
                </p>
                <Button variant="ghost" size="sm" className="mt-2 text-secondary-600 dark:text-secondary-400 p-0 h-auto">
                  {t('dashboard.sendRecalls', "Send Recalls")} <ArrowRight size={14} className="ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;