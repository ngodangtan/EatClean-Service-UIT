import Joi from 'joi';
import { getDiseaseByKey } from '../data/diseaseCatalog.js';

const indicatorValueSchema = Joi.object({
  key: Joi.string().trim().required(),
  value: Joi.number().required(),
  unit: Joi.string().trim().allow('', null),
  measuredAt: Joi.date(),
  note: Joi.string().trim().max(500).allow('', null)
});

const diseaseEntrySchema = Joi.object({
  key: Joi.string().trim().required(),
  diagnosedAt: Joi.date(),
  indicators: Joi.array().items(indicatorValueSchema).default([])
});

export const healthProfileSchema = Joi.object({
  goal: Joi.string().valid('lose-weight', 'gain-weight', 'improve-health'),
  triedHealthyBefore: Joi.boolean(),
  hungryTime: Joi.string().trim(),
  favoriteMeal: Joi.string().trim(),
  desiredWeight: Joi.number().min(1).max(500),
  activityLevel: Joi.string().valid('sedentary', 'lightly-active', 'moderately-active', 'very-active', 'extremely-active'),
  averageDay: Joi.string().trim(),
  workSchedule: Joi.string().trim(),
  sleepDuration: Joi.number().min(0).max(24),
  diseases: Joi.array().items(diseaseEntrySchema),
  dietPreference: Joi.string().trim(),
  mealsPerDay: Joi.number().integer().min(1).max(6),
  cuisinePreference: Joi.array().items(Joi.string().trim()).max(10)
});

/**
 * Cross-check disease entries against the catalog. Validates that:
 *  - Each disease.key exists in the catalog.
 *  - Each indicator.key belongs to that disease's relatedIndicators.
 *  - No duplicate disease keys in a single payload.
 *
 * Joi can't see the catalog cleanly, so this runs after Joi validation.
 *
 * @param {Array} diseases — diseases array from validated request body
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateDiseasesAgainstCatalog(diseases) {
  if (!Array.isArray(diseases) || diseases.length === 0) {
    return { valid: true, errors: [] };
  }

  const errors = [];
  const seenDiseaseKeys = new Set();

  for (let i = 0; i < diseases.length; i++) {
    const entry = diseases[i];
    const path = `diseases[${i}]`;

    if (seenDiseaseKeys.has(entry.key)) {
      errors.push(`${path}.key: duplicate disease "${entry.key}"`);
      continue;
    }
    seenDiseaseKeys.add(entry.key);

    const catalogEntry = getDiseaseByKey(entry.key);
    if (!catalogEntry) {
      errors.push(`${path}.key: "${entry.key}" is not a known disease. Use GET /api/diseases for the valid list.`);
      continue;
    }

    if (!Array.isArray(entry.indicators)) continue;

    const seenIndicatorKeys = new Set();
    for (let j = 0; j < entry.indicators.length; j++) {
      const ind = entry.indicators[j];
      const indPath = `${path}.indicators[${j}]`;

      if (seenIndicatorKeys.has(ind.key)) {
        errors.push(`${indPath}.key: duplicate indicator "${ind.key}" for disease "${entry.key}"`);
        continue;
      }
      seenIndicatorKeys.add(ind.key);

      if (!catalogEntry.indicatorKeySet.has(ind.key)) {
        errors.push(
          `${indPath}.key: "${ind.key}" is not a valid indicator for "${entry.key}". ` +
          `Valid keys: ${[...catalogEntry.indicatorKeySet].join(', ')}`
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Enrich indicator entries with the unit from the catalog (if not provided by client).
 * Called after cross-check passes. Mutates `diseases` in place and returns it.
 */
export function snapshotIndicatorUnits(diseases) {
  if (!Array.isArray(diseases)) return diseases;

  for (const entry of diseases) {
    const catalogEntry = getDiseaseByKey(entry.key);
    if (!catalogEntry || !Array.isArray(entry.indicators)) continue;

    for (const ind of entry.indicators) {
      if (ind.unit) continue;
      const catalogInd = catalogEntry.indicatorByKey.get(ind.key);
      if (catalogInd) ind.unit = catalogInd.unit;
    }
  }

  return diseases;
}
