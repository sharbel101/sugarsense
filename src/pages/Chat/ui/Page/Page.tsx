import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChatMessage, Message } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';
import Header from '@/components/Header/Header';
import Sidebar from '@/components/Sidebar/Sidebar';
import { getBotResponse } from '../../botMessages';
import { getCarbPrediction, resizeImage } from '@/api/imageApi';

const VIEWPORT_HEIGHT_VAR = '--app-viewport-height';
const KEYBOARD_OFFSET_VAR = '--app-keyboard-offset';
const CHAT_INPUT_HEIGHT_VAR = '--chat-input-height';

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
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

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
      const totalValue = parseCarbsFromValues(values);
      if (totalValue !== null) totalCarbs = totalValue;
      return;
    }

    // Regular item or sub-ingredient: parse carb value if present.
    const carbValue = parseCarbsFromValues(values);
    if (carbValue !== null) {
      items.push({ name, carbs: carbValue });
    }
  });

  // If Total line missing or unparsable, fall back to summing parsed carbs.
  const computedTotal = items.reduce((acc, item) => acc + item.carbs, 0);
  const finalTotal = totalCarbs !== null ? totalCarbs : computedTotal;

  return { items, totalCarbs: finalTotal };
};

const renderFoodData = (data: FoodData): JSX.Element[] => {
  const elements: JSX.Element[] = [];

  data.items.forEach((item, index) => {
    elements.push(
      <p key={`item-${index}`} className="text-sm leading-relaxed sm:text-base">
        <strong>{item.name}</strong>: {item.carbs}g carbs
      </p>
    );
  });

  elements.push(
    <p key="total" className="mt-2 text-sm font-semibold sm:text-base">
      <strong>Total</strong>: {data.totalCarbs}g carbs
    </p>
  );

  const bolus = (data.totalCarbs / 15) * 4;
  elements.push(
    <p key="insulin" className="mt-3 text-base font-semibold sm:text-lg">
      Estimated Insulin Needed: {bolus.toFixed(1)} units
    </p>
  );

  return elements;
};

export const Page: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputContainerRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (typeof window === 'undefined') return;
    window.requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
    });
  }, []);

  useEffect(() => {
    if (!messages.length) return;
    scrollToBottom(messages.length === 1 ? 'auto' : 'smooth');
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const { body } = document;
    const originalOverflow = body.style.overflow;

    if (isSidebarOpen) {
      body.style.overflow = 'hidden';
    } else {
      body.style.overflow = '';
    }

    return () => {
      body.style.overflow = originalOverflow;
    };
  }, [isSidebarOpen]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const root = document.documentElement;
    const viewport = window.visualViewport;

    const setViewportVars = () => {
      const viewportHeight = viewport ? viewport.height : window.innerHeight;
      root.style.setProperty(
        VIEWPORT_HEIGHT_VAR,
        `${Math.round(viewportHeight)}px`
      );

      const keyboardOffset = viewport
        ? Math.max(0, window.innerHeight - (viewport.height + viewport.offsetTop))
        : 0;

      root.style.setProperty(
        KEYBOARD_OFFSET_VAR,
        `${Math.round(keyboardOffset)}px`
      );
    };

    const handleViewportChange = () => {
      setViewportVars();
      scrollToBottom('auto');
    };

    setViewportVars();

    if (viewport) {
      viewport.addEventListener('resize', handleViewportChange);
      viewport.addEventListener('scroll', handleViewportChange);
    }
    window.addEventListener('resize', handleViewportChange);

    const preventGesture = (event: Event) => event.preventDefault();
    const gestureEvents = [
      'gesturestart',
      'gesturechange',
      'gestureend',
    ];

    gestureEvents.forEach((eventName) => {
      document.addEventListener(eventName, preventGesture, { passive: false });
    });

    return () => {
      if (viewport) {
        viewport.removeEventListener('resize', handleViewportChange);
        viewport.removeEventListener('scroll', handleViewportChange);
      }
      window.removeEventListener('resize', handleViewportChange);
      gestureEvents.forEach((eventName) =>
        document.removeEventListener(eventName, preventGesture)
      );
      root.style.removeProperty(VIEWPORT_HEIGHT_VAR);
      root.style.removeProperty(KEYBOARD_OFFSET_VAR);
    };
  }, [scrollToBottom]);

  useLayoutEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    const updateHeight = () => {
      if (!inputContainerRef.current) return;
      const { height } = inputContainerRef.current.getBoundingClientRect();
      root.style.setProperty(
        CHAT_INPUT_HEIGHT_VAR,
        `${Math.round(height)}px`
      );
    };

    updateHeight();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && inputContainerRef.current) {
      observer = new ResizeObserver(updateHeight);
      observer.observe(inputContainerRef.current);
    }

    return () => {
      if (observer) observer.disconnect();
      root.style.removeProperty(CHAT_INPUT_HEIGHT_VAR);
    };
  }, []);

  useLayoutEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const headerElement = document.querySelector<HTMLElement>('.app-header');
    if (!headerElement) return;

    const updateHeaderHeight = () => {
      const { height } = headerElement.getBoundingClientRect();
      root.style.setProperty('--header-height', `${Math.round(height)}px`);
    };

    updateHeaderHeight();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(updateHeaderHeight);
      observer.observe(headerElement);
    }

    return () => {
      if (observer) observer.disconnect();
    };
  }, []);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

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
    setMessages((prev) => [
      ...prev.filter(
        (m) =>
          m.isUser || !(typeof m.text === 'object' && m.text !== null && 'items' in m.text)
      ),
      newUserMessage,
      loadingMsg,
    ]);

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
      prev.map((msg) => (msg.id === messageId ? { ...msg, text: newText } : msg))
    );
  };

  return (
    <div
      className="relative flex min-h-screen flex-col bg-white text-slate-900"
      style={{ minHeight: 'var(--app-viewport-height, 100vh)' }}
    >
      <Header onToggleSidebar={() => setIsSidebarOpen((state) => !state)} />

      <div className="flex flex-1">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        <main
          className="flex-1 overflow-y-auto px-4 pb-6 app-scroll"
          role="main"
          style={{
            paddingTop: 'calc(var(--header-height) + env(safe-area-inset-top))',
            paddingBottom:
              'calc(var(--chat-input-height, 96px) + env(safe-area-inset-bottom) + var(--app-keyboard-offset, 0px) + 24px)',
            scrollPaddingBottom:
              'calc(var(--chat-input-height, 96px) + env(safe-area-inset-bottom) + 16px)',
            scrollPaddingTop:
              'calc(var(--header-height) + env(safe-area-inset-top) + 16px)',
          }}
        >
          <section
            className="mx-auto flex w-full max-w-3xl flex-col space-y-4"
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
          >
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onUpdateMessage={handleUpdateMessage}
                renderFoodData={renderFoodData}
              />
            ))}
            <div ref={messagesEndRef} aria-hidden="true" />
          </section>
        </main>
      </div>

      <footer
        ref={inputContainerRef}
        className="w-full flex-shrink-0 border-t border-gray-200 bg-white/95 px-3 py-3 shadow-[0_-6px_18px_rgba(15,23,42,0.05)] backdrop-blur-xl transition-[padding-bottom]"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom) + var(--app-keyboard-offset, 0px))',
        }}
      >
        <div className="mx-auto w-full max-w-3xl">
          <ChatInput
            value={inputText}
            onChange={setInputText}
            onSend={handleSendMessage}
            onSendImage={handleSendImage}
          />
        </div>
      </footer>
    </div>
  );
};

