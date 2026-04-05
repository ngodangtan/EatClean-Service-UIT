import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Recipe model before importing the controller
vi.mock('../../../src/models/Recipe.js', () => {
  const Recipe = {
    find: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  };
  return { default: Recipe };
});

import Recipe from '../../../src/models/Recipe.js';
import {
  listRecipes,
  getRecipe,
  createRecipe,
  updateRecipe,
  removeRecipe,
} from '../../../src/controllers/recipe.controller.js';

function mockRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => vi.clearAllMocks());

// ─── listRecipes ────────────────────────────────────────────────────────────

describe('listRecipes', () => {
  it('returns recipes without filter when no query params', async () => {
    const fakeItems = [{ title: 'Salad' }];
    Recipe.find.mockReturnValue({ sort: vi.fn().mockResolvedValue(fakeItems) });

    const req = { query: {} };
    const res = mockRes();
    await listRecipes(req, res);

    expect(Recipe.find).toHaveBeenCalledWith({});
    expect(res.json).toHaveBeenCalledWith(fakeItems);
  });

  it('escapes regex special characters in q param (ReDoS fix)', async () => {
    Recipe.find.mockReturnValue({ sort: vi.fn().mockResolvedValue([]) });

    const req = { query: { q: '(a+)+$' } };
    const res = mockRes();
    await listRecipes(req, res);

    const filterArg = Recipe.find.mock.calls[0][0];
    // The raw string must NOT appear — it must be escaped
    expect(filterArg.title.$regex).toBe('\\(a\\+\\)\\+\\$');
  });

  it('filters by tag when tag param is provided', async () => {
    Recipe.find.mockReturnValue({ sort: vi.fn().mockResolvedValue([]) });

    const req = { query: { tag: 'low-carb' } };
    const res = mockRes();
    await listRecipes(req, res);

    expect(Recipe.find).toHaveBeenCalledWith({ tags: 'low-carb' });
  });
});

// ─── getRecipe ───────────────────────────────────────────────────────────────

describe('getRecipe', () => {
  it('returns 404 when recipe not found', async () => {
    Recipe.findById.mockResolvedValue(null);

    const req = { params: { id: 'abc' } };
    const res = mockRes();
    await getRecipe(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns recipe when found', async () => {
    const fake = { title: 'Pasta' };
    Recipe.findById.mockResolvedValue(fake);

    const req = { params: { id: 'abc' } };
    const res = mockRes();
    await getRecipe(req, res);

    expect(res.json).toHaveBeenCalledWith(fake);
  });
});

// ─── createRecipe ────────────────────────────────────────────────────────────

describe('createRecipe', () => {
  it('creates recipe with author set from req.user', async () => {
    const created = { title: 'Soup', author: 'user1' };
    Recipe.create.mockResolvedValue(created);

    const req = { body: { title: 'Soup' }, user: { id: 'user1' } };
    const res = mockRes();
    await createRecipe(req, res);

    expect(Recipe.create).toHaveBeenCalledWith({ title: 'Soup', author: 'user1' });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(created);
  });
});

// ─── updateRecipe ────────────────────────────────────────────────────────────

describe('updateRecipe', () => {
  it('returns 404 when recipe does not exist', async () => {
    Recipe.findById.mockResolvedValue(null);

    const req = { params: { id: 'abc' }, body: {}, user: { id: 'user1' } };
    const res = mockRes();
    await updateRecipe(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 403 when user is not the owner', async () => {
    Recipe.findById.mockResolvedValue({ author: { toString: () => 'other-user' } });

    const req = { params: { id: 'abc' }, body: {}, user: { id: 'user1', role: 'user' } };
    const res = mockRes();
    await updateRecipe(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('allows update when user is the owner', async () => {
    const fake = { author: { toString: () => 'user1' } };
    Recipe.findById.mockResolvedValue(fake);
    const updated = { title: 'Updated' };
    Recipe.findByIdAndUpdate.mockResolvedValue(updated);

    const req = { params: { id: 'abc' }, body: { title: 'Updated' }, user: { id: 'user1', role: 'user' } };
    const res = mockRes();
    await updateRecipe(req, res);

    expect(res.json).toHaveBeenCalledWith(updated);
  });

  it('allows update when user is admin regardless of ownership', async () => {
    Recipe.findById.mockResolvedValue({ author: { toString: () => 'other-user' } });
    const updated = { title: 'Updated by admin' };
    Recipe.findByIdAndUpdate.mockResolvedValue(updated);

    const req = { params: { id: 'abc' }, body: {}, user: { id: 'admin1', role: 'admin' } };
    const res = mockRes();
    await updateRecipe(req, res);

    expect(res.json).toHaveBeenCalledWith(updated);
  });
});

// ─── removeRecipe ────────────────────────────────────────────────────────────

describe('removeRecipe', () => {
  it('returns 404 when recipe does not exist', async () => {
    Recipe.findById.mockResolvedValue(null);

    const req = { params: { id: 'abc' }, user: { id: 'user1' } };
    const res = mockRes();
    await removeRecipe(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 403 when user is not the owner', async () => {
    Recipe.findById.mockResolvedValue({ author: { toString: () => 'other-user' } });

    const req = { params: { id: 'abc' }, user: { id: 'user1', role: 'user' } };
    const res = mockRes();
    await removeRecipe(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('deletes and returns ok when user is the owner', async () => {
    const fake = { author: { toString: () => 'user1' }, deleteOne: vi.fn().mockResolvedValue({}) };
    Recipe.findById.mockResolvedValue(fake);

    const req = { params: { id: 'abc' }, user: { id: 'user1', role: 'user' } };
    const res = mockRes();
    await removeRecipe(req, res);

    expect(fake.deleteOne).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it('allows admin to delete any recipe', async () => {
    const fake = { author: { toString: () => 'other-user' }, deleteOne: vi.fn().mockResolvedValue({}) };
    Recipe.findById.mockResolvedValue(fake);

    const req = { params: { id: 'abc' }, user: { id: 'admin1', role: 'admin' } };
    const res = mockRes();
    await removeRecipe(req, res);

    expect(fake.deleteOne).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
});
