import React, { useState } from 'react';
import { supabase } from '../../api/supabaseClient';

type Props = {
  mealId: string | number;
  onSuccess?: (url: string) => void;
};

export async function uploadMealImage(file: File, mealId: string | number): Promise<string> {
  if (!file) throw new Error('No file provided');

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-_]/g, '_');
  const ext = safeName.includes('.') ? safeName.split('.').pop() : '';
  const filename = `${mealId}_${timestamp}${ext ? '.' + ext : ''}`;
  const path = `meals/${mealId}/${filename}`;

  // upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('meal-images')
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  // get public url (support both v1/v2 responses)
  const publicResp = supabase.storage.from('meal-images').getPublicUrl(path as string);
  // publicResp may return { data: { publicUrl } } or { publicURL }
  // normalize
  // @ts-ignore - runtime shape varies between SDK versions
  const publicUrl = (publicResp as any)?.data?.publicUrl || (publicResp as any)?.publicURL || null;

  if (!publicUrl) {
    throw new Error('Could not generate public URL for uploaded image');
  }

  // update meals table and return updated row for verification
  const { data: updateData, error: updateError } = await supabase
    .from('meals')
    .update({ image_url: publicUrl })
    .eq('id', mealId)
    .select('id, image_url');

  // If there's an error, include the response for easier debugging
  if (updateError) {
    const err = new Error(`DB update failed: ${updateError.message}`);
    // @ts-ignore
    err.details = { updateError, uploadData, publicUrl, path };
    throw err;
  }

  // If no rows were updated, surface that as an error (likely wrong id or permissions)
  if (!updateData || (Array.isArray(updateData) && updateData.length === 0)) {
    const err = new Error('DB update succeeded but no rows were updated. Verify `mealId` and DB permissions (RLS).');
    // @ts-ignore
    err.details = { updateData, uploadData, publicUrl, path };
    throw err;
  }

  return publicUrl;
}

export default function MealImageUploader({ mealId, onSuccess }: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(null);
    setError(null);
    const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    setSelectedFile(f);
  };

  const onApprove = async () => {
    setMessage(null);
    setError(null);

    if (!selectedFile) {
      setError('No image selected.');
      return;
    }

    setLoading(true);
    try {
      const url = await uploadMealImage(selectedFile, mealId);
      setMessage('Image uploaded successfully.');
      setSelectedFile(null);
      if (onSuccess) onSuccess(url);
    } catch (err: any) {
      console.error('uploadMealImage error', err);
      setError(err?.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 420 }}>
      <label style={{ display: 'block', marginBottom: 8 }}>
        <strong>Choose image</strong>
      </label>
      <input type="file" accept="image/*" onChange={onFileChange} />

      {selectedFile && (
        <div style={{ marginTop: 8 }}>
          <div style={{ marginBottom: 8 }}>{selectedFile.name}</div>
          <img
            src={URL.createObjectURL(selectedFile)}
            alt="preview"
            style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 6 }}
          />
        </div>
      )}

      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <button
          onClick={onApprove}
          disabled={!selectedFile || loading}
          style={{ padding: '8px 12px' }}
          aria-disabled={!selectedFile || loading}
        >
          {loading ? 'Uploading...' : 'Approve'}
        </button>
      </div>

      {message && (
        <div style={{ marginTop: 10, color: 'green' }}>{message}</div>
      )}
      {error && (
        <div style={{ marginTop: 10, color: 'crimson' }}>{error}</div>
      )}
    </div>
  );
}
