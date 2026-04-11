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

// NOTE: Lists include BOTH Vietnamese terms (primary, since the AI now generates
// in Vietnamese) AND English terms (fallback, in case the LLM falls back to
// English loanwords or for backward compatibility with any English content).
// Matching is Unicode-aware via ingredientFilter.js.
const DISEASE_RULES = {
  'diabetes': {
    macroAdjustment: {
      maxCarbPct: 35        // cap carbs at 35% of total calories
    },
    forbiddenIngredients: [
      // Vietnamese
      'đường trắng', 'đường cát', 'đường tinh luyện', 'kẹo', 'nước ngọt',
      'siro', 'sữa đặc có đường', 'nước ép cô đặc', 'mật ong', 'caramel',
      'kẹo dẻo', 'bánh donut', 'bánh ngọt', 'kem tươi', 'ngũ cốc có đường',
      'chè', 'bánh kem', 'bánh quy ngọt',
      // English fallbacks
      'white sugar', 'candy', 'soda', 'syrup', 'sweetened condensed milk',
      'fruit juice concentrate', 'honey glazed', 'marshmallow',
      'donuts', 'pastry cream', 'sugary cereal'
    ],
    limitedIngredients: [
      // Vietnamese
      'cơm trắng', 'gạo trắng', 'bánh mì trắng', 'khoai tây', 'siro bắp',
      'trái cây sấy', 'yến mạch ăn liền', 'chuối', 'xoài', 'nho',
      // English
      'white rice', 'white bread', 'potato', 'corn syrup', 'dried fruit',
      'instant oatmeal', 'banana', 'mango', 'grape'
    ],
    preferredIngredients: [
      // Vietnamese
      'diêm mạch', 'gạo lứt', 'yến mạch', 'khoai lang', 'rau xanh',
      'đậu lăng', 'đậu gà', 'quả mọng', 'các loại hạt', 'quế',
      // English
      'quinoa', 'brown rice', 'oats', 'sweet potato', 'leafy greens',
      'lentils', 'chickpeas', 'berries', 'nuts', 'cinnamon'
    ]
  },

  'kidney-disease': {
    macroAdjustment: {
      maxProteinPerKg: 0.8   // cap protein at 0.8g per kg bodyweight
    },
    forbiddenIngredients: [
      // Vietnamese
      'thịt xông khói', 'xúc xích', 'lạp xưởng', 'jambon', 'giăm bông',
      'dưa muối', 'dưa chua', 'nước tương', 'xì dầu', 'tương miso',
      'súp đóng hộp', 'phô mai chế biến', 'mì gói', 'mì ăn liền',
      'hạt rang muối', 'cá cơm', 'khô bò', 'khô cá', 'nước mắm',
      'mắm tôm', 'mắm nêm', 'chao',
      // English
      'bacon', 'salami', 'sausage', 'ham', 'pickles', 'soy sauce',
      'miso paste', 'canned soup', 'processed cheese', 'instant noodles',
      'salted nuts', 'anchovies', 'jerky', 'fish sauce'
    ],
    limitedIngredients: [
      // Vietnamese
      'cà chua', 'chuối', 'cam', 'khoai tây', 'rau bina', 'rau chân vịt',
      'bơ', 'sô cô la', 'sữa bò', 'sữa chua', 'đậu khô',
      // English
      'tomato', 'banana', 'orange', 'potato', 'spinach', 'avocado',
      'chocolate', 'dairy milk', 'yogurt', 'dried beans'
    ],
    preferredIngredients: [
      // Vietnamese
      'súp lơ', 'bắp cải', 'ớt chuông', 'dưa leo', 'dưa chuột', 'táo',
      'lòng trắng trứng', 'cơm', 'mì ống', 'dầu ô liu', 'rau thơm',
      // English
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
      // Vietnamese
      'nội tạng', 'lòng', 'gan', 'thận', 'cật', 'óc', 'tim', 'lá lách',
      'cá cơm', 'cá mòi', 'cá trích', 'cá thu', 'sò điệp', 'vẹm',
      'bia', 'rượu bia', 'nước hầm xương đậm đặc', 'bột nêm thịt',
      'cao thịt', 'chiết xuất men',
      // English
      'organ meat', 'liver', 'kidney', 'sweetbread', 'anchovies', 'sardines',
      'herring', 'mackerel', 'scallops', 'mussels', 'beer', 'gravy',
      'meat extract', 'yeast extract', 'broth concentrate'
    ],
    limitedIngredients: [
      // Vietnamese
      'thịt đỏ', 'thịt bò', 'thịt heo', 'thịt lợn', 'thịt cừu',
      'hải sản có vỏ', 'tôm', 'cua', 'nấm', 'măng tây',
      'rau bina', 'súp lơ trắng', 'đậu khô', 'đậu lăng',
      // English
      'red meat', 'pork', 'lamb', 'shellfish', 'mushroom', 'asparagus',
      'spinach', 'cauliflower', 'dried beans', 'lentils'
    ],
    preferredIngredients: [
      // Vietnamese
      'ức gà', 'đậu hũ', 'đậu phụ', 'trứng', 'sữa ít béo', 'anh đào',
      'cherry', 'cơm', 'yến mạch', 'dưa leo', 'cần tây', 'dưa hấu',
      // English
      'chicken breast', 'tofu', 'egg', 'low-fat dairy',
      'rice', 'oats', 'cucumber', 'celery', 'watermelon'
    ]
  },

  'hypertension': {
    macroAdjustment: {
      maxFatPct: 25          // limit saturated fat
    },
    forbiddenIngredients: [
      // Vietnamese
      'muối ăn', 'muối tinh', 'nước tương', 'xì dầu', 'nước mắm',
      'mắm tôm', 'mắm nêm', 'dưa muối', 'ô liu muối', 'súp đóng hộp',
      'phô mai chế biến', 'lạp xưởng', 'xúc xích', 'thịt xông khói',
      'snack khoai tây', 'bim bim', 'mì gói', 'mì ăn liền',
      'viên nêm', 'hạt nêm', 'bột canh', 'tương cà', 'sốt cà chua đóng hộp',
      // English
      'table salt', 'soy sauce', 'fish sauce', 'pickles', 'olives',
      'canned soup', 'processed cheese', 'salami', 'hot dog', 'bacon',
      'chips', 'pretzels', 'instant noodles', 'bouillon cube', 'ketchup'
    ],
    limitedIngredients: [
      // Vietnamese
      'bánh mì', 'rau củ đóng hộp', 'thức ăn đông lạnh chế biến sẵn',
      'gia vị chế biến sẵn', 'phô mai', 'bơ động vật', 'thịt đỏ',
      'thịt nguội',
      // English
      'bread', 'canned vegetables', 'frozen dinners', 'condiments',
      'cheese', 'butter', 'red meat', 'deli meat'
    ],
    preferredIngredients: [
      // Vietnamese
      'chuối', 'rau xanh', 'quả mọng', 'cá hồi', 'tỏi', 'yến mạch',
      'củ dền', 'khoai lang', 'bơ', 'hạt không muối',
      // English
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
