import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  CheckCircle, 
  Circle, 
  ArrowRight, 
  ArrowLeft, 
  MoreHorizontal,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '../ui/Button';
import { useOnboarding } from '../../hooks/useOnboarding';

// Define navigation flows for different user journeys
const NAVIGATION_FLOWS = {
  onboarding: {
    id: 'onboarding',
    title: 'Setup Your Clinic',
    description: 'Complete these steps to get started',
    steps: [
      { id: 'welcome', title: 'Welcome', path: '/onboarding/welcome' },
      { id: 'clinic', title: 'Clinic Info', path: '/onboarding/clinic' },
      { id: 'profile', title: 'Your Profile', path: '/onboarding/profile' },
      { id: 'team', title: 'Team', path: '/onboarding/team' },
      { id: 'services', title: 'Services', path: '/onboarding/services' },
      { id: 'integrations', title: 'Integrations', path: '/onboarding/integrations' },
      { id: 'complete', title: 'Complete', path: '/onboarding/complete' },
    ],
  },
  patientSetup: {
    id: 'patient-setup',
    title: 'Add New Patient',
    description: 'Collect patient information',
    steps: [
      { id: 'personal', title: 'Personal Info', path: '/patients/new/personal' },
      { id: 'contact', title: 'Contact', path: '/patients/new/contact' },
      { id: 'medical', title: 'Medical History', path: '/patients/new/medical' },
      { id: 'insurance', title: 'Insurance', path: '/patients/new/insurance' },
      { id: 'review', title: 'Review', path: '/patients/new/review' },
    ],
  },
  appointmentBooking: {
    id: 'appointment-booking',
    title: 'Book Appointment',
    description: 'Schedule a new appointment',
    steps: [
      { id: 'patient', title: 'Select Patient', path: '/appointments/new/patient' },
      { id: 'service', title: 'Choose Service', path: '/appointments/new/service' },
      { id: 'datetime', title: 'Date & Time', path: '/appointments/new/datetime' },
      { id: 'details', title: 'Details', path: '/appointments/new/details' },
      { id: 'confirm', title: 'Confirm', path: '/appointments/new/confirm' },
    ],
  },
  invoiceCreation: {
    id: 'invoice-creation',
    title: 'Create Invoice',
    description: 'Generate patient invoice',
    steps: [
      { id: 'patient', title: 'Patient', path: '/billing/invoices/new/patient' },
      { id: 'services', title: 'Services', path: '/billing/invoices/new/services' },
      { id: 'details', title: 'Details', path: '/billing/invoices/new/details' },
      { id: 'review', title: 'Review', path: '/billing/invoices/new/review' },
    ],
  },
};

interface NavigationProgressProps {
  flowId?: keyof typeof NAVIGATION_FLOWS;
  currentStep?: string;
  completedSteps?: string[];
  onStepClick?: (stepId: string, path: string) => void;
  showControls?: boolean;
  compact?: boolean;
  className?: string;
}

export const NavigationProgress: React.FC<NavigationProgressProps> = ({
  flowId,
  currentStep,
  completedSteps = [],
  onStepClick,
  showControls = true,
  compact = false,
  className = '',
}) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { status: onboardingStatus } = useOnboarding();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Auto-detect flow based on current path
  const detectedFlow = React.useMemo(() => {
    if (flowId) return NAVIGATION_FLOWS[flowId];

    const path = location.pathname;
    if (path.startsWith('/onboarding')) return NAVIGATION_FLOWS.onboarding;
    if (path.includes('/patients/new')) return NAVIGATION_FLOWS.patientSetup;
    if (path.includes('/appointments/new')) return NAVIGATION_FLOWS.appointmentBooking;
    if (path.includes('/billing/invoices/new')) return NAVIGATION_FLOWS.invoiceCreation;

    return null;
  }, [flowId, location.pathname]);

  // Auto-detect current step based on path
  const detectedCurrentStep = React.useMemo(() => {
    if (currentStep) return currentStep;
    if (!detectedFlow) return null;

    const path = location.pathname;
    const step = detectedFlow.steps.find(s => path.includes(s.path.split('/').pop() || ''));
    return step?.id || null;
  }, [currentStep, detectedFlow, location.pathname]);

  if (!detectedFlow) return null;

  const currentStepIndex = detectedFlow.steps.findIndex(s => s.id === detectedCurrentStep);
  const progress = detectedFlow.steps.length > 0 
    ? ((currentStepIndex + 1) / detectedFlow.steps.length) * 100 
    : 0;

  const handleStepClick = (step: any) => {
    if (onStepClick) {
      onStepClick(step.id, step.path);
    } else {
      navigate(step.path);
    }
  };

  const handleNext = () => {
    if (currentStepIndex < detectedFlow.steps.length - 1) {
      const nextStep = detectedFlow.steps[currentStepIndex + 1];
      handleStepClick(nextStep);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      const prevStep = detectedFlow.steps[currentStepIndex - 1];
      handleStepClick(prevStep);
    }
  };

  const isStepCompleted = (stepId: string) => {
    return completedSteps.includes(stepId) || 
           detectedFlow.steps.findIndex(s => s.id === stepId) < currentStepIndex;
  };

  const isStepCurrent = (stepId: string) => {
    return stepId === detectedCurrentStep;
  };

  const isStepAccessible = (stepId: string) => {
    const stepIndex = detectedFlow.steps.findIndex(s => s.id === stepId);
    return stepIndex <= currentStepIndex + 1; // Allow access to current and next step
  };

  if (compact) {
    return (
      <div className={`bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                {detectedFlow.title}
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Step {currentStepIndex + 1} of {detectedFlow.steps.length}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </Button>
            </div>
          </div>

          {!isCollapsed && (
            <div className="mt-3 flex items-center space-x-2 overflow-x-auto">
              {detectedFlow.steps.map((step, index) => (
                <button
                  key={step.id}
                  onClick={() => isStepAccessible(step.id) && handleStepClick(step)}
                  disabled={!isStepAccessible(step.id)}
                  className={`
                    flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap
                    ${isStepCurrent(step.id) 
                      ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' 
                      : isStepCompleted(step.id)
                      ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                      : isStepAccessible(step.id)
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    }
                  `}
                >
                  {isStepCompleted(step.id) ? (
                    <CheckCircle size={12} />
                  ) : (
                    <Circle size={12} />
                  )}
                  <span>{step.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {detectedFlow.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {detectedFlow.description}
            </p>
          </div>
          
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {currentStepIndex + 1} of {detectedFlow.steps.length}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-primary-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="px-6 py-4">
        <div className="space-y-3">
          {detectedFlow.steps.map((step, index) => (
            <div key={step.id} className="flex items-center space-x-3">
              <button
                onClick={() => isStepAccessible(step.id) && handleStepClick(step)}
                disabled={!isStepAccessible(step.id)}
                className={`
                  flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors
                  ${isStepCurrent(step.id)
                    ? 'border-primary-500 bg-primary-500 text-white'
                    : isStepCompleted(step.id)
                    ? 'border-green-500 bg-green-500 text-white'
                    : isStepAccessible(step.id)
                    ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:border-primary-300'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  }
                `}
              >
                {isStepCompleted(step.id) ? (
                  <CheckCircle size={16} />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </button>

              <div className="flex-1">
                <button
                  onClick={() => isStepAccessible(step.id) && handleStepClick(step)}
                  disabled={!isStepAccessible(step.id)}
                  className={`
                    text-left w-full
                    ${isStepCurrent(step.id)
                      ? 'text-primary-700 dark:text-primary-300 font-medium'
                      : isStepCompleted(step.id)
                      ? 'text-green-700 dark:text-green-300'
                      : isStepAccessible(step.id)
                      ? 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400'
                      : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    }
                  `}
                >
                  {step.title}
                </button>
              </div>

              {isStepCurrent(step.id) && (
                <ArrowRight size={16} className="text-primary-500" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      {showControls && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStepIndex <= 0}
          >
            <ArrowLeft size={16} className="mr-2" />
            Previous
          </Button>

          <Button
            onClick={handleNext}
            disabled={currentStepIndex >= detectedFlow.steps.length - 1}
          >
            Next
            <ArrowRight size={16} className="ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
};

// Hook for managing navigation progress
export const useNavigationProgress = (flowId: keyof typeof NAVIGATION_FLOWS) => {
  const [currentStep, setCurrentStep] = useState<string>('');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const navigate = useNavigate();

  const flow = NAVIGATION_FLOWS[flowId];

  const goToStep = (stepId: string) => {
    const step = flow.steps.find(s => s.id === stepId);
    if (step) {
      setCurrentStep(stepId);
      navigate(step.path);
    }
  };

  const completeStep = (stepId: string) => {
    setCompletedSteps(prev => 
      prev.includes(stepId) ? prev : [...prev, stepId]
    );
  };

  const goToNext = () => {
    const currentIndex = flow.steps.findIndex(s => s.id === currentStep);
    if (currentIndex < flow.steps.length - 1) {
      const nextStep = flow.steps[currentIndex + 1];
      goToStep(nextStep.id);
    }
  };

  const goToPrevious = () => {
    const currentIndex = flow.steps.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      const prevStep = flow.steps[currentIndex - 1];
      goToStep(prevStep.id);
    }
  };

  const getProgress = () => {
    const currentIndex = flow.steps.findIndex(s => s.id === currentStep);
    return ((currentIndex + 1) / flow.steps.length) * 100;
  };

  return {
    currentStep,
    completedSteps,
    goToStep,
    completeStep,
    goToNext,
    goToPrevious,
    getProgress,
    flow,
  };
};
