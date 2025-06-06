import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Filter, 
  Calendar, 
  User, 
  FileText, 
  CreditCard, 
  Stethoscope,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { GlobalSearchFilters, SearchEntityType } from '../../lib/search/search-service';
import { cn } from '../../utils/cn';

interface AdvancedSearchFiltersProps {
  filters: GlobalSearchFilters;
  onFiltersChange: (filters: Partial<GlobalSearchFilters>) => void;
  onClear: () => void;
  className?: string;
}

const entityTypeOptions: Array<{ value: SearchEntityType; label: string; icon: React.ComponentType<any> }> = [
  { value: 'patient', label: 'Patients', icon: User },
  { value: 'appointment', label: 'Appointments', icon: Calendar },
  { value: 'invoice', label: 'Invoices', icon: CreditCard },
  { value: 'treatment', label: 'Treatments', icon: Stethoscope },
  { value: 'user', label: 'Staff', icon: User },
];

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'no_show', label: 'No Show' },
  { value: 'partial', label: 'Partial' },
  { value: 'refunded', label: 'Refunded' },
];

const sortOptions = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'date', label: 'Date' },
  { value: 'alphabetical', label: 'Alphabetical' },
];

const dateRangePresets = [
  { label: 'Today', days: 0 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last year', days: 365 },
];

export const AdvancedSearchFilters: React.FC<AdvancedSearchFiltersProps> = ({
  filters,
  onFiltersChange,
  onClear,
  className
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleEntityTypeToggle = (type: SearchEntityType) => {
    const currentTypes = filters.types || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type];
    
    onFiltersChange({ types: newTypes.length > 0 ? newTypes : undefined });
  };

  const handleDateRangePreset = (days: number) => {
    if (days === 0) {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      
      onFiltersChange({
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString()
        }
      });
    } else {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - days);
      
      onFiltersChange({
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString()
        }
      });
    }
  };

  const handleCustomDateRange = (field: 'start' | 'end', value: string) => {
    const currentRange = filters.dateRange || { start: '', end: '' };
    onFiltersChange({
      dateRange: {
        ...currentRange,
        [field]: value ? new Date(value).toISOString() : ''
      }
    });
  };

  const clearDateRange = () => {
    onFiltersChange({ dateRange: undefined });
  };

  const hasActiveFilters = !!(
    filters.types?.length ||
    filters.status ||
    filters.dateRange ||
    (filters.sortBy && filters.sortBy !== 'relevance')
  );

  return (
    <Card className={cn('border-gray-200 dark:border-gray-700', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Filter size={18} />
            {t('search.advancedFilters', 'Advanced Filters')}
            {hasActiveFilters && (
              <span className="bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-full text-xs">
                {t('search.filtersActive', 'Active')}
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X size={16} className="mr-1" />
                {t('common.clear', 'Clear')}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          {/* Entity Types */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('search.searchIn', 'Search in')}
            </label>
            <div className="flex flex-wrap gap-2">
              {entityTypeOptions.map(({ value, label, icon: Icon }) => {
                const isSelected = filters.types?.includes(value) ?? true;
                return (
                  <button
                    key={value}
                    onClick={() => handleEntityTypeToggle(value)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
                      isSelected
                        ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    )}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('search.status', 'Status')}
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) => onFiltersChange({ status: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">{t('search.allStatuses', 'All statuses')}</option>
              {statusOptions.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('search.dateRange', 'Date Range')}
            </label>
            
            {/* Date Range Presets */}
            <div className="flex flex-wrap gap-2 mb-3">
              {dateRangePresets.map(({ label, days }) => (
                <button
                  key={label}
                  onClick={() => handleDateRangePreset(days)}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  {label}
                </button>
              ))}
              {filters.dateRange && (
                <button
                  onClick={clearDateRange}
                  className="px-3 py-1 text-sm border border-red-300 dark:border-red-600 rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  <X size={14} className="inline mr-1" />
                  Clear
                </button>
              )}
            </div>

            {/* Custom Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {t('search.startDate', 'Start Date')}
                </label>
                <input
                  type="date"
                  value={filters.dateRange?.start ? new Date(filters.dateRange.start).toISOString().split('T')[0] : ''}
                  onChange={(e) => handleCustomDateRange('start', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {t('search.endDate', 'End Date')}
                </label>
                <input
                  type="date"
                  value={filters.dateRange?.end ? new Date(filters.dateRange.end).toISOString().split('T')[0] : ''}
                  onChange={(e) => handleCustomDateRange('end', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Sort Options */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('search.sortBy', 'Sort by')}
              </label>
              <select
                value={filters.sortBy || 'relevance'}
                onChange={(e) => onFiltersChange({ sortBy: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {sortOptions.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('search.sortOrder', 'Order')}
              </label>
              <select
                value={filters.sortOrder || 'desc'}
                onChange={(e) => onFiltersChange({ sortOrder: e.target.value as 'asc' | 'desc' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="desc">{t('search.descending', 'Descending')}</option>
                <option value="asc">{t('search.ascending', 'Ascending')}</option>
              </select>
            </div>
          </div>

          {/* Results Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('search.resultsLimit', 'Results per page')}
            </label>
            <select
              value={filters.limit || 50}
              onChange={(e) => onFiltersChange({ limit: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
