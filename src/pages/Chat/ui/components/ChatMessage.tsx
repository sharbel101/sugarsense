import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { FoodData, FoodItem, calculateInsulin } from '../utils/nutrition';
import { saveMeal } from '@/api/mealsApi';
import { selectUser } from '@/features/user/userSlice';
import { supabase } from '@/api/supabaseClient';
import { getUserRow } from '@/api/userApi';
import { uploadImageToStorage } from '@/api/storageApi';

export interface Message {
  id: number;
  text?: string | JSX.Element[] | FoodData;
  isUser: boolean;
  image?: string;
  imageFile?: File;
}

interface ChatMessageProps {
  message: Message;
  onUpdateMessage: (messageId: number, newText: FoodData) => void;
  renderFoodData: (data: FoodData) => JSX.Element[];
}

// Type guard
const isFoodData = (v: any): v is FoodData =>
  v && typeof v === 'object' && Array.isArray(v.items) && typeof v.totalCarbs === 'number';

const sanitizeCarbs = (val: string | number): number => {
  const n = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 10) / 10;
};

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onUpdateMessage,
  renderFoodData,
}) => {
  const user = useSelector(selectUser);
  const { text, isUser, image, imageFile } = message;
  const stringText = typeof text === 'string' ? text : undefined;
  const hasStringText = Boolean(stringText && stringText.trim().length > 0);

  const [editMode, setEditMode] = useState(false);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = () => {
    if (isFoodData(text)) {
      setFoodItems(text.items.map(it => ({ name: it.name, carbs: sanitizeCarbs(it.carbs) })));
      setEditMode(true);
    }
  };

  const handleCarbChange = (index: number, value: string) => {
    setFoodItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], carbs: sanitizeCarbs(value) };
      return next;
    });
  };

  const handleSave = () => {
    const newTotalCarbs = foodItems.reduce((acc, it) => acc + sanitizeCarbs(it.carbs), 0);

    // Send updated data back up; bolus is recalculated inside renderFoodData in Page.tsx
    onUpdateMessage(message.id, {
      items: foodItems.map(it => ({ name: it.name, carbs: sanitizeCarbs(it.carbs) })),
      totalCarbs: Math.round(newTotalCarbs * 10) / 10,
    });

    setEditMode(false);
  };

  const handleApprove = async () => {
    console.log('handleApprove called');
    console.log('user from Redux:', user);
    console.log('text (food data):', text);
    
    if (!isFoodData(text)) {
      console.warn('Cannot approve: text is not food data', text);
      alert('Error: No food data to save');
      return;
    }

    // Allow approval when user is present in Redux or when a Supabase session exists.
    let effectiveUserId = user?.id;
    if (!effectiveUserId) {
      try {
        const { data } = await supabase.auth.getSession();
        const sessionUser = data?.session?.user ?? null;
        if (sessionUser && sessionUser.id) {
          effectiveUserId = sessionUser.id;
          console.log('Using Supabase session user id for approval:', effectiveUserId);
        }
      } catch (e) {
        console.warn('Error checking supabase session during approval:', e);
      }
    }

    if (!effectiveUserId) {
      console.warn('Cannot approve: missing user id. user object:', user);
      alert('Cannot save meal: please sign in to save meals');
      return;
    }

    setIsSaving(true);
    try {
      console.log('Approving meal with data:', text);
      
      // Aggregate all food items into one meal
      const mealName = text.items.map((item) => item.name).join(', ');
      const totalCarbs = text.items.reduce((sum, item) => sum + item.carbs, 0);
      
      // Calculate total insulin based on carbs and user's insulin ratio
      let insulinRatio = user?.insulinRatio;
      console.log('insulinRatio from Redux:', insulinRatio);
      
      if (!insulinRatio || insulinRatio === null) {
        // Fallback: try to fetch from DB if Redux is empty (edge case)
        try {
          const row = await getUserRow(effectiveUserId);
          insulinRatio = (row as any)?.insulinRatio ?? (row as any)?.insulin_ratio ?? null;
          console.log('Fallback: insulinRatio from DB:', insulinRatio);
        } catch (e) {
          console.warn('Could not fetch user row for insulin ratio', e);
        }
      }
      
      // Final fallback to 1 if still null
      if (!insulinRatio || insulinRatio === null) {
        console.warn('No insulinRatio found, using fallback of 1');
        insulinRatio = 1;
      }
      
      const totalInsulin = calculateInsulin(totalCarbs, insulinRatio);
      
      console.log(`Saving meal: ${mealName}`);
      console.log(`Total carbs: ${totalCarbs}g, insulinRatio: ${insulinRatio}, Total insulin: ${totalInsulin} units`);
      
      // If there's an image attached to the message, upload it first
      let imageUrl: string | undefined = undefined;
      try {
        console.log('Message imageFile value:', imageFile);
        console.log('Message image value:', image);
        
        // Prefer imageFile if available (File object), otherwise try image (URL)
        if (imageFile) {
          console.log('Using imageFile from message...');
          imageUrl = await uploadImageToStorage(imageFile);
          console.log('Image uploaded, public URL:', imageUrl);
        } else if (image) {
          const isRemote = /^https?:\/\//i.test(image);
          console.log('isRemote image?', isRemote);
          if (!isRemote) {
            // Convert data/blob URL to File by fetching it
            console.log('Fetching image blob for upload...');
            const resp = await fetch(image);
            if (!resp.ok) throw new Error(`Failed to fetch image for upload: ${resp.status}`);
            const blob = await resp.blob();
            const filename = `meal_${Date.now()}.${(blob.type || 'image/png').split('/').pop()}`;
            const file = new File([blob], filename, { type: blob.type || 'image/png' });
            console.log('Uploading attached image for meal...');
            imageUrl = await uploadImageToStorage(file);
            console.log('Image uploaded, public URL:', imageUrl);
          } else {
            // Assume already public
            console.log('Image is remote URL; skipping upload. Using as-is.');
            imageUrl = image;
          }
        } else {
          console.log('No image attached to message; skipping upload.');
        }
      } catch (imgErr) {
        console.warn('Image upload failed, proceeding without image:', imgErr);
      }

      // Save as a single meal row (include imageUrl when available)
      await saveMeal(
        effectiveUserId,
        mealName,
        totalCarbs,
        totalInsulin,
        undefined, // glycemicIndex
        undefined, // currentGlucose
        imageUrl ?? null
      );

      console.log('✓ Meal approved and saved to database');
      alert('Meal saved successfully!');
    } catch (error: any) {
      console.error('✗ Error saving meal:', error);
      alert(`Failed to save meal: ${error?.message ?? 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] break-words p-3 shadow-sm md:max-w-[70%] flex flex-col gap-3 ${
          isUser
            ? 'bg-green-500 text-white rounded-t-2xl rounded-l-2xl rounded-br-lg'
            : 'bg-green-100 text-green-800 rounded-t-2xl rounded-r-2xl rounded-bl-lg'
        }`}
      >
        {image && (
          <div className="flex flex-col gap-2">
            <img src={image} alt="User upload" className="w-full rounded-2xl object-cover" />
            {hasStringText && (
              <p className="text-base leading-snug">{stringText}</p>
            )}
          </div>
        )}

        {!image && hasStringText && <p>{stringText}</p>}
        {Array.isArray(text) && text}
        {isFoodData(text) && !editMode && renderFoodData(text)}

        {!isUser && isFoodData(text) && !editMode && (
          <div className="flex justify-end mt-2">
            <button 
              disabled={isSaving}
              onClick={handleApprove}
              className="bg-green-500 text-white px-4 py-1 rounded-lg mr-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-600"
            >
              {isSaving ? 'Saving...' : 'Approve'}
            </button>
            <button
              disabled={isSaving}
              className="bg-red-500 text-white px-4 py-1 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-600"
              onClick={handleEdit}
            >
              Edit
            </button>
          </div>
        )}

        {!isUser && editMode && (
          <div>
            {foodItems.map((item, index) => (
              <div key={index} className="flex items-center mt-2">
                <span className="mr-2">{item.name}</span>
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={item.carbs}
                  onChange={(e) => handleCarbChange(index, e.target.value)}
                  className="w-24 p-1 border rounded-lg bg-green-200 text-green-800"
                  aria-label={`${item.name} carbs (g)`}
                />
                <span className="ml-2">g carbs</span>
              </div>
            ))}

            {/* Just show live total here, no bolus calc duplication */}
            <div className="mt-3 font-semibold">
              Total (preview): {foodItems.reduce((acc, it) => acc + sanitizeCarbs(it.carbs), 0).toFixed(1)}g carbs
            </div>

            <div className="flex justify-end mt-3">
              <button
                className="bg-gray-300 text-gray-800 px-4 py-1 rounded-lg mr-2"
                onClick={() => setEditMode(false)}
              >
                Cancel
              </button>
              <button
                className="bg-green-500 hover:bg-green-600 text-white font-bold px-4 py-1 rounded-lg"
                onClick={handleSave}
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


