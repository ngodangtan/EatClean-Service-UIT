import { calculateBMR } from './bmrCalculator.js';
import { calculateTDEE } from './tdeeCalculator.js';
import { calculateCalorieTarget } from './calorieTargetCalculator.js';
import { calculateMacros } from './macroCalculator.js';
import { distributeMacros } from './mealMacroDistributor.js';

function validateInputs({ currentWeight, height, age, gender }) {
  const errors = [];
  if (typeof currentWeight !== 'number' || !Number.isFinite(currentWeight) || currentWeight < 20 || currentWeight > 500) {
    errors.push(`Invalid weight: ${currentWeight}. Must be a number between 20 and 500 kg.`);
  }
  if (typeof height !== 'number' || !Number.isFinite(height) || height < 50 || height > 300) {
    errors.push(`Invalid height: ${height}. Must be a number between 50 and 300 cm.`);
  }
  if (typeof age !== 'number' || !Number.isFinite(age) || age < 1 || age > 120) {
    errors.push(`Invalid age: ${age}. Must be a number between 1 and 120.`);
  }
  if (gender !== 'male' && gender !== 'female') {
    errors.push(`Invalid gender: ${gender}. Must be 'male' or 'female'.`);
  }
  if (errors.length > 0) {
    throw new Error(`Nutrition engine input validation failed: ${errors.join('; ')}`);
  }
}

export function generateNutritionPlan(healthProfile) {
  const { currentWeight, height, age, gender, activityLevel, goal, mealsPerDay } = healthProfile;

  validateInputs({ currentWeight, height, age, gender });

  const bmr = calculateBMR({ weight: currentWeight, height, age, gender });
  const tdee = calculateTDEE(bmr, activityLevel);
  const calorieTarget = calculateCalorieTarget(tdee, goal, gender);
  const macros = calculateMacros(calorieTarget, goal, currentWeight);

  const totalMacros = { calories: calorieTarget, ...macros };
  const mealDistribution = distributeMacros(totalMacros, mealsPerDay);

  return { bmr: Math.round(bmr), tdee: Math.round(tdee), calorieTarget, macros, mealDistribution };
}
