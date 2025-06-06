import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from './useDebounce';
import { searchService, GlobalSearchFilters, GlobalSearchResult, SearchEntityType } from '../lib/search/search-service';
import { useCurrentClinicId } from '../contexts/ClinicContext';

export interface UseSearchOptions {
  enabled?: boolean;
  debounceMs?: number;
  minQueryLength?: number;
  defaultFilters?: Partial<GlobalSearchFilters>;
}

export interface UseSearchResult {
  results: GlobalSearchResult | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  query: string;
  setQuery: (query: string) => void;
  filters: GlobalSearchFilters;
  setFilters: (filters: Partial<GlobalSearchFilters>) => void;
  clearSearch: () => void;
  searchHistory: string[];
  addToHistory: (query: string) => void;
  clearHistory: () => void;
}

export const useSearch = (options: UseSearchOptions = {}): UseSearchResult => {
  const {
    enabled = true,
    debounceMs = 300,
    minQueryLength = 2,
    defaultFilters = {}
  } = options;

  const clinicId = useCurrentClinicId();
  const queryClient = useQueryClient();

  const [query, setQuery] = useState('');
  const [filters, setFiltersState] = useState<GlobalSearchFilters>({
    clinicId,
    limit: 50,
    sortBy: 'relevance',
    sortOrder: 'desc',
    ...defaultFilters
  });
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('clinic-search-history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const debouncedQuery = useDebounce(query, debounceMs);

  // Update clinic filter when clinic changes
  useEffect(() => {
    setFiltersState(prev => ({ ...prev, clinicId }));
  }, [clinicId]);

  // Save search history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('clinic-search-history', JSON.stringify(searchHistory));
    } catch (error) {
      console.warn('Failed to save search history:', error);
    }
  }, [searchHistory]);

  const setFilters = useCallback((newFilters: Partial<GlobalSearchFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setFiltersState(prev => ({
      ...prev,
      query: undefined,
      types: undefined,
      dateRange: undefined,
      status: undefined
    }));
  }, []);

  const addToHistory = useCallback((searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < minQueryLength) return;
    
    setSearchHistory(prev => {
      const filtered = prev.filter(item => item !== searchQuery);
      const updated = [searchQuery, ...filtered].slice(0, 10); // Keep last 10 searches
      return updated;
    });
  }, [minQueryLength]);

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    try {
      localStorage.removeItem('clinic-search-history');
    } catch (error) {
      console.warn('Failed to clear search history:', error);
    }
  }, []);

  // Prepare search filters
  const searchFilters = useMemo(() => ({
    ...filters,
    query: debouncedQuery || undefined
  }), [filters, debouncedQuery]);

  // Determine if search should be enabled
  const shouldSearch = enabled && 
    (debouncedQuery.length >= minQueryLength || 
     filters.types?.length || 
     filters.dateRange || 
     filters.status);

  // Perform search query
  const {
    data: results,
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ['global-search', searchFilters],
    queryFn: () => searchService.globalSearch(searchFilters),
    enabled: shouldSearch,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });

  // Add successful searches to history
  useEffect(() => {
    if (debouncedQuery && results && results.totalCount > 0) {
      addToHistory(debouncedQuery);
    }
  }, [debouncedQuery, results, addToHistory]);

  return {
    results,
    isLoading,
    isError,
    error: error as Error | null,
    query,
    setQuery,
    filters: searchFilters,
    setFilters,
    clearSearch,
    searchHistory,
    addToHistory,
    clearHistory
  };
};

export interface UseEntitySearchOptions {
  entityType: SearchEntityType;
  enabled?: boolean;
  debounceMs?: number;
  minQueryLength?: number;
}

export const useEntitySearch = (options: UseEntitySearchOptions) => {
  const { entityType, ...searchOptions } = options;
  
  const searchResult = useSearch({
    ...searchOptions,
    defaultFilters: {
      types: [entityType]
    }
  });

  const entityResults = useMemo(() => {
    if (!searchResult.results) return undefined;
    
    return {
      ...searchResult.results,
      results: searchResult.results.resultsByType[entityType] || [],
      totalCount: searchResult.results.resultsByType[entityType]?.length || 0
    };
  }, [searchResult.results, entityType]);

  return {
    ...searchResult,
    results: entityResults
  };
};

export interface UseQuickSearchOptions {
  limit?: number;
  types?: SearchEntityType[];
}

export const useQuickSearch = (query: string, options: UseQuickSearchOptions = {}) => {
  const { limit = 8, types = ['patient', 'appointment'] } = options;
  
  return useSearch({
    enabled: !!query,
    debounceMs: 200,
    minQueryLength: 1,
    defaultFilters: {
      limit,
      types,
      sortBy: 'relevance'
    }
  });
};

// Custom hook for search suggestions
export const useSearchSuggestions = (query: string) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const debouncedQuery = useDebounce(query, 200);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    // Generate suggestions based on common search patterns
    const commonSuggestions = [
      `${debouncedQuery} appointments`,
      `${debouncedQuery} patients`,
      `${debouncedQuery} invoices`,
      `pending ${debouncedQuery}`,
      `completed ${debouncedQuery}`,
    ].filter(suggestion => suggestion !== debouncedQuery);

    setSuggestions(commonSuggestions.slice(0, 5));
  }, [debouncedQuery]);

  return suggestions;
};

// Hook for search analytics
export const useSearchAnalytics = () => {
  const queryClient = useQueryClient();

  const trackSearch = useCallback((query: string, resultCount: number, entityTypes: SearchEntityType[]) => {
    // Track search analytics (could be sent to analytics service)
    console.log('Search tracked:', { query, resultCount, entityTypes, timestamp: new Date() });
  }, []);

  const getPopularSearches = useCallback(() => {
    try {
      const history = localStorage.getItem('clinic-search-history');
      return history ? JSON.parse(history) : [];
    } catch {
      return [];
    }
  }, []);

  return {
    trackSearch,
    getPopularSearches
  };
};
