#!/usr/bin/env node
// Run: node scripts/indexKnowledgeBase.js
// Or:  npm run rag:index

import 'dotenv/config';
import { indexAllCollections } from '../src/services/rag/indexer.js';

async function main() {
  console.log('Starting knowledge base indexing...');
  console.log(`ChromaDB: ${process.env.CHROMA_URL || 'http://localhost:8000'}`);
  console.log(`Embedding model: ${process.env.EMBEDDING_MODEL || 'nomic-embed-text'}`);
  console.log('');

  const summary = await indexAllCollections();

  console.log('\nIndexing complete:');
  console.log(`  Recipes:     ${summary.recipes} indexed`);
  console.log(`  Guidelines:  ${summary.guidelines} indexed`);
  console.log(`  Ingredients: ${summary.ingredients} indexed`);
  console.log(`  Errors:      ${summary.errors}`);

  if (summary.errors > 0) {
    console.warn(`\nWarning: ${summary.errors} item(s) failed to index. Check logs above.`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error during indexing:', err.message);
  process.exit(1);
});
