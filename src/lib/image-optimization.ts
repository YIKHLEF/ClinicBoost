/**
 * Advanced Image Optimization System
 * 
 * This module provides comprehensive image optimization including:
 * - Automatic format conversion (WebP, AVIF)
 * - Responsive image generation
 * - Lazy loading with intersection observer
 * - Progressive loading with blur placeholders
 * - Compression and quality optimization
 * - CDN integration
 */

export interface ImageOptimizationConfig {
  quality: number;
  formats: ('webp' | 'avif' | 'jpeg' | 'png')[];
  sizes: number[];
  enableLazyLoading: boolean;
  enableProgressiveLoading: boolean;
  enableBlurPlaceholder: boolean;
  cdnBaseUrl?: string;
  compressionLevel: number;
  maxWidth: number;
  maxHeight: number;
}

export interface OptimizedImageData {
  src: string;
  srcSet: string;
  sizes: string;
  placeholder?: string;
  width: number;
  height: number;
  format: string;
  size: number;
}

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png' | 'auto';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  blur?: number;
  sharpen?: boolean;
  grayscale?: boolean;
}

class ImageOptimizer {
  private config: ImageOptimizationConfig = {
    quality: 85,
    formats: ['webp', 'jpeg'],
    sizes: [320, 640, 768, 1024, 1280, 1920],
    enableLazyLoading: true,
    enableProgressiveLoading: true,
    enableBlurPlaceholder: true,
    compressionLevel: 8,
    maxWidth: 1920,
    maxHeight: 1080,
  };

  private imageCache = new Map<string, OptimizedImageData>();
  private loadingImages = new Set<string>();
  private intersectionObserver?: IntersectionObserver;

  constructor(customConfig?: Partial<ImageOptimizationConfig>) {
    this.config = { ...this.config, ...customConfig };
    this.initializeIntersectionObserver();
  }

  /**
   * Initialize intersection observer for lazy loading
   */
  private initializeIntersectionObserver(): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            this.loadImage(img);
            this.intersectionObserver?.unobserve(img);
          }
        });
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.01,
      }
    );
  }

  /**
   * Optimize image with multiple formats and sizes
   */
  async optimizeImage(
    src: string,
    options: ImageTransformOptions = {}
  ): Promise<OptimizedImageData> {
    const cacheKey = this.generateCacheKey(src, options);
    
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey)!;
    }

    try {
      const optimizedData = await this.processImage(src, options);
      this.imageCache.set(cacheKey, optimizedData);
      return optimizedData;
    } catch (error) {
      console.error('Image optimization failed:', error);
      return this.createFallbackImageData(src);
    }
  }

  /**
   * Process image with transformations
   */
  private async processImage(
    src: string,
    options: ImageTransformOptions
  ): Promise<OptimizedImageData> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    return new Promise((resolve, reject) => {
      img.onload = () => {
        try {
          const { width, height } = this.calculateDimensions(
            img.naturalWidth,
            img.naturalHeight,
            options
          );

          canvas.width = width;
          canvas.height = height;

          if (!ctx) {
            throw new Error('Canvas context not available');
          }

          // Apply transformations
          this.applyImageTransformations(ctx, img, options, width, height);

          // Generate optimized versions
          const optimizedData = this.generateOptimizedVersions(canvas, src, options);
          resolve(optimizedData);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.crossOrigin = 'anonymous';
      img.src = src;
    });
  }

  /**
   * Calculate optimal dimensions
   */
  private calculateDimensions(
    naturalWidth: number,
    naturalHeight: number,
    options: ImageTransformOptions
  ): { width: number; height: number } {
    let { width, height } = options;
    const maxWidth = Math.min(this.config.maxWidth, naturalWidth);
    const maxHeight = Math.min(this.config.maxHeight, naturalHeight);

    if (!width && !height) {
      return { width: maxWidth, height: maxHeight };
    }

    if (width && !height) {
      height = (naturalHeight * width) / naturalWidth;
    } else if (height && !width) {
      width = (naturalWidth * height) / naturalHeight;
    }

    // Ensure dimensions don't exceed limits
    if (width! > maxWidth) {
      const ratio = maxWidth / width!;
      width = maxWidth;
      height = height! * ratio;
    }

    if (height! > maxHeight) {
      const ratio = maxHeight / height!;
      height = maxHeight;
      width = width! * ratio;
    }

    return { width: Math.round(width!), height: Math.round(height!) };
  }

  /**
   * Apply image transformations
   */
  private applyImageTransformations(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    options: ImageTransformOptions,
    width: number,
    height: number
  ): void {
    // Apply filters
    let filter = '';
    
    if (options.blur) {
      filter += `blur(${options.blur}px) `;
    }
    
    if (options.grayscale) {
      filter += 'grayscale(100%) ';
    }
    
    if (options.sharpen) {
      filter += 'contrast(110%) brightness(110%) ';
    }

    if (filter) {
      ctx.filter = filter.trim();
    }

    // Draw image with fit options
    const { sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight } = 
      this.calculateDrawParameters(img, width, height, options.fit || 'cover');

    ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
  }

  /**
   * Calculate draw parameters for different fit modes
   */
  private calculateDrawParameters(
    img: HTMLImageElement,
    canvasWidth: number,
    canvasHeight: number,
    fit: string
  ) {
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = canvasWidth / canvasHeight;

    let sx = 0, sy = 0, sWidth = img.naturalWidth, sHeight = img.naturalHeight;
    let dx = 0, dy = 0, dWidth = canvasWidth, dHeight = canvasHeight;

    switch (fit) {
      case 'cover':
        if (imgRatio > canvasRatio) {
          sWidth = img.naturalHeight * canvasRatio;
          sx = (img.naturalWidth - sWidth) / 2;
        } else {
          sHeight = img.naturalWidth / canvasRatio;
          sy = (img.naturalHeight - sHeight) / 2;
        }
        break;

      case 'contain':
        if (imgRatio > canvasRatio) {
          dHeight = canvasWidth / imgRatio;
          dy = (canvasHeight - dHeight) / 2;
        } else {
          dWidth = canvasHeight * imgRatio;
          dx = (canvasWidth - dWidth) / 2;
        }
        break;

      case 'fill':
        // Use default values (stretch to fill)
        break;
    }

    return { sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight };
  }

  /**
   * Generate optimized versions in different formats
   */
  private generateOptimizedVersions(
    canvas: HTMLCanvasElement,
    originalSrc: string,
    options: ImageTransformOptions
  ): OptimizedImageData {
    const quality = options.quality || this.config.quality;
    const format = options.format === 'auto' ? this.detectOptimalFormat() : options.format || 'webp';

    // Generate main image
    const src = canvas.toDataURL(`image/${format}`, quality / 100);

    // Generate srcSet for responsive images
    const srcSet = this.generateSrcSet(canvas, format, quality);

    // Generate sizes attribute
    const sizes = this.generateSizesAttribute();

    // Generate blur placeholder if enabled
    const placeholder = this.config.enableBlurPlaceholder 
      ? this.generateBlurPlaceholder(canvas)
      : undefined;

    return {
      src,
      srcSet,
      sizes,
      placeholder,
      width: canvas.width,
      height: canvas.height,
      format,
      size: this.estimateFileSize(canvas, format, quality),
    };
  }

  /**
   * Generate srcSet for responsive images
   */
  private generateSrcSet(canvas: HTMLCanvasElement, format: string, quality: number): string {
    const srcSetEntries: string[] = [];

    for (const size of this.config.sizes) {
      if (size <= canvas.width) {
        const ratio = size / canvas.width;
        const scaledCanvas = this.scaleCanvas(canvas, ratio);
        const scaledSrc = scaledCanvas.toDataURL(`image/${format}`, quality / 100);
        srcSetEntries.push(`${scaledSrc} ${size}w`);
      }
    }

    return srcSetEntries.join(', ');
  }

  /**
   * Scale canvas to different size
   */
  private scaleCanvas(canvas: HTMLCanvasElement, ratio: number): HTMLCanvasElement {
    const scaledCanvas = document.createElement('canvas');
    const scaledCtx = scaledCanvas.getContext('2d');

    scaledCanvas.width = canvas.width * ratio;
    scaledCanvas.height = canvas.height * ratio;

    if (scaledCtx) {
      scaledCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
    }

    return scaledCanvas;
  }

  /**
   * Generate sizes attribute for responsive images
   */
  private generateSizesAttribute(): string {
    return [
      '(max-width: 320px) 320px',
      '(max-width: 640px) 640px',
      '(max-width: 768px) 768px',
      '(max-width: 1024px) 1024px',
      '(max-width: 1280px) 1280px',
      '1920px'
    ].join(', ');
  }

  /**
   * Generate blur placeholder
   */
  private generateBlurPlaceholder(canvas: HTMLCanvasElement): string {
    const placeholderCanvas = document.createElement('canvas');
    const placeholderCtx = placeholderCanvas.getContext('2d');

    placeholderCanvas.width = 20;
    placeholderCanvas.height = (canvas.height / canvas.width) * 20;

    if (placeholderCtx) {
      placeholderCtx.filter = 'blur(2px)';
      placeholderCtx.drawImage(canvas, 0, 0, placeholderCanvas.width, placeholderCanvas.height);
    }

    return placeholderCanvas.toDataURL('image/jpeg', 0.1);
  }

  /**
   * Detect optimal format based on browser support
   */
  private detectOptimalFormat(): string {
    if (this.supportsFormat('avif')) return 'avif';
    if (this.supportsFormat('webp')) return 'webp';
    return 'jpeg';
  }

  /**
   * Check if browser supports image format
   */
  private supportsFormat(format: string): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    try {
      const dataUrl = canvas.toDataURL(`image/${format}`);
      return dataUrl.startsWith(`data:image/${format}`);
    } catch {
      return false;
    }
  }

  /**
   * Estimate file size
   */
  private estimateFileSize(canvas: HTMLCanvasElement, format: string, quality: number): number {
    const pixels = canvas.width * canvas.height;
    const baseSize = pixels * 3; // RGB

    const compressionRatio = format === 'jpeg' ? quality / 100 : 0.8;
    return Math.round(baseSize * compressionRatio);
  }

  /**
   * Load image with lazy loading
   */
  private loadImage(img: HTMLImageElement): void {
    const dataSrc = img.dataset.src;
    const dataSrcSet = img.dataset.srcset;

    if (dataSrc) {
      img.src = dataSrc;
      img.removeAttribute('data-src');
    }

    if (dataSrcSet) {
      img.srcset = dataSrcSet;
      img.removeAttribute('data-srcset');
    }

    img.classList.remove('lazy');
    img.classList.add('loaded');
  }

  /**
   * Setup lazy loading for image element
   */
  setupLazyLoading(img: HTMLImageElement): void {
    if (!this.config.enableLazyLoading || !this.intersectionObserver) {
      return;
    }

    img.classList.add('lazy');
    this.intersectionObserver.observe(img);
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(src: string, options: ImageTransformOptions): string {
    return `${src}_${JSON.stringify(options)}`;
  }

  /**
   * Create fallback image data
   */
  private createFallbackImageData(src: string): OptimizedImageData {
    return {
      src,
      srcSet: '',
      sizes: '',
      width: 0,
      height: 0,
      format: 'jpeg',
      size: 0,
    };
  }

  /**
   * Preload critical images
   */
  preloadImages(urls: string[]): Promise<void[]> {
    return Promise.all(
      urls.map(url => 
        new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => reject(new Error(`Failed to preload ${url}`));
          img.src = url;
        })
      )
    );
  }

  /**
   * Clear image cache
   */
  clearCache(): void {
    this.imageCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: number } {
    const entries = this.imageCache.size;
    const size = Array.from(this.imageCache.values())
      .reduce((total, data) => total + data.size, 0);

    return { size, entries };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ImageOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Export singleton instance
export const imageOptimizer = new ImageOptimizer();

// Export utility functions
export const optimizeImage = (src: string, options?: ImageTransformOptions) => 
  imageOptimizer.optimizeImage(src, options);

export const setupLazyLoading = (img: HTMLImageElement) => 
  imageOptimizer.setupLazyLoading(img);

export const preloadImages = (urls: string[]) => 
  imageOptimizer.preloadImages(urls);
