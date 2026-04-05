import Recipe from '../models/Recipe.js';

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function listRecipes(req, res) {
  const { q, tag } = req.query;
  const filter = {};
  if (q) filter.title = { $regex: escapeRegex(q), $options: 'i' };
  if (tag) filter.tags = tag;

  const items = await Recipe.find(filter).sort({ createdAt: -1 });
  res.json(items);
}

export async function getRecipe(req, res) {
  const item = await Recipe.findById(req.params.id);
  if (!item) return res.status(404).json({ message: 'Not found' });
  res.json(item);
}

export async function createRecipe(req, res) {
  const data = { ...req.body, author: req.user?.id };
  const created = await Recipe.create(data);
  res.status(201).json(created);
}

export async function updateRecipe(req, res) {
  const recipe = await Recipe.findById(req.params.id);
  if (!recipe) return res.status(404).json({ message: 'Not found' });

  const userId = req.user?.id;
  const isAdmin = req.user?.role === 'admin';
  if (!isAdmin && recipe.author?.toString() !== userId)
    return res.status(403).json({ message: 'Forbidden' });

  const updated = await Recipe.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
}

export async function removeRecipe(req, res) {
  const recipe = await Recipe.findById(req.params.id);
  if (!recipe) return res.status(404).json({ message: 'Not found' });

  const userId = req.user?.id;
  const isAdmin = req.user?.role === 'admin';
  if (!isAdmin && recipe.author?.toString() !== userId)
    return res.status(403).json({ message: 'Forbidden' });

  await recipe.deleteOne();
  res.json({ ok: true });
}
