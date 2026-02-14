import mongoose from 'mongoose';

const mealPlanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    healthProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthProfile' },
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
    }
  },
  { timestamps: true }
);

export default mongoose.model('MealPlan', mealPlanSchema);
