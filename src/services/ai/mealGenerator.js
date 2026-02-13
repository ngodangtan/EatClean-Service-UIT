import { callLMStudio, parseAIResponse } from './aiClient.js';
import { buildMealPrompt } from './promptBuilder.js';

const MAX_MEAL_RETRIES = 2;

const FORBIDDEN_NUMERIC_FIELDS = [
  'calories', 'macros', 'protein', 'carbs', 'fat', 'totalCalories'
];

/**
 * Sanitize parsed AI response for a single meal.
 * Strips unknown fields and rejects responses containing numeric nutrition data.
 */
export function sanitizeResponse(parsed) {
  // Reject if any forbidden numeric fields are present
  for (const field of FORBIDDEN_NUMERIC_FIELDS) {
    if (parsed[field] !== undefined) {
      throw new Error(`AI response contains forbidden numeric field: "${field}"`);
    }
  }

  const name = (parsed.name || '').trim();
  if (!name) {
    throw new Error('AI response has empty or missing "name"');
  }

  const ingredients = Array.isArray(parsed.ingredients) ? parsed.ingredients.filter(i => typeof i === 'string' && i.trim()) : [];
  if (ingredients.length === 0) {
    throw new Error('AI response has empty or missing "ingredients"');
  }

  // Return only allowed fields
  return {
    name,
    description: (parsed.description || '').trim(),
    ingredients,
    benefits: Array.isArray(parsed.benefits) ? parsed.benefits.filter(b => typeof b === 'string' && b.trim()) : []
  };
}

/**
 * Generate a single meal via AI.
 * Orchestrates: prompt → AI call → parse → sanitize, with retry.
 * @param {object} mealInput - Meal parameters (mealType, calories, etc.)
 * @param {object} [callBudget] - Optional shared budget tracker { remaining: number }
 */
export async function generateMeal(mealInput, callBudget) {
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_MEAL_RETRIES; attempt++) {
    // Check global call budget before each AI call
    if (callBudget) {
      if (callBudget.remaining <= 0) {
        throw new Error(`Global AI call budget exhausted`);
      }
      callBudget.remaining--;
    }

    const errorFeedback = lastError ? lastError.message : null;
    const prompt = buildMealPrompt({ ...mealInput, errorFeedback });

    try {
      const rawResponse = await callLMStudio(prompt);
      const parsed = parseAIResponse(rawResponse);
      const sanitized = sanitizeResponse(parsed);
      return sanitized;
    } catch (error) {
      console.error(`Meal generation attempt ${attempt + 1}/${MAX_MEAL_RETRIES + 1} failed:`, error.message);
      lastError = error;
    }
  }

  throw new Error(`Failed to generate ${mealInput.mealType} after ${MAX_MEAL_RETRIES + 1} attempts: ${lastError.message}`);
}
