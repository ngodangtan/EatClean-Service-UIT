import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock embeddingClient and vectorStore before importing retriever
vi.mock('../../../../src/services/rag/embeddingClient.js', () => ({
  getEmbedding: vi.fn()
}));

vi.mock('../../../../src/services/rag/vectorStore.js', () => ({
  queryDocuments: vi.fn(),
  COLLECTIONS: { RECIPES: 'recipes', GUIDELINES: 'guidelines', INGREDIENTS: 'ingredients' }
}));

import { retrieveRelevantMeals, retrieveDiseaseGuidelines } from '../../../../src/services/rag/retriever.js';
import { getEmbedding } from '../../../../src/services/rag/embeddingClient.js';
import { queryDocuments } from '../../../../src/services/rag/vectorStore.js';

const MOCK_EMBEDDING = [0.1, 0.2, 0.3];
const MOCK_RESULT = {
  ids: [['rec_001']],
  documents: [['Grilled Salmon. lunch for lose-weight.']],
  metadatas: [[{ name: 'Grilled Salmon', mealType: 'lunch' }]],
  distances: [[0.1]]
};

beforeEach(() => {
  vi.clearAllMocks();
  // Default: RAG enabled
  process.env.RAG_ENABLED = 'true';
});

afterEach(() => {
  delete process.env.RAG_ENABLED;
});

describe('retrieveRelevantMeals', () => {
  it('returns null when RAG_ENABLED is false', async () => {
    process.env.RAG_ENABLED = 'false';
    const result = await retrieveRelevantMeals({ mealType: 'lunch', goal: 'lose-weight', diseases: [] });
    expect(result).toBeNull();
    expect(getEmbedding).not.toHaveBeenCalled();
  });

  it('returns null when embeddingClient returns null', async () => {
    getEmbedding.mockResolvedValue(null);
    const result = await retrieveRelevantMeals({ mealType: 'lunch', goal: 'lose-weight', diseases: [] });
    expect(result).toBeNull();
    expect(queryDocuments).not.toHaveBeenCalled();
  });

  it('builds correct query string from all params', async () => {
    getEmbedding.mockResolvedValue(MOCK_EMBEDDING);
    queryDocuments.mockResolvedValue(MOCK_RESULT);

    await retrieveRelevantMeals({
      mealType: 'breakfast',
      goal: 'gain-weight',
      diseases: ['diabetes'],
      cuisine: 'vietnamese',
      favoriteMeal: 'pho'
    });

    const calledWith = getEmbedding.mock.calls[0][0];
    expect(calledWith).toContain('breakfast');
    expect(calledWith).toContain('gain-weight');
    expect(calledWith).toContain('vietnamese');
    expect(calledWith).toContain('pho');
  });

  it('builds query string without null/empty fields', async () => {
    getEmbedding.mockResolvedValue(MOCK_EMBEDDING);
    queryDocuments.mockResolvedValue(MOCK_RESULT);

    await retrieveRelevantMeals({
      mealType: 'dinner',
      goal: 'improve-health',
      diseases: [],
      cuisine: null,
      favoriteMeal: null
    });

    const calledWith = getEmbedding.mock.calls[0][0];
    expect(calledWith).toContain('dinner');
    expect(calledWith).not.toContain('null');
    expect(calledWith).not.toContain('undefined');
  });

  it('passes mealType filter to queryDocuments', async () => {
    getEmbedding.mockResolvedValue(MOCK_EMBEDDING);
    queryDocuments.mockResolvedValue(MOCK_RESULT);

    await retrieveRelevantMeals({ mealType: 'snack', goal: 'improve-health', diseases: [] });

    expect(queryDocuments).toHaveBeenCalledWith(
      'recipes',
      MOCK_EMBEDDING,
      expect.objectContaining({ where: { mealType: 'snack' } })
    );
  });

  it('returns raw ChromaDB results on success', async () => {
    getEmbedding.mockResolvedValue(MOCK_EMBEDDING);
    queryDocuments.mockResolvedValue(MOCK_RESULT);

    const result = await retrieveRelevantMeals({ mealType: 'lunch', goal: 'lose-weight', diseases: [] });
    expect(result).toEqual(MOCK_RESULT);
  });
});

describe('retrieveDiseaseGuidelines', () => {
  it('returns empty array when RAG_ENABLED is false', async () => {
    process.env.RAG_ENABLED = 'false';
    const result = await retrieveDiseaseGuidelines(['diabetes']);
    expect(result).toEqual([]);
    expect(getEmbedding).not.toHaveBeenCalled();
  });

  it('returns empty array for empty diseases array', async () => {
    const result = await retrieveDiseaseGuidelines([]);
    expect(result).toEqual([]);
    expect(getEmbedding).not.toHaveBeenCalled();
  });

  it('returns empty array for null/undefined diseases', async () => {
    const result = await retrieveDiseaseGuidelines(null);
    expect(result).toEqual([]);
  });

  it('queries once per unique disease', async () => {
    getEmbedding.mockResolvedValue(MOCK_EMBEDDING);
    queryDocuments.mockResolvedValue(MOCK_RESULT);

    await retrieveDiseaseGuidelines(['diabetes', 'hypertension', 'diabetes']);

    // diabetes is deduplicated → should query exactly 2 times
    expect(queryDocuments).toHaveBeenCalledTimes(2);
  });

  it('uses disease metadata filter in query', async () => {
    getEmbedding.mockResolvedValue(MOCK_EMBEDDING);
    queryDocuments.mockResolvedValue(MOCK_RESULT);

    await retrieveDiseaseGuidelines(['diabetes']);

    expect(queryDocuments).toHaveBeenCalledWith(
      'guidelines',
      MOCK_EMBEDDING,
      expect.objectContaining({ where: { disease: 'diabetes' } })
    );
  });

  it('skips a disease if embedding fails but continues with others', async () => {
    getEmbedding
      .mockResolvedValueOnce(null)          // diabetes fails
      .mockResolvedValueOnce(MOCK_EMBEDDING); // hypertension succeeds
    queryDocuments.mockResolvedValue(MOCK_RESULT);

    const results = await retrieveDiseaseGuidelines(['diabetes', 'hypertension']);
    expect(results).toHaveLength(1);
  });
});
