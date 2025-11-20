import { supabase } from './supabaseClient';

// Change this to the bucket name you have in your Supabase project
const BUCKET_NAME = 'meal-images';

/**
 * Uploads an image File to Supabase Storage and returns a public URL.
 * If the bucket does not exist or upload fails, this will throw.
 */
export const uploadImageToStorage = async (file: File): Promise<string> => {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `uploads/${timestamp}_${safeName}`;

  const { data, error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (uploadError) {
    console.error('[storageApi] upload error', uploadError);
    throw uploadError;
  }

  // Normalize getPublicUrl() return shapes between SDK versions
  const publicResp = supabase.storage.from(BUCKET_NAME).getPublicUrl((data as any).path);
  // v1: { data: { publicUrl } }, v2: { publicURL }
  // Try known places and fall back to constructing a URL if possible
  // @ts-ignore
  const publicUrl = (publicResp as any)?.data?.publicUrl || (publicResp as any)?.publicURL || null;

  if (!publicUrl) {
    console.warn('[storageApi] getPublicUrl returned unexpected shape:', publicResp);
    throw new Error('Could not obtain public URL after upload');
  }

  return publicUrl;
};
