import { getCarbPrediction, resizeImage } from '@/api/imageApi';
import { FoodData, formatApiResponse } from './nutrition';

const HARD_CODED_MESSAGE = `
You are a nutrition assistant estimating ONLY carbohydrates from ONE food image (plus optional notes). Reason silently.

TASK
Identify each food, break it into main components, estimate carbs per component, and give total calories for the entire plate. When uncertain, choose the closest common equivalent and slightly UNDERestimate.

OUTPUT FORMAT (plain text only)
<Food>:
  - <Ingredient>: <carbs> g carbs
<Next food>:
  - ...
Total: <sum> g carbs
Total Cals: <integer> kcal

RULES
- Food name ends with colon; ingredients use dash + two spaces.
- Integers only; units EXACT: "g carbs" and "kcal".
- Every food has at least one ingredient line.
- Totals must equal the sum of all lines.
- No markdown, no explanations.

USER OVERRIDES
- If user says to exclude an item, do not list or count it.
- If user says “count only <item(s)>”, include only those.
- Apply substitutions exactly.
- Do not mention overrides.

ESTIMATION (silent)
- Identify foods + components; include sauces if visible or implied.
- Determine portion size using visible baselines (hand, fork, spoon, plate, credit card).
- If none available, assume the most common real-world size for that food.
- Convert volume → weight → carbs using typical references.
- Starches carry most carbs; sauces may add carbs; proteins/cheese/veg minimal.
- Round carbs to nearest 1 g..

PACKAGED ITEMS
- If the image shows a labeled or wrapped product (e.g., chocolate bar, snack bag, candy), use the carbs for the ENTIRE item shown — not per serving.

FALLBACKS
- Estimate partially hidden foods based on visible portion.
- Multiply when multiple pieces are visible.
- Include only carb-containing beverages.

FINAL CHECK
- Validate math, units, formatting, and indentation.
- Output ONLY the strict format.
`;


export const buildFullPrompt = (userComment: string): string => {
  const comment = userComment || '(No additional comment provided.)';
  return HARD_CODED_MESSAGE + comment;
};

export const analyzeFoodImage = async (
  imageFile: File,
  userComment: string,
  isMorningMode: boolean
): Promise<FoodData> => {
  const resizedImage = await resizeImage(imageFile, 512, 512);
  const prompt = buildFullPrompt(userComment);
  const predictionText = await getCarbPrediction(prompt, resizedImage);
  const baseData = formatApiResponse(predictionText);
  return { ...baseData, isMorningMode };
};
