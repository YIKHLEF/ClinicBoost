/**
 * Mobile Performance Optimization Service
 * 
 * This module provides comprehensive performance optimizations for mobile devices,
 * including network-aware loading, resource management, and adaptive UI rendering.
 */

import { deviceDetection, type DeviceInfo } from './device-detection';

export interface PerformanceConfig {
  enableLazyLoading: boolean;
  enableImageOptimization: boolean;
  enableCodeSplitting: boolean;
  enableServiceWorker: boolean;
  enableOfflineMode: boolean;
  maxConcurrentRequests: number;
  imageQuality: 'low' | 'medium' | 'high' | 'auto';
  animationLevel: 'none' | 'reduced' | 'full' | 'auto';
  prefetchStrategy: 'none' | 'viewport' | 'aggressive';
}

export interface OptimizationMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  networkUsage: number;
  batteryImpact: number;
  userExperience: number;
}

class MobilePerformanceOptimizer {
  private config: PerformanceConfig;
  private metrics: OptimizationMetrics;
  private observers: Map<string, IntersectionObserver> = new Map();
  private loadQueue: Set<() => Promise<void>> = new Set();
  private isProcessingQueue = false;

  constructor() {
    this.config = this.getDefaultConfig();
    this.metrics = this.initializeMetrics();
    this.initialize();
  }

  /**
   * Initialize performance optimizer
   */
  private initialize(): void {
    this.adaptConfigToDevice();
    this.setupPerformanceMonitoring();
    this.initializeLazyLoading();
    this.optimizeNetworkRequests();
    this.setupMemoryManagement();
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): PerformanceConfig {
    return {
      enableLazyLoading: true,
      enableImageOptimization: true,
      enableCodeSplitting: true,
      enableServiceWorker: true,
      enableOfflineMode: true,
      maxConcurrentRequests: 6,
      imageQuality: 'auto',
      animationLevel: 'auto',
      prefetchStrategy: 'viewport',
    };
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): OptimizationMetrics {
    return {
      loadTime: 0,
      renderTime: 0,
      memoryUsage: 0,
      networkUsage: 0,
      batteryImpact: 0,
      userExperience: 0,
    };
  }

  /**
   * Adapt configuration based on device capabilities
   */
  private adaptConfigToDevice(): void {
    const deviceInfo = deviceDetection.getDeviceInfo();
    
    // Adapt to network conditions
    if (deviceInfo.network.effectiveType === 'slow-2g' || deviceInfo.network.effectiveType === '2g') {
      this.config.maxConcurrentRequests = 2;
      this.config.imageQuality = 'low';
      this.config.animationLevel = 'none';
      this.config.prefetchStrategy = 'none';
    } else if (deviceInfo.network.effectiveType === '3g') {
      this.config.maxConcurrentRequests = 4;
      this.config.imageQuality = 'medium';
      this.config.animationLevel = 'reduced';
      this.config.prefetchStrategy = 'viewport';
    }

    // Adapt to device capabilities
    if (deviceInfo.capabilities.deviceMemory <= 2) {
      this.config.animationLevel = 'reduced';
      this.config.prefetchStrategy = 'none';
      this.config.enableOfflineMode = false;
    }

    // Adapt to battery level
    if (deviceInfo.performance.batteryLevel && deviceInfo.performance.batteryLevel < 0.2) {
      this.config.animationLevel = 'none';
      this.config.prefetchStrategy = 'none';
      this.config.imageQuality = 'low';
    }

    // Enable data saver mode
    if (deviceInfo.network.saveData) {
      this.config.imageQuality = 'low';
      this.config.animationLevel = 'none';
      this.config.prefetchStrategy = 'none';
      this.config.enableOfflineMode = false;
    }
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    // Monitor Core Web Vitals
    this.observeWebVitals();
    
    // Monitor memory usage
    this.monitorMemoryUsage();
    
    // Monitor network usage
    this.monitorNetworkUsage();
    
    // Monitor battery impact
    this.monitorBatteryImpact();
  }

  /**
   * Observe Core Web Vitals
   */
  private observeWebVitals(): void {
    // Largest Contentful Paint (LCP)
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.metrics.loadTime = lastEntry.startTime;
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay (FID)
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        this.metrics.userExperience = Math.max(0, 100 - entry.processingStart - entry.startTime);
      });
    }).observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift (CLS)
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          this.metrics.renderTime += entry.value;
        }
      });
    }).observe({ entryTypes: ['layout-shift'] });
  }

  /**
   * Monitor memory usage
   */
  private monitorMemoryUsage(): void {
    const updateMemoryUsage = () => {
      const memory = (performance as any).memory;
      if (memory) {
        this.metrics.memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
      }
    };

    updateMemoryUsage();
    setInterval(updateMemoryUsage, 5000);
  }

  /**
   * Monitor network usage
   */
  private monitorNetworkUsage(): void {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (entry.transferSize) {
          this.metrics.networkUsage += entry.transferSize;
        }
      });
    });
    observer.observe({ entryTypes: ['resource'] });
  }

  /**
   * Monitor battery impact
   */
  private monitorBatteryImpact(): void {
    const battery = (navigator as any).battery;
    if (battery) {
      const updateBatteryImpact = () => {
        const dischargingRate = battery.dischargingTime;
        this.metrics.batteryImpact = dischargingRate ? 1 / dischargingRate : 0;
      };
      
      battery.addEventListener('dischargingtimechange', updateBatteryImpact);
      updateBatteryImpact();
    }
  }

  /**
   * Initialize lazy loading
   */
  private initializeLazyLoading(): void {
    if (!this.config.enableLazyLoading) return;

    // Lazy load images
    const imageObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            this.loadImage(img);
            imageObserver.unobserve(img);
          }
        });
      },
      { rootMargin: '50px' }
    );

    this.observers.set('images', imageObserver);

    // Lazy load components
    const componentObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            this.loadComponent(element);
            componentObserver.unobserve(element);
          }
        });
      },
      { rootMargin: '100px' }
    );

    this.observers.set('components', componentObserver);
  }

  /**
   * Load image with optimization
   */
  private async loadImage(img: HTMLImageElement): Promise<void> {
    const src = img.dataset.src;
    if (!src) return;

    const optimizedSrc = this.optimizeImageUrl(src);
    
    return new Promise((resolve, reject) => {
      const tempImg = new Image();
      tempImg.onload = () => {
        img.src = optimizedSrc;
        img.classList.add('loaded');
        resolve();
      };
      tempImg.onerror = reject;
      tempImg.src = optimizedSrc;
    });
  }

  /**
   * Optimize image URL based on device capabilities
   */
  private optimizeImageUrl(src: string): string {
    const deviceInfo = deviceDetection.getDeviceInfo();
    const params = new URLSearchParams();

    // Set quality based on configuration
    switch (this.config.imageQuality) {
      case 'low':
        params.set('q', '60');
        break;
      case 'medium':
        params.set('q', '80');
        break;
      case 'high':
        params.set('q', '95');
        break;
      case 'auto':
        if (deviceInfo.network.effectiveType === 'slow-2g' || deviceInfo.network.effectiveType === '2g') {
          params.set('q', '50');
        } else if (deviceInfo.network.effectiveType === '3g') {
          params.set('q', '70');
        } else {
          params.set('q', '85');
        }
        break;
    }

    // Set format based on browser support
    if (deviceInfo.capabilities.supportsAvif) {
      params.set('f', 'avif');
    } else if (deviceInfo.capabilities.supportsWebP) {
      params.set('f', 'webp');
    }

    // Set size based on viewport
    const maxWidth = Math.min(deviceInfo.viewport.width * deviceInfo.viewport.pixelRatio, 1920);
    params.set('w', maxWidth.toString());

    return `${src}?${params.toString()}`;
  }

  /**
   * Load component lazily
   */
  private async loadComponent(element: HTMLElement): Promise<void> {
    const componentName = element.dataset.component;
    if (!componentName) return;

    try {
      // Dynamic import based on component name
      const module = await import(`../../components/${componentName}`);
      const Component = module.default || module[componentName];
      
      // Render component (this would be handled by React in practice)
      element.classList.add('loaded');
    } catch (error) {
      console.error(`Failed to load component: ${componentName}`, error);
    }
  }

  /**
   * Optimize network requests
   */
  private optimizeNetworkRequests(): void {
    // Implement request queuing
    this.processLoadQueue();
    
    // Setup request prioritization
    this.setupRequestPrioritization();
    
    // Enable request deduplication
    this.enableRequestDeduplication();
  }

  /**
   * Process load queue with concurrency control
   */
  private async processLoadQueue(): Promise<void> {
    if (this.isProcessingQueue || this.loadQueue.size === 0) return;
    
    this.isProcessingQueue = true;
    const concurrent = Math.min(this.config.maxConcurrentRequests, this.loadQueue.size);
    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < concurrent; i++) {
      const loader = this.loadQueue.values().next().value;
      if (loader) {
        this.loadQueue.delete(loader);
        promises.push(loader());
      }
    }
    
    await Promise.all(promises);
    this.isProcessingQueue = false;
    
    // Process remaining items
    if (this.loadQueue.size > 0) {
      setTimeout(() => this.processLoadQueue(), 100);
    }
  }

  /**
   * Setup request prioritization
   */
  private setupRequestPrioritization(): void {
    // Intercept fetch requests and add priority headers
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const priority = this.getRequestPriority(url);
      
      const headers = new Headers(init?.headers);
      headers.set('Priority', priority);
      
      return originalFetch(input, { ...init, headers });
    };
  }

  /**
   * Get request priority based on resource type
   */
  private getRequestPriority(url: string): string {
    if (url.includes('/api/')) return 'high';
    if (url.includes('.css') || url.includes('.js')) return 'high';
    if (url.includes('.jpg') || url.includes('.png') || url.includes('.webp')) return 'low';
    return 'medium';
  }

  /**
   * Enable request deduplication
   */
  private enableRequestDeduplication(): void {
    const requestCache = new Map<string, Promise<Response>>();
    
    const originalFetch = window.fetch;
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const key = `${input.toString()}-${JSON.stringify(init)}`;
      
      if (requestCache.has(key)) {
        return requestCache.get(key)!.then(response => response.clone());
      }
      
      const promise = originalFetch(input, init);
      requestCache.set(key, promise);
      
      // Clean up cache after 5 minutes
      setTimeout(() => requestCache.delete(key), 300000);
      
      return promise;
    };
  }

  /**
   * Setup memory management
   */
  private setupMemoryManagement(): void {
    // Monitor memory pressure
    this.monitorMemoryPressure();
    
    // Implement garbage collection hints
    this.implementGCHints();
    
    // Setup resource cleanup
    this.setupResourceCleanup();
  }

  /**
   * Monitor memory pressure
   */
  private monitorMemoryPressure(): void {
    const checkMemoryPressure = () => {
      const memory = (performance as any).memory;
      if (memory) {
        const usage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        
        if (usage > 0.8) {
          this.handleHighMemoryPressure();
        } else if (usage > 0.6) {
          this.handleMediumMemoryPressure();
        }
      }
    };
    
    setInterval(checkMemoryPressure, 10000);
  }

  /**
   * Handle high memory pressure
   */
  private handleHighMemoryPressure(): void {
    // Disable animations
    document.body.classList.add('reduce-motion');
    
    // Clear caches
    this.clearCaches();
    
    // Reduce image quality
    this.config.imageQuality = 'low';
    
    // Disable prefetching
    this.config.prefetchStrategy = 'none';
  }

  /**
   * Handle medium memory pressure
   */
  private handleMediumMemoryPressure(): void {
    // Reduce animations
    document.body.classList.add('reduce-motion');
    
    // Reduce prefetching
    this.config.prefetchStrategy = 'viewport';
  }

  /**
   * Implement garbage collection hints
   */
  private implementGCHints(): void {
    // Suggest garbage collection during idle time
    if ('requestIdleCallback' in window) {
      const scheduleGC = () => {
        requestIdleCallback(() => {
          // Force garbage collection if available
          if ((window as any).gc) {
            (window as any).gc();
          }
          
          // Schedule next GC
          setTimeout(scheduleGC, 60000);
        });
      };
      
      scheduleGC();
    }
  }

  /**
   * Setup resource cleanup
   */
  private setupResourceCleanup(): void {
    // Clean up observers when page is hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseOptimizations();
      } else {
        this.resumeOptimizations();
      }
    });
    
    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }

  /**
   * Pause optimizations
   */
  private pauseOptimizations(): void {
    this.observers.forEach(observer => observer.disconnect());
  }

  /**
   * Resume optimizations
   */
  private resumeOptimizations(): void {
    this.initializeLazyLoading();
  }

  /**
   * Clear caches
   */
  private clearCaches(): void {
    // Clear image cache
    const images = document.querySelectorAll('img[data-src]');
    images.forEach(img => {
      (img as HTMLImageElement).src = '';
    });
    
    // Clear component cache
    const components = document.querySelectorAll('[data-component]');
    components.forEach(component => {
      component.innerHTML = '';
    });
  }

  /**
   * Get current configuration
   */
  getConfig(): PerformanceConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...updates };
    this.adaptConfigToDevice();
  }

  /**
   * Get performance metrics
   */
  getMetrics(): OptimizationMetrics {
    return { ...this.metrics };
  }

  /**
   * Add item to load queue
   */
  addToLoadQueue(loader: () => Promise<void>): void {
    this.loadQueue.add(loader);
    this.processLoadQueue();
  }

  /**
   * Observe element for lazy loading
   */
  observeElement(element: HTMLElement, type: 'images' | 'components'): void {
    const observer = this.observers.get(type);
    if (observer) {
      observer.observe(element);
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.loadQueue.clear();
  }
}

// Export singleton instance
export const performanceOptimizer = new MobilePerformanceOptimizer();
