/**
 * Disaster Recovery Plan
 * 
 * Component for managing disaster recovery plans and procedures
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Badge } from '../ui/Badge';
import useTranslation from '../../hooks/useTranslation';
import {
  DisasterRecoveryPlan,
  RecoveryStep,
  EmergencyContact,
  TestResult,
  TestIssue
} from '../../lib/backup/types';
import {
  AlertTriangle,
  Shield,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  Play,
  Edit,
  Trash2,
  Plus,
  Phone,
  Mail,
  Calendar,
  FileText,
  Activity,
  Target,
  Timer
} from 'lucide-react';

interface DisasterRecoveryPlanProps {
  plan?: DisasterRecoveryPlan;
  onSave?: (plan: DisasterRecoveryPlan) => void;
  onTest?: (planId: string) => void;
}

const DisasterRecoveryPlanComponent: React.FC<DisasterRecoveryPlanProps> = ({
  plan: initialPlan,
  onSave,
  onTest
}) => {
  const { t, tCommon, format } = useTranslation();

  // State management
  const [plan, setPlan] = useState<DisasterRecoveryPlan>(
    initialPlan || getDefaultPlan()
  );
  const [activeTab, setActiveTab] = useState<'overview' | 'steps' | 'contacts' | 'testing'>('overview');
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [editingContact, setEditingContact] = useState<string | null>(null);

  // Handle plan save
  const handleSave = () => {
    const updatedPlan = {
      ...plan,
      lastUpdated: new Date()
    };
    setPlan(updatedPlan);
    onSave?.(updatedPlan);
  };

  // Handle test execution
  const handleTest = () => {
    onTest?.(plan.id);
  };

  // Add new step
  const addStep = () => {
    const newStep: RecoveryStep = {
      id: `step_${Date.now()}`,
      order: plan.steps.length + 1,
      title: '',
      description: '',
      type: 'manual',
      estimatedTime: 30,
      dependencies: [],
      responsible: '',
      instructions: ''
    };

    setPlan(prev => ({
      ...prev,
      steps: [...prev.steps, newStep]
    }));
    setEditingStep(newStep.id);
  };

  // Update step
  const updateStep = (stepId: string, updates: Partial<RecoveryStep>) => {
    setPlan(prev => ({
      ...prev,
      steps: prev.steps.map(step =>
        step.id === stepId ? { ...step, ...updates } : step
      )
    }));
  };

  // Remove step
  const removeStep = (stepId: string) => {
    setPlan(prev => ({
      ...prev,
      steps: prev.steps.filter(step => step.id !== stepId)
    }));
  };

  // Add new contact
  const addContact = () => {
    const newContact: EmergencyContact = {
      name: '',
      role: '',
      email: '',
      phone: '',
      priority: plan.contacts.length + 1,
      availability: '24/7'
    };

    setPlan(prev => ({
      ...prev,
      contacts: [...prev.contacts, newContact]
    }));
    setEditingContact(`contact_${Date.now()}`);
  };

  // Update contact
  const updateContact = (index: number, updates: Partial<EmergencyContact>) => {
    setPlan(prev => ({
      ...prev,
      contacts: prev.contacts.map((contact, i) =>
        i === index ? { ...contact, ...updates } : contact
      )
    }));
  };

  // Remove contact
  const removeContact = (index: number) => {
    setPlan(prev => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== index)
    }));
  };

  // Get priority color
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('backup.drp.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {plan.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleTest}>
            <Play size={16} className="mr-2" />
            {t('backup.drp.testPlan')}
          </Button>
          <Button onClick={handleSave}>
            <Shield size={16} className="mr-2" />
            {tCommon('save')}
          </Button>
        </div>
      </div>

      {/* Plan Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${getPriorityColor(plan.priority)}`}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('backup.drp.priority')}
                </p>
                <p className="font-medium text-gray-900 dark:text-white capitalize">
                  {plan.priority}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Target size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('backup.drp.rto')}
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {plan.rto} {t('backup.drp.minutes')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Timer size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('backup.drp.rpo')}
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {plan.rpo} {t('backup.drp.minutes')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Calendar size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('backup.drp.lastTested')}
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {plan.lastTested ? format({ date: plan.lastTested }).date : t('backup.drp.never')}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: t('backup.drp.tabs.overview'), icon: FileText },
            { id: 'steps', label: t('backup.drp.tabs.steps'), icon: Activity },
            { id: 'contacts', label: t('backup.drp.tabs.contacts'), icon: Users },
            { id: 'testing', label: t('backup.drp.tabs.testing'), icon: CheckCircle }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('backup.drp.planDetails')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('backup.drp.planName')}
                  </label>
                  <Input
                    value={plan.name}
                    onChange={(e) => setPlan(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('backup.drp.description')}
                  </label>
                  <Textarea
                    value={plan.description}
                    onChange={(e) => setPlan(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('backup.drp.rto')} ({t('backup.drp.minutes')})
                    </label>
                    <Input
                      type="number"
                      value={plan.rto}
                      onChange={(e) => setPlan(prev => ({ ...prev, rto: parseInt(e.target.value) }))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('backup.drp.rpo')} ({t('backup.drp.minutes')})
                    </label>
                    <Input
                      type="number"
                      value={plan.rpo}
                      onChange={(e) => setPlan(prev => ({ ...prev, rpo: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('backup.drp.approvalStatus')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="approved"
                    checked={plan.approved}
                    onChange={(e) => setPlan(prev => ({ ...prev, approved: e.target.checked }))}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="approved" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    {t('backup.drp.planApproved')}
                  </label>
                </div>

                {plan.approved && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('backup.drp.approvedBy')}
                      </label>
                      <Input
                        value={plan.approvedBy || ''}
                        onChange={(e) => setPlan(prev => ({ ...prev, approvedBy: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('backup.drp.approvedAt')}
                      </label>
                      <Input
                        type="datetime-local"
                        value={plan.approvedAt ? plan.approvedAt.toISOString().slice(0, 16) : ''}
                        onChange={(e) => setPlan(prev => ({ 
                          ...prev, 
                          approvedAt: e.target.value ? new Date(e.target.value) : undefined 
                        }))}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Steps Tab */}
        {activeTab === 'steps' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity size={20} />
                  {t('backup.drp.recoverySteps')}
                </CardTitle>
                <Button onClick={addStep} size="sm">
                  <Plus size={16} className="mr-2" />
                  {t('backup.drp.addStep')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {plan.steps.length > 0 ? (
                <div className="space-y-4">
                  {plan.steps
                    .sort((a, b) => a.order - b.order)
                    .map((step) => (
                      <div
                        key={step.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                      >
                        {editingStep === step.id ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  {t('backup.drp.stepTitle')}
                                </label>
                                <Input
                                  value={step.title}
                                  onChange={(e) => updateStep(step.id, { title: e.target.value })}
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  {t('backup.drp.estimatedTime')} ({t('backup.drp.minutes')})
                                </label>
                                <Input
                                  type="number"
                                  value={step.estimatedTime}
                                  onChange={(e) => updateStep(step.id, { estimatedTime: parseInt(e.target.value) })}
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('backup.drp.instructions')}
                              </label>
                              <Textarea
                                value={step.instructions}
                                onChange={(e) => updateStep(step.id, { instructions: e.target.value })}
                                rows={3}
                              />
                            </div>

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => setEditingStep(null)}
                              >
                                {tCommon('save')}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingStep(null)}
                              >
                                {tCommon('cancel')}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center justify-center w-8 h-8 bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 rounded-full font-medium">
                                {step.order}
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                  {step.title || t('backup.drp.untitledStep')}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {t('backup.drp.estimatedTime')}: {step.estimatedTime} {t('backup.drp.minutes')}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingStep(step.id)}
                              >
                                <Edit size={14} />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeStep(step.id)}
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {t('backup.drp.noSteps')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Contacts Tab */}
        {activeTab === 'contacts' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users size={20} />
                  {t('backup.drp.emergencyContacts')}
                </CardTitle>
                <Button onClick={addContact} size="sm">
                  <Plus size={16} className="mr-2" />
                  {t('backup.drp.addContact')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {plan.contacts.length > 0 ? (
                <div className="space-y-4">
                  {plan.contacts.map((contact, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                            <Users size={20} className="text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {contact.name || t('backup.drp.unnamedContact')}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {contact.role}
                            </p>
                            <div className="flex items-center gap-4 mt-1">
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <Mail size={12} />
                                {contact.email}
                              </div>
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <Phone size={12} />
                                {contact.phone}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline">
                            {t('backup.drp.priority')} {contact.priority}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeContact(index)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {t('backup.drp.noContacts')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Testing Tab */}
        {activeTab === 'testing' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle size={20} />
                {t('backup.drp.testResults')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <CheckCircle size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  {t('backup.drp.noTestResults')}
                </p>
                <Button className="mt-4" onClick={handleTest}>
                  <Play size={16} className="mr-2" />
                  {t('backup.drp.runTest')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

// Default disaster recovery plan
function getDefaultPlan(): DisasterRecoveryPlan {
  return {
    id: `drp_${Date.now()}`,
    name: 'Clinic Data Recovery Plan',
    description: 'Comprehensive disaster recovery plan for clinic data and systems',
    priority: 'high',
    rto: 240, // 4 hours
    rpo: 60,  // 1 hour
    steps: [],
    contacts: [],
    resources: [],
    testing: {
      frequency: 'quarterly',
      testType: 'partial'
    },
    lastUpdated: new Date(),
    approved: false
  };
}

export default DisasterRecoveryPlanComponent;
