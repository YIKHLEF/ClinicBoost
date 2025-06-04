import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, User, Calendar, FileText, Clock, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../utils/cn';

interface SearchResult {
  id: string;
  type: 'patient' | 'appointment' | 'invoice' | 'treatment';
  title: string;
  subtitle?: string;
  description?: string;
  url: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

interface GlobalSearchProps {
  className?: string;
  placeholder?: string;
}

// Mock search data - in a real app, this would come from an API
const mockSearchData: SearchResult[] = [
  {
    id: '1',
    type: 'patient',
    title: 'Mohammed Karimi',
    subtitle: '+212 6 12 34 56 78',
    description: 'Last visit: Dec 10, 2024',
    url: '/patients/1',
    icon: User,
  },
  {
    id: '2',
    type: 'patient',
    title: 'Fatima Benali',
    subtitle: '+212 6 87 65 43 21',
    description: 'Last visit: Dec 8, 2024',
    url: '/patients/2',
    icon: User,
  },
  {
    id: '3',
    type: 'appointment',
    title: 'Root Canal - Fatima Benali',
    subtitle: 'Dec 15, 2024 at 2:30 PM',
    description: 'Scheduled appointment',
    url: '/appointments/3',
    icon: Calendar,
  },
  {
    id: '4',
    type: 'appointment',
    title: 'Checkup - Mohammed Karimi',
    subtitle: 'Dec 15, 2024 at 9:00 AM',
    description: 'Confirmed appointment',
    url: '/appointments/4',
    icon: Calendar,
  },
  {
    id: '5',
    type: 'invoice',
    title: 'Invoice #INV-001',
    subtitle: 'Mohammed Karimi',
    description: '450.00 MAD - Paid',
    url: '/billing/invoices/5',
    icon: FileText,
  },
  {
    id: '6',
    type: 'treatment',
    title: 'Dental Cleaning',
    subtitle: 'Omar Saidi',
    description: 'Completed on Dec 10, 2024',
    url: '/patients/3/treatments/6',
    icon: Clock,
  },
];

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  className,
  placeholder,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search function
  const performSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const filtered = mockSearchData.filter(item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subtitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setResults(filtered.slice(0, 8)); // Limit to 8 results
  };

  // Handle input change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleResultClick(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleResultClick = (result: SearchResult) => {
    navigate(result.url);
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const getTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'patient':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400';
      case 'appointment':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400';
      case 'invoice':
        return 'text-purple-600 bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400';
      case 'treatment':
        return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <div ref={searchRef} className={cn('relative', className)}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={18} className="text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="search"
          placeholder={placeholder || t('common.search', 'Search patients, appointments, invoices...')}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (query) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Search Results */}
      {isOpen && (query || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {results.length === 0 && query ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <Search size={24} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No results found for "{query}"</p>
            </div>
          ) : (
            <div className="py-2">
              {results.map((result, index) => {
                const Icon = result.icon;
                return (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className={cn(
                      'w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
                      selectedIndex === index && 'bg-gray-50 dark:bg-gray-700'
                    )}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={cn('p-2 rounded-lg', getTypeColor(result.type))}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {result.title}
                          </p>
                          <span className={cn(
                            'px-2 py-0.5 text-xs font-medium rounded-full',
                            getTypeColor(result.type)
                          )}>
                            {t(`search.${result.type}`, result.type)}
                          </span>
                        </div>
                        {result.subtitle && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {result.subtitle}
                          </p>
                        )}
                        {result.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 truncate">
                            {result.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          
          {results.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
              Use ↑↓ to navigate, Enter to select, Esc to close
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
