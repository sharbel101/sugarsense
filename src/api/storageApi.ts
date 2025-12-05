import { compressImageToBase64, getBase64Size, formatBytes } from './imageCompression';

/**
 * Uploads a compressed image to the database as base64 string
 * Fast and lightweight - no external storage roundtrip
 * Returns the base64 string directly for database storage
 */
export const uploadImageToStorage = async (file: File): Promise<string> => {
  try {
    console.log(`[storageApi] Compressing image: ${file.name}`);
    
    // Aggressive compression for mobile: 400x400 max, 60% quality
    const base64 = await compressImageToBase64(file, {
      maxWidth: 400,
      maxHeight: 400,
      quality: 0.6,
    });

    const sizeBytes = getBase64Size(base64);
    console.log(`[storageApi] Compressed image size: ${formatBytes(sizeBytes)}`);

    // Return base64 string directly - will be stored in DB
    return base64;
  } catch (error) {
    console.error('[storageApi] Compression error', error);
    throw new Error(`Image compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
