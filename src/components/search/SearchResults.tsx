import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Calendar,
  CreditCard,
  Stethoscope,
  FileText,
  Clock,
  MapPin,
  Phone,
  Mail,
  Download,
  ExternalLink,
  Grid,
  List,
  Search
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { GlobalSearchResult, SearchResult, SearchEntityType } from '../../lib/search/search-service';
import { cn } from '../../utils/cn';

interface SearchResultsProps {
  results: GlobalSearchResult;
  isLoading?: boolean;
  query?: string;
  onExport?: () => void;
  className?: string;
}

type ViewMode = 'list' | 'grid' | 'grouped';

const entityIcons: Record<SearchEntityType, React.ComponentType<any>> = {
  patient: User,
  appointment: Calendar,
  invoice: CreditCard,
  treatment: Stethoscope,
  user: User,
};

const entityColors: Record<SearchEntityType, string> = {
  patient: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  appointment: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  invoice: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  treatment: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
  user: 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400',
};

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  isLoading = false,
  query,
  onExport,
  className
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const handleResultClick = (result: SearchResult) => {
    navigate(result.url);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderResultItem = (result: SearchResult, index: number) => {
    const Icon = entityIcons[result.type];
    const colorClass = entityColors[result.type];

    return (
      <Card
        key={result.id}
        className={cn(
          'cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600',
          viewMode === 'grid' ? 'h-full' : ''
        )}
        onClick={() => handleResultClick(result)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={cn('p-2 rounded-lg', colorClass)}>
              <Icon size={16} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {result.title}
                  </h3>
                  {result.subtitle && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {result.subtitle}
                    </p>
                  )}
                  {result.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1 line-clamp-2">
                      {result.description}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="secondary" className="text-xs">
                    {result.type}
                  </Badge>
                  <ExternalLink size={14} className="text-gray-400" />
                </div>
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  {formatDate(result.createdAt)}
                </div>
                
                {result.metadata?.status && (
                  <Badge variant="outline" className="text-xs">
                    {result.metadata.status}
                  </Badge>
                )}
                
                {result.type === 'appointment' && result.metadata?.startTime && (
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    {formatTime(result.metadata.startTime)}
                  </div>
                )}
                
                {result.type === 'invoice' && result.metadata?.amount && (
                  <div className="flex items-center gap-1">
                    <CreditCard size={12} />
                    ${result.metadata.amount}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderGroupedResults = () => {
    const groupedResults = Object.entries(results.resultsByType)
      .filter(([_, items]) => items.length > 0)
      .sort(([, a], [, b]) => b.length - a.length);

    return (
      <div className="space-y-6">
        {groupedResults.map(([type, items]) => {
          const Icon = entityIcons[type as SearchEntityType];
          return (
            <div key={type}>
              <div className="flex items-center gap-2 mb-3">
                <Icon size={18} />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 capitalize">
                  {type}s ({items.length})
                </h3>
              </div>
              <div className={cn(
                'grid gap-3',
                viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
              )}>
                {items.slice(0, 5).map((result, index) => renderResultItem(result, index))}
              </div>
              {items.length > 5 && (
                <Button variant="ghost" size="sm" className="mt-2">
                  View all {items.length} {type}s
                </Button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderAllResults = () => {
    return (
      <div className={cn(
        'grid gap-3',
        viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
      )}>
        {results.results.map((result, index) => renderResultItem(result, index))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (results.totalCount === 0) {
    return (
      <div className={className}>
        <EmptyState
          type="search"
          title={query ? `No results for "${query}"` : 'No results found'}
          description="Try adjusting your search terms or filters"
          size="lg"
        />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {results.totalCount} {results.totalCount === 1 ? 'result' : 'results'}
            {query && (
              <span className="text-gray-500 dark:text-gray-400 font-normal">
                {' '}for "{query}"
              </span>
            )}
          </h2>
          
          {/* Facets */}
          <div className="flex items-center gap-2">
            {results.facets.types.map(({ type, count }) => (
              <Badge key={type} variant="outline" className="text-xs">
                {type}: {count}
              </Badge>
            ))}
          </div>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-md">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 text-sm',
                viewMode === 'list'
                  ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              )}
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 text-sm',
                viewMode === 'grid'
                  ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              )}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('grouped')}
              className={cn(
                'p-2 text-sm',
                viewMode === 'grouped'
                  ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              )}
            >
              <FileText size={16} />
            </button>
          </div>

          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download size={16} className="mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Results */}
      {viewMode === 'grouped' ? renderGroupedResults() : renderAllResults()}
    </div>
  );
};
