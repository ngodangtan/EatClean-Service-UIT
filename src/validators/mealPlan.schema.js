import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true });

const macrosSchema = {
  type: 'object',
  properties: {
    protein: { type: 'number', minimum: 1 },
    carbs: { type: 'number', minimum: 0 },
    fat: { type: 'number', minimum: 1 }
  },
  required: ['protein', 'carbs', 'fat'],
  additionalProperties: false
};

const mealSchema = {
  type: 'object',
  properties: {
    mealType: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
    name: { type: 'string' },
    description: { type: 'string' },
    ingredients: { type: 'array', items: { type: 'string' } },
    benefits: { type: 'array', items: { type: 'string' } },
    calories: { type: 'number', minimum: 1 },
    macros: macrosSchema
  },
  required: ['mealType', 'name', 'calories', 'macros'],
  additionalProperties: false
};

const daySchema = {
  type: 'object',
  properties: {
    day: { type: 'integer', minimum: 1 },
    title: { type: 'string' },
    theme: { type: 'string' },
    macros: macrosSchema,
    totalCalories: { type: 'number', minimum: 0 },
    meals: { type: 'array', items: mealSchema, minItems: 1 },
    tips: { type: 'array', items: { type: 'string' } }
  },
  required: ['day', 'title', 'totalCalories', 'macros', 'meals'],
  additionalProperties: false
};

const mealPlanSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    days: { type: 'array', items: daySchema, minItems: 1 }
  },
  required: ['title', 'days'],
  additionalProperties: false
};

const validate = ajv.compile(mealPlanSchema);

export function validateMealPlan(data) {
  const valid = validate(data);
  return {
    valid,
    errors: valid ? null : validate.errors.map(e => `${e.instancePath} ${e.message}`)
  };
}
