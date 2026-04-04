import { ChromaClient } from 'chromadb';
import logger from '../../utils/logger.js';

export const COLLECTIONS = {
  RECIPES: 'recipes',
  GUIDELINES: 'guidelines',
  INGREDIENTS: 'ingredients'
};

/**
 * No-op embedding function passed to ChromaDB to suppress the DefaultEmbeddingFunction error.
 * We always supply our own embeddings via LM Studio — this function is never actually called.
 */
const NO_OP_EMBEDDING_FUNCTION = {
  generate: async (texts) => texts.map(() => [])
};

/**
 * Build ChromaDB client from CHROMA_URL env var.
 * Uses host/port/ssl to avoid deprecated 'path' argument.
 */
function buildClient() {
  const chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000';
  const url = new URL(chromaUrl);
  return new ChromaClient({
    host: url.hostname,
    port: parseInt(url.port) || 8000,
    ssl: url.protocol === 'https:'
  });
}

/**
 * Get or create a ChromaDB collection.
 * Passes a no-op embedding function so ChromaDB doesn't try to load DefaultEmbeddingFunction.
 * @param {string} collectionName
 * @returns {Promise<Collection>}
 */
export async function initializeCollection(collectionName) {
  const client = buildClient();
  return client.getOrCreateCollection({
    name: collectionName,
    embeddingFunction: NO_OP_EMBEDDING_FUNCTION
  });
}

/**
 * Upsert documents into a ChromaDB collection.
 * @param {string} collectionName
 * @param {Array<{ id: string, embedding: number[], metadata: object, document: string }>} documents
 */
export async function upsertDocuments(collectionName, documents) {
  const collection = await initializeCollection(collectionName);

  await collection.upsert({
    ids: documents.map(d => d.id),
    embeddings: documents.map(d => d.embedding),
    metadatas: documents.map(d => d.metadata),
    documents: documents.map(d => d.document)
  });
}

/**
 * Query a ChromaDB collection by embedding vector.
 * Returns null on failure (graceful degradation).
 * @param {string} collectionName
 * @param {number[]} queryEmbedding
 * @param {{ nResults?: number, where?: object }} options
 * @returns {Promise<object|null>}
 */
export async function queryDocuments(collectionName, queryEmbedding, options = {}) {
  const { nResults = 3, where = {} } = options;

  try {
    const collection = await initializeCollection(collectionName);

    const queryParams = {
      queryEmbeddings: [queryEmbedding],
      nResults
    };

    // Only add where filter if it has keys (empty object causes ChromaDB errors)
    if (Object.keys(where).length > 0) {
      queryParams.where = where;
    }

    return await collection.query(queryParams);
  } catch (err) {
    logger.warn(`RAG: ChromaDB query failed for collection "${collectionName}":`, err.message);
    return null;
  }
}

/**
 * Delete a ChromaDB collection.
 * @param {string} collectionName
 */
export async function deleteCollection(collectionName) {
  const client = buildClient();
  await client.deleteCollection({ name: collectionName });
}

/**
 * Check if ChromaDB is reachable.
 * @returns {Promise<boolean>}
 */
export async function healthCheck() {
  try {
    const client = buildClient();
    await client.heartbeat();
    return true;
  } catch {
    return false;
  }
}
