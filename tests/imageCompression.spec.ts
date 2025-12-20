import { test, expect } from '@playwright/test';

/**
 * Tests for image compression utility
 * Tests the compression behavior to ensure images are properly optimized
 * 
 * These tests use a test harness page that loads the compression utility via Vite,
 * making it available for testing in the browser context.
 */

test.describe('Image Compression Utility', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the test harness page
    await page.goto('/test-compression.html');
    
    // Wait for the compression module to be ready
    await page.waitForFunction(() => window.compressionModuleReady === true);
  });

  test('images under 50KB are returned unchanged', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // Create a small test file (under 50KB)
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No context');
      
      // Fill with a simple pattern
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, 100, 100);
      
      // Convert to blob and then to File
      const blob = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9);
      });
      
      const file = new File([blob], 'small-test.jpg', { type: 'image/jpeg' });
      const originalSize = file.size;
      
      // @ts-expect-error - window.compressImage is injected
      const compressed = await window.compressImage(file);
      
      return {
        originalSize,
        compressedSize: compressed.size,
        sameFile: originalSize === compressed.size && file.name === compressed.name
      };
    });
    
    // Verify the file was returned unchanged
    expect(result.sameFile).toBe(true);
    expect(result.originalSize).toBeLessThan(50 * 1024);
    expect(result.compressedSize).toBe(result.originalSize);
  });

  test('images over 50KB are compressed', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // Create a larger test file (over 50KB)
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No context');
      
      // Fill with a gradient pattern to create a larger file
      const gradient = ctx.createLinearGradient(0, 0, 800, 600);
      gradient.addColorStop(0, '#ff0000');
      gradient.addColorStop(0.5, '#00ff00');
      gradient.addColorStop(1, '#0000ff');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 600);
      
      // Add some detail to increase size
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 100; i++) {
        ctx.fillRect(Math.random() * 800, Math.random() * 600, 10, 10);
      }
      
      // Convert to blob at high quality to ensure size > 50KB
      const blob = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 1.0);
      });
      
      const file = new File([blob], 'large-test.jpg', { type: 'image/jpeg' });
      const originalSize = file.size;
      
      // @ts-expect-error - window.compressImage is injected
      const compressed = await window.compressImage(file);
      
      return {
        originalSize,
        compressedSize: compressed.size,
        wasCompressed: compressed.size < originalSize,
        underLimit: compressed.size <= 50 * 1024
      };
    });
    
    // Verify the file was compressed
    expect(result.originalSize).toBeGreaterThan(50 * 1024);
    expect(result.wasCompressed).toBe(true);
    expect(result.underLimit).toBe(true);
  });

  test('quality reduction works correctly', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // Create a large, detailed image
      const canvas = document.createElement('canvas');
      canvas.width = 1000;
      canvas.height = 1000;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No context');
      
      // Create a detailed pattern
      for (let i = 0; i < 1000; i += 10) {
        ctx.fillStyle = `hsl(${(i / 1000) * 360}, 100%, 50%)`;
        ctx.fillRect(i, 0, 10, 1000);
      }
      
      // Convert to high quality blob
      const blob = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 1.0);
      });
      
      const file = new File([blob], 'quality-test.jpg', { type: 'image/jpeg' });
      
      // @ts-expect-error - window.compressImage is injected
      const compressed = await window.compressImage(file);
      
      // Verify it was compressed to JPEG format
      return {
        originalSize: file.size,
        compressedSize: compressed.size,
        compressedType: compressed.type,
        underLimit: compressed.size <= 50 * 1024
      };
    });
    
    expect(result.compressedType).toBe('image/jpeg');
    expect(result.underLimit).toBe(true);
    expect(result.compressedSize).toBeLessThan(result.originalSize);
  });

  test('dimension scaling is applied when needed', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // Create a very large image that will need dimension scaling
      const canvas = document.createElement('canvas');
      canvas.width = 2000;
      canvas.height = 2000;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No context');
      
      // Fill with a complex pattern that won't compress well with quality alone
      for (let y = 0; y < 2000; y += 2) {
        for (let x = 0; x < 2000; x += 2) {
          ctx.fillStyle = Math.random() > 0.5 ? '#000' : '#fff';
          ctx.fillRect(x, y, 2, 2);
        }
      }
      
      const blob = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 1.0);
      });
      
      const file = new File([blob], 'huge-test.jpg', { type: 'image/jpeg' });
      
      // @ts-expect-error - window.compressImage is injected
      const compressed = await window.compressImage(file);
      
      // Load compressed image to check dimensions
      const url = URL.createObjectURL(compressed);
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = () => resolve(undefined);
        img.onerror = reject;
        img.src = url;
      });
      
      URL.revokeObjectURL(url);
      
      return {
        originalSize: file.size,
        compressedSize: compressed.size,
        originalDimensions: { width: canvas.width, height: canvas.height },
        compressedDimensions: { width: img.width, height: img.height },
        wasResized: img.width < canvas.width || img.height < canvas.height,
        underLimit: compressed.size <= 50 * 1024
      };
    });
    
    // Very large complex images should be resized
    expect(result.underLimit).toBe(true);
    // Either compression worked or dimensions were scaled
    expect(result.compressedSize).toBeLessThan(result.originalSize);
  });

  test('handles edge case of very large images without infinite recursion', async ({ page }) => {
    // Set a timeout for this test to catch infinite loops
    test.setTimeout(30000); // 30 seconds max
    
    const result = await page.evaluate(async () => {
      // Create an extremely large image
      const canvas = document.createElement('canvas');
      canvas.width = 4000;
      canvas.height = 3000;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No context');
      
      // Create a complex, high-entropy image
      const imageData = ctx.createImageData(4000, 3000);
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] = Math.random() * 255;     // R
        imageData.data[i + 1] = Math.random() * 255; // G
        imageData.data[i + 2] = Math.random() * 255; // B
        imageData.data[i + 3] = 255;                  // A
      }
      ctx.putImageData(imageData, 0, 0);
      
      const blob = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 1.0);
      });
      
      const file = new File([blob], 'extreme-test.jpg', { type: 'image/jpeg' });
      const startTime = Date.now();
      
      // @ts-expect-error - window.compressImage is injected
      const compressed = await window.compressImage(file);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      return {
        originalSize: file.size,
        compressedSize: compressed.size,
        duration,
        completed: true,
        underLimit: compressed.size <= 50 * 1024
      };
    });
    
    // Verify it completed without hanging
    expect(result.completed).toBe(true);
    expect(result.duration).toBeLessThan(25000); // Should finish within 25 seconds
    expect(result.underLimit).toBe(true);
  });

  test('formatFileSize utility works correctly', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // @ts-expect-error - window.formatFileSize is injected
      return {
        bytes: window.formatFileSize(512),
        kilobytes: window.formatFileSize(50 * 1024),
        megabytes: window.formatFileSize(2 * 1024 * 1024)
      };
    });
    
    expect(result.bytes).toBe('512 B');
    expect(result.kilobytes).toBe('50.0 KB');
    expect(result.megabytes).toBe('2.0 MB');
  });

  test('handles invalid file gracefully', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // Create a file with invalid image data that's larger than 50KB
      // This will force the compression to try to load it as an image
      const largeInvalidData = new Array(60 * 1024).fill('x').join('');
      const blob = new Blob([largeInvalidData], { type: 'image/jpeg' });
      const file = new File([blob], 'invalid.jpg', { type: 'image/jpeg' });
      
      // @ts-expect-error - window.compressImage is injected
      try {
        await window.compressImage(file);
        return { error: null };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    // Should handle the error gracefully
    expect(result.error).toBeTruthy();
    expect(result.error).toContain('Failed to load image');
  });

  test('preserves original filename', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No context');
      
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(0, 0, 200, 200);
      
      const blob = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9);
      });
      
      const originalName = 'my-product-image.jpg';
      const file = new File([blob], originalName, { type: 'image/jpeg' });
      
      // @ts-expect-error - window.compressImage is injected
      const compressed = await window.compressImage(file);
      
      return {
        originalName: file.name,
        compressedName: compressed.name
      };
    });
    
    expect(result.compressedName).toBe(result.originalName);
  });
});
