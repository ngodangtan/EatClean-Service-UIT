import mongoose from 'mongoose';

const recipeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    tags: [{ type: String }],         // ví dụ: ['eat-clean', 'low-carb']
    ingredients: [{ type: String }],  // danh sách nguyên liệu
    steps: [{ type: String }],        // hướng dẫn chế biến
    imageUrl: { type: String },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

recipeSchema.index({ title: 'text' });
recipeSchema.index({ tags: 1 });
recipeSchema.index({ author: 1 });

export default mongoose.model('Recipe', recipeSchema);
