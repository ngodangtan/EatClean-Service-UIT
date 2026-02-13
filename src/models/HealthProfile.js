import mongoose from 'mongoose';

const healthProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    // Gender (required for BMR calculation)
    gender: { type: String, enum: ['male', 'female'], required: true },

    // Age (required for BMR calculation)
    age: { type: Number, min: 1, max: 120, required: true },

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
    
    // 7) What is your desired weight? (in kg)
    desiredWeight: { type: Number },
    
    // 8) How active are you?
    activityLevel: { type: String, enum: ['sedentary', 'lightly-active', 'moderately-active', 'very-active', 'extremely-active'] },
    
    // 9) Describe your average day
    averageDay: { type: String },
    
    // 10) What is your work schedule?
    workSchedule: { type: String }, // e.g., '9-5', 'flexible', 'shift-work'
    
    // 11) Sleep duration (in hours)
    sleepDuration: { type: Number },
    
    // 12) Do you have any of these diseases? (array of disease names)
    diseases: [{ type: String, enum: ['diabetes', 'kidney-disease', 'high-uric-acid', 'hypertension'] }],
    
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
