import mongoose from 'mongoose';
import logger from '../utils/logger.js';

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Missing MONGODB_URI');

  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    logger.info('MongoDB connected');
  } catch (err) {
    logger.error('MongoDB connection error. Possible causes:');
    logger.error('- IP not whitelisted in Atlas Network Access (allow your IP or 0.0.0.0/0)');
    logger.error('- Cluster paused or network/DNS issues');
    logger.error('- Wrong user/password or database name in the connection string');
    logger.error('Full error:', err);
    throw err;
  }
}
