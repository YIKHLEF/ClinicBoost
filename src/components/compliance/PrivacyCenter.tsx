import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { 
  gdprService, 
  consentService, 
  type ConsentPreferences, 
  type ConsentHistory 
} from '../../lib/compliance';
import {
  Shield,
  Download,
  Trash2,
  Eye,
  Settings,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Mail,
  User
} from 'lucide-react';

export const PrivacyCenter: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'consent' | 'data' | 'requests'>('overview');
  const [consentPreferences, setConsentPreferences] = useState<ConsentPreferences>({
    cookies: false,
    analytics: false,
    marketing: false,
    dataProcessing: false,
    thirdPartySharing: false
  });
  const [consentHistory, setConsentHistory] = useState<ConsentHistory[]>([]);
  const [dataRequests, setDataRequests] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadPrivacyData();
    }
  }, [user]);

  const loadPrivacyData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load consent preferences
      const preferences = await consentService.getConsentPreferences(user.id);
      setConsentPreferences(preferences);

      // Load consent history
      const history = await consentService.getConsentHistory(user.id);
      setConsentHistory(history);

      // TODO: Load data subject requests
      // const requests = await gdprService.getDataSubjectRequests(user.id);
      // setDataRequests(requests);
    } catch (error) {
      console.error('Failed to load privacy data:', error);
      showToast('Failed to load privacy data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConsentChange = async (type: keyof ConsentPreferences, value: boolean) => {
    if (!user) return;

    try {
      const updatedPreferences = { ...consentPreferences, [type]: value };
      
      await consentService.updateConsentPreferences(
        { [type]: value },
        user.id,
        undefined,
        '0.0.0.0', // In real implementation, get from server
        navigator.userAgent
      );

      setConsentPreferences(updatedPreferences);
      showToast('Consent preferences updated', 'success');
      
      // Reload history to show the change
      const history = await consentService.getConsentHistory(user.id);
      setConsentHistory(history);
    } catch (error) {
      console.error('Failed to update consent:', error);
      showToast('Failed to update consent preferences', 'error');
    }
  };

  const handleExportData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const exportData = await gdprService.exportData(user.id, undefined, {
        format: 'json',
        includeMetadata: true,
        anonymize: false
      });

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `privacy-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('Data export completed', 'success');
    } catch (error) {
      console.error('Failed to export data:', error);
      showToast('Failed to export data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteData = async () => {
    if (!user) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete your data? This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      await gdprService.deleteData(user.id);
      showToast('Data deletion request submitted', 'success');
    } catch (error) {
      console.error('Failed to delete data:', error);
      showToast('Failed to submit data deletion request', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitDataRequest = async (requestType: 'access' | 'rectification' | 'erasure' | 'portability') => {
    if (!user) return;

    try {
      setLoading(true);
      const requestId = await gdprService.submitDataSubjectRequest({
        requestType,
        requesterEmail: user.email || '',
        requesterName: `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim(),
        userId: user.id
      });

      showToast(`${requestType} request submitted successfully`, 'success');
    } catch (error) {
      console.error('Failed to submit data request:', error);
      showToast('Failed to submit data request', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getConsentStatusIcon = (status: string) => {
    switch (status) {
      case 'granted':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'denied':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'withdrawn':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const tabs = [
    { id: 'overview', label: t('privacy.tabs.overview', 'Overview'), icon: Shield },
    { id: 'consent', label: t('privacy.tabs.consent', 'Consent Management'), icon: Settings },
    { id: 'data', label: t('privacy.tabs.data', 'Your Data'), icon: FileText },
    { id: 'requests', label: t('privacy.tabs.requests', 'Data Requests'), icon: Mail }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('privacy.title', 'Privacy Center')}
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          {t('privacy.description', 'Manage your privacy settings and data preferences')}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                {t('privacy.overview.dataProtection', 'Data Protection')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                {t('privacy.overview.dataProtectionDesc', 'Your data is protected with industry-standard security measures.')}
              </p>
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                {t('privacy.overview.gdprCompliant', 'GDPR Compliant')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                {t('privacy.overview.consentStatus', 'Consent Status')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">{t('privacy.consent.analytics', 'Analytics')}</span>
                  {getConsentStatusIcon(consentPreferences.analytics ? 'granted' : 'denied')}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">{t('privacy.consent.marketing', 'Marketing')}</span>
                  {getConsentStatusIcon(consentPreferences.marketing ? 'granted' : 'denied')}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">{t('privacy.consent.thirdParty', 'Third-party')}</span>
                  {getConsentStatusIcon(consentPreferences.thirdPartySharing ? 'granted' : 'denied')}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-purple-600" />
                {t('privacy.overview.yourRights', 'Your Rights')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>• {t('privacy.rights.access', 'Right to access your data')}</div>
                <div>• {t('privacy.rights.rectification', 'Right to rectify your data')}</div>
                <div>• {t('privacy.rights.erasure', 'Right to erasure')}</div>
                <div>• {t('privacy.rights.portability', 'Right to data portability')}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'consent' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('privacy.consent.preferences', 'Consent Preferences')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(consentPreferences).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      {t(`privacy.consent.${key}`, key)}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {t(`privacy.consent.${key}Desc`, `Description for ${key}`)}
                    </p>
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => handleConsentChange(key as keyof ConsentPreferences, e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                  </label>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('privacy.consent.history', 'Consent History')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {consentHistory.map((record, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getConsentStatusIcon(record.status)}
                      <div>
                        <div className="font-medium text-sm">
                          {t(`privacy.consent.${record.consentType}`, record.consentType)}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">
                          {record.status === 'granted' && record.grantedAt && 
                            `Granted: ${new Date(record.grantedAt).toLocaleDateString()}`}
                          {record.status === 'withdrawn' && record.withdrawnAt && 
                            `Withdrawn: ${new Date(record.withdrawnAt).toLocaleDateString()}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      v{record.version}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'data' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('privacy.data.export', 'Export Your Data')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t('privacy.data.exportDesc', 'Download a copy of all your data in JSON format.')}
              </p>
              <Button onClick={handleExportData} disabled={loading} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                {t('privacy.data.downloadData', 'Download My Data')}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">{t('privacy.data.delete', 'Delete Your Data')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t('privacy.data.deleteDesc', 'Permanently delete your account and all associated data. This action cannot be undone.')}
              </p>
              <Button 
                variant="destructive" 
                onClick={handleDeleteData} 
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {t('privacy.data.deleteAccount', 'Delete My Account')}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('privacy.requests.submit', 'Submit Data Request')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  onClick={() => handleSubmitDataRequest('access')}
                  disabled={loading}
                  className="flex items-center gap-2 h-auto p-4"
                >
                  <Eye className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">{t('privacy.requests.access', 'Access Request')}</div>
                    <div className="text-sm text-gray-600">{t('privacy.requests.accessDesc', 'Get a copy of your data')}</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => handleSubmitDataRequest('rectification')}
                  disabled={loading}
                  className="flex items-center gap-2 h-auto p-4"
                >
                  <Settings className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">{t('privacy.requests.rectification', 'Rectification Request')}</div>
                    <div className="text-sm text-gray-600">{t('privacy.requests.rectificationDesc', 'Correct your data')}</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => handleSubmitDataRequest('portability')}
                  disabled={loading}
                  className="flex items-center gap-2 h-auto p-4"
                >
                  <Download className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">{t('privacy.requests.portability', 'Portability Request')}</div>
                    <div className="text-sm text-gray-600">{t('privacy.requests.portabilityDesc', 'Transfer your data')}</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => handleSubmitDataRequest('erasure')}
                  disabled={loading}
                  className="flex items-center gap-2 h-auto p-4"
                >
                  <Trash2 className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">{t('privacy.requests.erasure', 'Erasure Request')}</div>
                    <div className="text-sm text-gray-600">{t('privacy.requests.erasureDesc', 'Delete your data')}</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
