import Favorite from '../models/Favorite.js';

export async function addFavorite(req, res) {
  try {
    const userId = req.user?.id;
    const { targetType, targetId, note } = req.body;

    if (!targetType || !targetId) {
      return res.status(400).json({ message: 'targetType and targetId are required' });
    }

    const existing = await Favorite.findOne({ userId, targetType, targetId });
    if (existing) return res.status(409).json({ message: 'Already in favorites' });

    const favorite = await Favorite.create({ userId, targetType, targetId, note });
    return res.status(201).json(favorite);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

export async function getFavorites(req, res) {
  try {
    const userId = req.user?.id;
    const { targetType } = req.query;
    const limit = parseInt(req.query.limit) || 20;
    const skip = parseInt(req.query.skip) || 0;

    const filter = { userId };
    if (targetType) filter.targetType = targetType;

    const favorites = await Favorite.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Favorite.countDocuments(filter);

    return res.json({ favorites, total, limit, skip });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

export async function removeFavorite(req, res) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const deleted = await Favorite.findOneAndDelete({ _id: id, userId });
    if (!deleted) return res.status(404).json({ message: 'Favorite not found' });

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

export async function checkFavorite(req, res) {
  try {
    const userId = req.user?.id;
    const { targetType, targetId } = req.query;

    if (!targetType || !targetId) {
      return res.status(400).json({ message: 'targetType and targetId query params are required' });
    }

    const exists = await Favorite.findOne({ userId, targetType, targetId });
    return res.json({ isFavorite: !!exists, favorite: exists });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}
