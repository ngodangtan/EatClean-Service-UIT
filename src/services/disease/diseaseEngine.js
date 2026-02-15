import { adjustMacrosForDiseases } from './macroAdjuster.js';
import { distributeMacros } from '../nutrition/mealMacroDistributor.js';
import { validateMealSafety } from './safetyValidator.js';
import { SUPPORTED_DISEASES } from './diseaseRules.js';
import logger from '../../utils/logger.js';

const FEASIBILITY_THRESHOLD = 0.10; // 10% tolerance for macro-calorie drift

/**
 * Apply disease-based macro adjustments to a nutrition plan.
 * Recalculates meal distribution after adjusting macros.
 * Includes a feasibility check to detect impossible macro combinations.
 *
 * @param {object} nutritionPlan - Output from generateNutritionPlan()
 * @param {object} healthProfile - User's health profile
 * @returns {object} Modified nutritionPlan with adjusted macros and distribution
 * @throws {Error} If disease combination produces infeasible macro distribution
 */
export function applyDiseaseAdjustments(nutritionPlan, healthProfile) {
  const { diseases, currentWeight, mealsPerDay } = healthProfile;

  // Issue 9: Warn about unsupported diseases
  const unsupportedDiseases = (diseases || []).filter(d => !SUPPORTED_DISEASES.includes(d));
  if (unsupportedDiseases.length > 0) {
    logger.warn(`Unsupported diseases ignored by disease engine: ${unsupportedDiseases.join(', ')}`);
  }

  const adjustedMacros = adjustMacrosForDiseases(
    nutritionPlan.macros,
    nutritionPlan.calorieTarget,
    diseases,
    currentWeight
  );

  // Issue 6: Feasibility check — verify adjusted macros still sum close to calorie target
  const reconstructedCalories = adjustedMacros.protein * 4 + adjustedMacros.carbs * 4 + adjustedMacros.fat * 9;
  const drift = Math.abs(reconstructedCalories - nutritionPlan.calorieTarget) / nutritionPlan.calorieTarget;
  if (drift > FEASIBILITY_THRESHOLD) {
    throw new Error(
      `The combination of health conditions produces an infeasible macro distribution ` +
      `(${reconstructedCalories} cal vs ${nutritionPlan.calorieTarget} cal target, ${Math.round(drift * 100)}% drift). ` +
      `Please consult a healthcare provider for a personalized dietary plan.`
    );
  }

  // Issue 8: Use reconstructed calories as effective total so downstream validation passes
  const effectiveCalories = reconstructedCalories;
  const totalMacros = { calories: effectiveCalories, ...adjustedMacros };
  const mealDistribution = distributeMacros(totalMacros, mealsPerDay);

  return {
    ...nutritionPlan,
    calorieTarget: effectiveCalories,
    macros: adjustedMacros,
    mealDistribution,
    unsupportedDiseases: unsupportedDiseases.length > 0 ? unsupportedDiseases : undefined
  };
}

/**
 * Post-AI validation for a generated meal.
 * Runs safety checks (ingredient filtering is done internally by safetyValidator).
 *
 * @param {{ name: string, ingredients: string[] }} meal
 * @param {string[]} diseases
 * @returns {{ safe: boolean, meal: object, reasons: string[] }}
 */
export function validateGeneratedMeal(meal, diseases) {
  if (!diseases || diseases.length === 0) {
    return { safe: true, meal, reasons: [] };
  }

  // Issue 4: Only call validateMealSafety (which internally calls filterIngredients)
  const safetyResult = validateMealSafety(meal, diseases);

  return {
    safe: safetyResult.valid,
    meal,
    reasons: safetyResult.reasons
  };
}
