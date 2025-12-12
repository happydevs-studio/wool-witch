import { useState, useRef, useEffect } from 'react';
import { optimizedStorage } from '../lib/storageOptimization';
import { networkOptimizer } from '../lib/cacheUtils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  placeholder?: 'blur' | 'empty' | string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Optimized image component that:
 * - Uses modern WebP format with JPEG fallback
 * - Implements lazy loading by default
 * - Supports responsive images with srcset
 * - Provides loading states and error handling
 * - Minimizes data usage and improves performance
 */
export function OptimizedImage({
  src,
  alt,
  className = '',
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  priority = false,
  placeholder = 'blur',
  onLoad,
  onError
}: OptimizedImageProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [fixedQuality] = useState(() => networkOptimizer.getOptimalQuality()); // Fix quality on mount
  const imageRef = useRef<HTMLImageElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || !imageRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before the image comes into view
      }
    );

    observer.observe(imageRef.current);

    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = () => {
    setImageLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setImageError(true);
    onError?.();
  };

  // Generate optimized image URLs using storage service
  const getOptimizedSrc = (originalSrc: string, width?: number) => {
    // Use fixed quality determined at component mount to prevent flicker
    return optimizedStorage.getOptimizedImageUrl(originalSrc, {
      width,
      quality: fixedQuality,
      format: 'webp'
    });
  };

  // Generate srcSet for responsive images using storage service
  const generateSrcSet = (originalSrc: string) => {
    const widths = [320, 480, 640, 768, 1024, 1280, 1600];
    const urls = optimizedStorage.generateResponsiveUrls(originalSrc, widths);
    return urls.map(({ url, width }) => `${url} ${width}w`).join(', ');
  };

  // Placeholder styles
  const placeholderStyles = {
    blur: 'bg-gradient-to-br from-gray-100 to-gray-200',
    empty: 'bg-gray-100',
  };

  const placeholderClass = typeof placeholder === 'string' && placeholderStyles[placeholder as keyof typeof placeholderStyles] 
    ? placeholderStyles[placeholder as keyof typeof placeholderStyles] 
    : 'bg-gray-100';

  return (
    <div className={`relative overflow-hidden ${className}`} ref={imageRef}>
      {/* Placeholder */}
      <div 
        className={`absolute inset-0 transition-opacity duration-300 ${
          imageLoaded ? 'opacity-0' : 'opacity-100'
        } ${placeholderClass}`}
      />
      
      {/* Error state */}
      {imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-2 text-gray-300">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-sm">Image unavailable</span>
          </div>
        </div>
      )}

      {/* Actual images - only load when in view */}
      {isInView && !imageError && (
        <picture>
          {/* WebP version for modern browsers */}
          <source
            srcSet={generateSrcSet(src)}
            sizes={sizes}
            type="image/webp"
          />
          
          {/* JPEG fallback for older browsers */}
          <img
            src={getOptimizedSrc(src)}
            srcSet={generateSrcSet(src)}
            sizes={sizes}
            alt={alt}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={handleLoad}
            onError={handleError}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
          />
        </picture>
      )}
    </div>
  );
}