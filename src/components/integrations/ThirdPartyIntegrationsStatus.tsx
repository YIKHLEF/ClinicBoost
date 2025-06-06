import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useToast } from '../../hooks/useToast';
import { useTranslation } from '../../hooks/useTranslation';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  MessageSquare, 
  CreditCard, 
  Brain,
  Settings,
  Activity,
  Clock
} from 'lucide-react';
import { azureAIService } from '../../lib/integrations/azure-ai';
import { getTwilioStatus, getTwilioRateLimitStatus } from '../../utils/twilio';
import { mockHealthCheck } from '../../lib/api/mock-endpoints';
import { getRateLimitStats, getRateLimitStatus } from '../../lib/rate-limiting/advanced-rate-limiter';
import { getErrorStats } from '../../lib/error-handling/integration-errors';
import { backendAPI } from '../../lib/api/backend-endpoints';

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down' | 'unknown';
  lastChecked: string;
  details?: string;
  icon: React.ReactNode;
  rateLimits?: Record<string, { current: number; limit: number; resetTime: number }>;
}

interface IntegrationHealth {
  overall: 'healthy' | 'warning' | 'critical';
  services: ServiceStatus[];
  lastUpdated: string;
}

export const ThirdPartyIntegrationsStatus: React.FC = () => {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [health, setHealth] = useState<IntegrationHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const checkIntegrationsHealth = async (): Promise<IntegrationHealth> => {
    const services: ServiceStatus[] = [];

    // Check Azure AI
    try {
      const azureStatus = azureAIService.getStatus();
      services.push({
        name: 'Azure AI Text Analytics',
        status: azureStatus.initialized ? 'operational' : 'down',
        lastChecked: new Date().toISOString(),
        details: azureStatus.initialized 
          ? 'Text analytics and sentiment analysis available'
          : 'Service not configured or initialization failed',
        icon: <Brain className="h-5 w-5" />,
      });
    } catch (error) {
      services.push({
        name: 'Azure AI Text Analytics',
        status: 'down',
        lastChecked: new Date().toISOString(),
        details: 'Failed to check service status',
        icon: <Brain className="h-5 w-5" />,
      });
    }

    // Check Twilio
    try {
      const twilioStatus = getTwilioStatus();
      const rateLimits = getTwilioRateLimitStatus();
      
      let status: ServiceStatus['status'] = 'operational';
      let details = 'SMS and WhatsApp messaging available';

      if (!twilioStatus.initialized) {
        status = 'down';
        details = `Configuration errors: ${twilioStatus.errors.join(', ')}`;
      } else if (twilioStatus.warnings.length > 0) {
        status = 'degraded';
        details = `Warnings: ${twilioStatus.warnings.join(', ')}`;
      }

      services.push({
        name: 'Twilio Messaging',
        status,
        lastChecked: new Date().toISOString(),
        details,
        icon: <MessageSquare className="h-5 w-5" />,
        rateLimits,
      });
    } catch (error) {
      services.push({
        name: 'Twilio Messaging',
        status: 'down',
        lastChecked: new Date().toISOString(),
        details: 'Failed to check service status',
        icon: <MessageSquare className="h-5 w-5" />,
      });
    }

    // Check Stripe
    try {
      const healthCheck = await mockHealthCheck();
      const stripeStatus = healthCheck.data?.services?.stripe || 'unknown';
      
      services.push({
        name: 'Stripe Payments',
        status: stripeStatus as ServiceStatus['status'],
        lastChecked: new Date().toISOString(),
        details: stripeStatus === 'operational' 
          ? 'Payment processing, subscriptions, and webhooks available'
          : 'Payment service experiencing issues',
        icon: <CreditCard className="h-5 w-5" />,
      });
    } catch (error) {
      services.push({
        name: 'Stripe Payments',
        status: 'down',
        lastChecked: new Date().toISOString(),
        details: 'Failed to check service status',
        icon: <CreditCard className="h-5 w-5" />,
      });
    }

    // Determine overall health
    const downServices = services.filter(s => s.status === 'down').length;
    const degradedServices = services.filter(s => s.status === 'degraded').length;

    let overall: IntegrationHealth['overall'] = 'healthy';
    if (downServices > 0) {
      overall = 'critical';
    } else if (degradedServices > 0) {
      overall = 'warning';
    }

    return {
      overall,
      services,
      lastUpdated: new Date().toISOString(),
    };
  };

  const refreshStatus = async () => {
    setRefreshing(true);
    try {
      const newHealth = await checkIntegrationsHealth();
      setHealth(newHealth);
      addToast({
        type: 'success',
        title: t('integrations.statusRefreshed', 'Status Refreshed'),
        message: t('integrations.statusRefreshedMessage', 'Integration status has been updated'),
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: t('integrations.statusRefreshFailed', 'Refresh Failed'),
        message: t('integrations.statusRefreshFailedMessage', 'Failed to refresh integration status'),
      });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const loadInitialStatus = async () => {
      setLoading(true);
      try {
        const initialHealth = await checkIntegrationsHealth();
        setHealth(initialHealth);
      } catch (error) {
        console.error('Failed to load integration status:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialStatus();

    // Set up periodic refresh every 5 minutes
    const interval = setInterval(() => {
      if (!refreshing) {
        checkIntegrationsHealth().then(setHealth);
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshing]);

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'down':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: ServiceStatus['status']) => {
    const variants = {
      operational: 'default',
      degraded: 'secondary',
      down: 'destructive',
      unknown: 'outline',
    } as const;

    const labels = {
      operational: t('integrations.operational', 'Operational'),
      degraded: t('integrations.degraded', 'Degraded'),
      down: t('integrations.down', 'Down'),
      unknown: t('integrations.unknown', 'Unknown'),
    };

    return (
      <Badge variant={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const getOverallStatusColor = (overall: IntegrationHealth['overall']) => {
    switch (overall) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatRateLimit = (rateLimits: Record<string, { current: number; limit: number; resetTime: number }>) => {
    return Object.entries(rateLimits).map(([key, limit]) => (
      <div key={key} className="text-xs text-gray-500">
        {key}: {limit.current}/{limit.limit} 
        (resets in {Math.ceil((limit.resetTime - Date.now()) / 60000)}m)
      </div>
    ));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t('integrations.status', 'Third-Party Integrations Status')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">
              {t('integrations.loadingStatus', 'Loading integration status...')}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!health) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t('integrations.status', 'Third-Party Integrations Status')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              {t('integrations.statusLoadFailed', 'Failed to load integration status')}
            </p>
            <Button onClick={refreshStatus} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('common.retry', 'Retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t('integrations.status', 'Third-Party Integrations Status')}
          </CardTitle>
          <Button
            onClick={refreshStatus}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {t('common.refresh', 'Refresh')}
          </Button>
        </div>
        
        <div className={`p-3 rounded-lg border ${getOverallStatusColor(health.overall)}`}>
          <div className="flex items-center justify-between">
            <span className="font-medium">
              {t('integrations.overallStatus', 'Overall Status')}: {health.overall.toUpperCase()}
            </span>
            <div className="flex items-center text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {t('integrations.lastUpdated', 'Last updated')}: {new Date(health.lastUpdated).toLocaleTimeString()}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {health.services.map((service, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  {service.icon}
                  <span className="font-medium">{service.name}</span>
                  {getStatusIcon(service.status)}
                </div>
                {getStatusBadge(service.status)}
              </div>
              
              <p className="text-sm text-gray-600 mb-2">{service.details}</p>
              
              {service.rateLimits && Object.keys(service.rateLimits).length > 0 && (
                <div className="mt-2 p-2 bg-gray-50 rounded">
                  <div className="text-xs font-medium text-gray-700 mb-1">
                    {t('integrations.rateLimits', 'Rate Limits')}:
                  </div>
                  {formatRateLimit(service.rateLimits)}
                </div>
              )}
              
              <div className="text-xs text-gray-400 mt-2">
                {t('integrations.lastChecked', 'Last checked')}: {new Date(service.lastChecked).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
