import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Message } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';
import Header from '@/components/Header/Header';
import Sidebar from '@/components/Sidebar/Sidebar';
import { getBotResponse } from '../../botMessages';
import { getCarbPrediction, resizeImage } from '@/api/imageApi';

export interface FoodItem {
  name: string;
  carbs: number;
}

export interface FoodData {
  items: FoodItem[];
  totalCarbs: number;
}

const formatApiResponse = (text: string): FoodData => {
  if (!text) return { items: [], totalCarbs: 0 };

  const items: FoodItem[] = [];
  let totalCarbs: number = 0;

  text.split('\n').forEach((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('-')) {
      const parts = trimmedLine.substring(1).split(':');
      if (parts.length > 1) {
        const ingredient = parts[0].trim();
        const values = parts[1].trim();
        const carbMatch = values.match(/(\d+)\s*g carbs/i);
        if (carbMatch) {
          items.push({ name: ingredient, carbs: parseInt(carbMatch[1], 10) });
        }
      }
    } else {
      const parts = line.split(':');
      if (parts.length > 1) {
        const item = parts[0].trim();
        const values = parts[1].trim();
        if (item.toLowerCase() === 'total') {
          const match = values.match(/(\d+)\s*g carbs/i);
          if (match) {
            totalCarbs = parseInt(match[1], 10);
          }
        } else {
          const carbMatch = values.match(/(\d+)\s*g carbs/i);
          if (carbMatch) {
            items.push({ name: item, carbs: parseInt(carbMatch[1], 10) });
          }
        }
      }
    }
  });

  return { items, totalCarbs };
};

const renderFoodData = (data: FoodData): JSX.Element[] => {
  const elements: JSX.Element[] = [];
  data.items.forEach((item, i) => {
    elements.push(
      <div key={i}>
        <strong>{item.name}</strong>: {item.carbs}g carbs
      </div>
    );
  });

  elements.push(
    <div key="total">
      <strong>Total</strong>: {data.totalCarbs}g carbs
    </div>
  );

  let bolus = (data.totalCarbs / 15) * 4;
  elements.push(
    <div
      key="insulin"
      style={{ fontWeight: 'bold', fontSize: '1.4em', marginTop: '10px' }}
    >
      Estimated Insulin Needed: {bolus.toFixed(1)} units
    </div>
  );

  return elements;
};

export const Page: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (inputText.trim()) {
      const userMessageText = inputText.trim();
      const newUserMessage: Message = {
        id: Date.now(),
        text: userMessageText,
        isUser: true,
      };

      setMessages((prev) => [...prev, newUserMessage]);
      setInputText('');

      setTimeout(() => {
        const botResponseText = getBotResponse(userMessageText);
        const botResponse: Message = {
          id: Date.now() + 1,
          text: botResponseText,
          isUser: false,
        };
        setMessages((prev) => [...prev, botResponse]);
      }, 1000);
    }
  };

  const handleSendImage = async (imageFile: File) => {
    const userMessageText = inputText.trim();
    setInputText('');

    const imageUrl = URL.createObjectURL(imageFile);
    const newUserMessage: Message = {
      id: Date.now(),
      isUser: true,
      image: imageUrl,
      text: userMessageText,
    };

    const loadingMsgId = Date.now() + 1;
    const loadingMsg: Message = {
      id: loadingMsgId,
      isUser: false,
      text: 'Analyzing image...',
    };
    setMessages((prev) => [...prev, newUserMessage, loadingMsg]);

    try {
      const resizedImage = await resizeImage(imageFile, 512, 512);
      const hardcodedMessage = `
Provide a detailed breakdown of the carbohydrate and calorie content for each food item in this image. If an item is composed of multiple ingredients (like a burger), break it down into its main components (e.g., bun, patty, sauce, cheese).

Respond ONLY in this format:
<Food name>: <carb amount> g carbs, <calorie amount> cals, <weight> g
  - <Ingredient 1>: <carb amount> g carbs, <calorie amount> cals, <weight> g
  - <Ingredient 2>: <carb amount> g carbs, <calorie amount> cals, <weight> g

List each food and its ingredients on its own line. After all foods, add:
Total: <sum of carbs> g carbs, <sum of calories> cals, <sum of weight> g

Rules:
- Use a colon (:) after the main food name.
- Use a dash (-) for sub-ingredients, and indent them.
- Always say "g carbs" for carbs, "cals" for calories, and "g" for weight.
- Do not include explanations, bullet points, or markdown (except for the dashes for ingredients).
- Keep it plain text only.
The user also said:
`;

      const fullMessage = hardcodedMessage + userMessageText;
      const predictionText = await getCarbPrediction(fullMessage, resizedImage);
      const formattedResponse = formatApiResponse(predictionText);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingMsgId ? { ...msg, text: formattedResponse } : msg
        )
      );
    } catch (error) {
      console.error('[Page.tsx] handleSendImage: Error getting prediction:', error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingMsgId
            ? { ...msg, text: "Sorry, I couldn't analyze the image. Please try again." } 
            : msg
        )
      );
    }
  };

  const handleUpdateMessage = (messageId: number, newText: FoodData) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, text: newText } : msg
      )
    );
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      <Header onToggleSidebar={() => setIsSidebarOpen((s) => !s)} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pt-20 pb-[92px]">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            onUpdateMessage={handleUpdateMessage}
            renderFoodData={renderFoodData}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-2">
        <div className="mx-auto max-w-3xl">
          <ChatInput
            value={inputText}
            onChange={setInputText}
            onSend={handleSendMessage}
            onSendImage={handleSendImage}
          />
        </div>
      </div>
    </div>
  );
};
