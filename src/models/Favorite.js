import mongoose from 'mongoose';

const favoriteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['meal-plan', 'recipe'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    note: { type: String, maxlength: 500 }
  },
  { timestamps: true }
);

favoriteSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });

export default mongoose.model('Favorite', favoriteSchema);
