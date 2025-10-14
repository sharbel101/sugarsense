
export interface FoodItem {
  name: string;
  carbs: number;
}

export interface FoodData {
  items: FoodItem[];
  totalCarbs: number;
  isMorningMode?: boolean;
}

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

export const renderFoodData = (data: FoodData): JSX.Element[] => {
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

  const bolusMultiplier = data.isMorningMode ? 5 : 4;
  const bolus = (data.totalCarbs / 15) * bolusMultiplier;

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
