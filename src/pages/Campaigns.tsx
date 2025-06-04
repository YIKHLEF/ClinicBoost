import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter 
} from '../components/ui/Card';
import {
  Plus, Users, Calendar, Megaphone, BarChart3, 
  Clock, CheckCircle2, AlertCircle, ArrowRight
} from 'lucide-react';

// Mock campaign data
const CAMPAIGNS = [
  {
    id: '1',
    name: '6-Month Checkup Reminder',
    type: 'recall',
    status: 'active',
    startDate: '2023-06-01',
    endDate: '2023-06-30',
    targetCount: 75,
    sentCount: 58,
    responseCount: 32,
    bookingCount: 24
  },
  {
    id: '2',
    name: 'Cosmetic Treatment Promotion',
    type: 'promotional',
    status: 'active',
    startDate: '2023-06-15',
    endDate: '2023-07-15',
    targetCount: 120,
    sentCount: 85,
    responseCount: 18,
    bookingCount: 9
  },
  {
    id: '3',
    name: 'Treatment Plan Completion',
    type: 'reactivation',
    status: 'scheduled',
    startDate: '2023-07-01',
    endDate: '2023-07-31',
    targetCount: 45,
    sentCount: 0,
    responseCount: 0,
    bookingCount: 0
  },
  {
    id: '4',
    name: 'Spring Dental Cleaning',
    type: 'promotional',
    status: 'completed',
    startDate: '2023-03-01',
    endDate: '2023-03-31',
    targetCount: 150,
    sentCount: 150,
    responseCount: 65,
    bookingCount: 42
  }
];

const Campaigns: React.FC = () => {
  const { t } = useTranslation();

  // Function to calculate campaign success percentage
  const calculateSuccessRate = (campaign: any) => {
    if (campaign.status === 'scheduled') return 0;
    if (campaign.sentCount === 0) return 0;
    return Math.round((campaign.bookingCount / campaign.sentCount) * 100);
  };

  // Function to get status badge styling
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'completed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // Function to get campaign type icon
  const getCampaignTypeIcon = (type: string) => {
    switch (type) {
      case 'recall':
        return <Calendar size={16} className="mr-1.5" />;
      case 'reactivation':
        return <Users size={16} className="mr-1.5" />;
      case 'promotional':
        return <Megaphone size={16} className="mr-1.5" />;
      default:
        return <Megaphone size={16} className="mr-1.5" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('campaigns.title')}
        </h1>
        <Button>
          <Plus size={16} className="mr-2" />
          {t('campaigns.newCampaign')}
        </Button>
      </div>

      {/* Campaign Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                <Megaphone size={20} />
              </div>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                +12%
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">3</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('campaigns.activeCampaigns')}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                <Users size={20} />
              </div>
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                +24%
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">287</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('campaigns.patientsReached')}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                <BarChart3 size={20} />
              </div>
              <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                +8%
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">32%</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('campaigns.avgResponseRate')}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                <Calendar size={20} />
              </div>
              <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                +15%
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">75</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('campaigns.newAppointments')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Campaigns */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('campaigns.campaignsList')}
        </h2>
        
        <div className="space-y-4">
          {CAMPAIGNS.map(campaign => (
            <Card key={campaign.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row">
                {/* Campaign Info */}
                <CardContent className="p-6 flex-1">
                  <div className="flex items-center mb-2">
                    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${getStatusBadgeClass(campaign.status)}`}>
                      {t(`campaigns.status_${campaign.status}`)}
                    </span>
                    <span className="mx-2 text-gray-300 dark:text-gray-600">•</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                      {getCampaignTypeIcon(campaign.type)}
                      {t(`campaigns.${campaign.type}Campaign`)}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {campaign.name}
                  </h3>
                  
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <Calendar size={16} className="mr-1.5" />
                    {new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}
                  </div>
                  
                  <div className="flex items-center text-sm">
                    <Users size={16} className="mr-1.5 text-gray-500 dark:text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {campaign.targetCount} {t('campaigns.targetPatients')}
                    </span>
                  </div>
                </CardContent>
                
                {/* Campaign Stats */}
                <div className="sm:border-l border-gray-200 dark:border-gray-700 p-6 sm:w-64 bg-gray-50 dark:bg-gray-800/50 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('campaigns.success')}
                      </p>
                      <div className="flex items-center">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                          {calculateSuccessRate(campaign)}%
                        </h4>
                        {campaign.status !== 'scheduled' && (
                          <span className="ml-2 text-xs font-medium text-green-600 dark:text-green-400">
                            {campaign.bookingCount} {t('campaigns.bookings')}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('campaigns.progress')}
                      </p>
                      <div className="mt-1">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                          {campaign.status === 'scheduled' ? (
                            <div className="bg-blue-500 h-2 rounded-full\" style={{ width: '0%' }}></div>
                          ) : (
                            <div 
                              className="bg-primary-500 h-2 rounded-full" 
                              style={{ width: `${(campaign.sentCount / campaign.targetCount) * 100}%` }}
                            ></div>
                          )}
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <span>{campaign.sentCount}/{campaign.targetCount}</span>
                          <span>
                            {Math.round((campaign.sentCount / campaign.targetCount) * 100) || 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-4 justify-between"
                  >
                    {t('common.viewDetails')}
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Campaigns;