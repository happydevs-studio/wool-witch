/**
 * Image compression utility
 * Compresses images to under 50KB while maintaining reasonable quality
 * Uses Web Worker to keep UI responsive during compression
 * Preserves transparency for PNG images and original format for web-optimized formats
 */

const MAX_SIZE_KB = 50;
const MAX_SIZE_BYTES = MAX_SIZE_KB * 1024;

// Type for progress callback
export type CompressionProgressCallback = (progress: number) => void;

/**
 * Detects if an image has transparency by checking alpha channel
 */
function hasTransparency(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;
  
  try {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Check alpha channel (every 4th byte starting from index 3)
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) {
        return true; // Found a pixel with transparency
      }
    }
    return false;
  } catch {
    // If we can't read the image data (e.g., tainted canvas), assume no transparency
    return false;
  }
}

/**
 * Determines the best output format for the image
 */
function getBestOutputFormat(file: File, canvas: HTMLCanvasElement): { mimeType: string; extension: string } {
  const originalType = file.type.toLowerCase();
  
  // WebP is already well-optimized, preserve it
  if (originalType === 'image/webp') {
    return { mimeType: 'image/webp', extension: '.webp' };
  }
  
  // Check for transparency - if present, must use PNG
  if (hasTransparency(canvas)) {
    return { mimeType: 'image/png', extension: '.png' };
  }
  
  // For images without transparency, use JPEG for better compression
  return { mimeType: 'image/jpeg', extension: '.jpg' };
}

/**
 * Compress image using Web Worker for better performance
 * Falls back to main thread compression if Web Workers are not supported
 */
export async function compressImage(
  file: File,
  onProgress?: CompressionProgressCallback
): Promise<File> {
  // If already under limit, return as-is
  if (file.size <= MAX_SIZE_BYTES) {
    // Call progress callback to maintain consistent behavior
    onProgress?.(100);
    return file;
  }

  // Check if Web Workers are supported
  if (typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined') {
    try {
      return await compressWithWorker(file, onProgress);
    } catch (error) {
      console.warn('Web Worker compression failed, falling back to main thread:', error);
      // Fall back to main thread compression
      return await compressOnMainThread(file, onProgress);
    }
  }

  // Fall back to main thread compression
  return await compressOnMainThread(file, onProgress);
}

/**
 * Compress image using Web Worker
 */
async function compressWithWorker(
  file: File,
  onProgress?: CompressionProgressCallback
): Promise<File> {
  return new Promise((resolve, reject) => {
    // Create Web Worker
    const worker = new Worker(
      new URL('./imageCompression.worker.ts', import.meta.url),
      { type: 'module' }
    );

    // Load image to get ImageData
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onerror = () => {
      worker.terminate();
      reject(new Error('Failed to read file'));
    };

    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;

      img.onload = () => {
        // Create canvas to get ImageData
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // For very large files, pre-scale dimensions aggressively
        const estimatedRawSize = width * height * 3;
        const estimatedCompressedSize = estimatedRawSize / 10;
        
        if (estimatedCompressedSize > MAX_SIZE_BYTES) {
          const scaleFactor = Math.sqrt(MAX_SIZE_BYTES / estimatedCompressedSize);
          width = Math.floor(width * scaleFactor);
          height = Math.floor(height * scaleFactor);
          console.log(`Pre-scaling large image from ${img.width}x${img.height} to ${width}x${height}`);
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          worker.terminate();
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Determine best output format based on image characteristics
        const outputFormat = getBestOutputFormat(file, canvas);

        // Set up worker message handler
        worker.onmessage = (e: MessageEvent) => {
          const { type, blob, fileName, error, progress } = e.data;

          if (type === 'progress' && onProgress) {
            onProgress(progress);
          } else if (type === 'success' && blob) {
            worker.terminate();
            const compressedFile = new File([blob], fileName || file.name, {
              type: outputFormat.mimeType,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else if (type === 'error') {
            worker.terminate();
            reject(new Error(error || 'Compression failed'));
          }
        };

        worker.onerror = (error) => {
          worker.terminate();
          reject(new Error(`Worker error: ${error.message}`));
        };

        // Send data to worker
        worker.postMessage({
          type: 'compress',
          imageData,
          fileName: file.name,
          fileType: file.type,
          outputFormat,
          width: canvas.width,
          height: canvas.height,
        });
      };

      img.onerror = () => {
        worker.terminate();
        reject(new Error('Failed to load image'));
      };
    };
  });
}

/**
 * Compress image on main thread (fallback)
 */
async function compressOnMainThread(
  file: File,
  onProgress?: CompressionProgressCallback
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onerror = reject;

    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // For very large files, pre-scale dimensions aggressively
        // Estimate: JPEG at quality 0.7 is roughly 1/10th of raw pixels
        // Target: dimensions that would yield ~50KB at quality 0.7
        const estimatedRawSize = width * height * 3; // 3 bytes per pixel (RGB)
        const estimatedCompressedSize = estimatedRawSize / 10; // rough JPEG compression estimate
        
        if (estimatedCompressedSize > MAX_SIZE_BYTES) {
          // Scale down dimensions to hit target size
          const scaleFactor = Math.sqrt(MAX_SIZE_BYTES / estimatedCompressedSize);
          width = Math.floor(width * scaleFactor);
          height = Math.floor(height * scaleFactor);
          console.log(`Pre-scaling large image from ${img.width}x${img.height} to ${width}x${height}`);
        }
        
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        
        // Determine best output format based on image characteristics
        const outputFormat = getBestOutputFormat(file, canvas);
        
        // Try different quality levels until we get under the size limit
        compressWithQuality(canvas, file.name, outputFormat, 0.9, resolve, reject, onProgress);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
    };
  });
}

function compressWithQuality(
  canvas: HTMLCanvasElement,
  fileName: string,
  outputFormat: { mimeType: string; extension: string },
  quality: number,
  resolve: (file: File) => void,
  reject: (error: Error) => void,
  onProgress?: CompressionProgressCallback,
  iteration: number = 0
) {
  const maxIterations = 10;
  
  // Report progress
  if (onProgress) {
    onProgress(Math.min((iteration / maxIterations) * 100, 90));
  }

  // All formats support quality parameters for compression level control
  // PNG quality parameter may have less impact, so we use larger steps for faster convergence
  canvas.toBlob(
    (blob) => {
      if (!blob) {
        reject(new Error('Failed to compress image'));
        return;
      }

      // If still too large and quality can be reduced, try again
      // For PNG, this may not help much, so we'll move to dimension reduction faster
      const qualityStep = outputFormat.mimeType === 'image/png' ? 0.2 : 0.1;
      if (blob.size > MAX_SIZE_BYTES && quality > 0.1 && iteration < maxIterations) {
        compressWithQuality(canvas, fileName, outputFormat, quality - qualityStep, resolve, reject, onProgress, iteration + 1);
        return;
      }

      // If we've reduced quality to minimum and still too large, resize dimensions
      if (blob.size > MAX_SIZE_BYTES && iteration < maxIterations) {
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Calculate how much to reduce dimensions based on size ratio
        // If still way over limit, be more aggressive
        const sizeRatio = blob.size / MAX_SIZE_BYTES;
        let scaleFactor: number;
        
        if (sizeRatio > 4) {
          // Very oversized - reduce by 50%
          scaleFactor = 0.5;
        } else if (sizeRatio > 2) {
          // Moderately oversized - reduce by 30%
          scaleFactor = 0.7;
        } else {
          // Slightly oversized - reduce by 20%
          scaleFactor = 0.8;
        }
        
        const newWidth = Math.floor(canvas.width * scaleFactor);
        const newHeight = Math.floor(canvas.height * scaleFactor);

        // Create temporary canvas to resize
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = newWidth;
        tempCanvas.height = newHeight;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) {
          reject(new Error('Failed to get temp canvas context'));
          return;
        }

        tempCtx.drawImage(canvas, 0, 0, newWidth, newHeight);

        // Update main canvas
        canvas.width = newWidth;
        canvas.height = newHeight;
        ctx.drawImage(tempCanvas, 0, 0);

        // Try compression again with reset quality
        compressWithQuality(canvas, fileName, outputFormat, 0.9, resolve, reject, onProgress, iteration + 1);
        return;
      }

      // Final progress
      if (onProgress) {
        onProgress(100);
      }

      // Success! Convert blob to File with appropriate type and filename
      const newFileName = updateFileExtension(fileName, outputFormat.extension);
      const compressedFile = new File([blob], newFileName, {
        type: outputFormat.mimeType,
        lastModified: Date.now(),
      });

      resolve(compressedFile);
    },
    outputFormat.mimeType,
    quality
  );
}

/**
 * Updates the file extension to match the output format
 */
function updateFileExtension(fileName: string, newExtension: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return fileName + newExtension;
  }
  return fileName.substring(0, lastDotIndex) + newExtension;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
