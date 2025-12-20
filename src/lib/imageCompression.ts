/**
 * Image compression utility
 * Compresses images to under 50KB while maintaining reasonable quality
 * Uses Web Worker to keep UI responsive during compression
 */

const MAX_SIZE_KB = 50;
const MAX_SIZE_BYTES = MAX_SIZE_KB * 1024;

// Type for progress callback
export type CompressionProgressCallback = (progress: number) => void;

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
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          worker.terminate();
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Set up worker message handler
        worker.onmessage = (e: MessageEvent) => {
          const { type, blob, fileName, error, progress } = e.data;

          if (type === 'progress' && onProgress) {
            onProgress(progress);
          } else if (type === 'success' && blob) {
            worker.terminate();
            const compressedFile = new File([blob], fileName || file.name, {
              type: 'image/jpeg',
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

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Try different quality levels until we get under the size limit
        compressWithQuality(canvas, file.name, 0.9, resolve, reject, onProgress);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
    };
  });
}

function compressWithQuality(
  canvas: HTMLCanvasElement,
  fileName: string,
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

  canvas.toBlob(
    (blob) => {
      if (!blob) {
        reject(new Error('Failed to compress image'));
        return;
      }

      // If still too large and quality can be reduced, try again
      if (blob.size > MAX_SIZE_BYTES && quality > 0.1 && iteration < maxIterations) {
        compressWithQuality(canvas, fileName, quality - 0.1, resolve, reject, onProgress, iteration + 1);
        return;
      }

      // If we've reduced quality to minimum and still too large, resize dimensions
      if (blob.size > MAX_SIZE_BYTES && iteration < maxIterations) {
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Reduce dimensions by 20%
        const newWidth = Math.floor(canvas.width * 0.8);
        const newHeight = Math.floor(canvas.height * 0.8);

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
        compressWithQuality(canvas, fileName, 0.9, resolve, reject, onProgress, iteration + 1);
        return;
      }

      // Final progress
      if (onProgress) {
        onProgress(100);
      }

      // Success! Convert blob to File
      const compressedFile = new File([blob], fileName, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      resolve(compressedFile);
    },
    'image/jpeg',
    quality
  );
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
