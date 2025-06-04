import React, { useState, useEffect, useRef, memo, forwardRef } from 'react';
import { imageOptimizer, type ImageTransformOptions, type OptimizedImageData } from '../../lib/image-optimization';

export interface OptimizedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'sizes'> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png' | 'auto';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  blur?: number;
  sharpen?: boolean;
  grayscale?: boolean;
  lazy?: boolean;
  progressive?: boolean;
  placeholder?: string | 'blur' | 'color';
  placeholderColor?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  className?: string;
  style?: React.CSSProperties;
}

const OptimizedImage = memo(forwardRef<HTMLImageElement, OptimizedImageProps>(({
  src,
  alt,
  width,
  height,
  quality = 85,
  format = 'auto',
  fit = 'cover',
  position = 'center',
  blur,
  sharpen,
  grayscale,
  lazy = true,
  progressive = true,
  placeholder = 'blur',
  placeholderColor = '#f3f4f6',
  priority = false,
  onLoad,
  onError,
  className = '',
  style,
  ...props
}, ref) => {
  const [optimizedData, setOptimizedData] = useState<OptimizedImageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isInView, setIsInView] = useState(!lazy || priority);

  // Combine refs
  const combinedRef = (node: HTMLImageElement) => {
    imgRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  };

  // Optimize image when src or options change
  useEffect(() => {
    if (!src || (!isInView && lazy && !priority)) return;

    const optimizeImageAsync = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const options: ImageTransformOptions = {
          width,
          height,
          quality,
          format,
          fit,
          position,
          blur,
          sharpen,
          grayscale,
        };

        const data = await imageOptimizer.optimizeImage(src, options);
        setOptimizedData(data);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Image optimization failed');
        setError(error);
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    };

    optimizeImageAsync();
  }, [src, width, height, quality, format, fit, position, blur, sharpen, grayscale, isInView, lazy, priority, onError]);

  // Setup intersection observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [lazy, priority, isInView]);

  // Handle image load
  const handleLoad = () => {
    setIsLoaded(true);
    setIsLoading(false);
    onLoad?.();
  };

  // Handle image error
  const handleError = () => {
    const error = new Error(`Failed to load image: ${src}`);
    setError(error);
    setIsLoading(false);
    onError?.(error);
  };

  // Generate placeholder styles
  const getPlaceholderStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      backgroundColor: placeholderColor,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: width || '100%',
      height: height || 'auto',
      minHeight: height ? `${height}px` : '200px',
    };

    if (placeholder === 'blur' && optimizedData?.placeholder) {
      return {
        ...baseStyles,
        backgroundImage: `url(${optimizedData.placeholder})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'blur(10px)',
        transform: 'scale(1.1)',
      };
    }

    return baseStyles;
  };

  // Generate image styles
  const getImageStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      transition: progressive ? 'opacity 0.3s ease-in-out' : undefined,
      opacity: isLoaded ? 1 : 0,
      width: width || '100%',
      height: height || 'auto',
      objectFit: fit as any,
      objectPosition: position,
      ...style,
    };

    return baseStyles;
  };

  // Generate container styles
  const getContainerStyles = (): React.CSSProperties => {
    return {
      position: 'relative',
      overflow: 'hidden',
      width: width || '100%',
      height: height || 'auto',
    };
  };

  // Render loading placeholder
  const renderPlaceholder = () => {
    if (placeholder === 'color' || !optimizedData?.placeholder) {
      return (
        <div
          style={getPlaceholderStyles()}
          className={`${className} animate-pulse`}
        >
          <svg
            className="w-8 h-8 text-gray-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      );
    }

    return (
      <div
        style={getPlaceholderStyles()}
        className={className}
      />
    );
  };

  // Render error state
  const renderError = () => (
    <div
      style={getPlaceholderStyles()}
      className={`${className} bg-red-50 text-red-500`}
    >
      <svg
        className="w-8 h-8"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );

  // Don't render anything if not in view and lazy loading
  if (lazy && !priority && !isInView) {
    return <div ref={combinedRef} style={getContainerStyles()} className={className} />;
  }

  // Render error state
  if (error) {
    return renderError();
  }

  // Render loading state
  if (isLoading || !optimizedData) {
    return renderPlaceholder();
  }

  return (
    <div style={getContainerStyles()}>
      {/* Placeholder background */}
      {!isLoaded && progressive && renderPlaceholder()}
      
      {/* Optimized image */}
      <img
        ref={combinedRef}
        src={optimizedData.src}
        srcSet={optimizedData.srcSet}
        sizes={optimizedData.sizes}
        alt={alt}
        style={getImageStyles()}
        className={`${className} ${isLoaded ? 'loaded' : 'loading'}`}
        onLoad={handleLoad}
        onError={handleError}
        loading={lazy && !priority ? 'lazy' : 'eager'}
        decoding="async"
        {...props}
      />
    </div>
  );
}));

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;

// Higher-order component for image optimization
export const withImageOptimization = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const WrappedComponent = (props: P) => {
    useEffect(() => {
      // Preload critical images
      const criticalImages = document.querySelectorAll('img[data-priority="true"]');
      const urls = Array.from(criticalImages).map(img => (img as HTMLImageElement).src);
      
      if (urls.length > 0) {
        imageOptimizer.preloadImages(urls).catch(console.error);
      }
    }, []);

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withImageOptimization(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Hook for image optimization
export const useImageOptimization = () => {
  const [stats, setStats] = useState({ size: 0, entries: 0 });

  useEffect(() => {
    const updateStats = () => {
      setStats(imageOptimizer.getCacheStats());
    };

    updateStats();
    const interval = setInterval(updateStats, 5000);

    return () => clearInterval(interval);
  }, []);

  const clearCache = () => {
    imageOptimizer.clearCache();
    setStats({ size: 0, entries: 0 });
  };

  const preloadImages = (urls: string[]) => {
    return imageOptimizer.preloadImages(urls);
  };

  return {
    stats,
    clearCache,
    preloadImages,
  };
};

// Avatar component with optimization
export const OptimizedAvatar: React.FC<{
  src?: string;
  alt: string;
  size?: number;
  className?: string;
  fallback?: string;
}> = ({ src, alt, size = 40, className = '', fallback }) => {
  if (!src) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-300 text-gray-600 rounded-full ${className}`}
        style={{ width: size, height: size }}
      >
        {fallback || alt.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      fit="cover"
      className={`rounded-full ${className}`}
      placeholder="color"
      placeholderColor="#e5e7eb"
    />
  );
};

// Logo component with optimization
export const OptimizedLogo: React.FC<{
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}> = ({ src, alt, width = 120, height = 40, className = '' }) => {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      fit="contain"
      priority
      className={className}
      placeholder="color"
      placeholderColor="transparent"
    />
  );
};

// Hero image component with optimization
export const OptimizedHeroImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
}> = ({ src, alt, className = '' }) => {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={1920}
      height={1080}
      fit="cover"
      priority
      quality={90}
      className={className}
      placeholder="blur"
    />
  );
};
