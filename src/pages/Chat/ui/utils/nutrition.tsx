export interface FoodItem {
  name: string;
  carbs: number;
  cals?: number | null;
}

export interface FoodData {
  items: FoodItem[];
  totalCarbs: number;
  totalCals?: number;
  mealGi?: number;
  isMorningMode?: boolean;
}

/**
 * Calculate insulin units needed based on carbs and insulin ratio.
 * Formula: (carbs / 15) * insulinRatio
 * @param carbs Total carbohydrate grams
 * @param insulinRatio User's insulin-to-carb ratio (units per 15g carbs)
 * @returns Insulin units needed
 */
export const calculateInsulin = (carbs: number, insulinRatio: number = 1): number => {
  return (carbs / 15) * insulinRatio;
};

/**
 * Strictly parses carbohydrate amounts from a plain-text nutrition breakdown.
 * - Accepts patterns like: "30 g carbs", "30 grams carbs", "30 g of carbs",
 *   "30 g carbohydrates", "30 grams of carbohydrates"
 * - Ignores weights like "220 g" and calories like "480 cals"
 * - Extracts "Total" carbs if present; otherwise sums parsed item carbs as fallback
 */
export const formatApiResponse = (text: string): FoodData => {
  if (!text || !text.trim()) return { items: [], totalCarbs: 0 };

  // Match exactly the carb token; disallow plain "g" without "carb".
  // Captures the numeric part in group 1.
  const CARB_REGEX = /(\d+(?:\.\d+)?)\s*(?:g|gram|grams)\s*(?:of\s*)?(?:carb(?:s)?|carbohydrate(?:s)?)\b/i;
  // Match calories like "480 cals", "480 kcal", "480 calories" (group 1)
  const CAL_REGEX = /(\d+(?:\.\d+)?)\s*(?:k?cal|cals?|calories?)\b/i;

  const items: FoodItem[] = [];
  let totalCarbs: number | null = null;
  let totalCals: number | null = null;
  let mealGi: number | null = null;

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

  // Helper: parse calories from a values string
  const parseCalsFromValues = (values: string): number | null => {
    if (!values) return null;

    const match = values.match(CAL_REGEX);
    if (!match) return null;

    const num = parseFloat(match[1]);
    if (!isFinite(num) || num < 0) return null;

    return Math.round(num);
  };

  // Normalize line endings and skip empty lines.
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  console.log('[nutrition] Parsing lines:', lines);

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

    // Accept "Total", "Total Cals", "Total Calories", etc.
    if (/^total(?:\s*(?:cals?|calories?))?$/i.test(name)) {
      // Parse strictly the carbs from the total line.
      const t = parseCarbsFromValues(values);
      if (t !== null) totalCarbs = t;

      // Also try to parse total calories if present
      const tc = parseCalsFromValues(values);
      if (tc !== null) totalCals = tc;
      return;
    }

    // Parse GI line: accept "Meal GI", "Total GI", or plain "GI"
    if (/^(?:meal\s*gi|total\s*gi|gi)$/i.test(name)) {
      // Extract first integer on the line
      const giMatch = values.match(/(\d{1,3})/);
      if (giMatch) {
        const giVal = parseInt(giMatch[1], 10);
        if (isFinite(giVal)) {
          // Clamp to 0-100 to match prompt contract
          mealGi = Math.max(0, Math.min(100, giVal));
          console.log('[nutrition] Parsed Meal GI:', mealGi);
        }
      }
      return;
    }

    // Regular item or sub-ingredient: parse carb value if present.
    const c = parseCarbsFromValues(values);
    const cal = parseCalsFromValues(values);
    if (c !== null || cal !== null) {
      items.push({ name, carbs: c ?? 0, cals: cal ?? null });
    }
  });

  // If Total line missing or unparsable, fall back to summing parsed carbs.
  const computedTotal = items.reduce((acc, it) => acc + it.carbs, 0);
  const finalTotal = totalCarbs !== null ? totalCarbs : computedTotal;

  // Compute total calories if not provided by a Total line
  const computedCals = items.reduce((acc, it) => acc + (it.cals || 0), 0);
  const finalCals = totalCals !== null ? totalCals : (computedCals || undefined);

  const result = { items, totalCarbs: finalTotal, totalCals: finalCals, mealGi: mealGi ?? undefined };
  console.log('[nutrition] Final parsed result:', result);
  return result;
};

export const renderFoodData = (data: FoodData, insulinRatio?: number | null): JSX.Element[] => {
  const elements: JSX.Element[] = [];
  data.items.forEach((item, i) => {
    elements.push(
      <div key={i}>
        <strong>{item.name}</strong>: {item.carbs}g carbs{item.cals ? ` — ${item.cals} kcal` : ''}
      </div>
    );
  });

  elements.push(
    <div key="total">
      <strong>Total</strong>: {data.totalCarbs}g carbs
    </div>
  );

  // Show total calories below total carbs when available
  if (typeof data.totalCals === 'number') {
    elements.push(
      <div key="total-cals">
        <strong>Total Cals</strong>: {data.totalCals} kcal
      </div>
    );
  }

  // Show Meal GI when available
  if (typeof data.mealGi === 'number') {
    elements.push(
      <div key="meal-gi">
        <strong>Meal GI</strong>: {data.mealGi}
      </div>
    );
  }

  // Use provided insulinRatio or fallback to 4 (default estimate)
  const ratio = insulinRatio ?? 4;
  const bolus = calculateInsulin(data.totalCarbs, ratio);

  elements.push(
    <div
      key="insulin"
      style={{
        fontWeight: 'bold',
        fontSize: '1.6em',
        marginTop: '12px',
        textAlign: 'center',
      }}
    >
      Estimated Insulin Needed: {bolus.toFixed(1)} units
    </div>
  );

  return elements;
};
