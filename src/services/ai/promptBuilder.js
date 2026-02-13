const MAX_STRING_LENGTH = 100;
const MAX_ARRAY_ITEMS = 10;

/**
 * Sanitize a user-controlled string before prompt interpolation.
 * Strips newlines, limits length, removes instruction-like patterns.
 */
function sanitizePromptInput(value, maxLen = MAX_STRING_LENGTH) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, maxLen)
    .trim();
}

/**
 * Sanitize an array of user-controlled strings.
 * Caps item count and sanitizes each string.
 */
function sanitizePromptArray(arr, maxItems = MAX_ARRAY_ITEMS, maxLen = MAX_STRING_LENGTH) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, maxItems).map(v => sanitizePromptInput(v, maxLen)).filter(Boolean);
}

/**
 * Build a per-meal prompt for AI content generation.
 * AI produces only: name, description, ingredients, benefits.
 * All numeric nutrition values are injected by the backend.
 */
export function buildMealPrompt({
  mealType,
  calories,
  protein,
  carbs,
  fat,
  goal,
  dietPreference,
  cuisinePreference,
  diseases,
  favoriteMeal,
  forbiddenIngredients,
  limitedIngredients,
  preferredIngredients,
  errorFeedback
}) {
  const safeMealType = sanitizePromptInput(mealType, 20);
  const safeGoal = sanitizePromptInput(goal);
  const safeDiet = sanitizePromptInput(dietPreference) || 'balanced';
  const safeFavorite = sanitizePromptInput(favoriteMeal) || 'none specified';
  const safeCuisines = sanitizePromptArray(cuisinePreference);
  const safeDiseases = sanitizePromptArray(diseases);

  const cuisineList = safeCuisines.length > 0 ? safeCuisines.join(', ') : 'diverse';
  const diseasesList = safeDiseases.length > 0 ? safeDiseases.join(', ') : 'none';

  let prompt = `You are a professional nutritionist. Generate ONE creative ${safeMealType} meal. Return ONLY valid JSON.

Target context (for meal suitability only — do NOT include these numbers in your output):
- Approximate calories: ${calories}, Protein: ${protein}g, Carbs: ${carbs}g, Fat: ${fat}g

User Preferences:
- Goal: ${safeGoal}
- Diet: ${safeDiet}
- Cuisines: ${cuisineList}
- Favorite food: ${safeFavorite}
- Health conditions: ${diseasesList}

Return ONLY this JSON (no markdown, no text):
{
  "name": "Meal name here",
  "description": "Brief description of the meal",
  "ingredients": ["ingredient 1", "ingredient 2"],
  "benefits": ["health benefit 1", "health benefit 2"]
}

STRICT RULES:
1. Return JSON ONLY — no code blocks, no markdown, no extra text
2. Do NOT include calories, macros, protein, carbs, fat, totalCalories, or any numeric nutrition fields
3. ingredients must be a non-empty array of strings
4. name must be a non-empty string
5. Ensure complete, valid JSON — no truncated strings, no trailing commas`;

  const safeForbidden = sanitizePromptArray(forbiddenIngredients, 50);
  if (safeForbidden.length > 0) {
    prompt += `\n\nDo NOT use these ingredients (they are unsafe for the user's health conditions): ${safeForbidden.join(', ')}`;
  }

  const safeLimited = sanitizePromptArray(limitedIngredients, 30);
  if (safeLimited.length > 0) {
    prompt += `\n\nUse these ingredients sparingly or in small portions only: ${safeLimited.join(', ')}`;
  }

  const safePreferred = sanitizePromptArray(preferredIngredients, 30);
  if (safePreferred.length > 0) {
    prompt += `\n\nPrefer these ingredients when possible (they are beneficial for the user's health conditions): ${safePreferred.join(', ')}`;
  }

  if (errorFeedback) {
    prompt += `\n\nIMPORTANT: Your previous response had these errors. Fix them:\n${sanitizePromptInput(errorFeedback, 500)}`;
  }

  return prompt;
}
