/**
 * Type declarations for test harness
 * Extends the Window interface with compression utility functions
 */

declare global {
  interface Window {
    compressImage: (file: File) => Promise<File>;
    formatFileSize: (bytes: number) => string;
    compressionModuleReady: boolean;
  }
}

export {};
