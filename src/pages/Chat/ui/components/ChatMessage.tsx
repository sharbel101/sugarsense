import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { FoodData, FoodItem, calculateInsulin } from '../utils/nutrition';
import { saveMeal } from '@/api/mealsApi';
import { selectUser } from '@/features/user/userSlice';
import { supabase } from '@/api/supabaseClient';
import { uploadImageToStorage } from '@/api/storageApi';

// Helper to add a timeout to promises
const withTimeout = async <T,>(p: Promise<T>, ms: number, message?: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message || `Operation timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([p, timeoutPromise]) as T;
  } finally {
    if (timer) clearTimeout(timer);
  }
};

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
    
    // Preserve other fields from original FoodData when editing
    const originalData = isFoodData(text) ? text : null;
    const insulinRatio = user?.insulinRatio ?? 4;
    const newInsulinUnits = calculateInsulin(newTotalCarbs, insulinRatio);

    // Send updated data back up with recalculated insulin
    onUpdateMessage(message.id, {
      items: foodItems.map(it => ({ name: it.name, carbs: sanitizeCarbs(it.carbs) })),
      totalCarbs: Math.round(newTotalCarbs * 10) / 10,
      totalCals: originalData?.totalCals,
      mealGi: originalData?.mealGi,
      insulinUnits: newInsulinUnits,
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
      
      // Use exact parsed values from FoodData - no recalculation
      const mealName = text.items.map((item) => item.name).join(', ');
      const totalCarbs = text.totalCarbs; // Use parsed total, not recalculated
      const totalInsulin = text.insulinUnits ?? 0; // Use pre-calculated insulin
      const glycemicIndex = text.mealGi ?? undefined; // Use parsed GI
      
      console.log(`Saving meal: ${mealName}`);
      console.log(`Exact values from FoodData - Carbs: ${totalCarbs}g, Insulin: ${totalInsulin} units, GI: ${glycemicIndex ?? 'N/A'}`);
      
      // If there's an image attached to the message, upload it first
      let imageUrl: string | undefined = undefined;
      try {
        console.log('Message imageFile value:', imageFile);
        console.log('Message image value:', image);
        
        // Prefer imageFile if available (File object), otherwise try image (URL)
        if (imageFile) {
          console.log('Using imageFile from message...');
          // limit upload time to 20s
          imageUrl = await withTimeout(uploadImageToStorage(imageFile), 20000, 'Image upload timed out');
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
            imageUrl = await withTimeout(uploadImageToStorage(file), 20000, 'Image upload timed out');
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
        try {
          await withTimeout(
            saveMeal(
              effectiveUserId,
              mealName,
              totalCarbs,
              totalInsulin,
              glycemicIndex, // Use parsed GI from FoodData
              undefined, // currentGlucose
              imageUrl ?? null
            ),
            15000,
            'Saving meal timed out'
          );
          console.log('✓ Meal approved and saved to database');
          alert('Meal saved successfully!');
        } catch (saveErr: any) {
          console.error('Failed to save meal (with timeout):', saveErr);
          // Attempt a retry without image if the first save failed and an image was present
          if (imageUrl) {
            try {
              console.log('Retrying save without image...');
              await withTimeout(
                saveMeal(effectiveUserId, mealName, totalCarbs, totalInsulin),
                10000,
                'Retry saving meal timed out'
              );
              console.log('✓ Meal saved on retry without image');
              alert('Meal saved (without image) after retry');
            } catch (retryErr: any) {
              console.error('Retry also failed:', retryErr);
              alert(`Failed to save meal: ${retryErr?.message || retryErr}`);
              throw retryErr;
            }
          } else {
            alert(`Failed to save meal: ${saveErr?.message || saveErr}`);
            throw saveErr;
          }
        }
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

        {!image && hasStringText && stringText && (
          stringText.includes('Welcome to SugarSense — Your Smart Diabetes Companion') ? (
            <div className="rounded-2xl bg-white p-4 md:p-5 text-green-900 shadow-sm border border-green-200">
              <h3 className="text-lg md:text-xl font-bold mb-2">Welcome to SugarSense — Your Smart Diabetes Companion</h3>
              <p className="text-sm md:text-base mb-4">SugarSense helps you understand your meals, track your blood sugar, and stay in control with simple, easy-to-use features.</p>

              <div className="space-y-3">
                <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                  <p className="font-semibold">Instant Meal Analysis</p>
                  <p className="text-sm md:text-base">Take a photo of your food and SugarSense instantly estimates carbohydrates, calories, and glycemic index. It can also suggest insulin doses based on your personal needs. Every meal is automatically saved with its image and nutritional details.</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <p className="font-semibold">Blood Glucose Predictions</p>
                  <p className="text-sm md:text-base">Enter your current blood sugar, carbs, and insulin dose, and SugarSense shows how your levels may change over the next few hours. A clear color-coded graph highlights safe, high, and low ranges, along with your predicted peak.</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <p className="font-semibold">Meal History and Daily Insights</p>
                  <p className="text-sm md:text-base">Review your past meals with pictures and nutritional breakdowns. Track your daily totals and long-term trends to better understand your patterns.</p>
                </div>
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                  <p className="font-semibold">Doctor Dashboard (For Healthcare Providers)</p>
                  <p className="text-sm md:text-base">Healthcare providers can securely view their patients’ meal logs and glucose data, monitor progress, and identify patterns over time.</p>
                </div>
                <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-3">
                  <p className="font-semibold">Patient Overview</p>
                  <p className="text-sm md:text-base">Doctors can see detailed profiles that include meal history, daily summaries, and insulin settings.</p>
                </div>
              </div>
            </div>
          ) : (
            <p>{stringText}</p>
          )
        )}
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


