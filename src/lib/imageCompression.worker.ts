/**
 * Web Worker for image compression
 * Performs image compression off the main thread to keep UI responsive
 */

const MAX_SIZE_KB = 50;
const MAX_SIZE_BYTES = MAX_SIZE_KB * 1024;

interface CompressionMessage {
  type: 'compress';
  imageData: ImageData;
  fileName: string;
  fileType: string;
  outputFormat: { mimeType: string; extension: string };
  width: number;
  height: number;
}

interface CompressionResult {
  type: 'success' | 'error' | 'progress';
  blob?: Blob;
  fileName?: string;
  error?: string;
  progress?: number;
}

self.onmessage = async (e: MessageEvent<CompressionMessage>) => {
  // Validate message type
  if (!e.data || e.data.type !== 'compress') {
    self.postMessage({
      type: 'error',
      error: 'Invalid message type',
    } as CompressionResult);
    return;
  }

  const { imageData, fileName, outputFormat, width, height } = e.data;

  try {
    // Create OffscreenCanvas for compression
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Draw image data to canvas
    ctx.putImageData(imageData, 0, 0);

    // Compress with quality adjustment using the determined format
    const result = await compressWithQuality(canvas, fileName, outputFormat, 0.9);
    
    self.postMessage({
      type: 'success',
      blob: result.blob,
      fileName: result.fileName,
    } as CompressionResult);
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    } as CompressionResult);
  }
};

async function compressWithQuality(
  canvas: OffscreenCanvas,
  fileName: string,
  outputFormat: { mimeType: string; extension: string },
  quality: number,
  iteration: number = 0
): Promise<{ blob: Blob; fileName: string }> {
  const maxIterations = 10;
  
  // Report progress
  self.postMessage({
    type: 'progress',
    progress: Math.min((iteration / maxIterations) * 100, 90),
  } as CompressionResult);

  const blob = await canvas.convertToBlob({
    type: outputFormat.mimeType,
    quality,
  });

  // If still too large and quality can be reduced, try again
  // For PNG, this may not help much, so we use larger steps for faster convergence
  const qualityStep = outputFormat.mimeType === 'image/png' ? 0.2 : 0.1;
  if (blob.size > MAX_SIZE_BYTES && quality > 0.1 && iteration < maxIterations) {
    return compressWithQuality(canvas, fileName, outputFormat, quality - qualityStep, iteration + 1);
  }

  // If we've reduced quality to minimum and still too large, resize dimensions
  if (blob.size > MAX_SIZE_BYTES && iteration < maxIterations) {
    // Calculate how much to reduce dimensions based on size ratio
    const sizeRatio = blob.size / MAX_SIZE_BYTES;
    let scaleFactor: number;
    
    if (sizeRatio > 4) {
      scaleFactor = 0.5; // Very oversized - reduce by 50%
    } else if (sizeRatio > 2) {
      scaleFactor = 0.7; // Moderately oversized - reduce by 30%
    } else {
      scaleFactor = 0.8; // Slightly oversized - reduce by 20%
    }
    
    const newWidth = Math.floor(canvas.width * scaleFactor);
    const newHeight = Math.floor(canvas.height * scaleFactor);

    // Create new canvas with reduced dimensions
    const tempCanvas = new OffscreenCanvas(newWidth, newHeight);
    const tempCtx = tempCanvas.getContext('2d');
    
    if (!tempCtx) {
      throw new Error('Failed to get temp canvas context');
    }

    // Create an ImageBitmap directly from the current canvas
    const img = await createImageBitmap(canvas, 0, 0, canvas.width, canvas.height);
    
    // Draw resized image
    tempCtx.drawImage(img, 0, 0, newWidth, newHeight);

    // Try compression again with reset quality
    return compressWithQuality(tempCanvas, fileName, outputFormat, 0.9, iteration + 1);
  }

  // Final progress
  self.postMessage({
    type: 'progress',
    progress: 100,
  } as CompressionResult);

  // Update filename with correct extension
  const newFileName = updateFileExtension(fileName, outputFormat.extension);
  return { blob, fileName: newFileName };
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
