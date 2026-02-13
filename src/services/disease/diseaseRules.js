/**
 * Disease-specific nutrition rules and ingredient restrictions.
 * Covers: diabetes, kidney-disease, high-uric-acid, hypertension.
 *
 * NOTE on sodium/sugar/potassium: These micronutrient limits are NOT enforced
 * programmatically because the system has no nutrition database to estimate
 * micronutrient content from ingredient names. Instead, high-sodium/high-sugar
 * foods are covered by the forbiddenIngredients blacklists as a proxy.
 * Full enforcement would require integrating a food composition database
 * (e.g. USDA FoodData Central).
 */

export const SUPPORTED_DISEASES = [
  'diabetes', 'kidney-disease', 'high-uric-acid', 'hypertension'
];

const DISEASE_RULES = {
  'diabetes': {
    macroAdjustment: {
      maxCarbPct: 35        // cap carbs at 35% of total calories
    },
    forbiddenIngredients: [
      'white sugar', 'candy', 'soda', 'syrup', 'sweetened condensed milk',
      'fruit juice concentrate', 'honey glazed', 'caramel', 'marshmallow',
      'donuts', 'pastry cream', 'sugary cereal'
    ],
    limitedIngredients: [
      'white rice', 'white bread', 'potato', 'corn syrup', 'dried fruit',
      'instant oatmeal', 'banana', 'mango', 'grape'
    ],
    preferredIngredients: [
      'quinoa', 'brown rice', 'oats', 'sweet potato', 'leafy greens',
      'lentils', 'chickpeas', 'berries', 'nuts', 'cinnamon'
    ]
  },

  'kidney-disease': {
    macroAdjustment: {
      maxProteinPerKg: 0.8   // cap protein at 0.8g per kg bodyweight
    },
    forbiddenIngredients: [
      'bacon', 'salami', 'sausage', 'ham', 'pickles', 'soy sauce',
      'miso paste', 'canned soup', 'processed cheese', 'instant noodles',
      'salted nuts', 'anchovies', 'jerky', 'fish sauce'
    ],
    limitedIngredients: [
      'tomato', 'banana', 'orange', 'potato', 'spinach', 'avocado',
      'chocolate', 'dairy milk', 'yogurt', 'dried beans'
    ],
    preferredIngredients: [
      'cauliflower', 'cabbage', 'bell pepper', 'cucumber', 'apple',
      'egg whites', 'rice', 'pasta', 'olive oil', 'herbs'
    ]
  },

  'high-uric-acid': {
    macroAdjustment: {
      maxProteinPct: 30,     // moderate protein to reduce purine load
      maxFatPct: 25          // limit fat to reduce uric acid
    },
    forbiddenIngredients: [
      'organ meat', 'liver', 'kidney', 'sweetbread', 'anchovies', 'sardines',
      'herring', 'mackerel', 'scallops', 'mussels', 'beer', 'gravy',
      'meat extract', 'yeast extract', 'broth concentrate'
    ],
    limitedIngredients: [
      'red meat', 'pork', 'lamb', 'shellfish', 'mushroom', 'asparagus',
      'spinach', 'cauliflower', 'dried beans', 'lentils'
    ],
    preferredIngredients: [
      'chicken breast', 'tofu', 'egg', 'low-fat dairy', 'cherry',
      'rice', 'oats', 'cucumber', 'celery', 'watermelon'
    ]
  },

  'hypertension': {
    macroAdjustment: {
      maxFatPct: 25          // limit saturated fat
    },
    forbiddenIngredients: [
      'table salt', 'soy sauce', 'fish sauce', 'pickles', 'olives',
      'canned soup', 'processed cheese', 'salami', 'hot dog', 'bacon',
      'chips', 'pretzels', 'instant noodles', 'bouillon cube', 'ketchup'
    ],
    limitedIngredients: [
      'bread', 'canned vegetables', 'frozen dinners', 'condiments',
      'cheese', 'butter', 'red meat', 'deli meat'
    ],
    preferredIngredients: [
      'banana', 'leafy greens', 'berries', 'salmon', 'garlic',
      'oats', 'beets', 'sweet potato', 'avocado', 'unsalted nuts'
    ]
  }
};

/**
 * Get rules for a specific disease.
 * @param {string} diseaseName
 * @returns {object|null} Disease rules or null if unknown
 */
export function getDiseaseRules(diseaseName) {
  return DISEASE_RULES[diseaseName] || null;
}

/**
 * Get combined forbidden ingredients for multiple diseases.
 * @param {string[]} diseases
 * @returns {string[]} Deduplicated forbidden ingredient list
 */
export function getForbiddenIngredients(diseases) {
  if (!Array.isArray(diseases) || diseases.length === 0) return [];

  const forbidden = new Set();
  for (const disease of diseases) {
    const rules = DISEASE_RULES[disease];
    if (rules) {
      for (const ingredient of rules.forbiddenIngredients) {
        forbidden.add(ingredient);
      }
    }
  }
  return [...forbidden];
}

/**
 * Get combined limited ingredients for multiple diseases.
 * @param {string[]} diseases
 * @returns {string[]} Deduplicated limited ingredient list
 */
export function getLimitedIngredients(diseases) {
  if (!Array.isArray(diseases) || diseases.length === 0) return [];

  const limited = new Set();
  for (const disease of diseases) {
    const rules = DISEASE_RULES[disease];
    if (rules) {
      for (const ingredient of rules.limitedIngredients) {
        limited.add(ingredient);
      }
    }
  }
  return [...limited];
}

/**
 * Get combined preferred ingredients for multiple diseases.
 * @param {string[]} diseases
 * @returns {string[]} Deduplicated preferred ingredient list
 */
export function getPreferredIngredients(diseases) {
  if (!Array.isArray(diseases) || diseases.length === 0) return [];

  const preferred = new Set();
  for (const disease of diseases) {
    const rules = DISEASE_RULES[disease];
    if (rules) {
      for (const ingredient of rules.preferredIngredients) {
        preferred.add(ingredient);
      }
    }
  }
  return [...preferred];
}
