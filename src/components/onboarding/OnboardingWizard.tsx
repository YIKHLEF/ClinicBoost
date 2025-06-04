import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { 
  Building2, 
  User, 
  Users, 
  Settings, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Stethoscope,
  Calendar,
  CreditCard,
  MessageSquare,
  Shield,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

// Onboarding steps configuration
const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to ClinicBoost',
    description: 'Let\'s get your dental practice set up in just a few minutes',
    icon: Sparkles,
    color: 'text-purple-500',
    bgColor: 'bg-purple-100 dark:bg-purple-900/20',
  },
  {
    id: 'clinic-info',
    title: 'Clinic Information',
    description: 'Tell us about your dental practice',
    icon: Building2,
    color: 'text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
  },
  {
    id: 'profile',
    title: 'Your Profile',
    description: 'Set up your professional profile',
    icon: User,
    color: 'text-green-500',
    bgColor: 'bg-green-100 dark:bg-green-900/20',
  },
  {
    id: 'team',
    title: 'Team Members',
    description: 'Invite your team to join',
    icon: Users,
    color: 'text-orange-500',
    bgColor: 'bg-orange-100 dark:bg-orange-900/20',
  },
  {
    id: 'services',
    title: 'Services & Pricing',
    description: 'Configure your dental services',
    icon: Stethoscope,
    color: 'text-red-500',
    bgColor: 'bg-red-100 dark:bg-red-900/20',
  },
  {
    id: 'integrations',
    title: 'Integrations',
    description: 'Connect your tools and services',
    icon: Settings,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-900/20',
  },
  {
    id: 'complete',
    title: 'All Set!',
    description: 'Your clinic is ready to go',
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-100 dark:bg-green-900/20',
  },
];

// Form schemas for each step
const clinicInfoSchema = z.object({
  clinic_name: z.string().min(1, 'Clinic name is required'),
  clinic_type: z.enum(['general', 'orthodontics', 'oral_surgery', 'pediatric', 'cosmetic']),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  postal_code: z.string().min(1, 'Postal code is required'),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Valid email is required'),
  website: z.string().url().optional().or(z.literal('')),
});

const profileSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  title: z.string().min(1, 'Professional title is required'),
  license_number: z.string().min(1, 'License number is required'),
  specialization: z.string().optional(),
  bio: z.string().optional(),
});

const teamSchema = z.object({
  team_members: z.array(z.object({
    email: z.string().email('Valid email is required'),
    role: z.enum(['dentist', 'hygienist', 'assistant', 'receptionist', 'admin']),
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
  })).optional(),
});

const servicesSchema = z.object({
  services: z.array(z.object({
    name: z.string().min(1, 'Service name is required'),
    description: z.string().optional(),
    duration: z.number().min(15, 'Duration must be at least 15 minutes'),
    price: z.number().min(0, 'Price must be positive'),
    category: z.string().min(1, 'Category is required'),
  })).min(1, 'At least one service is required'),
});

const integrationsSchema = z.object({
  enable_sms: z.boolean().default(false),
  enable_email: z.boolean().default(true),
  enable_payments: z.boolean().default(false),
  enable_insurance: z.boolean().default(false),
  twilio_enabled: z.boolean().default(false),
  stripe_enabled: z.boolean().default(false),
});

interface OnboardingWizardProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip?: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  isOpen,
  onComplete,
  onSkip,
}) => {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [onboardingData, setOnboardingData] = useState<any>({});

  // Form instances for each step
  const clinicForm = useForm({
    resolver: zodResolver(clinicInfoSchema),
    defaultValues: {
      clinic_name: '',
      clinic_type: 'general' as const,
      address: '',
      city: '',
      postal_code: '',
      phone: '',
      email: user?.email || '',
      website: '',
    },
  });

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.user_metadata?.first_name || '',
      last_name: user?.user_metadata?.last_name || '',
      title: 'Dr.',
      license_number: '',
      specialization: '',
      bio: '',
    },
  });

  const teamForm = useForm({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      team_members: [],
    },
  });

  const servicesForm = useForm({
    resolver: zodResolver(servicesSchema),
    defaultValues: {
      services: [
        {
          name: 'Dental Cleaning',
          description: 'Regular dental cleaning and examination',
          duration: 60,
          price: 150,
          category: 'Preventive',
        },
        {
          name: 'Dental Filling',
          description: 'Tooth restoration with composite filling',
          duration: 45,
          price: 200,
          category: 'Restorative',
        },
      ],
    },
  });

  const integrationsForm = useForm({
    resolver: zodResolver(integrationsSchema),
    defaultValues: {
      enable_sms: false,
      enable_email: true,
      enable_payments: false,
      enable_insurance: false,
      twilio_enabled: false,
      stripe_enabled: false,
    },
  });

  // Check if user has completed onboarding
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) return;

      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('onboarding_completed, onboarding_step')
          .eq('user_id', user.id)
          .single();

        if (profile?.onboarding_completed) {
          onComplete();
        } else if (profile?.onboarding_step) {
          setCurrentStep(profile.onboarding_step);
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      }
    };

    if (isOpen) {
      checkOnboardingStatus();
    }
  }, [isOpen, user, onComplete]);

  const nextStep = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepSubmit = async (stepData: any) => {
    setOnboardingData(prev => ({ ...prev, [ONBOARDING_STEPS[currentStep].id]: stepData }));
    
    // Save progress to database
    try {
      await supabase
        .from('user_profiles')
        .upsert({
          user_id: user?.id,
          onboarding_step: currentStep + 1,
          onboarding_data: { ...onboardingData, [ONBOARDING_STEPS[currentStep].id]: stepData },
        });
    } catch (error) {
      console.error('Error saving onboarding progress:', error);
    }

    if (currentStep === ONBOARDING_STEPS.length - 2) {
      // Last step before completion
      await completeOnboarding();
    } else {
      nextStep();
    }
  };

  const completeOnboarding = async () => {
    setIsSubmitting(true);
    
    try {
      // Save all onboarding data
      await supabase
        .from('user_profiles')
        .upsert({
          user_id: user?.id,
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
          onboarding_data: onboardingData,
        });

      // Create clinic record
      if (onboardingData['clinic-info']) {
        await supabase
          .from('clinics')
          .insert({
            ...onboardingData['clinic-info'],
            owner_id: user?.id,
          });
      }

      // Create services
      if (onboardingData.services?.services) {
        await supabase
          .from('services')
          .insert(
            onboardingData.services.services.map((service: any) => ({
              ...service,
              clinic_id: user?.id, // This would be the actual clinic ID
            }))
          );
      }

      addToast({
        type: 'success',
        title: t('onboarding.completed', 'Onboarding Complete!'),
        message: t('onboarding.completedMessage', 'Welcome to ClinicBoost! Your practice is ready to go.'),
      });

      setCurrentStep(ONBOARDING_STEPS.length - 1);
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error: any) {
      addToast({
        type: 'error',
        title: t('onboarding.error', 'Setup Error'),
        message: error.message || t('onboarding.errorMessage', 'Failed to complete setup. Please try again.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const skipOnboarding = async () => {
    if (onSkip) {
      try {
        await supabase
          .from('user_profiles')
          .upsert({
            user_id: user?.id,
            onboarding_completed: true,
            onboarding_skipped: true,
            onboarding_completed_at: new Date().toISOString(),
          });
        
        onSkip();
      } catch (error) {
        console.error('Error skipping onboarding:', error);
      }
    }
  };

  if (!isOpen) return null;

  const currentStepData = ONBOARDING_STEPS[currentStep];
  const Icon = currentStepData.icon;
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity" />
        
        <div className="relative w-full max-w-4xl bg-white dark:bg-gray-900 rounded-lg shadow-xl">
          {/* Progress Bar */}
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-t-lg overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Header */}
          <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-full ${currentStepData.bgColor}`}>
                  <Icon className={`h-6 w-6 ${currentStepData.color}`} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {currentStepData.title}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {currentStepData.description}
                  </p>
                </div>
              </div>
              
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Step {currentStep + 1} of {ONBOARDING_STEPS.length}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-6 min-h-[400px]">
            {/* Step content will be rendered here */}
            {currentStep === 0 && <WelcomeStep onNext={nextStep} />}
            {currentStep === 1 && <ClinicInfoStep form={clinicForm} onSubmit={handleStepSubmit} />}
            {currentStep === 2 && <ProfileStep form={profileForm} onSubmit={handleStepSubmit} />}
            {currentStep === 3 && <TeamStep form={teamForm} onSubmit={handleStepSubmit} />}
            {currentStep === 4 && <ServicesStep form={servicesForm} onSubmit={handleStepSubmit} />}
            {currentStep === 5 && <IntegrationsStep form={integrationsForm} onSubmit={handleStepSubmit} />}
            {currentStep === 6 && <CompletionStep onFinish={onComplete} />}
          </div>

          {/* Footer */}
          <div className="px-8 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
            <div className="flex space-x-3">
              {currentStep > 0 && currentStep < ONBOARDING_STEPS.length - 1 && (
                <Button variant="outline" onClick={prevStep}>
                  <ArrowLeft size={16} className="mr-2" />
                  Previous
                </Button>
              )}
              
              {currentStep < ONBOARDING_STEPS.length - 2 && (
                <Button variant="ghost" onClick={skipOnboarding}>
                  Skip Setup
                </Button>
              )}
            </div>

            {/* Step indicators */}
            <div className="flex space-x-2">
              {ONBOARDING_STEPS.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index <= currentStep
                      ? 'bg-primary-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Individual step components will be implemented in the next part
const WelcomeStep: React.FC<{ onNext: () => void }> = ({ onNext }) => (
  <div className="text-center py-12">
    <div className="mb-8">
      <Sparkles className="h-16 w-16 text-purple-500 mx-auto mb-4" />
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        Welcome to ClinicBoost!
      </h3>
      <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
        We'll help you set up your dental practice management system in just a few minutes. 
        Let's get started with the basics and you'll be ready to manage patients, appointments, and more.
      </p>
    </div>
    
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div className="text-center">
        <Calendar className="h-8 w-8 text-blue-500 mx-auto mb-2" />
        <p className="text-sm text-gray-600 dark:text-gray-400">Appointments</p>
      </div>
      <div className="text-center">
        <Users className="h-8 w-8 text-green-500 mx-auto mb-2" />
        <p className="text-sm text-gray-600 dark:text-gray-400">Patients</p>
      </div>
      <div className="text-center">
        <CreditCard className="h-8 w-8 text-orange-500 mx-auto mb-2" />
        <p className="text-sm text-gray-600 dark:text-gray-400">Billing</p>
      </div>
      <div className="text-center">
        <MessageSquare className="h-8 w-8 text-purple-500 mx-auto mb-2" />
        <p className="text-sm text-gray-600 dark:text-gray-400">Messaging</p>
      </div>
    </div>
    
    <Button onClick={onNext} size="lg">
      Get Started
      <ArrowRight size={16} className="ml-2" />
    </Button>
  </div>
);

// Step component implementations
const ClinicInfoStep: React.FC<{ form: any; onSubmit: (data: any) => void }> = ({ form, onSubmit }) => {
  const { t } = useTranslation();
  const { register, handleSubmit, formState: { errors } } = form;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Clinic Name *
          </label>
          <input
            {...register('clinic_name')}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Enter your clinic name"
          />
          {errors.clinic_name && (
            <p className="mt-1 text-sm text-red-600">{errors.clinic_name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Clinic Type *
          </label>
          <select
            {...register('clinic_type')}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="general">General Dentistry</option>
            <option value="orthodontics">Orthodontics</option>
            <option value="oral_surgery">Oral Surgery</option>
            <option value="pediatric">Pediatric Dentistry</option>
            <option value="cosmetic">Cosmetic Dentistry</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Phone Number *
          </label>
          <input
            {...register('phone')}
            type="tel"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="+212 5 22 XX XX XX"
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Address *
          </label>
          <input
            {...register('address')}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Enter clinic address"
          />
          {errors.address && (
            <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            City *
          </label>
          <input
            {...register('city')}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="City"
          />
          {errors.city && (
            <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Postal Code *
          </label>
          <input
            {...register('postal_code')}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Postal code"
          />
          {errors.postal_code && (
            <p className="mt-1 text-sm text-red-600">{errors.postal_code.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email *
          </label>
          <input
            {...register('email')}
            type="email"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="clinic@example.com"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Website
          </label>
          <input
            {...register('website')}
            type="url"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="https://www.yourclinic.com"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit">
          Continue
          <ArrowRight size={16} className="ml-2" />
        </Button>
      </div>
    </form>
  );
};

const ProfileStep: React.FC<{ form: any; onSubmit: (data: any) => void }> = ({ form, onSubmit }) => {
  const { t } = useTranslation();
  const { register, handleSubmit, formState: { errors } } = form;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            First Name *
          </label>
          <input
            {...register('first_name')}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Your first name"
          />
          {errors.first_name && (
            <p className="mt-1 text-sm text-red-600">{errors.first_name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Last Name *
          </label>
          <input
            {...register('last_name')}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Your last name"
          />
          {errors.last_name && (
            <p className="mt-1 text-sm text-red-600">{errors.last_name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Professional Title *
          </label>
          <input
            {...register('title')}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Dr., DDS, DMD, etc."
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            License Number *
          </label>
          <input
            {...register('license_number')}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Professional license number"
          />
          {errors.license_number && (
            <p className="mt-1 text-sm text-red-600">{errors.license_number.message}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Specialization
          </label>
          <input
            {...register('specialization')}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="e.g., Orthodontics, Oral Surgery, Pediatric Dentistry"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Professional Bio
          </label>
          <textarea
            {...register('bio')}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Tell patients about your experience and approach to dental care..."
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit">
          Continue
          <ArrowRight size={16} className="ml-2" />
        </Button>
      </div>
    </form>
  );
};

const TeamStep: React.FC<{ form: any; onSubmit: (data: any) => void }> = ({ form, onSubmit }) => {
  const { t } = useTranslation();
  const { register, handleSubmit, watch, setValue } = form;
  const [teamMembers, setTeamMembers] = useState([
    { email: '', role: 'assistant', first_name: '', last_name: '' }
  ]);

  const addTeamMember = () => {
    setTeamMembers([...teamMembers, { email: '', role: 'assistant', first_name: '', last_name: '' }]);
  };

  const removeTeamMember = (index: number) => {
    setTeamMembers(teamMembers.filter((_, i) => i !== index));
  };

  const handleSubmitWithTeam = (data: any) => {
    onSubmit({ ...data, team_members: teamMembers });
  };

  return (
    <form onSubmit={handleSubmit(handleSubmitWithTeam)} className="space-y-6">
      <div className="text-center mb-6">
        <p className="text-gray-600 dark:text-gray-400">
          Invite your team members to collaborate. You can skip this step and add them later.
        </p>
      </div>

      <div className="space-y-4">
        {teamMembers.map((member, index) => (
          <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  First Name
                </label>
                <input
                  value={member.first_name}
                  onChange={(e) => {
                    const updated = [...teamMembers];
                    updated[index].first_name = e.target.value;
                    setTeamMembers(updated);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="First name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Last Name
                </label>
                <input
                  value={member.last_name}
                  onChange={(e) => {
                    const updated = [...teamMembers];
                    updated[index].last_name = e.target.value;
                    setTeamMembers(updated);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Last name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={member.email}
                  onChange={(e) => {
                    const updated = [...teamMembers];
                    updated[index].email = e.target.value;
                    setTeamMembers(updated);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="email@example.com"
                />
              </div>

              <div className="flex items-end space-x-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Role
                  </label>
                  <select
                    value={member.role}
                    onChange={(e) => {
                      const updated = [...teamMembers];
                      updated[index].role = e.target.value as any;
                      setTeamMembers(updated);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="dentist">Dentist</option>
                    <option value="hygienist">Hygienist</option>
                    <option value="assistant">Assistant</option>
                    <option value="receptionist">Receptionist</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {teamMembers.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTeamMember(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={addTeamMember}>
          <Users size={16} className="mr-2" />
          Add Team Member
        </Button>

        <Button type="submit">
          Continue
          <ArrowRight size={16} className="ml-2" />
        </Button>
      </div>
    </form>
  );
};

const ServicesStep: React.FC<{ form: any; onSubmit: (data: any) => void }> = ({ form, onSubmit }) => {
  const { t } = useTranslation();
  const { register, handleSubmit, watch, setValue } = form;
  const [services, setServices] = useState([
    {
      name: 'Dental Cleaning',
      description: 'Regular dental cleaning and examination',
      duration: 60,
      price: 150,
      category: 'Preventive',
    },
    {
      name: 'Dental Filling',
      description: 'Tooth restoration with composite filling',
      duration: 45,
      price: 200,
      category: 'Restorative',
    },
  ]);

  const addService = () => {
    setServices([...services, {
      name: '',
      description: '',
      duration: 30,
      price: 0,
      category: 'General',
    }]);
  };

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const handleSubmitWithServices = (data: any) => {
    onSubmit({ ...data, services });
  };

  return (
    <form onSubmit={handleSubmit(handleSubmitWithServices)} className="space-y-6">
      <div className="text-center mb-6">
        <p className="text-gray-600 dark:text-gray-400">
          Set up your dental services and pricing. You can modify these later.
        </p>
      </div>

      <div className="space-y-4">
        {services.map((service, index) => (
          <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Service Name
                </label>
                <input
                  value={service.name}
                  onChange={(e) => {
                    const updated = [...services];
                    updated[index].name = e.target.value;
                    setServices(updated);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Service name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  value={service.category}
                  onChange={(e) => {
                    const updated = [...services];
                    updated[index].category = e.target.value;
                    setServices(updated);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="Preventive">Preventive</option>
                  <option value="Restorative">Restorative</option>
                  <option value="Cosmetic">Cosmetic</option>
                  <option value="Orthodontics">Orthodontics</option>
                  <option value="Surgery">Surgery</option>
                  <option value="Emergency">Emergency</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Duration (min)
                </label>
                <input
                  type="number"
                  value={service.duration}
                  onChange={(e) => {
                    const updated = [...services];
                    updated[index].duration = parseInt(e.target.value) || 0;
                    setServices(updated);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="60"
                />
              </div>

              <div className="flex items-end space-x-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Price (MAD)
                  </label>
                  <input
                    type="number"
                    value={service.price}
                    onChange={(e) => {
                      const updated = [...services];
                      updated[index].price = parseFloat(e.target.value) || 0;
                      setServices(updated);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="150"
                  />
                </div>

                {services.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeService(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={service.description}
                onChange={(e) => {
                  const updated = [...services];
                  updated[index].description = e.target.value;
                  setServices(updated);
                }}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Service description..."
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={addService}>
          <Stethoscope size={16} className="mr-2" />
          Add Service
        </Button>

        <Button type="submit">
          Continue
          <ArrowRight size={16} className="ml-2" />
        </Button>
      </div>
    </form>
  );
};

const IntegrationsStep: React.FC<{ form: any; onSubmit: (data: any) => void }> = ({ form, onSubmit }) => {
  const { t } = useTranslation();
  const { register, handleSubmit, watch } = form;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="text-center mb-6">
        <p className="text-gray-600 dark:text-gray-400">
          Enable integrations to enhance your clinic's capabilities. You can configure these later.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <MessageSquare className="h-8 w-8 text-blue-500" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">SMS & WhatsApp</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Send appointment reminders</p>
              </div>
            </div>
            <input
              {...register('enable_sms')}
              type="checkbox"
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <CreditCard className="h-8 w-8 text-green-500" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Payment Processing</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Accept online payments</p>
              </div>
            </div>
            <input
              {...register('enable_payments')}
              type="checkbox"
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-purple-500" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Insurance Claims</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Submit electronic claims</p>
              </div>
            </div>
            <input
              {...register('enable_insurance')}
              type="checkbox"
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Calendar className="h-8 w-8 text-orange-500" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Email Notifications</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Send email reminders</p>
              </div>
            </div>
            <input
              {...register('enable_email')}
              type="checkbox"
              defaultChecked
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Settings className="h-5 w-5 text-blue-500 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100">Configuration Required</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Some integrations require additional setup with API keys and configuration.
              You can complete this setup in the Settings section after onboarding.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit">
          Complete Setup
          <CheckCircle size={16} className="ml-2" />
        </Button>
      </div>
    </form>
  );
};

const CompletionStep: React.FC<{ onFinish: () => void }> = ({ onFinish }) => (
  <div className="text-center py-12">
    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
      All Set!
    </h3>
    <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
      Your clinic is now ready to use. Welcome to ClinicBoost!
    </p>
    <Button onClick={onFinish} size="lg">
      Start Using ClinicBoost
    </Button>
  </div>
);
