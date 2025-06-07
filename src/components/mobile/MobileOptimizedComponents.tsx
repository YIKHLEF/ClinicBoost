/**
 * Mobile-Optimized Components
 * 
 * Collection of mobile-first components optimized for touch interactions,
 * performance, and mobile user experience patterns.
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, X, Menu, Search, Plus, Filter } from 'lucide-react';
import TouchGestureHandler from './TouchGestureHandler';
import { deviceDetection } from '../../lib/mobile/device-detection';

// Mobile Card Component
interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
  onTap?: () => void;
  onLongPress?: () => void;
  swipeable?: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export const MobileCard: React.FC<MobileCardProps> = ({
  children,
  className = '',
  onTap,
  onLongPress,
  swipeable = false,
  onSwipeLeft,
  onSwipeRight,
}) => {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <TouchGestureHandler
      config={{
        enableSwipe: swipeable,
        enableLongPress: !!onLongPress,
      }}
      callbacks={{
        onSwipeLeft,
        onSwipeRight,
        onLongPress,
        onTouchStart: () => setIsPressed(true),
        onTouchEnd: () => {
          setIsPressed(false);
          onTap?.();
        },
      }}
      className={`mobile-card ${className} ${isPressed ? 'pressed' : ''}`}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 transition-all duration-150 touch-target">
        {children}
      </div>
    </TouchGestureHandler>
  );
};

// Mobile Bottom Sheet
interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  height?: 'auto' | 'half' | 'full';
}

export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  height = 'auto',
}) => {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const getHeightClass = () => {
    switch (height) {
      case 'half': return 'h-1/2';
      case 'full': return 'h-full';
      default: return 'h-auto max-h-[80vh]';
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Bottom Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-xl shadow-xl z-50 transform transition-transform duration-300 ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        } ${getHeightClass()}`}
        style={{ transform: `translateY(${isDragging ? dragY : isOpen ? 0 : '100%'}px)` }}
      >
        <TouchGestureHandler
          config={{ enablePan: true }}
          callbacks={{
            onPanStart: () => setIsDragging(true),
            onPanMove: (_, __, deltaY) => {
              if (deltaY > 0) setDragY(deltaY);
            },
            onPanEnd: () => {
              setIsDragging(false);
              if (dragY > 100) {
                onClose();
              }
              setDragY(0);
            },
          }}
        >
          {/* Drag Handle */}
          <div className="flex justify-center py-3">
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>

          {/* Header */}
          {title && (
            <div className="flex items-center justify-between px-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 touch-target"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Content */}
          <div className="p-4 overflow-y-auto">
            {children}
          </div>
        </TouchGestureHandler>
      </div>
    </>
  );
};

// Mobile Navigation Tabs
interface MobileTabsProps {
  tabs: Array<{ id: string; label: string; icon?: React.ReactNode; badge?: number }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  position?: 'top' | 'bottom';
}

export const MobileTabs: React.FC<MobileTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  position = 'bottom',
}) => {
  return (
    <div className={`${position === 'bottom' ? 'fixed bottom-0' : ''} left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-30`}>
      <div className="flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 flex flex-col items-center py-2 px-1 touch-target transition-colors ${
              activeTab === tab.id
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <div className="relative">
              {tab.icon}
              {tab.badge && tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
            </div>
            <span className="text-xs mt-1 truncate max-w-full">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// Mobile Action Button (FAB)
interface MobileActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label?: string;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  variant?: 'primary' | 'secondary';
}

export const MobileActionButton: React.FC<MobileActionButtonProps> = ({
  onClick,
  icon,
  label,
  position = 'bottom-right',
  variant = 'primary',
}) => {
  const getPositionClass = () => {
    switch (position) {
      case 'bottom-left': return 'bottom-6 left-6';
      case 'bottom-center': return 'bottom-6 left-1/2 transform -translate-x-1/2';
      default: return 'bottom-6 right-6';
    }
  };

  const getVariantClass = () => {
    return variant === 'primary'
      ? 'bg-blue-600 hover:bg-blue-700 text-white'
      : 'bg-gray-600 hover:bg-gray-700 text-white';
  };

  return (
    <TouchGestureHandler
      callbacks={{ onTouchEnd: onClick }}
    >
      <button
        className={`fixed ${getPositionClass()} ${getVariantClass()} rounded-full shadow-lg transition-all duration-200 touch-target z-40 ${
          label ? 'px-4 py-3' : 'w-14 h-14'
        } flex items-center justify-center space-x-2`}
      >
        {icon}
        {label && <span className="font-medium">{label}</span>}
      </button>
    </TouchGestureHandler>
  );
};

// Mobile Search Bar
interface MobileSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  showFilter?: boolean;
  onFilterClick?: () => void;
}

export const MobileSearchBar: React.FC<MobileSearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  onFocus,
  onBlur,
  showFilter = false,
  onFilterClick,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="flex items-center space-x-2 p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className={`flex-1 relative transition-all duration-200 ${isFocused ? 'scale-105' : ''}`}>
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-full border-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          onFocus={() => {
            setIsFocused(true);
            onFocus?.();
          }}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
        />
      </div>
      {showFilter && (
        <TouchGestureHandler callbacks={{ onTouchEnd: onFilterClick }}>
          <button className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full touch-target">
            <Filter className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </TouchGestureHandler>
      )}
    </div>
  );
};

// Mobile Collapsible Section
interface MobileCollapsibleProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  icon?: React.ReactNode;
}

export const MobileCollapsible: React.FC<MobileCollapsibleProps> = ({
  title,
  children,
  defaultOpen = false,
  icon,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <TouchGestureHandler
        callbacks={{ onTouchEnd: () => setIsOpen(!isOpen) }}
      >
        <button className="w-full flex items-center justify-between p-4 text-left touch-target">
          <div className="flex items-center space-x-3">
            {icon}
            <span className="font-medium text-gray-900 dark:text-white">{title}</span>
          </div>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>
      </TouchGestureHandler>
      
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 pb-4' : 'max-h-0'}`}>
        <div className="px-4">
          {children}
        </div>
      </div>
    </div>
  );
};

// Mobile Pull to Refresh
interface MobilePullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  refreshing?: boolean;
}

export const MobilePullToRefresh: React.FC<MobilePullToRefreshProps> = ({
  children,
  onRefresh,
  refreshing = false,
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const threshold = 80;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Pull indicator */}
      <div
        className={`absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-300 ${
          pullDistance > 0 ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ height: Math.min(pullDistance, threshold) }}
      >
        <div className={`transition-transform duration-300 ${isRefreshing || refreshing ? 'animate-spin' : ''}`}>
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      </div>

      <TouchGestureHandler
        config={{ enablePan: true }}
        callbacks={{
          onPanMove: (_, __, deltaY) => {
            if (deltaY > 0 && window.scrollY === 0) {
              setPullDistance(Math.min(deltaY * 0.5, threshold));
            }
          },
          onPanEnd: () => {
            if (pullDistance >= threshold && !isRefreshing && !refreshing) {
              handleRefresh();
            } else {
              setPullDistance(0);
            }
          },
        }}
      >
        <div style={{ transform: `translateY(${Math.min(pullDistance, threshold)}px)` }}>
          {children}
        </div>
      </TouchGestureHandler>
    </div>
  );
};

export default {
  MobileCard,
  MobileBottomSheet,
  MobileTabs,
  MobileActionButton,
  MobileSearchBar,
  MobileCollapsible,
  MobilePullToRefresh,
};
