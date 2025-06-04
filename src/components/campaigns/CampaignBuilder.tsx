import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Calendar, Users, MessageSquare, Settings } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Modal from '../ui/Modal';
import { useToast } from '../ui/Toast';
import DatePicker from '../ui/DatePicker';

interface CampaignStep {
  id: string;
  type: 'sms' | 'email' | 'whatsapp' | 'call';
  delay: number; // in days
  template: string;
  condition?: string;
}

interface Campaign {
  id?: string;
  name: string;
  description: string;
  type: 'recall' | 'birthday' | 'follow_up' | 'promotional';
  targetAudience: string[];
  startDate: Date;
  endDate?: Date;
  steps: CampaignStep[];
  isActive: boolean;
}

interface CampaignBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  campaign?: Campaign;
  onSave: (campaign: Campaign) => void;
}

const messageTemplates = {
  recall: [
    "Hi {patient_name}, it's time for your dental checkup! Please call us to schedule your appointment.",
    "Dear {patient_name}, your 6-month dental checkup is due. Book your appointment today!",
    "Hello {patient_name}, we haven't seen you in a while. Time for your regular dental visit!",
  ],
  birthday: [
    "Happy Birthday {patient_name}! 🎉 Wishing you a year full of healthy smiles!",
    "It's your special day, {patient_name}! Happy Birthday from all of us at the clinic!",
  ],
  follow_up: [
    "Hi {patient_name}, how are you feeling after your recent treatment?",
    "Dear {patient_name}, we hope you're recovering well. Any concerns about your treatment?",
  ],
  promotional: [
    "Special offer for {patient_name}: 20% off teeth whitening this month!",
    "Don't miss our dental hygiene package offer, {patient_name}!",
  ],
};

export const CampaignBuilder: React.FC<CampaignBuilderProps> = ({
  isOpen,
  onClose,
  campaign,
  onSave,
}) => {
  const { t } = useTranslation();
  const { addToast } = useToast();

  const [formData, setFormData] = useState<Campaign>({
    name: campaign?.name || '',
    description: campaign?.description || '',
    type: campaign?.type || 'recall',
    targetAudience: campaign?.targetAudience || [],
    startDate: campaign?.startDate || new Date(),
    endDate: campaign?.endDate,
    steps: campaign?.steps || [],
    isActive: campaign?.isActive || false,
  });

  const [currentStep, setCurrentStep] = useState<Partial<CampaignStep>>({
    type: 'sms',
    delay: 0,
    template: '',
  });

  const addStep = () => {
    if (!currentStep.template) {
      addToast({
        type: 'error',
        title: 'Invalid Step',
        message: 'Please select a message template.',
      });
      return;
    }

    const step: CampaignStep = {
      id: Date.now().toString(),
      type: currentStep.type || 'sms',
      delay: currentStep.delay || 0,
      template: currentStep.template,
      condition: currentStep.condition,
    };

    setFormData(prev => ({
      ...prev,
      steps: [...prev.steps, step],
    }));

    setCurrentStep({
      type: 'sms',
      delay: 0,
      template: '',
    });
  };

  const removeStep = (stepId: string) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.filter(step => step.id !== stepId),
    }));
  };

  const handleSave = () => {
    if (!formData.name || !formData.steps.length) {
      addToast({
        type: 'error',
        title: 'Invalid Campaign',
        message: 'Please provide a campaign name and at least one step.',
      });
      return;
    }

    onSave(formData);
    addToast({
      type: 'success',
      title: 'Campaign Saved',
      message: 'Campaign has been saved successfully.',
    });
    onClose();
  };

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'sms':
      case 'whatsapp':
        return <MessageSquare size={16} />;
      case 'email':
        return <MessageSquare size={16} />;
      case 'call':
        return <MessageSquare size={16} />;
      default:
        return <MessageSquare size={16} />;
    }
  };

  const getStepColor = (type: string) => {
    switch (type) {
      case 'sms':
        return 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400';
      case 'whatsapp':
        return 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400';
      case 'email':
        return 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400';
      case 'call':
        return 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={campaign ? 'Edit Campaign' : 'Create Campaign'}
      size="xl"
    >
      <div className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Campaign Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter campaign name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Campaign Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as Campaign['type'] }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="recall">Recall Campaign</option>
              <option value="birthday">Birthday Campaign</option>
              <option value="follow_up">Follow-up Campaign</option>
              <option value="promotional">Promotional Campaign</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Describe your campaign..."
          />
        </div>

        {/* Schedule */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date
            </label>
            <DatePicker
              value={formData.startDate}
              onChange={(date) => setFormData(prev => ({ ...prev, startDate: date }))}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date (Optional)
            </label>
            <DatePicker
              value={formData.endDate}
              onChange={(date) => setFormData(prev => ({ ...prev, endDate: date }))}
            />
          </div>
        </div>

        {/* Target Audience */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Target Audience
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {['all_patients', 'new_patients', 'returning_patients', 'overdue_patients'].map(audience => (
              <label key={audience} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.targetAudience.includes(audience)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData(prev => ({
                        ...prev,
                        targetAudience: [...prev.targetAudience, audience],
                      }));
                    } else {
                      setFormData(prev => ({
                        ...prev,
                        targetAudience: prev.targetAudience.filter(a => a !== audience),
                      }));
                    }
                  }}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t(`campaigns.audience_${audience}`, audience.replace('_', ' '))}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Campaign Steps */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Campaign Steps</h3>
          
          {/* Add Step Form */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">Add New Step</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Message Type
                  </label>
                  <select
                    value={currentStep.type}
                    onChange={(e) => setCurrentStep(prev => ({ ...prev, type: e.target.value as CampaignStep['type'] }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="sms">SMS</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                    <option value="call">Phone Call</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Delay (days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={currentStep.delay}
                    onChange={(e) => setCurrentStep(prev => ({ ...prev, delay: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div className="flex items-end">
                  <Button onClick={addStep} className="w-full">
                    <Plus size={16} className="mr-2" />
                    Add Step
                  </Button>
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Message Template
                </label>
                <select
                  value={currentStep.template}
                  onChange={(e) => setCurrentStep(prev => ({ ...prev, template: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select a template</option>
                  {messageTemplates[formData.type]?.map((template, index) => (
                    <option key={index} value={template}>
                      {template.substring(0, 50)}...
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Steps List */}
          <div className="space-y-3">
            {formData.steps.map((step, index) => (
              <div key={step.id} className="flex items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {index + 1}.
                    </span>
                    <div className={`p-2 rounded-lg ${getStepColor(step.type)}`}>
                      {getStepIcon(step.type)}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {step.type.toUpperCase()}
                      </span>
                      {step.delay > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          (after {step.delay} days)
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {step.template}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => removeStep(step.id)}
                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {campaign ? 'Update Campaign' : 'Create Campaign'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
