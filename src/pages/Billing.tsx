import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  FileCheck, FilePlus, AlertCircle, CreditCard, FileSearch,
  ArrowRight, CheckCircle2, Clock, X, DollarSign, PlusSquare
} from 'lucide-react';

// Mock billing data
const BILLING_DATA = [
  {
    id: 'B12345',
    patientName: 'Mohammed Karimi',
    date: '2023-06-10',
    procedure: 'Root Canal Treatment',
    amount: 1800,
    insuranceType: 'CNOPS',
    status: 'approved',
    notes: 'Full coverage'
  },
  {
    id: 'B12346',
    patientName: 'Fatima Benali',
    date: '2023-06-12',
    procedure: 'Dental Crown',
    amount: 2400,
    insuranceType: 'CNSS',
    status: 'pending',
    notes: 'Waiting for approval'
  },
  {
    id: 'B12347',
    patientName: 'Omar Saidi',
    date: '2023-06-14',
    procedure: 'Teeth Cleaning',
    amount: 600,
    insuranceType: 'Private',
    status: 'rejected',
    notes: 'Insufficient documentation'
  },
  {
    id: 'B12348',
    patientName: 'Layla Tazi',
    date: '2023-06-15',
    procedure: 'Dental Implant',
    amount: 5000,
    insuranceType: 'CNOPS',
    status: 'pending',
    notes: 'Additional documentation requested'
  }
];

// Optimization recommendations
const OPTIMIZATION_RECOMMENDATIONS = [
  {
    id: '1',
    patientName: 'Mohammed Karimi',
    recommendation: 'Missing insurance claim for X-ray',
    procedure: 'Panoramic X-ray',
    potentialRevenue: 250,
    priority: 'high'
  },
  {
    id: '2',
    patientName: 'Fatima Benali',
    recommendation: 'Incorrect billing code used',
    procedure: 'Root Canal',
    potentialRevenue: 450,
    priority: 'medium'
  },
  {
    id: '3',
    patientName: 'Omar Saidi',
    recommendation: 'Incomplete treatment plan',
    procedure: 'Dental Implant',
    potentialRevenue: 2000,
    priority: 'high'
  }
];

const Billing: React.FC = () => {
  const { t } = useTranslation();

  // Function to get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle2 size={14} className="mr-1" />
            {t('billing.approved')}
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
            <Clock size={14} className="mr-1" />
            {t('billing.pending')}
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
            <X size={14} className="mr-1" />
            {t('billing.rejected')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
            {status}
          </span>
        );
    }
  };

  // Function to get priority badge
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
            {t('billing.highPriority')}
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
            {t('billing.mediumPriority')}
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
            {t('billing.lowPriority')}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('billing.title')}
        </h1>
        <Button>
          <FilePlus size={16} className="mr-2" />
          {t('billing.newClaim')}
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400">
                <FileCheck size={20} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('billing.approvedClaims')}
                </p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  18,500 MAD
                </h3>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  {t('billing.lastMonth')}
                </span>
                <span className="font-medium text-green-600 dark:text-green-400">+24%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                <Clock size={20} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('billing.pendingClaims')}
                </p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  7,400 MAD
                </h3>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  {t('common.inReview')}
                </span>
                <span className="font-medium text-amber-600 dark:text-amber-400">8 {t('billing.claims')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                <DollarSign size={20} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('billing.potentialRevenue')}
                </p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  2,700 MAD
                </h3>
              </div>
            </div>
            <div className="mt-4">
              <Button variant="ghost" size="sm" className="text-green-600 dark:text-green-400 p-0 h-auto">
                {t('billing.viewOpportunities')} <ArrowRight size={14} className="ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Claims */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('billing.recentClaims')}
          </h2>
          <Button variant="outline" size="sm">
            <FileSearch size={16} className="mr-2" />
            {t('common.viewAll')}
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-750">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('billing.claimId')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('patients.patient')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('billing.date')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('billing.procedure')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('billing.insuranceType')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('billing.status')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('billing.amount')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {BILLING_DATA.map((claim) => (
                  <tr key={claim.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600 dark:text-primary-400">
                      {claim.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {claim.patientName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(claim.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {claim.procedure}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {t(`billing.${claim.insuranceType.toLowerCase()}`)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(claim.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-white">
                      {claim.amount} MAD
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Revenue Optimization */}
      <Card>
        <CardHeader>
          <CardTitle>{t('billing.revenueOptimization')}</CardTitle>
          <CardDescription>
            {t('billing.optimizationDesc', 'AI-detected opportunities to increase clinic revenue')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {OPTIMIZATION_RECOMMENDATIONS.map((recommendation) => (
              <div 
                key={recommendation.id}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center">
                      <AlertCircle size={18} className="text-primary-500 mr-2" />
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {recommendation.recommendation}
                      </h4>
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 ml-6">
                      {recommendation.patientName} - {recommendation.procedure}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 ml-6 sm:ml-0">
                    {getPriorityBadge(recommendation.priority)}
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      +{recommendation.potentialRevenue} MAD
                    </span>
                    <Button size="sm" variant="outline">
                      {t('common.fix')}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Billing;