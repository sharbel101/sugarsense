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
/**
 * Strictly parses carbohydrate amounts from a plain-text nutrition breakdown.
 * - Accepts patterns like: "30 g carbs", "30 grams carbs", "30 g of carbs",
 *   "30 g carbohydrates", "30 grams of carbohydrates"
 * - Ignores weights like "220 g" and calories like "480 cals"
 * - Extracts "Total" carbs if present; otherwise sums parsed item carbs as fallback
 */
const formatApiResponse = (text: string): FoodData => {
  if (!text || !text.trim()) return { items: [], totalCarbs: 0 };

  // Match exactly the carb token; disallow plain "g" without "carb".
  // Captures the numeric part in group 1.
  const CARB_REGEX = /(\d+(?:\.\d+)?)\s*(?:g|gram|grams)\s*(?:of\s*)?(?:carb(?:s)?|carbohydrate(?:s)?)\b/i;

  const items: FoodItem[] = [];
  let totalCarbs: number | null = null;

  // Helper: parse a "values" string (the right side after the colon) for carbs only.
  const parseCarbsFromValues = (values: string): number | null => {
    if (!values) return null;

    // Find the FIRST occurrence that explicitly mentions carbs.
    const match = values.match(CARB_REGEX);
    if (!match) return null;

    const num = parseFloat(match[1]);
    if (!isFinite(num) || num < 0) return null;

    // Round to, say, one decimal if you expect decimals; or keep raw.
    // Keeping raw numeric (no rounding) to preserve fidelity.
    return num;
  };

  // Normalize line endings and skip empty lines.
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  lines.forEach((line) => {
    // Identify sub-ingredient vs item/total
    const isSubIngredient = line.startsWith('-');

    // Strip the leading dash for sub-ingredients before splitting on colon.
    const working = isSubIngredient ? line.replace(/^\-\s*/, '') : line;

    // Split once on the first colon only, to keep values intact.
    const firstColonIdx = working.indexOf(':');
    if (firstColonIdx === -1) return; // No "name: values" structure; ignore

    const name = working.slice(0, firstColonIdx).trim();
    const values = working.slice(firstColonIdx + 1).trim();

    if (!name) return;

    if (/^total$/i.test(name)) {
      // Parse strictly the carbs from the total line.
      const t = parseCarbsFromValues(values);
      if (t !== null) totalCarbs = t;
      return;
    }

    // Regular item or sub-ingredient: parse carb value if present.
    const c = parseCarbsFromValues(values);
    if (c !== null) {
      items.push({ name, carbs: c });
    }
  });

  // If Total line missing or unparsable, fall back to summing parsed carbs.
  const computedTotal = items.reduce((acc, it) => acc + it.carbs, 0);
  const finalTotal = totalCarbs !== null ? totalCarbs : computedTotal;

  return { items, totalCarbs: finalTotal };
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
    setMessages((prev) => [...prev.filter(m => m.isUser || !(typeof m.text === 'object' && m.text !== null && 'items' in m.text)), newUserMessage, loadingMsg]);

    try {
      const resizedImage = await resizeImage(imageFile, 512, 512);
      const hardcodedMessage = `
Provide a detailed breakdown of the carbohydrate and calorie content for each food item in this image. If an item is composed of multiple ingredients (like a burger), break it down into its main components (e.g., bun, patty, sauce, cheese).

Respond ONLY in this format:
<Food name>: 
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
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <Header onToggleSidebar={() => setIsSidebarOpen((s) => !s)} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pt-20 pb-[92px] app-scroll">
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
