const CATEGORY_KEYWORDS = {
  Produce: [
    'lettuce', 'spinach', 'kale', 'broccoli', 'cauliflower', 'carrot', 'tomato',
    'onion', 'garlic', 'pepper', 'cucumber', 'zucchini', 'celery', 'cabbage',
    'mushroom', 'avocado', 'apple', 'banana', 'berry', 'berries', 'lemon', 'lime',
    'orange', 'grape', 'mango', 'watermelon', 'cherry', 'pear', 'peach',
    'sweet potato', 'potato', 'beet', 'asparagus', 'green bean', 'peas',
    'corn', 'eggplant', 'radish', 'ginger', 'herb', 'basil', 'cilantro',
    'parsley', 'mint', 'dill', 'leafy green'
  ],
  Protein: [
    'chicken', 'beef', 'pork', 'lamb', 'turkey', 'fish', 'salmon', 'tuna',
    'shrimp', 'tofu', 'tempeh', 'egg', 'sardine', 'cod', 'tilapia',
    'meat', 'sausage', 'bacon', 'ham'
  ],
  Dairy: [
    'milk', 'cheese', 'yogurt', 'butter', 'cream', 'cottage cheese',
    'mozzarella', 'parmesan', 'cheddar', 'whey', 'kefir'
  ],
  Grains: [
    'rice', 'bread', 'pasta', 'oat', 'oats', 'quinoa', 'flour', 'tortilla',
    'noodle', 'cereal', 'barley', 'couscous', 'wrap', 'pita', 'bagel'
  ],
  Pantry: [
    'oil', 'olive oil', 'coconut oil', 'vinegar', 'soy sauce', 'honey',
    'sugar', 'salt', 'pepper', 'spice', 'cinnamon', 'cumin', 'paprika',
    'turmeric', 'sauce', 'mustard', 'ketchup', 'nut', 'nuts', 'almond',
    'walnut', 'peanut', 'cashew', 'seed', 'seeds', 'flaxseed', 'chia',
    'lentil', 'lentils', 'chickpea', 'chickpeas', 'bean', 'beans',
    'canned', 'dried', 'broth', 'stock', 'coconut milk'
  ]
};

function categorize(ingredient) {
  const lower = ingredient.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) return category;
    }
  }
  return 'Other';
}

/**
 * Generate a categorized shopping list from a meal plan.
 * @param {object} mealPlan - Mongoose MealPlan document
 * @param {number} startDay - First day to include (inclusive)
 * @param {number} endDay - Last day to include (inclusive)
 * @returns {object} Categorized shopping list
 */
export function generateShoppingList(mealPlan, startDay = 1, endDay = Infinity) {
  const ingredientSet = new Set();

  for (const day of mealPlan.days) {
    if (day.day < startDay || day.day > endDay) continue;
    for (const meal of day.meals) {
      if (Array.isArray(meal.ingredients)) {
        for (const ing of meal.ingredients) {
          const trimmed = ing.trim();
          if (trimmed) ingredientSet.add(trimmed);
        }
      }
    }
  }

  const categorized = {};
  for (const ingredient of ingredientSet) {
    const category = categorize(ingredient);
    if (!categorized[category]) categorized[category] = [];
    categorized[category].push(ingredient);
  }

  // Sort within each category
  for (const category of Object.keys(categorized)) {
    categorized[category].sort();
  }

  return {
    totalItems: ingredientSet.size,
    dayRange: { startDay, endDay: endDay === Infinity ? 'all' : endDay },
    categories: categorized
  };
}
