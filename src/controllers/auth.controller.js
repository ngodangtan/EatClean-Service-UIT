import jwt from 'jsonwebtoken';
import User from '../models/User.js';

function sign(user) {
  return jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

export async function register(req, res) {
  try {
    const { email, password, name } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already registered' });

    const user = await User.create({ email, password, name });
    return res.status(201).json({ token: sign(user), user: { id: user._id, email: user.email, name: user.name } });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' });

    return res.json({ token: sign(user), user: { id: user._id, email: user.email, name: user.name } });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}
