import React, { useState } from 'react';
import { FoodData, FoodItem } from '../Page/Page';

export interface Message {
  id: number;
  text?: string | JSX.Element[] | FoodData;
  isUser: boolean;
  image?: string;
}

interface ChatMessageProps {
  message: Message;
  onUpdateMessage: (messageId: number, newText: FoodData) => void;
  renderFoodData: (data: FoodData) => JSX.Element[];
}

// Type guard
const isFoodData = (v: unknown): v is FoodData =>
  Boolean(
    v &&
      typeof v === 'object' &&
      'items' in (v as Record<string, unknown>) &&
      Array.isArray((v as FoodData).items) &&
      typeof (v as FoodData).totalCarbs === 'number'
  );

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
  const { text, isUser, image } = message;

  const [editMode, setEditMode] = useState(false);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);

  const handleEdit = () => {
    if (isFoodData(text)) {
      setFoodItems(text.items.map((item) => ({ name: item.name, carbs: sanitizeCarbs(item.carbs) })));
      setEditMode(true);
    }
  };

  const handleCarbChange = (index: number, value: string) => {
    setFoodItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], carbs: sanitizeCarbs(value) };
      return next;
    });
  };

  const handleSave = () => {
    const newTotalCarbs = foodItems.reduce((acc, item) => acc + sanitizeCarbs(item.carbs), 0);

    onUpdateMessage(message.id, {
      items: foodItems.map((item) => ({ name: item.name, carbs: sanitizeCarbs(item.carbs) })),
      totalCarbs: Math.round(newTotalCarbs * 10) / 10,
    });

    setEditMode(false);
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`relative max-w-[92%] rounded-3xl px-4 py-3 shadow-sm transition-transform sm:max-w-[70%] ${
          isUser
            ? 'bg-green-500 text-white shadow-[0_8px_16px_rgba(34,197,94,0.25)]'
            : 'bg-green-50 text-green-900 shadow-[0_6px_16px_rgba(15,23,42,0.06)]'
        }`}
      >
        {typeof text === 'string' && (
          <p className="whitespace-pre-wrap text-base leading-relaxed">{text}</p>
        )}

        {Array.isArray(text) && <div className="space-y-1 text-base leading-relaxed">{text}</div>}

        {isFoodData(text) && !editMode && (
          <div className="space-y-1 text-base leading-relaxed">
            {renderFoodData(text)}
          </div>
        )}

        {image && (
          <img
            src={image}
            alt="User upload"
            className="mt-3 h-auto max-h-64 w-full rounded-2xl object-cover"
            loading="lazy"
          />
        )}

        {!isUser && isFoodData(text) && !editMode && (
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-full bg-green-500 px-4 py-1.5 text-sm font-semibold text-white shadow hover:bg-green-600"
            >
              Approve
            </button>
            <button
              type="button"
              className="rounded-full bg-red-500 px-4 py-1.5 text-sm font-semibold text-white shadow hover:bg-red-600"
              onClick={handleEdit}
            >
              Edit
            </button>
          </div>
        )}

        {!isUser && editMode && (
          <div className="mt-2 space-y-2">
            {foodItems.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-sm font-medium text-green-900">{item.name}</span>
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={item.carbs}
                  onChange={(event) => handleCarbChange(index, event.target.value)}
                  className="w-24 rounded-xl border border-green-300 bg-green-100 px-2 py-1 text-base text-green-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-400/60"
                  aria-label={`${item.name} carbs (g)`}
                  style={{ fontSize: '16px' }}
                />
                <span className="text-sm font-medium text-green-900">g carbs</span>
              </div>
            ))}

            <div className="pt-1 text-sm font-semibold text-green-900">
              Total (preview): {foodItems.reduce((acc, item) => acc + sanitizeCarbs(item.carbs), 0).toFixed(1)}g carbs
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-full bg-gray-200 px-4 py-1.5 text-sm font-semibold text-gray-700 shadow hover:bg-gray-300"
                onClick={() => setEditMode(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-full bg-green-500 px-4 py-1.5 text-sm font-semibold text-white shadow hover:bg-green-600"
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
