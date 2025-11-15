import Recipe from '../models/Recipe.js';

export async function listRecipes(req, res) {
  const { q, tag } = req.query;
  const filter = {};
  if (q) filter.title = { $regex: q, $options: 'i' };
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
  const updated = await Recipe.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) return res.status(404).json({ message: 'Not found' });
  res.json(updated);
}

export async function removeRecipe(req, res) {
  const deleted = await Recipe.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ message: 'Not found' });
  res.json({ ok: true });
}
