import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { consentService, type ConsentPreferences } from '../../lib/compliance';
import { 
  Cookie, 
  Settings, 
  X, 
  Shield, 
  BarChart3, 
  Mail, 
  Share2,
  ExternalLink 
} from 'lucide-react';

interface ConsentBannerProps {
  onConsentChange?: (preferences: ConsentPreferences) => void;
}

export const ConsentBanner: React.FC<ConsentBannerProps> = ({ onConsentChange }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    cookies: false,
    analytics: false,
    marketing: false,
    dataProcessing: false,
    thirdPartySharing: false
  });

  useEffect(() => {
    checkIfBannerShouldShow();
  }, [user]);

  const checkIfBannerShouldShow = async () => {
    try {
      const shouldShow = await consentService.shouldShowConsentBanner(
        user?.id,
        undefined // patientId - not applicable for user consent
      );
      setShowBanner(shouldShow);

      if (!shouldShow) {
        // Load existing preferences
        const existingPreferences = await consentService.getConsentPreferences(user?.id);
        setPreferences(existingPreferences);
      }
    } catch (error) {
      console.error('Failed to check consent banner status:', error);
      setShowBanner(true); // Show banner on error to be safe
    }
  };

  const handleAcceptAll = async () => {
    setLoading(true);
    try {
      const allAccepted: ConsentPreferences = {
        cookies: true,
        analytics: true,
        marketing: true,
        dataProcessing: true,
        thirdPartySharing: true
      };

      await consentService.updateConsentPreferences(
        allAccepted,
        user?.id,
        undefined,
        getClientIP(),
        navigator.userAgent
      );

      setPreferences(allAccepted);
      setShowBanner(false);
      onConsentChange?.(allAccepted);
    } catch (error) {
      console.error('Failed to accept all consents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectAll = async () => {
    setLoading(true);
    try {
      const allRejected: ConsentPreferences = {
        cookies: false,
        analytics: false,
        marketing: false,
        dataProcessing: false,
        thirdPartySharing: false
      };

      await consentService.updateConsentPreferences(
        allRejected,
        user?.id,
        undefined,
        getClientIP(),
        navigator.userAgent
      );

      setPreferences(allRejected);
      setShowBanner(false);
      onConsentChange?.(allRejected);
    } catch (error) {
      console.error('Failed to reject all consents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    setLoading(true);
    try {
      await consentService.updateConsentPreferences(
        preferences,
        user?.id,
        undefined,
        getClientIP(),
        navigator.userAgent
      );

      setShowBanner(false);
      setShowDetails(false);
      onConsentChange?.(preferences);
    } catch (error) {
      console.error('Failed to save consent preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceChange = (type: keyof ConsentPreferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const getClientIP = (): string => {
    // In a real implementation, you'd get this from the server
    return '0.0.0.0';
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <Card className="max-w-4xl mx-auto bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          {!showDetails ? (
            // Simple banner view
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <Cookie className="h-6 w-6 text-primary-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {t('compliance.consent.title', 'We value your privacy')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t('compliance.consent.description', 'We use cookies and similar technologies to provide, protect and improve our services. By clicking "Accept All", you consent to our use of cookies.')}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <a 
                      href="/privacy-policy" 
                      className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('compliance.consent.privacyPolicy', 'Privacy Policy')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <a 
                      href="/cookie-policy" 
                      className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('compliance.consent.cookiePolicy', 'Cookie Policy')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetails(true)}
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  {t('compliance.consent.customize', 'Customize')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRejectAll}
                  disabled={loading}
                >
                  {t('compliance.consent.rejectAll', 'Reject All')}
                </Button>
                <Button
                  size="sm"
                  onClick={handleAcceptAll}
                  disabled={loading}
                >
                  {t('compliance.consent.acceptAll', 'Accept All')}
                </Button>
              </div>
            </div>
          ) : (
            // Detailed preferences view
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('compliance.consent.customizeTitle', 'Customize Your Privacy Preferences')}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4 mb-6">
                {/* Essential Cookies */}
                <div className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-green-600 mt-1" />
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {t('compliance.consent.essential', 'Essential Cookies')}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {t('compliance.consent.essentialDesc', 'Required for the website to function properly. Cannot be disabled.')}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-green-600 font-medium">
                    {t('compliance.consent.required', 'Required')}
                  </div>
                </div>

                {/* Analytics Cookies */}
                <div className="flex items-start justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="flex items-start gap-3">
                    <BarChart3 className="h-5 w-5 text-blue-600 mt-1" />
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {t('compliance.consent.analytics', 'Analytics Cookies')}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {t('compliance.consent.analyticsDesc', 'Help us understand how you use our website to improve your experience.')}
                      </p>
                    </div>
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) => handlePreferenceChange('analytics', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                  </label>
                </div>

                {/* Marketing Cookies */}
                <div className="flex items-start justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-purple-600 mt-1" />
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {t('compliance.consent.marketing', 'Marketing Cookies')}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {t('compliance.consent.marketingDesc', 'Used to show you relevant advertisements and marketing content.')}
                      </p>
                    </div>
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.marketing}
                      onChange={(e) => handlePreferenceChange('marketing', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                  </label>
                </div>

                {/* Third-party Sharing */}
                <div className="flex items-start justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Share2 className="h-5 w-5 text-orange-600 mt-1" />
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {t('compliance.consent.thirdParty', 'Third-party Sharing')}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {t('compliance.consent.thirdPartyDesc', 'Allow sharing of anonymized data with trusted partners for research.')}
                      </p>
                    </div>
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.thirdPartySharing}
                      onChange={(e) => handlePreferenceChange('thirdPartySharing', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDetails(false)}
                >
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button
                  onClick={handleSavePreferences}
                  disabled={loading}
                >
                  {t('compliance.consent.savePreferences', 'Save Preferences')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
