import React, { useState, useEffect } from 'react';
import { useClinic } from '../../contexts/ClinicContext';
import { useTranslation } from '../../hooks/useTranslation';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import {
  Building2,
  Users,
  Package,
  Share2,
  Settings,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  Shield,
  Activity
} from 'lucide-react';
import { clinicService } from '../../lib/clinic-management/clinic-service';
import { resourceService } from '../../lib/clinic-management/resource-service';

interface ClinicStats {
  totalMembers: number;
  totalResources: number;
  shareableResources: number;
  activeSharingRequests: number;
  pendingRequests: number;
}

export const ClinicManagement: React.FC = () => {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const { currentClinic, canManageClinic, refreshClinics } = useClinic();
  
  const [stats, setStats] = useState<ClinicStats>({
    totalMembers: 0,
    totalResources: 0,
    shareableResources: 0,
    activeSharingRequests: 0,
    pendingRequests: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'resources' | 'sharing'>('overview');

  useEffect(() => {
    if (currentClinic) {
      loadClinicStats();
    }
  }, [currentClinic]);

  const loadClinicStats = async () => {
    if (!currentClinic) return;

    try {
      setIsLoading(true);

      // Load resources and sharing data
      const [resources, sharingRequests] = await Promise.all([
        resourceService.getClinicResources(currentClinic.id),
        resourceService.getClinicSharingRequests(currentClinic.id)
      ]);

      const shareableCount = resources.filter(r => r.is_shareable).length;
      const activeSharing = sharingRequests.filter(r => 
        r.status === 'approved' || r.status === 'in_use'
      ).length;
      const pendingRequests = sharingRequests.filter(r => 
        r.status === 'requested'
      ).length;

      setStats({
        totalMembers: currentClinic.memberCount || 0,
        totalResources: resources.length,
        shareableResources: shareableCount,
        activeSharingRequests: activeSharing,
        pendingRequests
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: t('clinic.statsError'),
        message: error instanceof Error ? error.message : t('common.unknownError')
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentClinic) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {t('clinic.noClinicSelected')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {t('clinic.selectClinicToManage')}
          </p>
        </CardContent>
      </Card>
    );
  }

  const tabs = [
    { id: 'overview', label: t('clinic.overview'), icon: Activity },
    { id: 'members', label: t('clinic.members'), icon: Users },
    { id: 'resources', label: t('clinic.resources'), icon: Package },
    { id: 'sharing', label: t('clinic.sharing'), icon: Share2 }
  ];

  return (
    <div className="space-y-6">
      {/* Clinic Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                {currentClinic.logo_url ? (
                  <img
                    src={currentClinic.logo_url}
                    alt={currentClinic.name}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                    <Building2 className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {currentClinic.name}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  {currentClinic.description}
                </p>
                
                <div className="flex items-center space-x-6 mt-3 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>{currentClinic.address}, {currentClinic.city}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Phone className="h-4 w-4" />
                    <span>{currentClinic.phone}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Mail className="h-4 w-4" />
                    <span>{currentClinic.email}</span>
                  </div>
                  {currentClinic.website && (
                    <div className="flex items-center space-x-1">
                      <Globe className="h-4 w-4" />
                      <a
                        href={currentClinic.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        {t('clinic.website')}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {canManageClinic && (
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  {t('clinic.edit')}
                </Button>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  {t('clinic.settings')}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('clinic.totalMembers')}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.totalMembers}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('clinic.totalResources')}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.totalResources}
                </p>
              </div>
              <Package className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('clinic.shareableResources')}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.shareableResources}
                </p>
              </div>
              <Share2 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('clinic.pendingRequests')}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.pendingRequests}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <Card>
            <CardHeader>
              <CardTitle>{t('clinic.overview')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  {t('clinic.overviewContent')}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'members' && (
          <Card>
            <CardHeader>
              <CardTitle>{t('clinic.members')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  {t('clinic.membersContent')}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'resources' && (
          <Card>
            <CardHeader>
              <CardTitle>{t('clinic.resources')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  {t('clinic.resourcesContent')}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'sharing' && (
          <Card>
            <CardHeader>
              <CardTitle>{t('clinic.sharing')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Share2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  {t('clinic.sharingContent')}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
