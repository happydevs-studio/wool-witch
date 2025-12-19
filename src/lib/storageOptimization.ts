/**
 * Storage optimization utilities for Supabase
 * Implements CDN-like optimizations and image transformations
 */

import { supabase } from './supabase';

interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  fit?: 'cover' | 'contain' | 'fill';
}



/**
 * Enhanced storage service with optimization features
 */
export class OptimizedStorageService {
  private bucketName = 'product-images';
  
  /**
   * Upload image with optimization
   */
  async uploadOptimizedImage(
    file: File, 
    path: string,
    options: {
      quality?: number;
      maxWidth?: number;
      maxHeight?: number;
    } = {}
  ): Promise<{ path: string; publicUrl: string } | null> {
    try {
      const { quality = 85, maxWidth = 1200, maxHeight = 1200 } = options;
      
      // Compress and resize image before upload
      const optimizedFile = await this.optimizeImageFile(file, {
        maxWidth,
        maxHeight,
        quality
      });

      // Upload with optimized cache headers
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(path, optimizedFile, {
          cacheControl: '31536000', // 1 year cache
          upsert: false,
          contentType: this.getOptimalContentType(file.type)
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(path);

      return {
        path: data.path,
        publicUrl: urlData.publicUrl
      };
    } catch (error) {
      console.error('Failed to upload optimized image:', error);
      return null;
    }
  }

  /**
   * Generate optimized image URL with transformations
   */
  getOptimizedImageUrl(
    originalUrl: string,
    transforms: ImageTransformOptions = {}
  ): string {
    try {
      // For local development, skip transformations as imgproxy is not enabled by default
      const isLocal = originalUrl.includes('localhost') || originalUrl.includes('127.0.0.1');
      
      if (isLocal) {
        return originalUrl;
      }

      const url = new URL(originalUrl);
      const params = new URLSearchParams();

      // Add transformation parameters (only for production)
      if (transforms.width) {
        params.set('width', transforms.width.toString());
      }
      if (transforms.height) {
        params.set('height', transforms.height.toString());
      }
      if (transforms.quality) {
        params.set('quality', transforms.quality.toString());
      }
      if (transforms.format) {
        params.set('format', transforms.format);
      }
      if (transforms.fit) {
        params.set('resize', transforms.fit);
      }

      // Add cache-busting and optimization headers via query params
      params.set('t', Math.floor(Date.now() / (1000 * 60 * 60)).toString()); // Cache per hour

      if (params.toString()) {
        url.search = params.toString();
      }

      return url.toString();
    } catch {
      return originalUrl;
    }
  }

  /**
   * Generate responsive image URLs for srcSet
   */
  generateResponsiveUrls(
    originalUrl: string,
    widths: number[] = [320, 480, 640, 768, 1024, 1280, 1600],
    format: 'webp' | 'jpeg' = 'webp'
  ): Array<{ url: string; width: number }> {
    return widths.map(width => ({
      url: this.getOptimizedImageUrl(originalUrl, {
        width,
        format,
        quality: this.getQualityForWidth(width)
      }),
      width
    }));
  }

  /**
   * Optimize image file before upload
   */
  private async optimizeImageFile(
    file: File,
    options: {
      maxWidth: number;
      maxHeight: number;
      quality: number;
    }
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        try {
          // Calculate optimal dimensions
          const { width, height } = this.calculateOptimalSize(
            img.width,
            img.height,
            options.maxWidth,
            options.maxHeight
          );

          canvas.width = width;
          canvas.height = height;

          // Enable image smoothing for better quality
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const optimizedFile = new File([blob], file.name, {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                  });
                  resolve(optimizedFile);
                } else {
                  reject(new Error('Failed to optimize image'));
                }
              },
              'image/jpeg',
              options.quality / 100
            );
          } else {
            reject(new Error('Canvas context not available'));
          }
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for optimization'));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Calculate optimal image size maintaining aspect ratio
   */
  private calculateOptimalSize(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight;

    let width = originalWidth;
    let height = originalHeight;

    // Resize if too large
    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    return {
      width: Math.round(width),
      height: Math.round(height)
    };
  }

  /**
   * Get optimal content type for image format
   */
  private getOptimalContentType(originalType: string): string {
    // Prefer WebP for better compression
    if (this.supportsWebP()) {
      return 'image/webp';
    }
    
    // Fall back to JPEG for photos, PNG for graphics
    if (originalType.includes('png')) {
      return 'image/png';
    }
    
    return 'image/jpeg';
  }

  /**
   * Check if browser supports WebP
   */
  private supportsWebP(): boolean {
    const canvas = document.createElement('canvas');
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  /**
   * Get quality setting based on image width
   */
  private getQualityForWidth(width: number): number {
    if (width <= 480) return 75;      // Lower quality for small images
    if (width <= 768) return 80;      // Medium quality for tablet
    if (width <= 1024) return 85;     // Good quality for desktop
    return 90;                        // High quality for large displays
  }

  /**
   * Batch update storage policies for optimization
   */
  async optimizeStoragePolicies(): Promise<void> {
    try {
      // Note: This would typically be done via Supabase CLI or Dashboard
      console.log('Storage policies should be configured with:');
      console.log('- Public read access for product-images bucket');
      console.log('- Long cache control headers (1 year)');
      console.log('- Gzip compression enabled');
      console.log('- Image transformation support');
    } catch (error) {
      console.error('Failed to optimize storage policies:', error);
    }
  }
}

// Export singleton instance
export const optimizedStorage = new OptimizedStorageService();