import { getEmbedding } from './embeddingClient.js';
import { queryDocuments, COLLECTIONS } from './vectorStore.js';
import logger from '../../utils/logger.js';

/**
 * Check RAG_ENABLED env var.
 * Returns true unless explicitly set to "false".
 */
function isRagEnabled() {
  return process.env.RAG_ENABLED !== 'false';
}

/**
 * Retrieve semantically similar reference meals from the vector store.
 * @param {{ mealType: string, goal: string, diseases: string[], cuisine?: string, favoriteMeal?: string, nResults?: number }} params
 * @returns {Promise<object|null>} Raw ChromaDB results or null
 */
export async function retrieveRelevantMeals(params) {
  if (!isRagEnabled()) return null;

  const { mealType, goal, diseases = [], cuisine, favoriteMeal, nResults = 3 } = params;

  // Build query string from non-empty fields
  const parts = [`${mealType} meal`];
  if (goal) parts.push(`for ${goal} goal`);
  if (cuisine) parts.push(`${cuisine} cuisine`);
  if (favoriteMeal) parts.push(favoriteMeal);
  const queryString = parts.join(' ');

  const embedding = await getEmbedding(queryString);
  if (!embedding) {
    logger.warn('RAG: Could not get embedding for meal retrieval — skipping');
    return null;
  }

  // Filter by mealType only (ChromaDB does not support $in for array fields;
  // disease-compatibility filtering is done post-retrieval in ragContextBuilder)
  const where = mealType ? { mealType } : {};

  const results = await queryDocuments(COLLECTIONS.RECIPES, embedding, { nResults, where });
  return results;
}

/**
 * Retrieve disease dietary guidelines from the vector store.
 * @param {string[]} diseases
 * @returns {Promise<object[]>} Array of raw ChromaDB results (one per disease)
 */
export async function retrieveDiseaseGuidelines(diseases) {
  if (!isRagEnabled()) return [];
  if (!Array.isArray(diseases) || diseases.length === 0) return [];

  const seen = new Set();
  const results = [];

  for (const disease of diseases) {
    if (seen.has(disease)) continue;
    seen.add(disease);

    const embedding = await getEmbedding(`dietary guidelines for ${disease}`);
    if (!embedding) {
      logger.warn(`RAG: Could not get embedding for disease "${disease}" guidelines — skipping`);
      continue;
    }

    const result = await queryDocuments(COLLECTIONS.GUIDELINES, embedding, {
      nResults: 1,
      where: { disease }
    });

    if (result) results.push(result);
  }

  return results;
}

/**
 * Retrieve ingredient reference information from the vector store.
 * @param {string[]} ingredientNames
 * @returns {Promise<object|null>} Raw ChromaDB results or null
 */
export async function retrieveIngredientInfo(ingredientNames) {
  if (!isRagEnabled()) return null;
  if (!Array.isArray(ingredientNames) || ingredientNames.length === 0) return null;

  const queryString = ingredientNames.join(', ');
  const embedding = await getEmbedding(queryString);
  if (!embedding) {
    logger.warn('RAG: Could not get embedding for ingredient retrieval — skipping');
    return null;
  }

  return queryDocuments(COLLECTIONS.INGREDIENTS, embedding, { nResults: 5 });
}
