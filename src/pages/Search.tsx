import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, Filter, Download, History, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { AdvancedSearchFilters } from '../components/search/AdvancedSearchFilters';
import { SearchResults } from '../components/search/SearchResults';
import { useSearch, useSearchAnalytics } from '../hooks/useSearch';
import { cn } from '../utils/cn';

const Search: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { trackSearch } = useSearchAnalytics();

  // Initialize search with URL parameters
  const initialQuery = searchParams.get('q') || '';
  const initialType = searchParams.get('type');
  const initialStatus = searchParams.get('status');

  const {
    results,
    isLoading,
    isError,
    error,
    query,
    setQuery,
    filters,
    setFilters,
    clearSearch,
    searchHistory,
    clearHistory
  } = useSearch({
    defaultFilters: {
      types: initialType ? [initialType as any] : undefined,
      status: initialStatus || undefined
    }
  });

  // Set initial query from URL
  useEffect(() => {
    if (initialQuery && initialQuery !== query) {
      setQuery(initialQuery);
    }
  }, [initialQuery, query, setQuery]);

  // Update URL when search changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (filters.types?.length === 1) params.set('type', filters.types[0]);
    if (filters.status) params.set('status', filters.status);
    
    setSearchParams(params);
  }, [query, filters.types, filters.status, setSearchParams]);

  // Track search analytics
  useEffect(() => {
    if (results && query) {
      trackSearch(query, results.totalCount, filters.types || []);
    }
  }, [results, query, filters.types, trackSearch]);

  const handleExport = () => {
    if (!results) return;

    const csvContent = [
      ['Type', 'Title', 'Subtitle', 'Description', 'Created At'].join(','),
      ...results.results.map(result => [
        result.type,
        `"${result.title}"`,
        `"${result.subtitle || ''}"`,
        `"${result.description || ''}"`,
        result.createdAt
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `search-results-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleHistoryItemClick = (historyQuery: string) => {
    setQuery(historyQuery);
    setShowHistory(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {t('search.title', 'Advanced Search')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('search.description', 'Search across patients, appointments, invoices, and more')}
          </p>
        </div>

        {/* Search Input */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon size={20} className="text-gray-400" />
              </div>
              <input
                type="search"
                placeholder={t('search.placeholder', 'Search patients, appointments, invoices...')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="block w-full pl-10 pr-12 py-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 space-x-2">
                {searchHistory.length > 0 && (
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title={t('search.showHistory', 'Show search history')}
                  >
                    <History size={18} />
                  </button>
                )}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                    showFilters && 'text-primary-600 dark:text-primary-400'
                  )}
                  title={t('search.toggleFilters', 'Toggle filters')}
                >
                  <Filter size={18} />
                </button>
              </div>
            </div>

            {/* Search History Dropdown */}
            {showHistory && searchHistory.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {t('search.recentSearches', 'Recent Searches')}
                  </h3>
                  <button
                    onClick={clearHistory}
                    className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    title={t('search.clearHistory', 'Clear history')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="py-2">
                  {searchHistory.map((historyQuery, index) => (
                    <button
                      key={index}
                      onClick={() => handleHistoryItemClick(historyQuery)}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <SearchIcon size={14} className="inline mr-2 text-gray-400" />
                      {historyQuery}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          {showFilters && (
            <div className="lg:col-span-1">
              <AdvancedSearchFilters
                filters={filters}
                onFiltersChange={setFilters}
                onClear={clearSearch}
              />
            </div>
          )}

          {/* Results */}
          <div className={cn('lg:col-span-3', !showFilters && 'lg:col-span-4')}>
            {isError ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-red-500 dark:text-red-400 mb-4">
                    <SearchIcon size={48} className="mx-auto opacity-50" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    {t('search.error', 'Search Error')}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {error?.message || t('search.errorMessage', 'An error occurred while searching')}
                  </p>
                  <Button onClick={() => window.location.reload()}>
                    {t('common.retry', 'Try Again')}
                  </Button>
                </CardContent>
              </Card>
            ) : results ? (
              <SearchResults
                results={results}
                isLoading={isLoading}
                query={query}
                onExport={handleExport}
              />
            ) : query ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-gray-400 mb-4">
                    <SearchIcon size={48} className="mx-auto opacity-50" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    {t('search.startSearching', 'Start Searching')}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {t('search.startSearchingMessage', 'Enter a search term to find patients, appointments, and more')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-gray-400 mb-4">
                    <SearchIcon size={48} className="mx-auto opacity-50" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    {t('search.welcome', 'Welcome to Advanced Search')}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {t('search.welcomeMessage', 'Search across all your clinic data with powerful filters and sorting options')}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-lg mb-2">
                        <SearchIcon size={24} className="mx-auto text-blue-600 dark:text-blue-400" />
                      </div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">Patients</p>
                      <p className="text-gray-500 dark:text-gray-400">Find patient records</p>
                    </div>
                    <div className="text-center">
                      <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-lg mb-2">
                        <SearchIcon size={24} className="mx-auto text-green-600 dark:text-green-400" />
                      </div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">Appointments</p>
                      <p className="text-gray-500 dark:text-gray-400">Search schedules</p>
                    </div>
                    <div className="text-center">
                      <div className="bg-purple-100 dark:bg-purple-900/20 p-3 rounded-lg mb-2">
                        <SearchIcon size={24} className="mx-auto text-purple-600 dark:text-purple-400" />
                      </div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">Invoices</p>
                      <p className="text-gray-500 dark:text-gray-400">Find billing records</p>
                    </div>
                    <div className="text-center">
                      <div className="bg-orange-100 dark:bg-orange-900/20 p-3 rounded-lg mb-2">
                        <SearchIcon size={24} className="mx-auto text-orange-600 dark:text-orange-400" />
                      </div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">Treatments</p>
                      <p className="text-gray-500 dark:text-gray-400">Search procedures</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Search;
