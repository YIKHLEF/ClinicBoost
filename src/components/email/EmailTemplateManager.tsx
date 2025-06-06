import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Copy,
  Languages,
  Tag
} from 'lucide-react';
import { getEmailService } from '../../lib/email';
import type { EmailTemplate, EmailCategory } from '../../lib/email/types';
import { useToast } from '../../hooks/useToast';
import { logger } from '../../lib/logging-monitoring';

interface EmailTemplateManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmailTemplateManager: React.FC<EmailTemplateManagerProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState<EmailCategory | 'all'>('all');
  const [filterLanguage, setFilterLanguage] = useState<'en' | 'fr' | 'ar' | 'all'>('all');

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    try {
      const emailService = getEmailService();
      const templateService = emailService.getTemplateService();
      const allTemplates = templateService.getAllTemplates();
      setTemplates(allTemplates);
    } catch (error: any) {
      logger.error('Failed to load templates', 'email-template-manager', { error: error.message });
      addToast({
        type: 'error',
        title: t('email.templates.loadError', 'Failed to load templates'),
        description: error.message,
      });
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm(t('email.templates.deleteConfirm', 'Are you sure you want to delete this template?'))) {
      return;
    }

    try {
      setIsLoading(true);
      const emailService = getEmailService();
      const templateService = emailService.getTemplateService();
      const deleted = templateService.deleteTemplate(templateId);
      
      if (deleted) {
        addToast({
          type: 'success',
          title: t('email.templates.deleteSuccess', 'Template deleted'),
          description: t('email.templates.deleteSuccessDesc', 'The email template has been deleted.'),
        });
        loadTemplates();
      }
    } catch (error: any) {
      logger.error('Failed to delete template', 'email-template-manager', { error: error.message });
      addToast({
        type: 'error',
        title: t('email.templates.deleteError', 'Failed to delete template'),
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviewTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    
    // Set sample data for preview
    const sampleData = {
      patientName: 'John Doe',
      firstName: 'John',
      lastName: 'Doe',
      appointmentDate: new Date(),
      doctorName: 'Dr. Smith',
      treatmentType: 'Dental Cleaning',
      clinicName: 'ClinicBoost',
      clinicAddress: '123 Main St, City',
      clinicPhone: '+212 5 22 XX XX XX',
      clinicEmail: 'info@clinicboost.com',
      invoiceNumber: 'INV-001',
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      totalAmount: 150,
      currency: 'MAD',
      status: 'Pending',
    };
    
    setPreviewData(sampleData);
  };

  const renderPreview = () => {
    if (!selectedTemplate) return null;

    try {
      const emailService = getEmailService();
      const templateService = emailService.getTemplateService();
      const rendered = templateService.renderTemplate(selectedTemplate.id, previewData);
      
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('email.templates.subject', 'Subject')}
            </label>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded border">
              {rendered.subject}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('email.templates.htmlPreview', 'HTML Preview')}
            </label>
            <div 
              className="p-4 bg-white border rounded max-h-96 overflow-auto"
              dangerouslySetInnerHTML={{ __html: rendered.html }}
            />
          </div>
          
          {rendered.text && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('email.templates.textPreview', 'Text Preview')}
              </label>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded border whitespace-pre-wrap font-mono text-sm">
                {rendered.text}
              </div>
            </div>
          )}
        </div>
      );
    } catch (error: any) {
      return (
        <div className="text-red-600 p-4 bg-red-50 rounded">
          {t('email.templates.previewError', 'Error rendering template')}: {error.message}
        </div>
      );
    }
  };

  const filteredTemplates = templates.filter(template => {
    if (filterCategory !== 'all' && template.category !== filterCategory) {
      return false;
    }
    if (filterLanguage !== 'all' && template.language !== filterLanguage) {
      return false;
    }
    return true;
  });

  const categories: EmailCategory[] = [
    'appointment_reminder',
    'appointment_confirmation',
    'welcome',
    'invoice',
    'password_reset',
    'system_notification',
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-7xl h-5/6 flex">
        {/* Sidebar */}
        <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <FileText className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {t('email.templates.title', 'Email Templates')}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>
            
            {/* Filters */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('email.templates.category', 'Category')}
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value as EmailCategory | 'all')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="all">{t('common.all', 'All')}</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {t(`email.categories.${category}`, category)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('email.templates.language', 'Language')}
                </label>
                <select
                  value={filterLanguage}
                  onChange={(e) => setFilterLanguage(e.target.value as 'en' | 'fr' | 'ar' | 'all')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="all">{t('common.all', 'All')}</option>
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="ar">العربية</option>
                </select>
              </div>
            </div>
          </div>

          {/* Template List */}
          <div className="flex-1 overflow-auto p-4">
            <div className="space-y-2">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedTemplate?.id === template.id
                      ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600'
                  }`}
                  onClick={() => handlePreviewTemplate(template)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {template.name}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200">
                          <Tag className="h-3 w-3 mr-1" />
                          {t(`email.categories.${template.category}`, template.category)}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          <Languages className="h-3 w-3 mr-1" />
                          {template.language.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template.id);
                        }}
                        disabled={isLoading}
                        className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="flex-1 flex flex-col">
          {selectedTemplate ? (
            <>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {selectedTemplate.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {t('email.templates.preview', 'Template Preview')}
                </p>
              </div>
              <div className="flex-1 overflow-auto p-6">
                {renderPreview()}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {t('email.templates.selectTemplate', 'Select a template')}
                </h3>
                <p className="text-gray-500">
                  {t('email.templates.selectTemplateDesc', 'Choose a template from the list to preview it.')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
