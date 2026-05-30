import { callLMStudio, parseAIResponse } from './aiClient.js';
import { buildMealPrompt } from './promptBuilder.js';
import logger from '../../utils/logger.js';

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
 * @param {object} mealInput.retrievedContext - Pre-sanitized RAG context string (optional)
 * @param {object} [callBudget] - Optional shared budget tracker { remaining: number }
 */
// Delay before retry: longer for network errors (server may need time to recover)
// than for parse errors (which are safe to retry immediately).
function isNetworkError(err) {
  return err.message === 'fetch failed' || err.name === 'AbortError' || err.message.includes('ECONNREFUSED') || err.message.includes('ECONNRESET');
}

export async function generateMeal({ retrievedContext = null, eligibleRecipes = null, ...mealInput }, callBudget) {
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_MEAL_RETRIES; attempt++) {
    // Back off before retrying: network errors need a longer pause so LM Studio
    // can recover; parse/sanitize errors can retry after a short pause.
    if (attempt > 0) {
      const delay = isNetworkError(lastError) ? 3000 : 500;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Check global call budget before each AI call
    if (callBudget) {
      if (callBudget.remaining <= 0) {
        throw new Error(`Global AI call budget exhausted`);
      }
      callBudget.remaining--;
    }

    const errorFeedback = lastError && !isNetworkError(lastError) ? lastError.message : null;
    const prompt = buildMealPrompt({ ...mealInput, errorFeedback, retrievedContext, eligibleRecipes });

    try {
      const rawResponse = await callLMStudio(prompt);
      const parsed = parseAIResponse(rawResponse);

      if (eligibleRecipes && eligibleRecipes.length > 0) {
        // KB-selection mode: LLM picks a recipe name; backend injects authoritative KB data.
        const selectedRecipe = eligibleRecipes.find(r => r.name === parsed.name);
        if (!selectedRecipe) {
          logger.warn(`[KB] LLM selected unknown recipe "${parsed.name}", falling back to first eligible`);
        }
        const recipe = selectedRecipe ?? eligibleRecipes[0];
        return {
          name: recipe.name,
          description: recipe.description || '',
          ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
          benefits: Array.isArray(parsed.benefits) ? parsed.benefits.filter(b => typeof b === 'string' && b.trim()) : []
        };
      }

      const sanitized = sanitizeResponse(parsed);
      return sanitized;
    } catch (error) {
      logger.error(`Meal generation attempt ${attempt + 1}/${MAX_MEAL_RETRIES + 1} failed:`, error.message);
      lastError = error;
    }
  }

  throw new Error(`Failed to generate ${mealInput.mealType} after ${MAX_MEAL_RETRIES + 1} attempts: ${lastError.message}`);
}
