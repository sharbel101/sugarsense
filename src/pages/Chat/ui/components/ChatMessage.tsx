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

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onUpdateMessage,
  renderFoodData,
}) => {
  const [editMode, setEditMode] = useState(false);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);

  const handleEdit = () => {
    if (typeof message.text === 'object' && message.text !== null && 'items' in message.text) {
      setFoodItems(JSON.parse(JSON.stringify(message.text.items)));
      setEditMode(true);
    }
  };

  const handleCarbChange = (index: number, newCarbs: number) => {
    const newFoodItems = [...foodItems];
    newFoodItems[index].carbs = newCarbs;
    setFoodItems(newFoodItems);
  };

  const handleSave = () => {
    const newTotalCarbs = foodItems.reduce((acc, item) => acc + item.carbs, 0);
    onUpdateMessage(message.id, { items: foodItems, totalCarbs: newTotalCarbs });
    setEditMode(false);
  };

  const { text, isUser, image } = message;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] break-words p-3 shadow-sm ${
          isUser
            ? 'bg-green-500 text-white rounded-t-2xl rounded-l-2xl rounded-br-lg'
            : 'bg-green-100 text-green-800 rounded-t-2xl rounded-r-2xl rounded-bl-lg'
        } md:max-w-[70%]`}>
        {typeof text === 'string' && <p>{text}</p>}
        {Array.isArray(text) && text}
        {typeof text === 'object' && text !== null && 'items' in text && !editMode && renderFoodData(text as FoodData)}
        {image && <img src={image} alt="User upload" className="rounded-lg" />}
        {!isUser && typeof text === 'object' && text !== null && 'items' in text && !editMode && (
          <div className="flex justify-end mt-2">
            <button className="bg-green-500 text-white px-4 py-1 rounded-lg mr-2">
              Approve
            </button>
            <button
              className="bg-red-500 text-white px-4 py-1 rounded-lg"
              onClick={handleEdit}>
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
                  value={item.carbs}
                  onChange={(e) => handleCarbChange(index, parseInt(e.target.value))}
                  className="w-20 p-1 border rounded-lg bg-green-200 text-green-800"
                />
                <span className="ml-2">g carbs</span>
              </div>
            ))}
            <div className="flex justify-end mt-2">
              <button
                className="bg-gray-300 text-gray-800 px-4 py-1 rounded-lg mr-2"
                onClick={() => setEditMode(false)}>
                Cancel
              </button>
              <button
                className="bg-green-500 hover:bg-green-600 text-white font-bold px-4 py-1 rounded-lg"
                onClick={handleSave}>
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};