import React, { useState, useEffect } from 'react';
import { useClinic } from '../../contexts/ClinicContext';
import { useTranslation } from '../../hooks/useTranslation';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import {
  Package,
  Share2,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Calendar,
  MapPin,
  Building2,
  DollarSign,
  Eye,
  Plus
} from 'lucide-react';
import { resourceService, type ResourceWithSharing } from '../../lib/clinic-management/resource-service';
import type { Database } from '../../lib/database.types';

type ResourceSharing = Database['public']['Tables']['resource_sharing']['Row'];

interface ResourceSharingProps {
  mode?: 'browse' | 'manage';
}

export const ResourceSharing: React.FC<ResourceSharingProps> = ({ mode = 'browse' }) => {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const { currentClinic, canManageResources } = useClinic();
  
  const [resources, setResources] = useState<ResourceWithSharing[]>([]);
  const [sharingRequests, setSharingRequests] = useState<ResourceSharing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'available' | 'requests' | 'my-resources'>('available');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<Database['public']['Enums']['resource_type'] | ''>('');

  useEffect(() => {
    if (currentClinic) {
      loadData();
    }
  }, [currentClinic, activeTab]);

  const loadData = async () => {
    if (!currentClinic) return;

    try {
      setIsLoading(true);

      if (activeTab === 'available') {
        // Load shareable resources from other clinics
        const shareableResources = await resourceService.getShareableResources(
          currentClinic.id,
          {
            type: typeFilter || undefined,
            name: searchTerm || undefined
          }
        );
        setResources(shareableResources);
      } else if (activeTab === 'my-resources') {
        // Load current clinic's resources
        const clinicResources = await resourceService.getClinicResources(
          currentClinic.id,
          {
            type: typeFilter || undefined,
            name: searchTerm || undefined
          }
        );
        setResources(clinicResources);
      } else if (activeTab === 'requests') {
        // Load sharing requests
        const requests = await resourceService.getClinicSharingRequests(currentClinic.id);
        setSharingRequests(requests);
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: t('resources.loadError'),
        message: error instanceof Error ? error.message : t('common.unknownError')
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestResource = async (resourceId: string) => {
    if (!currentClinic) return;

    try {
      // For demo purposes, using current time + 1 hour
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      await resourceService.createSharingRequest(
        {
          resource_id: resourceId,
          requesting_clinic_id: currentClinic.id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          notes: 'Resource sharing request'
        },
        currentClinic.owner_id || ''
      );

      addToast({
        type: 'success',
        title: t('resources.requestSent'),
        message: t('resources.requestSentMessage')
      });

      loadData();
    } catch (error) {
      addToast({
        type: 'error',
        title: t('resources.requestError'),
        message: error instanceof Error ? error.message : t('common.unknownError')
      });
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      await resourceService.approveSharingRequest(
        requestId,
        currentClinic?.owner_id || '',
        0 // No cost for demo
      );

      addToast({
        type: 'success',
        title: t('resources.requestApproved'),
        message: t('resources.requestApprovedMessage')
      });

      loadData();
    } catch (error) {
      addToast({
        type: 'error',
        title: t('resources.approveError'),
        message: error instanceof Error ? error.message : t('common.unknownError')
      });
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await resourceService.declineSharingRequest(requestId, currentClinic?.owner_id || '');

      addToast({
        type: 'success',
        title: t('resources.requestDeclined'),
        message: t('resources.requestDeclinedMessage')
      });

      loadData();
    } catch (error) {
      addToast({
        type: 'error',
        title: t('resources.declineError'),
        message: error instanceof Error ? error.message : t('common.unknownError')
      });
    }
  };

  const getStatusIcon = (status: Database['public']['Enums']['sharing_status']) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'declined':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'requested':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'in_use':
        return <Package className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: Database['public']['Enums']['sharing_status']) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'declined':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'requested':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'in_use':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const tabs = [
    { id: 'available', label: t('resources.availableResources'), icon: Package },
    { id: 'requests', label: t('resources.sharingRequests'), icon: Share2 },
    { id: 'my-resources', label: t('resources.myResources'), icon: Building2 }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('resources.sharing')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('resources.sharingDescription')}
          </p>
        </div>
        
        {canManageResources && (
          <Button className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>{t('resources.addResource')}</span>
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('resources.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 input w-full"
              />
            </div>
            
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="input w-48"
            >
              <option value="">{t('resources.allTypes')}</option>
              <option value="equipment">{t('resources.types.equipment')}</option>
              <option value="room">{t('resources.types.room')}</option>
              <option value="staff">{t('resources.types.staff')}</option>
              <option value="material">{t('resources.types.material')}</option>
              <option value="service">{t('resources.types.service')}</option>
            </select>
            
            <Button variant="outline" onClick={loadData}>
              <Filter className="h-4 w-4 mr-2" />
              {t('common.filter')}
            </Button>
          </div>
        </CardContent>
      </Card>

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

      {/* Content */}
      <div>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
          </div>
        ) : (
          <>
            {(activeTab === 'available' || activeTab === 'my-resources') && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {resources.map((resource) => (
                  <Card key={resource.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">
                            {resource.name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t(`resources.types.${resource.type}`)}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          resource.is_available 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {resource.is_available ? t('resources.available') : t('resources.unavailable')}
                        </span>
                      </div>
                      
                      {resource.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          {resource.description}
                        </p>
                      )}
                      
                      <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                        {resource.clinic && (
                          <div className="flex items-center space-x-2">
                            <Building2 className="h-4 w-4" />
                            <span>{resource.clinic.name}</span>
                          </div>
                        )}
                        
                        {resource.location && (
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4" />
                            <span>{resource.location}</span>
                          </div>
                        )}
                        
                        {(resource.cost_per_hour || resource.cost_per_use) && (
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-4 w-4" />
                            <span>
                              {resource.cost_per_hour && `${resource.cost_per_hour}/hr`}
                              {resource.cost_per_use && `${resource.cost_per_use}/use`}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-4 flex items-center space-x-2">
                        {activeTab === 'available' && resource.is_available && (
                          <Button
                            size="sm"
                            onClick={() => handleRequestResource(resource.id)}
                            className="flex-1"
                          >
                            <Share2 className="h-4 w-4 mr-2" />
                            {t('resources.request')}
                          </Button>
                        )}
                        
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          {t('common.view')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="space-y-4">
                {sharingRequests.map((request) => (
                  <Card key={request.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-medium text-gray-900 dark:text-gray-100">
                              Resource Sharing Request
                            </h3>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(request.status)}
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                                {t(`resources.status.${request.status}`)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <div>
                              <span className="font-medium">{t('resources.requestedBy')}:</span>
                              <br />
                              Requesting Clinic
                            </div>
                            <div>
                              <span className="font-medium">{t('resources.duration')}:</span>
                              <br />
                              {new Date(request.start_time).toLocaleDateString()} - {new Date(request.end_time).toLocaleDateString()}
                            </div>
                            <div>
                              <span className="font-medium">{t('resources.cost')}:</span>
                              <br />
                              {request.cost ? `$${request.cost}` : t('resources.free')}
                            </div>
                          </div>
                          
                          {request.notes && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                              {request.notes}
                            </p>
                          )}
                        </div>
                        
                        {request.status === 'requested' && canManageResources && (
                          <div className="flex items-center space-x-2 ml-4">
                            <Button
                              size="sm"
                              onClick={() => handleApproveRequest(request.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              {t('resources.approve')}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeclineRequest(request.id)}
                              className="border-red-300 text-red-600 hover:bg-red-50"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              {t('resources.decline')}
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {sharingRequests.length === 0 && (
                  <div className="text-center py-8">
                    <Share2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      {t('resources.noRequests')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
