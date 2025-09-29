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
  const { text, isUser, image } = message;

  const [editMode, setEditMode] = useState(false);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);

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

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] break-words p-3 shadow-sm ${
          isUser
            ? 'bg-green-500 text-white rounded-t-2xl rounded-l-2xl rounded-br-lg'
            : 'bg-green-100 text-green-800 rounded-t-2xl rounded-r-2xl rounded-bl-lg'
        } md:max-w-[70%]`}
      >
        {typeof text === 'string' && <p>{text}</p>}
        {Array.isArray(text) && text}
        {isFoodData(text) && !editMode && renderFoodData(text)}
        {image && <img src={image} alt="User upload" className="rounded-lg" />}

        {!isUser && isFoodData(text) && !editMode && (
          <div className="flex justify-end mt-2">
            <button className="bg-green-500 text-white px-4 py-1 rounded-lg mr-2">
              Approve
            </button>
            <button
              className="bg-red-500 text-white px-4 py-1 rounded-lg"
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
