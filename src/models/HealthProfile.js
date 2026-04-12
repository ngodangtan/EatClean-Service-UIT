import mongoose from 'mongoose';

/**
 * One health-test indicator value entered by the user.
 * `key` references diseaseCatalog.relatedIndicators[].key (stable, language-independent).
 * `unit` is snapshotted from the catalog at write time so historical records remain
 * interpretable if catalog units ever change.
 */
const indicatorValueSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    value: { type: Number, required: true },
    unit: { type: String },
    measuredAt: { type: Date },
    note: { type: String, maxlength: 500 }
  },
  { _id: false }
);

/**
 * One disease entry on a user's health profile.
 * `key` references diseaseCatalog.key. Validation against the catalog happens
 * in the controller (see catalog cross-check helper) so the model can stay
 * decoupled from the catalog file.
 */
const diseaseEntrySchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    diagnosedAt: { type: Date },
    indicators: { type: [indicatorValueSchema], default: [] }
  },
  { _id: false }
);

const healthProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    // Gender (auto-populated from User account)
    gender: { type: String, enum: ['male', 'female'] },

    // Age (auto-calculated from User birthday)
    age: { type: Number, min: 1, max: 120 },

    // 1) Mục tiêu ăn uống
    goal: { type: String, enum: ['lose-weight', 'gain-weight', 'improve-health'], default: 'improve-health' },
    
    // 2) Have you tried to eat healthy before but couldn't keep it consistent?
    triedHealthyBefore: { type: Boolean },
    
    // 3) What time of the day do you usually feel hungry?
    hungryTime: { type: String }, // e.g., 'morning', 'afternoon', 'evening', 'night'
    
    // 4) What is your favorite meal?
    favoriteMeal: { type: String },
    
    // 5) How tall are you? (in cm)
    height: { type: Number },
    
    // 6) What is your current weight? (in kg)
    currentWeight: { type: Number },

    // 7) How active are you?
    activityLevel: { type: String, enum: ['sedentary', 'lightly-active', 'moderately-active', 'very-active', 'extremely-active'] },
    
    // 9) Describe your average day
    averageDay: { type: String },
    
    // 10) What is your work schedule?
    workSchedule: { type: String }, // e.g., '9-5', 'flexible', 'shift-work'
    
    // 11) Sleep duration (in hours)
    sleepDuration: { type: Number },
    
    // 12) Diseases the user has, with optional medical-test indicator values.
    // Disease keys reference src/data/diseaseCatalog.js. Catalog cross-check
    // is performed in the controller, not via Mongoose enum, so adding a new
    // disease to the catalog requires no schema change.
    diseases: { type: [diseaseEntrySchema], default: [] },
    
    // 13) Pick your primary diet preference
    dietPreference: { type: String }, // e.g., 'omnivore', 'vegetarian', 'vegan', 'keto', 'paleo'
    
    // 14) How many meals per day do you prefer?
    mealsPerDay: { type: Number, min: 1, max: 6 },
    
    // 15) What cuisine do you prefer?
    cuisinePreference: [{ type: String }] // e.g., ['asian', 'mediterranean', 'indian']
  },
  { timestamps: true }
);

export default mongoose.model('HealthProfile', healthProfileSchema);
