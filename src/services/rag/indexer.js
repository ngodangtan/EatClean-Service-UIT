import { readFile, readdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { getEmbeddingBatch } from './embeddingClient.js';
import { initializeCollection, upsertDocuments, deleteCollection, COLLECTIONS } from './vectorStore.js';
import logger from '../../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KB_DIR = join(__dirname, '../../data/knowledgeBase');

/**
 * Read and parse a single knowledge base JSON file.
 */
async function readKnowledgeBase(filename) {
  const content = await readFile(join(KB_DIR, filename), 'utf-8');
  return JSON.parse(content);
}

/**
 * Read and merge all JSON files inside a knowledge base subdirectory.
 */
async function readKnowledgeBaseDir(dirName) {
  const dir = join(KB_DIR, dirName);
  const files = (await readdir(dir)).filter(f => f.endsWith('.json')).sort();
  const chunks = await Promise.all(
    files.map(async f => JSON.parse(await readFile(join(dir, f), 'utf-8')))
  );
  return chunks.flat();
}

/**
 * Index all knowledge base collections.
 * @returns {Promise<{ recipes: number, guidelines: number, errors: number }>}
 */
export async function indexAllCollections() {
  const r = await indexRecipes();
  const g = await indexGuidelines();
  return {
    recipes: r.indexed,
    guidelines: g.indexed,
    errors: r.errors + g.errors
  };
}

/**
 * Index recipes.json into the RECIPES collection.
 */
export async function indexRecipes() {
  await deleteCollection(COLLECTIONS.RECIPES).catch(() => {});
  await initializeCollection(COLLECTIONS.RECIPES);
  const recipes = await readKnowledgeBaseDir('recipes');

  let indexed = 0;
  let errors = 0;

  // Process in batches of 10
  for (let i = 0; i < recipes.length; i += 10) {
    const batch = recipes.slice(i, i + 10);

    const documentStrings = batch.map(r =>
      `${r.name}. ${r.mealType} for ${r.goal.join(', ')}. Ingredients: ${r.ingredients.join(', ')}. ${r.description}${r.estimatedCalories ? ` Estimated calories: ${r.estimatedCalories} kcal.` : ''}`
    );

    const embeddings = await getEmbeddingBatch(documentStrings);

    for (let j = 0; j < batch.length; j++) {
      const recipe = batch[j];

      if (!embeddings || !embeddings[j]) {
        logger.warn(`RAG Indexer: Failed to embed recipe "${recipe.name}" — skipping`);
        errors++;
        continue;
      }

      try {
        await upsertDocuments(COLLECTIONS.RECIPES, [{
          id: recipe.id,
          embedding: embeddings[j],
          metadata: {
            name: recipe.name,
            mealType: recipe.mealType,
            cuisine: recipe.cuisine,
            goal: recipe.goal.join(','),
            diseaseCompatible: recipe.diseaseCompatible.join(','),
            tags: recipe.tags.join(','),
            estimatedCalories: recipe.estimatedCalories ?? 0
          },
          document: documentStrings[j]
        }]);
        indexed++;
      } catch (err) {
        logger.warn(`RAG Indexer: Failed to upsert recipe "${recipe.name}":`, err.message);
        errors++;
      }
    }

    logger.info(`RAG Indexer: Recipes progress ${Math.min(i + 10, recipes.length)}/${recipes.length}`);
  }

  logger.info(`RAG Indexer: Recipes done — indexed ${indexed}, errors ${errors}`);
  return { indexed, errors };
}

/**
 * Index diseaseGuidelines.json into the GUIDELINES collection.
 */
export async function indexGuidelines() {
  await deleteCollection(COLLECTIONS.GUIDELINES).catch(() => {});
  await initializeCollection(COLLECTIONS.GUIDELINES);
  const guidelines = await readKnowledgeBase('diseaseGuidelines.json');

  let indexed = 0;
  let errors = 0;

  const documentStrings = guidelines.map(g =>
    `${g.disease}: ${g.summary}. Tips: ${g.mealTips.join('. ')}`
  );

  const embeddings = await getEmbeddingBatch(documentStrings);

  for (let i = 0; i < guidelines.length; i++) {
    const guide = guidelines[i];

    if (!embeddings || !embeddings[i]) {
      logger.warn(`RAG Indexer: Failed to embed guideline "${guide.disease}" — skipping`);
      errors++;
      continue;
    }

    try {
      await upsertDocuments(COLLECTIONS.GUIDELINES, [{
        id: guide.id,
        embedding: embeddings[i],
        metadata: { disease: guide.disease, type: 'guideline' },
        document: documentStrings[i]
      }]);
      indexed++;
    } catch (err) {
      logger.warn(`RAG Indexer: Failed to upsert guideline "${guide.disease}":`, err.message);
      errors++;
    }
  }

  logger.info(`RAG Indexer: Guidelines done — indexed ${indexed}, errors ${errors}`);
  return { indexed, errors };
}

