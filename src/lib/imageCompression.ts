/**
 * Image compression utility
 * Compresses images to under 50KB while maintaining reasonable quality
 * Preserves transparency for PNG images and original format for web-optimized formats
 */

const MAX_SIZE_KB = 50;
const MAX_SIZE_BYTES = MAX_SIZE_KB * 1024;

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
  
  // For GIF without transparency, convert to JPEG for better compression
  // For other formats without transparency, use JPEG for better compression
  return { mimeType: 'image/jpeg', extension: '.jpg' };
}

export async function compressImage(file: File): Promise<File> {
  // If already under limit, return as-is
  if (file.size <= MAX_SIZE_BYTES) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onerror = reject;
    
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const width = img.width;
        const height = img.height;
        
        // Calculate scaling factor to reduce file size
        // Start with original dimensions and reduce quality
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
        compressWithQuality(canvas, file.name, outputFormat, 0.9, resolve, reject);
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
  reject: (error: Error) => void
) {
  // PNG doesn't support quality parameter in most browsers, but we'll pass it anyway
  // For PNG, quality parameter may be ignored, so we rely more on dimension reduction
  canvas.toBlob(
    (blob) => {
      if (!blob) {
        reject(new Error('Failed to compress image'));
        return;
      }
      
      // If still too large and quality can be reduced, try again
      // For PNG, this may not help much, so we'll move to dimension reduction faster
      const qualityStep = outputFormat.mimeType === 'image/png' ? 0.2 : 0.1;
      if (blob.size > MAX_SIZE_BYTES && quality > 0.1) {
        compressWithQuality(canvas, fileName, outputFormat, quality - qualityStep, resolve, reject);
        return;
      }
      
      // If we've reduced quality to minimum and still too large, resize dimensions
      if (blob.size > MAX_SIZE_BYTES) {
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
        compressWithQuality(canvas, fileName, outputFormat, 0.9, resolve, reject);
        return;
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
