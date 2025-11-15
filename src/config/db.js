import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Missing MONGODB_URI');

  mongoose.set('strictQuery', true);
  try {
    // Set a reasonable server selection timeout so failures surface quickly during development.
    // Mongoose v8 manages parser/driver options internally, so only set what we need.
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('✅ MongoDB connected');
  } catch (err) {
    // Provide more actionable logging for common Atlas connectivity issues.
    console.error('❌ MongoDB connection error. Possible causes:');
    console.error('- IP not whitelisted in Atlas Network Access (allow your IP or 0.0.0.0/0)');
    console.error('- Cluster paused or network/DNS issues');
    console.error('- Wrong user/password or database name in the connection string');
    console.error('Full error:');
    console.error(err);
    throw err;
  }
}
