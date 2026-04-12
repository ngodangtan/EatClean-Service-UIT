import { getEmbedding } from './embeddingClient.js';
import { queryDocuments, COLLECTIONS } from './vectorStore.js';
import logger from '../../utils/logger.js';

/**
 * English→Vietnamese maps for retrieval query strings.
 * Filter metadata (where clauses) still uses the English enum values —
 * these maps only affect the natural-language query that drives semantic search.
 */
const MEAL_TYPE_VI = {
  breakfast: 'bữa sáng',
  lunch: 'bữa trưa',
  dinner: 'bữa tối',
  snack: 'bữa phụ'
};

const GOAL_VI = {
  'weight-loss': 'giảm cân',
  'weight-gain': 'tăng cân',
  'muscle-gain': 'tăng cơ',
  'maintenance': 'duy trì cân nặng',
  'maintain': 'duy trì cân nặng'
};

const CUISINE_VI = {
  vietnamese: 'Việt Nam',
  asian: 'châu Á',
  western: 'phương Tây',
  japanese: 'Nhật Bản',
  korean: 'Hàn Quốc',
  chinese: 'Trung Hoa',
  italian: 'Ý',
  mediterranean: 'Địa Trung Hải',
  indian: 'Ấn Độ',
  thai: 'Thái Lan'
};

const DISEASE_VI = {
  diabetes: 'tiểu đường',
  'kidney-disease': 'bệnh thận',
  'high-uric-acid': 'gút (axit uric cao)',
  hypertension: 'cao huyết áp',
  'fatty-liver': 'gan nhiễm mỡ',
  'high-cholesterol': 'mỡ máu cao',
  'heart-disease': 'bệnh tim mạch',
  obesity: 'béo phì',
  anemia: 'thiếu máu',
  gastritis: 'viêm dạ dày'
};

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

  // Build Vietnamese query string from non-empty fields. bge-m3 is multilingual,
  // so querying in Vietnamese against a Vietnamese KB gives the best semantic match.
  // mealType/goal/cuisine values come from enums (English) — translate for the query.
  const mealTypeVi = MEAL_TYPE_VI[mealType] || mealType;
  const goalVi = GOAL_VI[goal] || goal;
  const cuisineVi = cuisine ? (CUISINE_VI[cuisine] || cuisine) : null;

  const parts = [`món ${mealTypeVi}`];
  if (goalVi) parts.push(`cho mục tiêu ${goalVi}`);
  if (cuisineVi) parts.push(`ẩm thực ${cuisineVi}`);
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

    const diseaseVi = DISEASE_VI[disease] || disease;
    const embedding = await getEmbedding(`hướng dẫn dinh dưỡng cho người ${diseaseVi}`);
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
