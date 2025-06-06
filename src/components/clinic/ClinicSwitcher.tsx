import React, { useState } from 'react';
import { useClinic } from '../../contexts/ClinicContext';
import { useTranslation } from '../../hooks/useTranslation';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useToast } from '../ui/Toast';
import {
  Building2,
  ChevronDown,
  Check,
  Users,
  Package,
  MapPin,
  Phone,
  Mail,
  Globe,
  Plus,
  Settings
} from 'lucide-react';

interface ClinicSwitcherProps {
  showCreateButton?: boolean;
  onCreateClinic?: () => void;
  onManageClinic?: () => void;
}

export const ClinicSwitcher: React.FC<ClinicSwitcherProps> = ({
  showCreateButton = false,
  onCreateClinic,
  onManageClinic
}) => {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const {
    currentClinic,
    userClinics,
    isLoading,
    switchClinic,
    hasMultipleClinics,
    canManageClinic
  } = useClinic();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const handleSwitchClinic = async (clinicId: string) => {
    if (clinicId === currentClinic?.id) {
      setIsOpen(false);
      return;
    }

    try {
      setIsSwitching(true);
      await switchClinic(clinicId);
      setIsOpen(false);
      
      const clinic = userClinics.find(c => c.id === clinicId);
      addToast({
        type: 'success',
        title: t('clinic.switchSuccess'),
        message: t('clinic.switchedTo', { name: clinic?.name })
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: t('clinic.switchError'),
        message: error instanceof Error ? error.message : t('common.unknownError')
      });
    } finally {
      setIsSwitching(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {t('clinic.loading')}
        </span>
      </div>
    );
  }

  if (!currentClinic) {
    return (
      <div className="flex items-center space-x-2">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {t('clinic.noClinic')}
        </div>
        {showCreateButton && onCreateClinic && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCreateClinic}
            className="flex items-center space-x-1"
          >
            <Plus className="h-4 w-4" />
            <span>{t('clinic.create')}</span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching || !hasMultipleClinics}
        className="flex items-center space-x-2 px-3 py-2 h-auto text-left justify-start max-w-xs"
      >
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <div className="flex-shrink-0">
            <Building2 className="h-5 w-5 text-primary-500" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm truncate">
              {currentClinic.name}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {currentClinic.city} • {currentClinic.memberCount} {t('clinic.members')}
            </div>
          </div>
        </div>
        {hasMultipleClinics && (
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </Button>

      {isOpen && hasMultipleClinics && (
        <div className="absolute top-full left-0 mt-1 w-80 z-50">
          <Card className="p-0 shadow-lg border">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">
                {t('clinic.switchClinic')}
              </h3>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {userClinics.map((clinic) => (
                <button
                  key={clinic.id}
                  onClick={() => handleSwitchClinic(clinic.id)}
                  disabled={isSwitching}
                  className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <Building2 className="h-4 w-4 text-gray-400" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                          {clinic.name}
                        </span>
                        {clinic.id === currentClinic.id && (
                          <Check className="h-4 w-4 text-primary-500 flex-shrink-0" />
                        )}
                      </div>
                      
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3" />
                          <span>{clinic.city}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Users className="h-3 w-3" />
                          <span>{clinic.memberCount} {t('clinic.members')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Package className="h-3 w-3" />
                          <span>{clinic.resourceCount} {t('clinic.resources')}</span>
                        </div>
                      </div>
                      
                      <div className="text-xs text-primary-600 dark:text-primary-400 mt-1">
                        {t(`roles.${clinic.membership?.role}`)}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
              {showCreateButton && onCreateClinic && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsOpen(false);
                    onCreateClinic();
                  }}
                  className="w-full flex items-center justify-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>{t('clinic.create')}</span>
                </Button>
              )}
              
              {canManageClinic && onManageClinic && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsOpen(false);
                    onManageClinic();
                  }}
                  className="w-full flex items-center justify-center space-x-2"
                >
                  <Settings className="h-4 w-4" />
                  <span>{t('clinic.manage')}</span>
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}
      
      {/* Overlay to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};
