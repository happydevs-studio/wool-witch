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

  const { imageData, fileName, width, height } = e.data;

  try {
    // Create OffscreenCanvas for compression
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Draw image data to canvas
    ctx.putImageData(imageData, 0, 0);

    // Compress with quality adjustment
    const result = await compressWithQuality(canvas, fileName, 0.9);
    
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
    type: 'image/jpeg',
    quality,
  });

  // If still too large and quality can be reduced, try again
  if (blob.size > MAX_SIZE_BYTES && quality > 0.1 && iteration < maxIterations) {
    return compressWithQuality(canvas, fileName, quality - 0.1, iteration + 1);
  }

  // If we've reduced quality to minimum and still too large, resize dimensions
  if (blob.size > MAX_SIZE_BYTES && iteration < maxIterations) {
    const newWidth = Math.floor(canvas.width * 0.8);
    const newHeight = Math.floor(canvas.height * 0.8);

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
    return compressWithQuality(tempCanvas, fileName, 0.9, iteration + 1);
  }

  // Final progress
  self.postMessage({
    type: 'progress',
    progress: 100,
  } as CompressionResult);

  return { blob, fileName };
}
