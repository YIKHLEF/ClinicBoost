/**
 * CDN Configuration and Asset Optimization for ClinicBoost
 * Handles CDN setup, asset optimization, and performance monitoring
 */

import { secureConfig } from '../config/secure-config';
import { logger } from '../logging-monitoring';
import { reportPerformanceIssue } from '../monitoring/error-reporting';

// CDN configuration interface
interface CDNConfig {
  enabled: boolean;
  baseUrl: string;
  regions: string[];
  cacheControl: {
    static: string;
    dynamic: string;
    api: string;
  };
  compression: {
    enabled: boolean;
    types: string[];
    level: number;
  };
  optimization: {
    images: boolean;
    css: boolean;
    js: boolean;
    fonts: boolean;
  };
}

// Asset types
enum AssetType {
  IMAGE = 'image',
  CSS = 'css',
  JS = 'js',
  FONT = 'font',
  VIDEO = 'video',
  DOCUMENT = 'document'
}

// Performance metrics
interface PerformanceMetrics {
  loadTime: number;
  transferSize: number;
  cacheHitRate: number;
  compressionRatio: number;
  errorRate: number;
}

export class CDNManager {
  private config: CDNConfig;
  private performanceMetrics = new Map<string, PerformanceMetrics>();
  private observer?: PerformanceObserver;

  constructor() {
    this.config = this.initializeConfig();
    this.setupPerformanceMonitoring();
  }

  /**
   * Get optimized asset URL
   */
  getAssetUrl(path: string, options?: {
    type?: AssetType;
    quality?: number;
    width?: number;
    height?: number;
    format?: string;
  }): string {
    if (!this.config.enabled) {
      return path;
    }

    const baseUrl = this.config.baseUrl;
    const optimizedPath = this.optimizeAssetPath(path, options);
    
    return `${baseUrl}${optimizedPath}`;
  }

  /**
   * Preload critical assets
   */
  preloadCriticalAssets(assets: Array<{
    url: string;
    type: AssetType;
    priority?: 'high' | 'low';
  }>): void {
    assets.forEach(asset => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = this.getAssetUrl(asset.url, { type: asset.type });
      
      switch (asset.type) {
        case AssetType.CSS:
          link.as = 'style';
          break;
        case AssetType.JS:
          link.as = 'script';
          break;
        case AssetType.IMAGE:
          link.as = 'image';
          break;
        case AssetType.FONT:
          link.as = 'font';
          link.crossOrigin = 'anonymous';
          break;
        default:
          link.as = 'fetch';
      }

      if (asset.priority) {
        link.setAttribute('importance', asset.priority);
      }

      document.head.appendChild(link);
    });

    logger.info('Critical assets preloaded', 'cdn', { count: assets.length });
  }

  /**
   * Optimize images with responsive loading
   */
  createResponsiveImage(src: string, options: {
    alt: string;
    sizes?: string;
    loading?: 'lazy' | 'eager';
    quality?: number;
    formats?: string[];
  }): HTMLPictureElement {
    const picture = document.createElement('picture');
    const formats = options.formats || ['webp', 'avif'];
    
    // Create source elements for different formats
    formats.forEach(format => {
      const source = document.createElement('source');
      source.srcset = this.generateSrcSet(src, { format, quality: options.quality });
      source.type = `image/${format}`;
      if (options.sizes) {
        source.sizes = options.sizes;
      }
      picture.appendChild(source);
    });

    // Fallback img element
    const img = document.createElement('img');
    img.src = this.getAssetUrl(src, { type: AssetType.IMAGE, quality: options.quality });
    img.alt = options.alt;
    img.loading = options.loading || 'lazy';
    if (options.sizes) {
      img.sizes = options.sizes;
    }

    picture.appendChild(img);
    return picture;
  }

  /**
   * Monitor bundle size and performance
   */
  monitorBundlePerformance(): void {
    if ('performance' in window) {
      const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      const navigation = entries[0];

      if (navigation) {
        const metrics = {
          loadTime: navigation.loadEventEnd - navigation.loadEventStart,
          transferSize: navigation.transferSize || 0,
          cacheHitRate: this.calculateCacheHitRate(),
          compressionRatio: this.calculateCompressionRatio(),
          errorRate: 0
        };

        this.performanceMetrics.set('bundle', metrics);

        // Report performance issues
        if (metrics.loadTime > 3000) { // 3 seconds threshold
          reportPerformanceIssue('bundle_load_time', metrics.loadTime, 3000, {
            transferSize: metrics.transferSize,
            cacheHitRate: metrics.cacheHitRate
          });
        }

        logger.info('Bundle performance metrics', 'cdn', metrics);
      }
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    totalAssets: number;
    totalSize: number;
    averageLoadTime: number;
    cacheHitRate: number;
    compressionSavings: number;
  } {
    const metrics = Array.from(this.performanceMetrics.values());
    
    return {
      totalAssets: metrics.length,
      totalSize: metrics.reduce((sum, m) => sum + m.transferSize, 0),
      averageLoadTime: metrics.reduce((sum, m) => sum + m.loadTime, 0) / metrics.length || 0,
      cacheHitRate: metrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / metrics.length || 0,
      compressionSavings: metrics.reduce((sum, m) => sum + (1 - m.compressionRatio), 0) / metrics.length || 0
    };
  }

  /**
   * Purge CDN cache
   */
  async purgeCDNCache(paths?: string[]): Promise<void> {
    if (!this.config.enabled) {
      logger.warn('CDN not enabled, skipping cache purge', 'cdn');
      return;
    }

    try {
      // Implementation would depend on CDN provider (CloudFlare, AWS CloudFront, etc.)
      const purgeData = {
        files: paths || ['/*'], // Purge all if no specific paths
        timestamp: new Date().toISOString()
      };

      logger.info('CDN cache purge initiated', 'cdn', purgeData);
      
      // Simulate API call to CDN provider
      // await fetch(`${this.config.baseUrl}/purge`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(purgeData)
      // });

    } catch (error) {
      logger.error('CDN cache purge failed', 'cdn', { error, paths });
      throw error;
    }
  }

  /**
   * Setup service worker for advanced caching
   */
  setupServiceWorkerCaching(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          logger.info('Service Worker registered', 'cdn', { 
            scope: registration.scope 
          });

          // Update service worker when new version available
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New version available
                  this.notifyNewVersionAvailable();
                }
              });
            }
          });
        })
        .catch(error => {
          logger.error('Service Worker registration failed', 'cdn', { error });
        });
    }
  }

  /**
   * Private methods
   */
  private initializeConfig(): CDNConfig {
    const isProduction = secureConfig.isProduction();
    
    return {
      enabled: isProduction && (import.meta.env.VITE_ENABLE_CDN === 'true'),
      baseUrl: import.meta.env.VITE_CDN_URL || '',
      regions: ['us-east-1', 'eu-west-1', 'ap-southeast-1'],
      cacheControl: {
        static: 'public, max-age=31536000, immutable', // 1 year
        dynamic: 'public, max-age=300, s-maxage=600',   // 5 min browser, 10 min CDN
        api: 'private, max-age=0, no-cache'             // No caching
      },
      compression: {
        enabled: true,
        types: ['text/html', 'text/css', 'application/javascript', 'application/json'],
        level: 6
      },
      optimization: {
        images: true,
        css: true,
        js: true,
        fonts: true
      }
    };
  }

  private optimizeAssetPath(path: string, options?: {
    type?: AssetType;
    quality?: number;
    width?: number;
    height?: number;
    format?: string;
  }): string {
    if (!options || !this.config.optimization) {
      return path;
    }

    let optimizedPath = path;
    const params = new URLSearchParams();

    // Image optimization
    if (options.type === AssetType.IMAGE && this.config.optimization.images) {
      if (options.quality) params.set('q', options.quality.toString());
      if (options.width) params.set('w', options.width.toString());
      if (options.height) params.set('h', options.height.toString());
      if (options.format) params.set('f', options.format);
    }

    // CSS/JS optimization
    if ((options.type === AssetType.CSS || options.type === AssetType.JS) && 
        (this.config.optimization.css || this.config.optimization.js)) {
      params.set('minify', 'true');
    }

    const queryString = params.toString();
    return queryString ? `${optimizedPath}?${queryString}` : optimizedPath;
  }

  private generateSrcSet(src: string, options: {
    format?: string;
    quality?: number;
  }): string {
    const widths = [320, 640, 768, 1024, 1280, 1920];
    
    return widths
      .map(width => {
        const url = this.getAssetUrl(src, {
          type: AssetType.IMAGE,
          width,
          format: options.format,
          quality: options.quality
        });
        return `${url} ${width}w`;
      })
      .join(', ');
  }

  private setupPerformanceMonitoring(): void {
    if ('PerformanceObserver' in window) {
      this.observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            this.trackResourcePerformance(resourceEntry);
          }
        });
      });

      this.observer.observe({ entryTypes: ['resource'] });
    }
  }

  private trackResourcePerformance(entry: PerformanceResourceTiming): void {
    const url = new URL(entry.name);
    const assetType = this.getAssetTypeFromUrl(url.pathname);
    
    const metrics: PerformanceMetrics = {
      loadTime: entry.responseEnd - entry.requestStart,
      transferSize: entry.transferSize || 0,
      cacheHitRate: entry.transferSize === 0 ? 1 : 0, // Simplified cache detection
      compressionRatio: entry.encodedBodySize / (entry.decodedBodySize || 1),
      errorRate: entry.responseEnd === 0 ? 1 : 0
    };

    this.performanceMetrics.set(entry.name, metrics);

    // Report slow assets
    if (metrics.loadTime > 2000) {
      reportPerformanceIssue('slow_asset_load', metrics.loadTime, 2000, {
        url: entry.name,
        type: assetType,
        size: metrics.transferSize
      });
    }
  }

  private getAssetTypeFromUrl(path: string): AssetType {
    const extension = path.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
      case 'avif':
        return AssetType.IMAGE;
      case 'css':
        return AssetType.CSS;
      case 'js':
        return AssetType.JS;
      case 'woff':
      case 'woff2':
      case 'ttf':
      case 'otf':
        return AssetType.FONT;
      case 'mp4':
      case 'webm':
      case 'ogg':
        return AssetType.VIDEO;
      default:
        return AssetType.DOCUMENT;
    }
  }

  private calculateCacheHitRate(): number {
    const metrics = Array.from(this.performanceMetrics.values());
    if (metrics.length === 0) return 0;
    
    const hits = metrics.filter(m => m.cacheHitRate > 0).length;
    return hits / metrics.length;
  }

  private calculateCompressionRatio(): number {
    const metrics = Array.from(this.performanceMetrics.values());
    if (metrics.length === 0) return 1;
    
    return metrics.reduce((sum, m) => sum + m.compressionRatio, 0) / metrics.length;
  }

  private notifyNewVersionAvailable(): void {
    // Show user notification about new version
    const event = new CustomEvent('newVersionAvailable', {
      detail: { message: 'A new version of ClinicBoost is available. Refresh to update.' }
    });
    window.dispatchEvent(event);
  }
}

// Export singleton instance
export const cdnManager = new CDNManager();

// Utility functions
export const CDNUtils = {
  /**
   * Preload critical resources
   */
  preloadCritical(): void {
    const criticalAssets = [
      { url: '/assets/css/critical.css', type: AssetType.CSS, priority: 'high' as const },
      { url: '/assets/fonts/inter-var.woff2', type: AssetType.FONT, priority: 'high' as const },
      { url: '/assets/js/vendor.js', type: AssetType.JS, priority: 'high' as const }
    ];

    cdnManager.preloadCriticalAssets(criticalAssets);
  },

  /**
   * Setup performance monitoring
   */
  initializePerformanceMonitoring(): void {
    cdnManager.monitorBundlePerformance();
    cdnManager.setupServiceWorkerCaching();
  },

  /**
   * Get optimized image element
   */
  createOptimizedImage(src: string, alt: string, options?: {
    sizes?: string;
    loading?: 'lazy' | 'eager';
    quality?: number;
  }): HTMLPictureElement {
    return cdnManager.createResponsiveImage(src, {
      alt,
      sizes: options?.sizes || '(max-width: 768px) 100vw, 50vw',
      loading: options?.loading || 'lazy',
      quality: options?.quality || 80,
      formats: ['webp', 'avif']
    });
  }
};
