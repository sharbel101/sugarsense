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
  const [pendingImage, setPendingImage] = useState<{ file: File; previewUrl: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectImage = (imageFile: File) => {
    setPendingImage((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return {
        file: imageFile,
        previewUrl: URL.createObjectURL(imageFile),
      };
    });
  };

  const handleRemovePendingImage = () => {
    setPendingImage((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return null;
    });
  };

  const handleSendMessage = async () => {
    const trimmedText = inputText.trim();

    if (pendingImage) {
      const { file, previewUrl } = pendingImage;
      const messageIdBase = Date.now();
      const newUserMessage: Message = {
        id: messageIdBase,
        isUser: true,
        image: previewUrl,
        ...(trimmedText ? { text: trimmedText } : {}),
      };

      const loadingMsgId = messageIdBase + 1;
      const loadingMsg: Message = {
        id: loadingMsgId,
        isUser: false,
        text: 'Analyzing image...',
      };

      setMessages((prev) => [...prev, newUserMessage, loadingMsg]);
      setInputText('');
      setPendingImage(null);

      try {
        const resizedImage = await resizeImage(file, 512, 512);
  const hardcodedMessage = `
You are a nutrition estimation assistant focused ONLY on carbohydrates. You receive ONE image of food (and may receive short user notes). Output ONLY the specified format below. Do all reasoning silently and never include your reasoning in the output.

TASK
Provide a detailed breakdown of the carbohydrate content for each food item in the image. If an item is composed of multiple ingredients (e.g., a burger), break it into main components (bun, patty, sauce, cheese). Report ONLY carbs.

STRICT OUTPUT FORMAT (plain text only; no extra lines, no commentary)
<Food name>:
  - <Ingredient 1>: <carb amount> g carbs
  - <Ingredient 2>: <carb amount> g carbs
<Next food>:
  - ...
Total: <sum of carbs> g carbs

FORMAT RULES
- Use a colon (:) after the main food name.
- Use a dash (-) for sub-ingredients and indent them by two spaces.
- Units must be EXACTLY: "g carbs".
- Use integers for all numbers (round carbs to nearest 1 g).
- Keep it plain text only. No markdown, no bullet icons, no explanations.
- Every listed food must have at least one sub-ingredient line.
- The "Total:" line must equal the arithmetic sum of all listed sub-ingredients across all foods.

USER OVERRIDES (must be honored)
- If the user includes instructions such as "do not count the fries", "exclude fries", "ignore the drink", or "exclude: <item>", do NOT list that item and do NOT include it in the total.
- If the user says "count only <item(s)>", list ONLY those items and exclude all others.
- If the user provides substitutions (e.g., "treat bun as lettuce wrap"), estimate carbs accordingly.
- Never add notes about exclusions; simply follow them and output the final numbers.

ESTIMATION PROTOCOL (apply silently; do NOT output this section)
1) Identify Foods & Components:
   - Segment visible foods. For composite foods, list primary components: starches (bun/tortilla/rice/pasta), proteins (patty/chicken/fish/eggs), fats (cheese, oils), sauces/dressings, toppings (lettuce/tomato/onion).
   - Always include sauces/dressings if visible or strongly implied.

2) Size & Scale:
   - If a clear hand is visible, assume distance from index finger to small finger is 8 cm; use as width scale.
   - If no hand, use common objects for scale when present (priority): standard dinner plate (≈27–28 cm Ø), fork width (≈2.5 cm), spoon bowl length (≈5–6 cm), credit card (≈8.5 cm width).
   - Prefer the closest-in-depth object to the food for scale.

3) Volume → Weight (internal only):
   - Approximate shapes (slab, cylinder, sphere, wedge). Estimate dimensions via scale reference and compute volume.
   - Convert volume to weight using typical densities for analogous foods (bread/buns, cooked rice, cooked pasta, fries/potatoes, tortilla, sauces, leafy veg, cheese, grilled meats).
   - If density is ambiguous, map to the nearest common analog and then reduce mass by 5–10% to stay conservative.

4) Carbs Lookup:
   - Use typical carbohydrate values per 100 g from standard food composition tables for the identified food or best analog (e.g., white bun, whole-wheat bun, American cheese, ketchup, mayonnaise, grilled beef patty, cooked long-grain rice, French fries).
   - If cooked state is uncertain, assume the most common ready-to-eat state for the cuisine shown and prefer the lower-carb plausible equivalent.

5) Adjustments:
   - Starches (bread/tortilla/rice/pasta/batters) are primary carb sources; proteins (meat/eggs/cheese) are typically ~0–2 g/100 g carbs; leafy veg minimal; starchy veg (potato/corn) notable.
   - Sauces can add meaningful carbs (ketchup, sweet glazes, BBQ, teriyaki). Include when visible or strongly implied.

6) Rounding & Consistency:
   - Round each ingredient’s carbs to the nearest 1 g.
   - Ensure each food’s subtotal equals the sum of its listed sub-ingredients.
   - Ensure the final "Total:" equals the sum across all foods (after exclusions).

7) Uncertainty Handling:
   - If an item is unclear, choose the closest common item and then slightly underestimate carbs (5–15%).
   - Do NOT add disclaimers or confidence statements. Do NOT ask questions. Output only the required format.

INPUT GUARANTEES & FALLBACKS
- If a food is partially occluded, estimate portion based on visible fraction and typical full size, then conservatively underestimate carbs.
- If there are multiples (e.g., 8 sushi pieces), multiply a per-piece estimate by the count.
- Include beverages as separate foods only if they likely contain carbs (soda, juice, milk tea, smoothies). Exclude zero-carb beverages (water, plain coffee/tea) from the list entirely.

FINAL CHECK (apply silently)
- Validate formatting exactly (colons, dashes, indentation).
- Validate unit spelling ("g carbs").
- Validate sums. If totals do not match, adjust sub-ingredient amounts conservatively and re-sum.
- Remove any items excluded by user overrides before finalizing the output.

Respond ONLY in the specified format and include the final "Total:" line.
`;



        const userCommentForPrompt = trimmedText || '(No additional comment provided.)';
        const fullMessage = hardcodedMessage + userCommentForPrompt;
        const predictionText = await getCarbPrediction(fullMessage, resizedImage);
        const formattedResponse = formatApiResponse(predictionText);

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === loadingMsgId ? { ...msg, text: formattedResponse } : msg
          )
        );
      } catch (error) {
        console.error('[Page.tsx] handleSendMessage: Error getting prediction:', error);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === loadingMsgId
              ? { ...msg, text: "Sorry, I couldn't analyze the image. Please try again." }
              : msg
          )
        );
      }

      return;
    }

    if (!trimmedText) {
      return;
    }

    const userMessageText = trimmedText;
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

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pt-20 pb-36 app-scroll" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 9rem)' }}>
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

      <footer className="sticky bottom-0 left-0 z-20 w-full border-t border-gray-200 bg-white/95 backdrop-blur">
        <div
          className="mx-auto flex w-full max-w-3xl px-3 pt-2"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
        >
          <ChatInput
            value={inputText}
            onChange={setInputText}
            onSend={handleSendMessage}
            onSelectImage={handleSelectImage}
            onRemoveImage={handleRemovePendingImage}
            hasPendingImage={Boolean(pendingImage)}
            imagePreviewUrl={pendingImage?.previewUrl}
          />
        </div>
      </footer>
    </div>
  );
};


