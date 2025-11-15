import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Missing MONGODB_URI');

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { dbName: undefined }); // dbName trong URI
  console.log('✅ MongoDB connected');
}
