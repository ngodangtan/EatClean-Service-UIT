import logger from '../../utils/logger.js';

const TIMEOUT_MS = 10000;

/**
 * Normalize text before embedding: trim, lowercase, collapse whitespace.
 */
function normalizeText(text) {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Get a single embedding vector for a text string.
 * Returns null on failure (graceful degradation).
 * @param {string} text
 * @returns {Promise<number[]|null>}
 */
export async function getEmbedding(text) {
  const embeddings = await getEmbeddingBatch([text]);
  if (!embeddings) return null;
  return embeddings[0] ?? null;
}

/**
 * Get embedding vectors for an array of text strings.
 * Returns null on failure (graceful degradation).
 * @param {string[]} texts
 * @returns {Promise<number[][]|null>}
 */
export async function getEmbeddingBatch(texts) {
  const url = process.env.LM_STUDIO_EMBEDDING_URL;
  const model = process.env.EMBEDDING_MODEL || 'bge-m3';

  if (!url) {
    logger.warn('RAG: LM_STUDIO_EMBEDDING_URL not set — skipping embedding');
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const normalizedTexts = texts.map(normalizeText);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input: normalizedTexts }),
      signal: controller.signal
    });

    if (!response.ok) {
      logger.warn(`RAG: Embedding request failed with status ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data.data || !Array.isArray(data.data)) {
      logger.warn('RAG: Embedding response missing data array');
      return null;
    }

    return data.data.map(item => item.embedding);
  } catch (err) {
    if (err.name === 'AbortError') {
      logger.warn('RAG: Embedding request timed out');
    } else {
      logger.warn('RAG: Embedding request error:', err.message);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}
