/**
 * Image compression utility
 * Compresses images to under 50KB while maintaining reasonable quality
 */

const MAX_SIZE_KB = 50;
const MAX_SIZE_BYTES = MAX_SIZE_KB * 1024;

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
        
        // Try different quality levels until we get under the size limit
        compressWithQuality(canvas, file.name, 0.9, resolve, reject);
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
  reject: (error: Error) => void
) {
  canvas.toBlob(
    (blob) => {
      if (!blob) {
        reject(new Error('Failed to compress image'));
        return;
      }
      
      // If still too large and quality can be reduced, try again
      if (blob.size > MAX_SIZE_BYTES && quality > 0.1) {
        compressWithQuality(canvas, fileName, quality - 0.1, resolve, reject);
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
        compressWithQuality(canvas, fileName, 0.9, resolve, reject);
        return;
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
