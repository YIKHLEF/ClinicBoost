import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Building2, 
  Users, 
  Calendar, 
  CreditCard, 
  MessageSquare,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import Modal from '../ui/Modal';

interface SetupStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  component: React.ComponentType<StepProps>;
  required: boolean;
  completed: boolean;
}

interface StepProps {
  onNext: () => void;
  onPrevious: () => void;
  onComplete: (data: any) => void;
  data: any;
  isLast: boolean;
}

interface SetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (setupData: any) => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [setupData, setSetupData] = useState<Record<string, any>>({});
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const steps: SetupStep[] = [
    {
      id: 'welcome',
      title: t('setup.welcome.title', 'Welcome to ClinicBoost'),
      description: t('setup.welcome.description', 'Let\'s get your clinic set up in just a few minutes'),
      icon: <Sparkles className="text-primary-500" size={24} />,
      component: WelcomeStep,
      required: true,
      completed: completedSteps.has('welcome'),
    },
    {
      id: 'clinic',
      title: t('setup.clinic.title', 'Clinic Information'),
      description: t('setup.clinic.description', 'Tell us about your clinic'),
      icon: <Building2 className="text-blue-500" size={24} />,
      component: ClinicInfoStep,
      required: true,
      completed: completedSteps.has('clinic'),
    },
    {
      id: 'staff',
      title: t('setup.staff.title', 'Add Staff Members'),
      description: t('setup.staff.description', 'Invite your team to join'),
      icon: <Users className="text-green-500" size={24} />,
      component: StaffSetupStep,
      required: false,
      completed: completedSteps.has('staff'),
    },
    {
      id: 'treatments',
      title: t('setup.treatments.title', 'Treatment Catalog'),
      description: t('setup.treatments.description', 'Set up your services and pricing'),
      icon: <Calendar className="text-purple-500" size={24} />,
      component: TreatmentSetupStep,
      required: false,
      completed: completedSteps.has('treatments'),
    },
    {
      id: 'billing',
      title: t('setup.billing.title', 'Payment Setup'),
      description: t('setup.billing.description', 'Configure payment methods'),
      icon: <CreditCard className="text-orange-500" size={24} />,
      component: BillingSetupStep,
      required: false,
      completed: completedSteps.has('billing'),
    },
    {
      id: 'messaging',
      title: t('setup.messaging.title', 'Communication'),
      description: t('setup.messaging.description', 'Set up SMS and email notifications'),
      icon: <MessageSquare className="text-indigo-500" size={24} />,
      component: MessagingSetupStep,
      required: false,
      completed: completedSteps.has('messaging'),
    },
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const canProceed = currentStepData.required ? currentStepData.completed : true;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepComplete = (stepId: string, data: any) => {
    setSetupData(prev => ({ ...prev, [stepId]: data }));
    setCompletedSteps(prev => new Set([...prev, stepId]));
    
    addToast({
      type: 'success',
      title: t('setup.stepCompleted', 'Step Completed'),
      message: t('setup.stepCompletedMessage', 'Great! Moving to the next step.'),
    });
  };

  const handleComplete = () => {
    onComplete(setupData);
    addToast({
      type: 'success',
      title: t('setup.completed', 'Setup Complete!'),
      message: t('setup.completedMessage', 'Your clinic is ready to go!'),
    });
  };

  const handleSkip = () => {
    if (!currentStepData.required) {
      handleNext();
    }
  };

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const StepComponent = currentStepData.component;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="2xl"
      showCloseButton={false}
    >
      <div className="flex h-[600px]">
        {/* Sidebar with steps */}
        <div className="w-1/3 bg-gray-50 dark:bg-gray-800 p-6 border-r border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            {t('setup.title', 'Setup Progress')}
          </h2>
          
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  index === currentStep
                    ? 'bg-primary-100 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
                    : index < currentStep || step.completed
                    ? 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                onClick={() => goToStep(index)}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  step.completed
                    ? 'bg-green-500 text-white'
                    : index === currentStep
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                }`}>
                  {step.completed ? (
                    <Check size={16} />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    index === currentStep
                      ? 'text-primary-900 dark:text-primary-100'
                      : step.completed
                      ? 'text-green-900 dark:text-green-100'
                      : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    {step.title}
                  </p>
                  <p className={`text-xs ${
                    index === currentStep
                      ? 'text-primary-600 dark:text-primary-400'
                      : step.completed
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {step.description}
                  </p>
                </div>
                
                {step.required && (
                  <div className="flex-shrink-0">
                    <span className="text-xs text-red-500 font-medium">
                      {t('setup.required', 'Required')}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p>{t('setup.progress', 'Progress')}: {completedSteps.size}/{steps.length}</p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(completedSteps.size / steps.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-6">
            <div className="mb-6">
              <div className="flex items-center space-x-3 mb-2">
                {currentStepData.icon}
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {currentStepData.title}
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                {currentStepData.description}
              </p>
            </div>

            <div className="flex-1">
              <StepComponent
                onNext={handleNext}
                onPrevious={handlePrevious}
                onComplete={(data) => handleStepComplete(currentStepData.id, data)}
                data={setupData[currentStepData.id] || {}}
                isLast={isLastStep}
              />
            </div>
          </div>

          {/* Navigation */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
              >
                <ChevronLeft size={16} className="mr-2" />
                {t('setup.previous', 'Previous')}
              </Button>

              <div className="flex items-center space-x-3">
                {!currentStepData.required && !isLastStep && (
                  <Button variant="ghost" onClick={handleSkip}>
                    {t('setup.skip', 'Skip')}
                  </Button>
                )}
                
                <Button
                  onClick={handleNext}
                  disabled={currentStepData.required && !currentStepData.completed}
                >
                  {isLastStep ? (
                    t('setup.finish', 'Finish Setup')
                  ) : (
                    <>
                      {t('setup.next', 'Next')}
                      <ChevronRight size={16} className="ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// Individual step components
const WelcomeStep: React.FC<StepProps> = ({ onComplete }) => {
  const { t } = useTranslation();

  useEffect(() => {
    onComplete({});
  }, [onComplete]);

  return (
    <div className="text-center py-8">
      <div className="mb-6">
        <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Sparkles className="text-primary-500" size={32} />
        </div>
        <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {t('setup.welcome.heading', 'Welcome to ClinicBoost!')}
        </h4>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          {t('setup.welcome.message', 'We\'re excited to help you streamline your dental practice. This setup wizard will guide you through configuring your clinic in just a few minutes.')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
        <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-2xl font-bold text-primary-500">5</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t('setup.welcome.minutes', 'Minutes to setup')}
          </div>
        </div>
        <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-2xl font-bold text-green-500">6</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t('setup.welcome.steps', 'Easy steps')}
          </div>
        </div>
      </div>
    </div>
  );
};

const ClinicInfoStep: React.FC<StepProps> = ({ onComplete, data }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: data.name || '',
    address: data.address || '',
    phone: data.phone || '',
    email: data.email || '',
    website: data.website || '',
    ...data,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(formData);
  };

  const isValid = formData.name && formData.address && formData.phone && formData.email;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('setup.clinic.name', 'Clinic Name')} *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder={t('setup.clinic.namePlaceholder', 'Enter your clinic name')}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('setup.clinic.address', 'Address')} *
        </label>
        <textarea
          value={formData.address}
          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder={t('setup.clinic.addressPlaceholder', 'Enter your clinic address')}
          rows={3}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('setup.clinic.phone', 'Phone')} *
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="+212 6 12 34 56 78"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('setup.clinic.email', 'Email')} *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="contact@clinic.com"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('setup.clinic.website', 'Website')}
        </label>
        <input
          type="url"
          value={formData.website}
          onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="https://www.clinic.com"
        />
      </div>

      <div className="pt-4">
        <Button type="submit" disabled={!isValid} className="w-full">
          {t('setup.clinic.save', 'Save Clinic Information')}
        </Button>
      </div>
    </form>
  );
};

// Placeholder components for other steps
const StaffSetupStep: React.FC<StepProps> = ({ onComplete }) => {
  useEffect(() => {
    onComplete({});
  }, [onComplete]);

  return (
    <div className="text-center py-8">
      <p className="text-gray-600 dark:text-gray-400">
        Staff setup will be implemented here
      </p>
    </div>
  );
};

const TreatmentSetupStep: React.FC<StepProps> = ({ onComplete }) => {
  useEffect(() => {
    onComplete({});
  }, [onComplete]);

  return (
    <div className="text-center py-8">
      <p className="text-gray-600 dark:text-gray-400">
        Treatment setup will be implemented here
      </p>
    </div>
  );
};

const BillingSetupStep: React.FC<StepProps> = ({ onComplete }) => {
  useEffect(() => {
    onComplete({});
  }, [onComplete]);

  return (
    <div className="text-center py-8">
      <p className="text-gray-600 dark:text-gray-400">
        Billing setup will be implemented here
      </p>
    </div>
  );
};

const MessagingSetupStep: React.FC<StepProps> = ({ onComplete }) => {
  useEffect(() => {
    onComplete({});
  }, [onComplete]);

  return (
    <div className="text-center py-8">
      <p className="text-gray-600 dark:text-gray-400">
        Messaging setup will be implemented here
      </p>
    </div>
  );
};
