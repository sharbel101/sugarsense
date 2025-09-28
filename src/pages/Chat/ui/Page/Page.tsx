import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';
import Header from '@/components/Header/Header';
import Sidebar from '@/components/Sidebar/Sidebar';
import { getBotResponse } from '../../botMessages';
import { getCarbPrediction, resizeImage } from '@/api/imageApi';

interface Message {
  id: number;
  text?: string | JSX.Element[];
  isUser: boolean;
  image?: string;
}

const formatApiResponse = (text: string): JSX.Element[] => {
  if (!text) return [];

  const elements: JSX.Element[] = [];
  let totalCarbs: number = 0; // store total carbs for later use

  text.split('\n').forEach((line, i) => {
    const trimmedLine = line.trim();

    // Handle sub-ingredients
    if (trimmedLine.startsWith('-')) {
      const parts = trimmedLine.substring(1).split(':');
      if (parts.length > 1) {
        const ingredient = parts[0].trim();
        const values = parts[1].trim();
        elements.push(
          <div key={i} style={{ marginLeft: '20px' }}>
            <em>{ingredient}</em>: {values}
          </div>
        );
        return;
      }
    }

    // Handle main items and totals
    const parts = line.split(':');
    if (parts.length > 1) {
      const item = parts[0].trim();
      const values = parts[1].trim();

      elements.push(
        <div key={i}>
          <strong>{item}</strong>: {values}
        </div>
      );

      // Capture total carbs
      if (item.toLowerCase() === 'total') {
        const match = values.match(/(\d+)\s*g carbs/i);
        if (match) {
          totalCarbs = parseInt(match[1], 10);
        }
let bolus = (totalCarbs/15 ) * 4;
        // Add insulin line using totalCarbs (currently placeholder = 1)
        elements.push(
        <div
  key={`${i}-insulin`}
  style={{ fontWeight: 'bold', fontSize: '1.4em', marginTop: '10px' }}
>
  Estimated Insulin Needed: {bolus.toFixed(1)} units
</div>

        );
      }
      return;
    }

    elements.push(<div key={i}>{line}</div>);
  });

  return elements;
};

export const Page: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (inputText.trim()) {
      const userMessageText = inputText.trim();
      console.log('[Page.tsx] handleSendMessage: Sending message:', userMessageText);
      const newUserMessage: Message = {
        id: Date.now(),
        text: userMessageText,
        isUser: true,
      };

      setMessages((prev) => [...prev, newUserMessage]);
      setInputText('');

      // Simulate bot response
      setTimeout(() => {
        const botResponseText = getBotResponse(userMessageText);
        console.log('[Page.tsx] handleSendMessage: Received bot response:', botResponseText);
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
    console.log('[Page.tsx] handleSendImage: Received image file:', imageFile);
    const userMessageText = inputText.trim();
    setInputText('');

    // Show user's message with image
    const imageUrl = URL.createObjectURL(imageFile);
    const newUserMessage: Message = {
      id: Date.now(),
      isUser: true,
      image: imageUrl,
      text: userMessageText,
    };

    // Add a loading message
    const loadingMsgId = Date.now() + 1;
    const loadingMsg: Message = {
      id: loadingMsgId,
      isUser: false,
      text: 'Analyzing image...',
    };
    setMessages((prev) => [...prev, newUserMessage, loadingMsg]);

    try {
      // Resize the image
      console.log('[Page.tsx] handleSendImage: Resizing image...');
      const resizedImage = await resizeImage(imageFile, 512, 512);
      console.log('[Page.tsx] handleSendImage: Image resized:', resizedImage);

      // Call the Gemini API
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
      console.log('[Page.tsx] handleSendImage: Calling getCarbPrediction with message:', fullMessage);
      const predictionText = await getCarbPrediction(fullMessage, resizedImage);
      console.log('[Page.tsx] handleSendImage: Received prediction:', predictionText);

      const formattedResponse = formatApiResponse(predictionText);

      // Update loading message with the prediction
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingMsgId ? { ...msg, text: formattedResponse } : msg
        )
      );
    } catch (error) {
      console.error('[Page.tsx] handleSendImage: Error getting prediction:', error);
      // Update loading message with an error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingMsgId
            ? { ...msg, text: "Sorry, I couldn't analyze the image. Please try again." } 
            : msg
        )
      );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* Header and Sidebar components (Header is fixed via its CSS) */}
      <Header onToggleSidebar={() => setIsSidebarOpen((s) => !s)} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Chat messages container - account for fixed header (h-16) and fixed input (approx 76px) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pt-20 pb-[92px]">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            text={message.text}
            isUser={message.isUser}
            image={message.image}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Fixed input at bottom */}
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
