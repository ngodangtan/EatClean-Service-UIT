import mongoose from 'mongoose';

const mealPlanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    healthProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthProfile' },
    // Generation intent — set by POST /api/meal-plans/generate.
    // daily_health_based  — single-day plan from Apple Watch + profile
    // weight_management   — 1/2/4-week plan tied to a request-scoped weightGoal + desiredWeight
    // disease_based       — 1/2/4-week plan focused on managing existing conditions
    purpose: {
      type: String,
      enum: ['daily_health_based', 'weight_management', 'disease_based']
    },
    title: { type: String }, // e.g., "7-Day Meal Plan"
    days: [
      {
        day: { type: Number }, // 1-7 or more
        title: { type: String }, // e.g., "Day 1"
        theme: { type: String }, // e.g., "Olive oil & colorful greens"
        macros: {
          protein: { type: Number }, // grams
          carbs: { type: Number },   // grams
          fat: { type: Number }      // grams
        },
        totalCalories: { type: Number },
        meals: [
          {
            mealType: { type: String }, // breakfast, lunch, dinner, snack
            name: { type: String },
            description: { type: String },
            ingredients: [{ type: String }],
            benefits: [{ type: String }],
            imageUrl: { type: String },
            calories: { type: Number },
            macros: {
              protein: { type: Number },
              carbs: { type: Number },
              fat: { type: Number }
            }
          }
        ],
        tips: [{ type: String }] // tips for the day
      }
    ],
    aiModel: { type: String, default: 'lm-studio' }, // which AI generated this
    prompt: { type: String }, // the prompt sent to LM Studio
    rawAiResponse: { type: String }, // raw response from LM Studio
    notes: { type: String },
    duration: {
      weeks: { type: Number },
      totalDays: { type: Number }
    },
  },
  { timestamps: true }
);

mealPlanSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('MealPlan', mealPlanSchema);
