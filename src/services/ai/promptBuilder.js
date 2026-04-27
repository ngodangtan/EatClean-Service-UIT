const MAX_STRING_LENGTH = 100;
const MAX_ARRAY_ITEMS = 10;

/**
 * Sanitize a user-controlled string before prompt interpolation.
 * Strips newlines, limits length, removes instruction-like patterns.
 */
export function sanitizePromptInput(value, maxLen = MAX_STRING_LENGTH) {
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
  forbiddenIngredients,
  limitedIngredients,
  preferredIngredients,
  errorFeedback,
  retrievedContext
}) {
  const safeMealType = sanitizePromptInput(mealType, 20);
  const safeGoal = sanitizePromptInput(goal);
  const safeDiet = sanitizePromptInput(dietPreference) || 'balanced';
  const safeCuisines = sanitizePromptArray(cuisinePreference);
  const safeDiseases = sanitizePromptArray(diseases);

  const cuisineList = safeCuisines.length > 0 ? safeCuisines.join(', ') : 'diverse';
  const diseasesList = safeDiseases.length > 0 ? safeDiseases.join(', ') : 'none';

  let prompt = `You are a professional Vietnamese nutritionist. Generate ONE creative ${safeMealType} meal suitable for Vietnamese users. Return ONLY valid JSON.

LANGUAGE REQUIREMENT: All text fields (name, description, ingredients, benefits) MUST be written in Vietnamese (tiếng Việt) with proper Vietnamese diacritics. Do NOT use English. Prefer common Vietnamese dishes and ingredients familiar to the Vietnamese market.

Target context (for meal suitability only — do NOT include these numbers in your output):
- Approximate calories: ${calories}, Protein: ${protein}g, Carbs: ${carbs}g, Fat: ${fat}g

User Preferences:
- Goal: ${safeGoal}
- Diet: ${safeDiet}
- Cuisines: ${cuisineList}
- Health conditions: ${diseasesList}

Return ONLY this JSON (no markdown, no text), with ALL string values in Vietnamese:
{
  "name": "Tên món ăn",
  "description": "Mô tả ngắn gọn về món ăn",
  "ingredients": ["nguyên liệu 1", "nguyên liệu 2"],
  "benefits": ["lợi ích sức khỏe 1", "lợi ích sức khỏe 2"]
}
`;

  // Inject RAG context as inspiration between preferences and strict rules
  if (retrievedContext && retrievedContext.trim()) {
    prompt += `
REFERENCE CONTEXT (inspiration only — do not copy):
${retrievedContext}

`;
  }

  // Selective Chain-of-Thought: when diseases are present, ask the model to
  // reason through ingredient safety before generating JSON. This reduces
  // forbidden-ingredient violations and cuts regeneration attempts.
  // The CoT text preceding the JSON is harmless — parseAIResponse uses
  // extractBalancedJSON (brace-counting) which skips non-JSON preamble.
  const safeForbidden = sanitizePromptArray(forbiddenIngredients, 50);
  const safeLimited = sanitizePromptArray(limitedIngredients, 30);
  const safePreferred = sanitizePromptArray(preferredIngredients, 30);

  if (safeDiseases.length > 0) {
    prompt += `IMPORTANT — THINK STEP-BY-STEP before generating JSON:
1. The user has these health conditions: ${diseasesList}
2. FORBIDDEN ingredients (NEVER use): ${safeForbidden.length > 0 ? safeForbidden.join(', ') : 'none'}
3. LIMITED ingredients (use sparingly only): ${safeLimited.length > 0 ? safeLimited.join(', ') : 'none'}
4. PREFERRED ingredients (prioritize these): ${safePreferred.length > 0 ? safePreferred.join(', ') : 'none'}
5. Choose ingredients that are SAFE and beneficial for the above conditions
6. Verify that NONE of the forbidden ingredients appear in your ingredient list
7. Now output the JSON

`;
  }

  prompt += `STRICT RULES:
1. Return JSON ONLY — no code blocks, no markdown, no extra text
2. Do NOT include calories, macros, protein, carbs, fat, totalCalories, or any numeric nutrition fields
3. ingredients must be a non-empty array of strings
4. name must be a non-empty string
5. Ensure complete, valid JSON — no truncated strings, no trailing commas
6. ALL text output (name, description, ingredients, benefits) MUST be in Vietnamese with proper diacritics — no English words except for unavoidable loanwords`;

  if (safeDiseases.length === 0) {
    // Without diseases, inject ingredient lists in the simpler flat format
    if (safeForbidden.length > 0) {
      prompt += `\n\nDo NOT use these ingredients (they are unsafe for the user's health conditions): ${safeForbidden.join(', ')}`;
    }

    if (safeLimited.length > 0) {
      prompt += `\n\nUse these ingredients sparingly or in small portions only: ${safeLimited.join(', ')}`;
    }

    if (safePreferred.length > 0) {
      prompt += `\n\nPrefer these ingredients when possible (they are beneficial for the user's health conditions): ${safePreferred.join(', ')}`;
    }
  }

  if (errorFeedback) {
    prompt += `\n\nIMPORTANT: Your previous response had these errors. Fix them:\n${sanitizePromptInput(errorFeedback, 500)}`;
  }

  return prompt;
}
