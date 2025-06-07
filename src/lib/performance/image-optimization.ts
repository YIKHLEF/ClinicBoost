/**
 * Advanced Image Optimization Service for ClinicBoost
 * 
 * Provides comprehensive image optimization including:
 * - WebP/AVIF format conversion
 * - Responsive image generation
 * - Lazy loading implementation
 * - Progressive loading
 * - Intelligent compression
 */

import { logger } from '../logging-monitoring';
import { cdnManager } from './cdn-config';

export interface ImageOptimizationOptions {
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png' | 'auto';
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  progressive?: boolean;
  lazy?: boolean;
  responsive?: boolean;
  placeholder?: 'blur' | 'color' | 'none';
  priority?: 'high' | 'normal' | 'low';
}

export interface ResponsiveImageSet {
  src: string;
  srcSet: string;
  sizes: string;
  placeholder?: string;
  aspectRatio?: number;
}

export interface ImageMetrics {
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  format: string;
  dimensions: { width: number; height: number };
  loadTime: number;
}

class ImageOptimizationService {
  private supportedFormats = new Set(['webp', 'avif', 'jpeg', 'png']);
  private cache = new Map<string, ResponsiveImageSet>();
  private metrics = new Map<string, ImageMetrics>();
  private observer?: IntersectionObserver;

  constructor() {
    this.initializeLazyLoading();
    this.detectFormatSupport();
  }

  /**
   * Optimize a single image with specified options
   */
  async optimizeImage(
    src: string,
    options: ImageOptimizationOptions = {}
  ): Promise<ResponsiveImageSet> {
    const cacheKey = this.generateCacheKey(src, options);
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const startTime = performance.now();
      
      // Determine optimal format
      const format = this.determineOptimalFormat(options.format);
      
      // Generate optimized image URLs
      const optimizedSet = await this.generateResponsiveSet(src, {
        ...options,
        format
      });

      // Calculate metrics
      const loadTime = performance.now() - startTime;
      await this.recordMetrics(src, optimizedSet, loadTime);

      // Cache the result
      this.cache.set(cacheKey, optimizedSet);

      logger.debug('Image optimized successfully', 'image-optimization', {
        src,
        format,
        loadTime: Math.round(loadTime)
      });

      return optimizedSet;
    } catch (error) {
      logger.error('Failed to optimize image', 'image-optimization', { src, error });
      
      // Return fallback
      return {
        src,
        srcSet: src,
        sizes: '100vw'
      };
    }
  }

  /**
   * Generate responsive image set with multiple sizes
   */
  private async generateResponsiveSet(
    src: string,
    options: ImageOptimizationOptions
  ): Promise<ResponsiveImageSet> {
    const breakpoints = [320, 640, 768, 1024, 1280, 1920];
    const format = options.format || 'webp';
    
    // Generate URLs for different sizes
    const srcSetEntries = breakpoints.map(width => {
      const optimizedUrl = this.buildOptimizedUrl(src, {
        ...options,
        width,
        format
      });
      return `${optimizedUrl} ${width}w`;
    });

    // Generate sizes attribute
    const sizes = this.generateSizesAttribute(options.responsive);

    // Generate placeholder if needed
    const placeholder = await this.generatePlaceholder(src, options.placeholder);

    // Calculate aspect ratio
    const aspectRatio = await this.calculateAspectRatio(src);

    return {
      src: this.buildOptimizedUrl(src, options),
      srcSet: srcSetEntries.join(', '),
      sizes,
      placeholder,
      aspectRatio
    };
  }

  /**
   * Build optimized image URL with CDN parameters
   */
  private buildOptimizedUrl(src: string, options: ImageOptimizationOptions): string {
    const params = new URLSearchParams();
    
    if (options.width) params.set('w', options.width.toString());
    if (options.height) params.set('h', options.height.toString());
    if (options.quality) params.set('q', options.quality.toString());
    if (options.format) params.set('f', options.format);
    if (options.fit) params.set('fit', options.fit);
    if (options.progressive) params.set('progressive', 'true');

    const baseUrl = cdnManager.getAssetUrl(src, {
      type: 'image' as any,
      quality: options.quality,
      width: options.width,
      height: options.height,
      format: options.format
    });

    return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
  }

  /**
   * Determine optimal image format based on browser support
   */
  private determineOptimalFormat(requestedFormat?: string): string {
    if (requestedFormat && requestedFormat !== 'auto') {
      return requestedFormat;
    }

    // Check browser support for modern formats
    if (this.supportsFormat('avif')) return 'avif';
    if (this.supportsFormat('webp')) return 'webp';
    
    return 'jpeg'; // Fallback
  }

  /**
   * Check if browser supports a specific image format
   */
  private supportsFormat(format: string): boolean {
    if (typeof window === 'undefined') return false;
    
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    try {
      return canvas.toDataURL(`image/${format}`).indexOf(`data:image/${format}`) === 0;
    } catch {
      return false;
    }
  }

  /**
   * Generate sizes attribute for responsive images
   */
  private generateSizesAttribute(responsive?: boolean): string {
    if (!responsive) return '100vw';
    
    return [
      '(max-width: 640px) 100vw',
      '(max-width: 1024px) 50vw',
      '33vw'
    ].join(', ');
  }

  /**
   * Generate image placeholder
   */
  private async generatePlaceholder(
    src: string,
    type?: 'blur' | 'color' | 'none'
  ): Promise<string | undefined> {
    if (!type || type === 'none') return undefined;

    try {
      if (type === 'blur') {
        // Generate low-quality blurred version
        return this.buildOptimizedUrl(src, {
          width: 20,
          quality: 20,
          format: 'jpeg'
        });
      }

      if (type === 'color') {
        // Generate dominant color placeholder
        return await this.extractDominantColor(src);
      }
    } catch (error) {
      logger.warn('Failed to generate placeholder', 'image-optimization', { src, type, error });
    }

    return undefined;
  }

  /**
   * Extract dominant color from image
   */
  private async extractDominantColor(src: string): Promise<string> {
    // Simplified implementation - in production, use a proper color extraction library
    const colors = ['#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Calculate image aspect ratio
   */
  private async calculateAspectRatio(src: string): Promise<number> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve(img.width / img.height);
      };
      img.onerror = () => {
        resolve(16 / 9); // Default aspect ratio
      };
      img.src = src;
    });
  }

  /**
   * Initialize lazy loading with Intersection Observer
   */
  private initializeLazyLoading(): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            this.loadImage(img);
            this.observer?.unobserve(img);
          }
        });
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.01
      }
    );
  }

  /**
   * Enable lazy loading for an image element
   */
  enableLazyLoading(img: HTMLImageElement): void {
    if (!this.observer) return;

    // Set placeholder
    const placeholder = img.dataset.placeholder;
    if (placeholder) {
      img.src = placeholder;
    }

    // Store actual src in data attribute
    if (img.src && !img.dataset.src) {
      img.dataset.src = img.src;
      img.src = placeholder || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNGM0Y0RjYiLz48L3N2Zz4=';
    }

    this.observer.observe(img);
  }

  /**
   * Load image with progressive enhancement
   */
  private loadImage(img: HTMLImageElement): void {
    const src = img.dataset.src;
    const srcSet = img.dataset.srcset;
    
    if (!src) return;

    // Create new image to preload
    const newImg = new Image();
    
    newImg.onload = () => {
      // Apply loaded image
      img.src = src;
      if (srcSet) img.srcset = srcSet;
      
      // Add loaded class for CSS transitions
      img.classList.add('loaded');
      
      // Record load metrics
      this.recordLoadMetrics(src);
    };

    newImg.onerror = () => {
      logger.warn('Failed to load image', 'image-optimization', { src });
    };

    // Start loading
    if (srcSet) newImg.srcset = srcSet;
    newImg.src = src;
  }

  /**
   * Record image metrics
   */
  private async recordMetrics(
    src: string,
    optimizedSet: ResponsiveImageSet,
    loadTime: number
  ): Promise<void> {
    try {
      // This would typically involve measuring actual file sizes
      const metrics: ImageMetrics = {
        originalSize: 0, // Would be measured
        optimizedSize: 0, // Would be measured
        compressionRatio: 0.7, // Estimated
        format: 'webp',
        dimensions: { width: 0, height: 0 }, // Would be measured
        loadTime
      };

      this.metrics.set(src, metrics);
    } catch (error) {
      logger.warn('Failed to record image metrics', 'image-optimization', { src, error });
    }
  }

  /**
   * Record load performance metrics
   */
  private recordLoadMetrics(src: string): void {
    const metrics = this.metrics.get(src);
    if (metrics) {
      logger.debug('Image loaded successfully', 'image-optimization', {
        src,
        loadTime: metrics.loadTime,
        compressionRatio: metrics.compressionRatio
      });
    }
  }

  /**
   * Generate cache key for optimization options
   */
  private generateCacheKey(src: string, options: ImageOptimizationOptions): string {
    const optionsStr = JSON.stringify(options);
    return `${src}:${btoa(optionsStr)}`;
  }

  /**
   * Detect browser format support
   */
  private detectFormatSupport(): void {
    if (typeof window === 'undefined') return;

    const formats = ['webp', 'avif'];
    formats.forEach(format => {
      if (this.supportsFormat(format)) {
        this.supportedFormats.add(format);
      }
    });

    logger.debug('Image format support detected', 'image-optimization', {
      supported: Array.from(this.supportedFormats)
    });
  }

  /**
   * Get optimization metrics
   */
  getMetrics(): { [src: string]: ImageMetrics } {
    const metrics: { [src: string]: ImageMetrics } = {};
    this.metrics.forEach((metric, src) => {
      metrics[src] = { ...metric };
    });
    return metrics;
  }

  /**
   * Clear cache and metrics
   */
  clearCache(): void {
    this.cache.clear();
    this.metrics.clear();
    logger.info('Image optimization cache cleared', 'image-optimization');
  }
}

// Export singleton instance
export const imageOptimization = new ImageOptimizationService();
