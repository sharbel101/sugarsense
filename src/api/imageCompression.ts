/**
 * Lightweight, fast image compression for mobile
 * Compresses images heavily to minimal sizes for database storage
 */

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Compress image to base64 string with aggressive settings
 * Optimized for minimal size and fast processing on mobile
 * @param file - Image file to compress
 * @param options - Compression options (maxWidth, maxHeight, quality 0-1)
 * @returns Base64 string of compressed image
 */
export const compressImageToBase64 = async (
  file: File,
  options: CompressionOptions = {}
): Promise<string> => {
  const { maxWidth = 400, maxHeight = 400, quality = 0.6 } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Calculate new dimensions maintaining aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to base64 with aggressive compression
        const base64 = canvas.toDataURL('image/jpeg', quality);
        URL.revokeObjectURL(img.src);
        resolve(base64);
      } catch (error) {
        URL.revokeObjectURL(img.src);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
  });
};

/**
 * Convert base64 to File for re-upload if needed
 * @param base64 - Base64 string
 * @param filename - Filename for the file
 * @returns File object
 */
export const base64ToFile = (base64: string, filename: string = 'image.jpg'): File => {
  const arr = base64.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);

  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }

  return new File([u8arr], filename, { type: mime });
};

/**
 * Get approximate size of base64 string in bytes
 * @param base64 - Base64 string
 * @returns Size in bytes
 */
export const getBase64Size = (base64: string): number => {
  if (!base64) return 0;
  // Remove data URL prefix if present
  const data = base64.includes(',') ? base64.split(',')[1] : base64;
  return Math.ceil((data.length * 3) / 4);
};

/**
 * Format bytes to human-readable size
 * @param bytes - Number of bytes
 * @returns Formatted string (e.g., "125 KB")
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};
