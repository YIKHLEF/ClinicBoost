/**
 * Custom Report Builder
 * 
 * Interactive interface for creating custom reports
 */

import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Badge } from '../ui/Badge';
import useTranslation from '../../hooks/useTranslation';
import {
  Report,
  ReportSection,
  ReportFilter,
  ChartConfig,
  TableData,
  ReportMetric
} from '../../lib/analytics/types';
import {
  Plus,
  Trash2,
  Eye,
  Save,
  Download,
  BarChart3,
  Table,
  FileText,
  TrendingUp,
  Settings,
  Filter,
  Calendar,
  Users,
  DollarSign
} from 'lucide-react';

interface ReportBuilderProps {
  onSave?: (report: Report) => void;
  onPreview?: (report: Report) => void;
  initialReport?: Partial<Report>;
}

export const ReportBuilder: React.FC<ReportBuilderProps> = ({
  onSave,
  onPreview,
  initialReport
}) => {
  const { t, tCommon } = useTranslation();

  // Report state
  const [report, setReport] = useState<Partial<Report>>({
    name: '',
    description: '',
    category: 'general',
    filters: [],
    sections: [],
    tags: [],
    isPublic: false,
    ...initialReport
  });

  const [activeTab, setActiveTab] = useState<'basic' | 'filters' | 'sections' | 'preview'>('basic');

  // Available metrics and dimensions
  const availableMetrics = [
    { id: 'patients_total', name: t('reports.metrics.totalPatients'), category: 'patients' },
    { id: 'patients_new', name: t('reports.metrics.newPatients'), category: 'patients' },
    { id: 'appointments_total', name: t('reports.metrics.totalAppointments'), category: 'appointments' },
    { id: 'appointments_completed', name: t('reports.metrics.completedAppointments'), category: 'appointments' },
    { id: 'revenue_total', name: t('reports.metrics.totalRevenue'), category: 'financial' },
    { id: 'revenue_collected', name: t('reports.metrics.collectedRevenue'), category: 'financial' },
    { id: 'treatments_total', name: t('reports.metrics.totalTreatments'), category: 'treatments' },
    { id: 'satisfaction_average', name: t('reports.metrics.averageSatisfaction'), category: 'operational' }
  ];

  const chartTypes = [
    { value: 'line', label: t('reports.chartTypes.line'), icon: TrendingUp },
    { value: 'bar', label: t('reports.chartTypes.bar'), icon: BarChart3 },
    { value: 'pie', label: t('reports.chartTypes.pie'), icon: BarChart3 },
    { value: 'doughnut', label: t('reports.chartTypes.doughnut'), icon: BarChart3 }
  ];

  const sectionTypes = [
    { value: 'metrics', label: t('reports.sectionTypes.metrics'), icon: TrendingUp },
    { value: 'chart', label: t('reports.sectionTypes.chart'), icon: BarChart3 },
    { value: 'table', label: t('reports.sectionTypes.table'), icon: Table },
    { value: 'text', label: t('reports.sectionTypes.text'), icon: FileText }
  ];

  // Update report field
  const updateReport = useCallback((field: keyof Report, value: any) => {
    setReport(prev => ({ ...prev, [field]: value }));
  }, []);

  // Add filter
  const addFilter = useCallback(() => {
    const newFilter: ReportFilter = {
      id: `filter_${Date.now()}`,
      name: '',
      type: 'date',
      value: null,
      required: false
    };

    updateReport('filters', [...(report.filters || []), newFilter]);
  }, [report.filters, updateReport]);

  // Update filter
  const updateFilter = useCallback((index: number, field: keyof ReportFilter, value: any) => {
    const updatedFilters = [...(report.filters || [])];
    updatedFilters[index] = { ...updatedFilters[index], [field]: value };
    updateReport('filters', updatedFilters);
  }, [report.filters, updateReport]);

  // Remove filter
  const removeFilter = useCallback((index: number) => {
    const updatedFilters = [...(report.filters || [])];
    updatedFilters.splice(index, 1);
    updateReport('filters', updatedFilters);
  }, [report.filters, updateReport]);

  // Add section
  const addSection = useCallback((type: ReportSection['type']) => {
    const newSection: ReportSection = {
      id: `section_${Date.now()}`,
      title: '',
      type,
      content: type === 'metrics' ? [] : type === 'chart' ? {
        type: 'bar',
        title: '',
        data: []
      } : type === 'table' ? {
        headers: [],
        rows: []
      } : ''
    };

    updateReport('sections', [...(report.sections || []), newSection]);
  }, [report.sections, updateReport]);

  // Update section
  const updateSection = useCallback((index: number, field: keyof ReportSection, value: any) => {
    const updatedSections = [...(report.sections || [])];
    updatedSections[index] = { ...updatedSections[index], [field]: value };
    updateReport('sections', updatedSections);
  }, [report.sections, updateReport]);

  // Remove section
  const removeSection = useCallback((index: number) => {
    const updatedSections = [...(report.sections || [])];
    updatedSections.splice(index, 1);
    updateReport('sections', updatedSections);
  }, [report.sections, updateReport]);

  // Handle save
  const handleSave = useCallback(() => {
    if (!report.name) {
      alert(t('reports.validation.nameRequired'));
      return;
    }

    const completeReport: Report = {
      id: report.id || `report_${Date.now()}`,
      name: report.name,
      description: report.description || '',
      category: report.category || 'general',
      filters: report.filters || [],
      sections: report.sections || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'current_user',
      isPublic: report.isPublic || false,
      tags: report.tags || []
    };

    onSave?.(completeReport);
  }, [report, onSave, t]);

  // Handle preview
  const handlePreview = useCallback(() => {
    if (!report.name) {
      alert(t('reports.validation.nameRequired'));
      return;
    }

    const completeReport: Report = {
      id: report.id || `preview_${Date.now()}`,
      name: report.name,
      description: report.description || '',
      category: report.category || 'general',
      filters: report.filters || [],
      sections: report.sections || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'current_user',
      isPublic: report.isPublic || false,
      tags: report.tags || []
    };

    onPreview?.(completeReport);
  }, [report, onPreview, t]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('reports.builder.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('reports.builder.description')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePreview}>
            <Eye size={16} className="mr-2" />
            {tCommon('preview')}
          </Button>
          <Button onClick={handleSave}>
            <Save size={16} className="mr-2" />
            {tCommon('save')}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {[
            { id: 'basic', label: t('reports.builder.tabs.basic'), icon: Settings },
            { id: 'filters', label: t('reports.builder.tabs.filters'), icon: Filter },
            { id: 'sections', label: t('reports.builder.tabs.sections'), icon: BarChart3 },
            { id: 'preview', label: t('reports.builder.tabs.preview'), icon: Eye }
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
        {/* Basic Information Tab */}
        {activeTab === 'basic' && (
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.builder.basic.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('reports.builder.basic.name')} *
                </label>
                <Input
                  value={report.name || ''}
                  onChange={(e) => updateReport('name', e.target.value)}
                  placeholder={t('reports.builder.basic.namePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('reports.builder.basic.description')}
                </label>
                <Textarea
                  value={report.description || ''}
                  onChange={(e) => updateReport('description', e.target.value)}
                  placeholder={t('reports.builder.basic.descriptionPlaceholder')}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('reports.builder.basic.category')}
                  </label>
                  <Select
                    value={report.category || 'general'}
                    onValueChange={(value) => updateReport('category', value)}
                  >
                    <option value="general">{t('reports.categories.general')}</option>
                    <option value="patients">{t('reports.categories.patients')}</option>
                    <option value="appointments">{t('reports.categories.appointments')}</option>
                    <option value="financial">{t('reports.categories.financial')}</option>
                    <option value="operational">{t('reports.categories.operational')}</option>
                  </Select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={report.isPublic || false}
                    onChange={(e) => updateReport('isPublic', e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    {t('reports.builder.basic.makePublic')}
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters Tab */}
        {activeTab === 'filters' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('reports.builder.filters.title')}</CardTitle>
                <Button onClick={addFilter} size="sm">
                  <Plus size={16} className="mr-2" />
                  {t('reports.builder.filters.add')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {report.filters && report.filters.length > 0 ? (
                <div className="space-y-4">
                  {report.filters.map((filter, index) => (
                    <div key={filter.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {t('reports.builder.filters.filter')} {index + 1}
                        </h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeFilter(index)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('reports.builder.filters.name')}
                          </label>
                          <Input
                            value={filter.name}
                            onChange={(e) => updateFilter(index, 'name', e.target.value)}
                            placeholder={t('reports.builder.filters.namePlaceholder')}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('reports.builder.filters.type')}
                          </label>
                          <Select
                            value={filter.type}
                            onValueChange={(value) => updateFilter(index, 'type', value)}
                          >
                            <option value="date">{t('reports.builder.filters.types.date')}</option>
                            <option value="select">{t('reports.builder.filters.types.select')}</option>
                            <option value="multiselect">{t('reports.builder.filters.types.multiselect')}</option>
                            <option value="number">{t('reports.builder.filters.types.number')}</option>
                            <option value="text">{t('reports.builder.filters.types.text')}</option>
                          </Select>
                        </div>
                        
                        <div className="flex items-center pt-6">
                          <input
                            type="checkbox"
                            id={`required_${index}`}
                            checked={filter.required || false}
                            onChange={(e) => updateFilter(index, 'required', e.target.checked)}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <label htmlFor={`required_${index}`} className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                            {t('reports.builder.filters.required')}
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Filter size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {t('reports.builder.filters.empty')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Sections Tab */}
        {activeTab === 'sections' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('reports.builder.sections.title')}</CardTitle>
                <div className="flex gap-2">
                  {sectionTypes.map(type => (
                    <Button
                      key={type.value}
                      onClick={() => addSection(type.value as any)}
                      size="sm"
                      variant="outline"
                    >
                      <type.icon size={16} className="mr-2" />
                      {type.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {report.sections && report.sections.length > 0 ? (
                <div className="space-y-6">
                  {report.sections.map((section, index) => (
                    <div key={section.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {sectionTypes.find(t => t.value === section.type)?.label}
                          </Badge>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {section.title || t('reports.builder.sections.untitled')}
                          </h4>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeSection(index)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('reports.builder.sections.title')}
                          </label>
                          <Input
                            value={section.title}
                            onChange={(e) => updateSection(index, 'title', e.target.value)}
                            placeholder={t('reports.builder.sections.titlePlaceholder')}
                          />
                        </div>
                        
                        {section.description && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {t('reports.builder.sections.description')}
                            </label>
                            <Textarea
                              value={section.description}
                              onChange={(e) => updateSection(index, 'description', e.target.value)}
                              placeholder={t('reports.builder.sections.descriptionPlaceholder')}
                              rows={2}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {t('reports.builder.sections.empty')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Preview Tab */}
        {activeTab === 'preview' && (
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.builder.preview.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {report.name || t('reports.builder.preview.untitled')}
                </h2>
                {report.description && (
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {report.description}
                  </p>
                )}
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                      {t('reports.builder.preview.filters')}
                    </h3>
                    {report.filters && report.filters.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {report.filters.map(filter => (
                          <Badge key={filter.id} variant="outline">
                            {filter.name || t('reports.builder.preview.unnamedFilter')}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {t('reports.builder.preview.noFilters')}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                      {t('reports.builder.preview.sections')}
                    </h3>
                    {report.sections && report.sections.length > 0 ? (
                      <div className="space-y-2">
                        {report.sections.map((section, index) => (
                          <div key={section.id} className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {sectionTypes.find(t => t.value === section.type)?.label}
                            </Badge>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {section.title || `${t('reports.builder.sections.untitled')} ${index + 1}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {t('reports.builder.preview.noSections')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
