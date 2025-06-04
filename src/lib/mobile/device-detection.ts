/**
 * Mobile Device Detection and Testing Framework
 * 
 * This module provides comprehensive device detection, viewport management,
 * and mobile-specific optimizations for ClinicBoost.
 */

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  os: 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown';
  browser: 'chrome' | 'firefox' | 'safari' | 'edge' | 'opera' | 'unknown';
  viewport: ViewportInfo;
  capabilities: DeviceCapabilities;
  network: NetworkInfo;
  performance: PerformanceInfo;
}

export interface ViewportInfo {
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  pixelRatio: number;
  breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  isTouch: boolean;
  safeArea: SafeAreaInsets;
}

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface DeviceCapabilities {
  hasTouch: boolean;
  hasHover: boolean;
  hasPointer: boolean;
  supportsWebP: boolean;
  supportsAvif: boolean;
  supportsServiceWorker: boolean;
  supportsWebGL: boolean;
  supportsWebAssembly: boolean;
  maxTextureSize: number;
  deviceMemory: number;
  hardwareConcurrency: number;
}

export interface NetworkInfo {
  type: 'slow-2g' | '2g' | '3g' | '4g' | '5g' | 'wifi' | 'ethernet' | 'unknown';
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  downlink: number;
  rtt: number;
  saveData: boolean;
  isOnline: boolean;
}

export interface PerformanceInfo {
  memoryUsage: number;
  cpuSlowdown: number;
  batteryLevel?: number;
  isCharging?: boolean;
  thermalState?: 'nominal' | 'fair' | 'serious' | 'critical';
}

class DeviceDetectionService {
  private deviceInfo: DeviceInfo | null = null;
  private listeners: Set<(info: DeviceInfo) => void> = new Set();
  private resizeObserver: ResizeObserver | null = null;
  private orientationChangeHandler: (() => void) | null = null;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize device detection
   */
  private initialize(): void {
    if (typeof window === 'undefined') return;

    this.detectDevice();
    this.setupEventListeners();
    this.startPerformanceMonitoring();
  }

  /**
   * Get current device information
   */
  getDeviceInfo(): DeviceInfo {
    if (!this.deviceInfo) {
      this.detectDevice();
    }
    return this.deviceInfo!;
  }

  /**
   * Subscribe to device info changes
   */
  subscribe(callback: (info: DeviceInfo) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Detect device information
   */
  private detectDevice(): void {
    const userAgent = navigator.userAgent;
    const viewport = this.getViewportInfo();
    const capabilities = this.getDeviceCapabilities();
    const network = this.getNetworkInfo();
    const performance = this.getPerformanceInfo();

    this.deviceInfo = {
      type: this.getDeviceType(userAgent, viewport.width),
      os: this.getOperatingSystem(userAgent),
      browser: this.getBrowser(userAgent),
      viewport,
      capabilities,
      network,
      performance,
    };

    this.notifyListeners();
  }

  /**
   * Get viewport information
   */
  private getViewportInfo(): ViewportInfo {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const pixelRatio = window.devicePixelRatio || 1;
    const orientation = width > height ? 'landscape' : 'portrait';
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    return {
      width,
      height,
      orientation,
      pixelRatio,
      breakpoint: this.getBreakpoint(width),
      isTouch,
      safeArea: this.getSafeAreaInsets(),
    };
  }

  /**
   * Get CSS breakpoint based on width
   */
  private getBreakpoint(width: number): ViewportInfo['breakpoint'] {
    if (width < 640) return 'xs';
    if (width < 768) return 'sm';
    if (width < 1024) return 'md';
    if (width < 1280) return 'lg';
    if (width < 1536) return 'xl';
    return '2xl';
  }

  /**
   * Get safe area insets for notched devices
   */
  private getSafeAreaInsets(): SafeAreaInsets {
    const style = getComputedStyle(document.documentElement);
    return {
      top: parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0'),
      right: parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0'),
      bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
      left: parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0'),
    };
  }

  /**
   * Detect device type
   */
  private getDeviceType(userAgent: string, width: number): DeviceInfo['type'] {
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const tabletRegex = /iPad|Android(?=.*\bMobile\b)(?=.*\bTablet\b)|Android(?=.*\bTablet\b)/i;

    if (tabletRegex.test(userAgent) || (width >= 768 && width < 1024)) {
      return 'tablet';
    }
    if (mobileRegex.test(userAgent) || width < 768) {
      return 'mobile';
    }
    return 'desktop';
  }

  /**
   * Detect operating system
   */
  private getOperatingSystem(userAgent: string): DeviceInfo['os'] {
    if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
    if (/Android/i.test(userAgent)) return 'android';
    if (/Windows/i.test(userAgent)) return 'windows';
    if (/Mac/i.test(userAgent)) return 'macos';
    if (/Linux/i.test(userAgent)) return 'linux';
    return 'unknown';
  }

  /**
   * Detect browser
   */
  private getBrowser(userAgent: string): DeviceInfo['browser'] {
    if (/Chrome/i.test(userAgent) && !/Edge/i.test(userAgent)) return 'chrome';
    if (/Firefox/i.test(userAgent)) return 'firefox';
    if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) return 'safari';
    if (/Edge/i.test(userAgent)) return 'edge';
    if (/Opera/i.test(userAgent)) return 'opera';
    return 'unknown';
  }

  /**
   * Get device capabilities
   */
  private getDeviceCapabilities(): DeviceCapabilities {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    const maxTextureSize = gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 0;

    return {
      hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      hasHover: window.matchMedia('(hover: hover)').matches,
      hasPointer: window.matchMedia('(pointer: fine)').matches,
      supportsWebP: this.supportsImageFormat('webp'),
      supportsAvif: this.supportsImageFormat('avif'),
      supportsServiceWorker: 'serviceWorker' in navigator,
      supportsWebGL: !!gl,
      supportsWebAssembly: typeof WebAssembly === 'object',
      maxTextureSize,
      deviceMemory: (navigator as any).deviceMemory || 4,
      hardwareConcurrency: navigator.hardwareConcurrency || 4,
    };
  }

  /**
   * Check image format support
   */
  private supportsImageFormat(format: string): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL(`image/${format}`).indexOf(`data:image/${format}`) === 0;
  }

  /**
   * Get network information
   */
  private getNetworkInfo(): NetworkInfo {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    if (!connection) {
      return {
        type: 'unknown',
        effectiveType: '4g',
        downlink: 10,
        rtt: 100,
        saveData: false,
        isOnline: navigator.onLine,
      };
    }

    return {
      type: connection.type || 'unknown',
      effectiveType: connection.effectiveType || '4g',
      downlink: connection.downlink || 10,
      rtt: connection.rtt || 100,
      saveData: connection.saveData || false,
      isOnline: navigator.onLine,
    };
  }

  /**
   * Get performance information
   */
  private getPerformanceInfo(): PerformanceInfo {
    const memory = (performance as any).memory;
    const battery = (navigator as any).battery;

    return {
      memoryUsage: memory ? memory.usedJSHeapSize / memory.jsHeapSizeLimit : 0,
      cpuSlowdown: this.estimateCPUSlowdown(),
      batteryLevel: battery?.level,
      isCharging: battery?.charging,
      thermalState: (navigator as any).thermalState || 'nominal',
    };
  }

  /**
   * Estimate CPU slowdown factor
   */
  private estimateCPUSlowdown(): number {
    const start = performance.now();
    let iterations = 0;
    const maxTime = 10; // 10ms test

    while (performance.now() - start < maxTime) {
      Math.random();
      iterations++;
    }

    // Baseline: ~1M iterations per 10ms on modern desktop
    const baseline = 1000000;
    return baseline / iterations;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Viewport changes
    this.resizeObserver = new ResizeObserver(() => {
      this.detectDevice();
    });
    this.resizeObserver.observe(document.documentElement);

    // Orientation changes
    this.orientationChangeHandler = () => {
      setTimeout(() => this.detectDevice(), 100);
    };
    window.addEventListener('orientationchange', this.orientationChangeHandler);

    // Network changes
    window.addEventListener('online', () => this.detectDevice());
    window.addEventListener('offline', () => this.detectDevice());

    // Connection changes
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', () => this.detectDevice());
    }
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    // Monitor performance every 30 seconds
    setInterval(() => {
      if (this.deviceInfo) {
        this.deviceInfo.performance = this.getPerformanceInfo();
        this.notifyListeners();
      }
    }, 30000);
  }

  /**
   * Notify all listeners of device info changes
   */
  private notifyListeners(): void {
    if (this.deviceInfo) {
      this.listeners.forEach(callback => callback(this.deviceInfo!));
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.orientationChangeHandler) {
      window.removeEventListener('orientationchange', this.orientationChangeHandler);
    }
    this.listeners.clear();
  }
}

// Export singleton instance
export const deviceDetection = new DeviceDetectionService();

// Utility functions
export const isMobile = () => deviceDetection.getDeviceInfo().type === 'mobile';
export const isTablet = () => deviceDetection.getDeviceInfo().type === 'tablet';
export const isDesktop = () => deviceDetection.getDeviceInfo().type === 'desktop';
export const isTouchDevice = () => deviceDetection.getDeviceInfo().viewport.isTouch;
export const isSlowNetwork = () => {
  const network = deviceDetection.getDeviceInfo().network;
  return network.effectiveType === 'slow-2g' || network.effectiveType === '2g';
};
export const isLowEndDevice = () => {
  const capabilities = deviceDetection.getDeviceInfo().capabilities;
  return capabilities.deviceMemory <= 2 || capabilities.hardwareConcurrency <= 2;
};
