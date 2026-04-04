import { sanitizePromptInput } from '../ai/promptBuilder.js';

const MAX_TOTAL_LENGTH = 1500;
const MAX_MEAL_ENTRY_LENGTH = 200;
const MAX_GUIDELINE_TIP_LENGTH = 150;

// Keywords that indicate adversarial prompt injection attempts
const ADVERSARIAL_KEYWORDS = /\b(ignore|forget|system|assistant|human|instruction|override)\b/i;

/**
 * Strip any string that contains adversarial keywords.
 * Returns empty string if adversarial content detected.
 * @param {string} text
 * @returns {string}
 */
function stripAdversarial(text) {
  if (ADVERSARIAL_KEYWORDS.test(text)) return '';
  return text;
}

/**
 * Sanitize and strip adversarial content from a retrieved field.
 * @param {string} value
 * @param {number} maxLen
 * @returns {string}
 */
function safeField(value, maxLen) {
  const sanitized = sanitizePromptInput(String(value || ''), maxLen);
  return stripAdversarial(sanitized);
}

/**
 * Parse meal entries from raw ChromaDB retrieval results.
 * @param {object|null} retrievedMeals
 * @returns {Array<{ name: string, ingredients: string, description: string }>}
 */
function parseMealEntries(retrievedMeals) {
  if (!retrievedMeals || !retrievedMeals.metadatas?.[0]) return [];

  const metadatas = retrievedMeals.metadatas[0];
  const documents = retrievedMeals.documents?.[0] ?? [];

  return metadatas
    .map((meta, i) => {
      const name = safeField(meta?.name ?? '', 80);
      const doc = safeField(documents[i] ?? '', MAX_MEAL_ENTRY_LENGTH);
      if (!name || !doc) return null;
      return { name, doc };
    })
    .filter(Boolean);
}

/**
 * Parse guideline tips from raw ChromaDB retrieval results.
 * @param {object[]} retrievedGuidelines - array of ChromaDB result objects
 * @returns {string[]}
 */
function parseGuidelineTips(retrievedGuidelines) {
  if (!Array.isArray(retrievedGuidelines) || retrievedGuidelines.length === 0) return [];

  const tips = [];
  for (const result of retrievedGuidelines) {
    const docs = result?.documents?.[0] ?? [];
    for (const doc of docs) {
      const tip = safeField(doc, MAX_GUIDELINE_TIP_LENGTH);
      if (tip) tips.push(tip);
    }
  }
  return tips;
}

/**
 * Format retrieved meals and guidelines into a prompt-injectable context string.
 * Sanitizes all content and enforces a hard 1500-character cap.
 *
 * @param {object|null} retrievedMeals - raw result from retrieveRelevantMeals()
 * @param {object[]} retrievedGuidelines - raw results from retrieveDiseaseGuidelines()
 * @returns {string} Context string ready for prompt injection, or empty string
 */
export function buildMealContext(retrievedMeals, retrievedGuidelines) {
  const mealEntries = parseMealEntries(retrievedMeals);
  const guidelineTips = parseGuidelineTips(retrievedGuidelines);

  if (mealEntries.length === 0 && guidelineTips.length === 0) return '';

  const lines = [];

  if (mealEntries.length > 0) {
    lines.push('Reference meals (use as inspiration, do NOT copy exactly):');
    mealEntries.forEach((entry, i) => {
      const line = `${i + 1}. ${entry.name}: ${entry.doc}`;
      lines.push(line.slice(0, MAX_MEAL_ENTRY_LENGTH));
    });
  }

  if (guidelineTips.length > 0) {
    lines.push('Dietary guidelines to follow:');
    guidelineTips.forEach(tip => {
      lines.push(`- ${tip.slice(0, MAX_GUIDELINE_TIP_LENGTH)}`);
    });
  }

  // Hard cap at MAX_TOTAL_LENGTH — truncate at last complete line
  let output = lines.join('\n');
  if (output.length <= MAX_TOTAL_LENGTH) return output;

  // Truncate at last newline that fits within the limit
  const truncated = output.slice(0, MAX_TOTAL_LENGTH);
  const lastNewline = truncated.lastIndexOf('\n');
  return lastNewline > 0 ? truncated.slice(0, lastNewline) : '';
}
