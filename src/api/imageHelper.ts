/**
 * Image helper utilities for meal display
 * Supports both base64 compressed images and URLs
 */

/**
 * Get the best available image source
 * Prefers base64 (compressed, always available)
 * Falls back to URL (remote or legacy)
 */
export const getImageSource = (
  imageData?: string | null,
  imageUrl?: string | null
): string | undefined => {
  return imageData || imageUrl || undefined;
};

/**
 * Check if meal has any image
 */
export const hasImage = (
  imageData?: string | null,
  imageUrl?: string | null
): boolean => {
  return Boolean(imageData || imageUrl);
};

/**
 * Determine image type
 */
export const getImageType = (
  imageData?: string | null,
  imageUrl?: string | null
): 'base64' | 'url' | 'none' => {
  if (imageData) return 'base64';
  if (imageUrl) return 'url';
  return 'none';
};

/**
 * Format image for display (with error handling)
 */
export const displayImage = (
  imageData?: string | null,
  imageUrl?: string | null,
  fallback: string = ''
): string => {
  if (imageData) {
    // Ensure it has data URL prefix if it's base64
    return imageData.startsWith('data:') ? imageData : `data:image/jpeg;base64,${imageData}`;
  }
  return imageUrl || fallback;
};

/**
 * Check if image is base64 data
 */
export const isBase64Image = (src?: string): boolean => {
  if (!src) return false;
  return src.startsWith('data:image/') || /^[A-Za-z0-9+/=]+$/.test(src);
};

/**
 * Get image MIME type from base64 string
 */
export const getBase64MimeType = (base64: string): string => {
  if (base64.includes('data:')) {
    const match = base64.match(/data:([^;]+)/);
    return match ? match[1] : 'image/jpeg';
  }
  return 'image/jpeg'; // Default
};
