/**
 * Mobile-First Responsive Hook
 * 
 * This hook provides comprehensive responsive design utilities with mobile-first approach,
 * device detection, and performance optimization.
 */

import React, { useState, useEffect, useMemo, useCallback, createContext, useContext } from 'react';
import { deviceDetection, type DeviceInfo } from '../lib/mobile/device-detection';
import { performanceOptimizer } from '../lib/mobile/performance-optimizer';

export interface ResponsiveState {
  // Device information
  deviceInfo: DeviceInfo;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  
  // Viewport information
  viewport: {
    width: number;
    height: number;
    orientation: 'portrait' | 'landscape';
    breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    safeArea: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
  };
  
  // Network information
  network: {
    isOnline: boolean;
    isSlowNetwork: boolean;
    effectiveType: string;
    saveData: boolean;
  };
  
  // Performance information
  performance: {
    isLowEndDevice: boolean;
    memoryUsage: number;
    batteryLevel?: number;
    isCharging?: boolean;
  };
  
  // Responsive utilities
  breakpoints: {
    xs: boolean;
    sm: boolean;
    md: boolean;
    lg: boolean;
    xl: boolean;
    '2xl': boolean;
  };
  
  // Media queries
  mediaQueries: {
    mobile: boolean;
    tablet: boolean;
    desktop: boolean;
    touch: boolean;
    hover: boolean;
    reducedMotion: boolean;
    darkMode: boolean;
    highContrast: boolean;
  };
}

export interface ResponsiveConfig {
  enablePerformanceOptimization: boolean;
  enableAdaptiveLoading: boolean;
  enableNetworkAwareLoading: boolean;
  enableBatteryAwareLoading: boolean;
  breakpoints: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    '2xl': number;
  };
}

const defaultConfig: ResponsiveConfig = {
  enablePerformanceOptimization: true,
  enableAdaptiveLoading: true,
  enableNetworkAwareLoading: true,
  enableBatteryAwareLoading: true,
  breakpoints: {
    xs: 0,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },
};

// Create context for responsive state
const ResponsiveContext = createContext<ResponsiveState | null>(null);

export const ResponsiveProvider: React.FC<{
  children: React.ReactNode;
  config?: Partial<ResponsiveConfig>;
}> = ({ children, config = {} }) => {
  const [responsiveState, setResponsiveState] = useState<ResponsiveState | null>(null);

  // Memoize the final config to prevent infinite re-renders
  const finalConfig = useMemo(() => ({ ...defaultConfig, ...config }), [config]);

  // Memoize the update function to prevent unnecessary re-renders
  const updateResponsiveState = useMemo(() => {
    return (deviceInfo: DeviceInfo) => {
      const state: ResponsiveState = {
        deviceInfo,
        isMobile: deviceInfo.type === 'mobile',
        isTablet: deviceInfo.type === 'tablet',
        isDesktop: deviceInfo.type === 'desktop',
        isTouchDevice: deviceInfo.viewport.isTouch,

        viewport: {
          width: deviceInfo.viewport.width,
          height: deviceInfo.viewport.height,
          orientation: deviceInfo.viewport.orientation,
          breakpoint: deviceInfo.viewport.breakpoint,
          safeArea: deviceInfo.viewport.safeArea,
        },

        network: {
          isOnline: deviceInfo.network.isOnline,
          isSlowNetwork: ['slow-2g', '2g'].includes(deviceInfo.network.effectiveType),
          effectiveType: deviceInfo.network.effectiveType,
          saveData: deviceInfo.network.saveData,
        },

        performance: {
          isLowEndDevice: deviceInfo.capabilities.deviceMemory <= 2 || deviceInfo.capabilities.hardwareConcurrency <= 2,
          memoryUsage: deviceInfo.performance.memoryUsage,
          batteryLevel: deviceInfo.performance.batteryLevel,
          isCharging: deviceInfo.performance.isCharging,
        },

        breakpoints: {
          xs: deviceInfo.viewport.width >= finalConfig.breakpoints.xs,
          sm: deviceInfo.viewport.width >= finalConfig.breakpoints.sm,
          md: deviceInfo.viewport.width >= finalConfig.breakpoints.md,
          lg: deviceInfo.viewport.width >= finalConfig.breakpoints.lg,
          xl: deviceInfo.viewport.width >= finalConfig.breakpoints.xl,
          '2xl': deviceInfo.viewport.width >= finalConfig.breakpoints['2xl'],
        },

        mediaQueries: {
          mobile: deviceInfo.type === 'mobile',
          tablet: deviceInfo.type === 'tablet',
          desktop: deviceInfo.type === 'desktop',
          touch: deviceInfo.viewport.isTouch,
          hover: deviceInfo.capabilities.hasHover,
          reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
          darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
          highContrast: window.matchMedia('(prefers-contrast: high)').matches,
        },
      };

      setResponsiveState(state);
    };
  }, [finalConfig]);

  // Memoize the media query change handler
  const handleMediaQueryChange = useCallback(() => {
    updateResponsiveState(deviceDetection.getDeviceInfo());
  }, [updateResponsiveState]);

  useEffect(() => {
    // Initial state
    updateResponsiveState(deviceDetection.getDeviceInfo());

    // Subscribe to device changes
    const unsubscribe = deviceDetection.subscribe(updateResponsiveState);

    // Listen to media query changes
    const mediaQueryLists = [
      window.matchMedia('(prefers-reduced-motion: reduce)'),
      window.matchMedia('(prefers-color-scheme: dark)'),
      window.matchMedia('(prefers-contrast: high)'),
    ];

    mediaQueryLists.forEach(mql => {
      mql.addEventListener('change', handleMediaQueryChange);
    });

    return () => {
      unsubscribe();
      mediaQueryLists.forEach(mql => {
        mql.removeEventListener('change', handleMediaQueryChange);
      });
    };
  }, [updateResponsiveState, handleMediaQueryChange]);

  if (!responsiveState) {
    return null; // or loading component
  }

  return (
    <ResponsiveContext.Provider value={responsiveState}>
      {children}
    </ResponsiveContext.Provider>
  );
};

export const useResponsive = (): ResponsiveState => {
  const context = useContext(ResponsiveContext);
  if (!context) {
    throw new Error('useResponsive must be used within a ResponsiveProvider');
  }
  return context;
};

// Utility hooks for specific use cases
export const useBreakpoint = (breakpoint: keyof ResponsiveState['breakpoints']): boolean => {
  const { breakpoints } = useResponsive();
  return breakpoints[breakpoint];
};

export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
};

export const useViewport = () => {
  const { viewport } = useResponsive();
  return viewport;
};

export const useDeviceType = () => {
  const { isMobile, isTablet, isDesktop, isTouchDevice } = useResponsive();
  return { isMobile, isTablet, isDesktop, isTouchDevice };
};

export const useNetworkStatus = () => {
  const { network } = useResponsive();
  return network;
};

export const usePerformanceStatus = () => {
  const { performance } = useResponsive();
  return performance;
};

// Adaptive loading hook
export const useAdaptiveLoading = () => {
  const { network, performance } = useResponsive();
  
  return useMemo(() => {
    const shouldReduceQuality = network.isSlowNetwork || performance.isLowEndDevice || network.saveData;
    const shouldDisableAnimations = performance.isLowEndDevice || network.saveData;
    const shouldLazyLoad = network.isSlowNetwork || performance.isLowEndDevice;
    
    return {
      shouldReduceQuality,
      shouldDisableAnimations,
      shouldLazyLoad,
      imageQuality: shouldReduceQuality ? 'low' : 'high',
      animationLevel: shouldDisableAnimations ? 'none' : 'full',
      loadingStrategy: shouldLazyLoad ? 'lazy' : 'eager',
    };
  }, [network, performance]);
};

// Responsive image hook
export const useResponsiveImage = (src: string, alt: string) => {
  const { viewport, network, performance } = useResponsive();
  const adaptiveLoading = useAdaptiveLoading();
  
  return useMemo(() => {
    const width = viewport.width;
    const pixelRatio = window.devicePixelRatio || 1;
    const quality = adaptiveLoading.imageQuality === 'low' ? 60 : 85;
    
    // Generate responsive image URLs
    const srcSet = [
      `${src}?w=${Math.round(width * 0.5)}&q=${quality} ${Math.round(width * 0.5)}w`,
      `${src}?w=${Math.round(width)}&q=${quality} ${width}w`,
      `${src}?w=${Math.round(width * 1.5)}&q=${quality} ${Math.round(width * 1.5)}w`,
      `${src}?w=${Math.round(width * 2)}&q=${quality} ${Math.round(width * 2)}w`,
    ].join(', ');
    
    const sizes = [
      `(max-width: 640px) ${Math.round(width * 0.9)}px`,
      `(max-width: 768px) ${Math.round(width * 0.8)}px`,
      `(max-width: 1024px) ${Math.round(width * 0.7)}px`,
      `${Math.round(width * 0.6)}px`,
    ].join(', ');
    
    return {
      src: `${src}?w=${width}&q=${quality}`,
      srcSet,
      sizes,
      alt,
      loading: adaptiveLoading.loadingStrategy as 'lazy' | 'eager',
      decoding: 'async' as const,
    };
  }, [src, alt, viewport, adaptiveLoading]);
};

// Responsive component wrapper
export const ResponsiveComponent: React.FC<{
  children: React.ReactNode;
  mobile?: React.ReactNode;
  tablet?: React.ReactNode;
  desktop?: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, mobile, tablet, desktop, fallback }) => {
  const { isMobile, isTablet, isDesktop } = useResponsive();
  
  if (isMobile && mobile) return <>{mobile}</>;
  if (isTablet && tablet) return <>{tablet}</>;
  if (isDesktop && desktop) return <>{desktop}</>;
  if (fallback) return <>{fallback}</>;
  
  return <>{children}</>;
};

// Conditional rendering based on breakpoints
export const ShowAt: React.FC<{
  children: React.ReactNode;
  breakpoint: keyof ResponsiveState['breakpoints'];
  above?: boolean;
  below?: boolean;
}> = ({ children, breakpoint, above = true, below = false }) => {
  const { viewport, breakpoints } = useResponsive();
  const breakpointValues = {
    xs: 0,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  };
  
  const shouldShow = useMemo(() => {
    const currentWidth = viewport.width;
    const targetWidth = breakpointValues[breakpoint];
    
    if (above && below) {
      return currentWidth >= targetWidth;
    } else if (above) {
      return currentWidth >= targetWidth;
    } else if (below) {
      return currentWidth < targetWidth;
    }
    
    return breakpoints[breakpoint];
  }, [viewport.width, breakpoint, above, below, breakpoints]);
  
  return shouldShow ? <>{children}</> : null;
};

// Hide at specific breakpoints
export const HideAt: React.FC<{
  children: React.ReactNode;
  breakpoint: keyof ResponsiveState['breakpoints'];
  above?: boolean;
  below?: boolean;
}> = ({ children, breakpoint, above = true, below = false }) => {
  const { viewport } = useResponsive();
  const breakpointValues = {
    xs: 0,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  };
  
  const shouldHide = useMemo(() => {
    const currentWidth = viewport.width;
    const targetWidth = breakpointValues[breakpoint];
    
    if (above && below) {
      return currentWidth >= targetWidth;
    } else if (above) {
      return currentWidth >= targetWidth;
    } else if (below) {
      return currentWidth < targetWidth;
    }
    
    return false;
  }, [viewport.width, breakpoint, above, below]);
  
  return !shouldHide ? <>{children}</> : null;
};
