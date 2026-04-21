import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import TokenBlacklist from '../models/TokenBlacklist.js';
import HealthProfile from '../models/HealthProfile.js';
import MealPlan from '../models/MealPlan.js';
import logger from '../utils/logger.js';

function signAccessToken(user) {
  return jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
}

function generateRefreshToken() {
  return crypto.randomBytes(40).toString('hex');
}

export async function register(req, res) {
  try {
    const { email, password, name, username, phone, fullName, birthday, gender, height, currentWeight } = req.body;
    const requestedUsername = username || name;
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already registered' });

    const user = await User.create({ email, password, username: requestedUsername, phone, fullName, birthday, gender, height, currentWeight });

    const accessToken = signAccessToken(user);
    const refreshToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    user.refreshTokens.push({ token: refreshToken, expiresAt });
    await user.save();

    return res.status(201).json({
      accessToken,
      refreshToken,
      user: { id: user._id, email: user.email, username: user.username, fullName: user.fullName, phone: user.phone, birthday: user.birthday, gender: user.gender, height: user.height, currentWeight: user.currentWeight }
    });
  } catch (e) {
    logger.error('register error', { error: e.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' });

    const accessToken = signAccessToken(user);
    const refreshToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    user.refreshTokens.push({ token: refreshToken, expiresAt });
    await user.save();

    return res.json({
      accessToken,
      refreshToken,
      user: { id: user._id, email: user.email, username: user.username, fullName: user.fullName, phone: user.phone, birthday: user.birthday, gender: user.gender }
    });
  } catch (e) {
    logger.error('login error', { error: e.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function logout(req, res) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (token) {
      // Decode to get expiry, then blacklist
      const decoded = jwt.decode(token);
      const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 15 * 60 * 1000);
      await TokenBlacklist.create({ token, expiresAt });
    }

    // Remove refresh token if provided
    const { refreshToken } = req.body;
    if (refreshToken) {
      await User.findByIdAndUpdate(req.user.id, {
        $pull: { refreshTokens: { token: refreshToken } }
      });
    }

    return res.json({ ok: true });
  } catch (e) {
    logger.error('logout error', { error: e.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function refreshToken(req, res) {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return res.status(400).json({ message: 'Refresh token required' });

    const user = await User.findOne({
      'refreshTokens.token': token,
      'refreshTokens.expiresAt': { $gt: new Date() }
    });

    if (!user) return res.status(401).json({ message: 'Invalid or expired refresh token' });

    const accessToken = signAccessToken(user);
    return res.json({ accessToken });
  } catch (e) {
    logger.error('refreshToken error', { error: e.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function revokeToken(req, res) {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return res.status(400).json({ message: 'Refresh token required' });

    await User.findByIdAndUpdate(req.user.id, {
      $pull: { refreshTokens: { token } }
    });

    return res.json({ ok: true });
  } catch (e) {
    logger.error('revokeToken error', { error: e.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getProfile(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const user = await User.findById(userId).select('-password -refreshTokens');
    if (!user) return res.status(404).json({ message: 'User not found' });

    return res.json({
      id: user._id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      phone: user.phone,
      birthday: user.birthday,
      gender: user.gender,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (e) {
    logger.error('getProfile error', { error: e.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function updateProfile(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { fullName, phone, birthday, gender, username } = req.body;

    // Check username uniqueness if changing
    if (username) {
      const existing = await User.findOne({ username, _id: { $ne: userId } });
      if (existing) return res.status(409).json({ message: 'Username already taken' });
    }

    const updates = {};
    if (fullName !== undefined) updates.fullName = fullName;
    if (phone !== undefined) updates.phone = phone;
    if (birthday !== undefined) updates.birthday = birthday;
    if (gender !== undefined) updates.gender = gender;
    if (username !== undefined) updates.username = username;

    const user = await User.findByIdAndUpdate(userId, updates, { new: true }).select('-password -refreshTokens');
    if (!user) return res.status(404).json({ message: 'User not found' });

    return res.json({
      id: user._id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      phone: user.phone,
      birthday: user.birthday,
      gender: user.gender,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (e) {
    logger.error('updateProfile error', { error: e.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function removeUser(req, res) {
  try {
    const targetId = req.params.id;
    const requesterId = req.user?.id;

    if (!requesterId) return res.status(401).json({ message: 'Unauthorized' });

    const requester = await User.findById(requesterId);
    if (!requester) return res.status(401).json({ message: 'Unauthorized' });

    if (requester.role !== 'admin' && requesterId !== targetId)
      return res.status(403).json({ message: 'Forbidden' });

    const deleted = await User.findByIdAndDelete(targetId);
    if (!deleted) return res.status(404).json({ message: 'User not found' });

    // Cascade-delete all data owned by this user
    await Promise.all([
      HealthProfile.deleteMany({ userId: targetId }),
      MealPlan.deleteMany({ userId: targetId })
    ]);

    return res.json({ ok: true });
  } catch (e) {
    logger.error('removeUser error', { error: e.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
}
