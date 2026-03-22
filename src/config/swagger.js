const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Eat Clean API',
    version: '1.0.0',
    description: 'Minimal OpenAPI spec for the Eat Clean service'
  },
  servers: [
    { url: 'http://localhost:4000', description: 'Local development server' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string' },
          username: { type: 'string' },
          fullName: { type: 'string' },
          phone: { type: 'string' },
          birthday: { type: 'string', format: 'date' },
          gender: { type: 'string', enum: ['male', 'female', 'other'] },
          role: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Register: {
        type: 'object',
        required: ['email', 'password'],
        properties: { email: { type: 'string' }, password: { type: 'string' }, username: { type: 'string' }, fullName: { type: 'string' }, phone: { type: 'string' }, birthday: { type: 'string', format: 'date' }, gender: { type: 'string', enum: ['male', 'female', 'other'] } }
      },
      Login: {
        type: 'object',
        required: ['email', 'password'],
        properties: { email: { type: 'string' }, password: { type: 'string' } }
      },
      HealthProfile: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          gender: { type: 'string', enum: ['male', 'female'] },
          age: { type: 'number', description: 'Age in years' },
          goal: { type: 'string', enum: ['lose-weight', 'gain-weight', 'improve-health'] },
          triedHealthyBefore: { type: 'boolean' },
          hungryTime: { type: 'string' },
          favoriteMeal: { type: 'string' },
          height: { type: 'number', description: 'Height in cm' },
          currentWeight: { type: 'number', description: 'Current weight in kg' },
          desiredWeight: { type: 'number', description: 'Desired weight in kg' },
          activityLevel: { type: 'string', enum: ['sedentary', 'lightly-active', 'moderately-active', 'very-active', 'extremely-active'] },
          averageDay: { type: 'string' },
          workSchedule: { type: 'string' },
          sleepDuration: { type: 'number', description: 'Sleep duration in hours' },
          diseases: { type: 'array', items: { type: 'string', enum: ['diabetes', 'kidney-disease', 'high-uric-acid', 'hypertension'] } },
          dietPreference: { type: 'string' },
          mealsPerDay: { type: 'number', minimum: 1, maximum: 6 },
          cuisinePreference: { type: 'array', items: { type: 'string' } }
        }
      },
      MealMacros: {
        type: 'object',
        properties: {
          protein: { type: 'number', description: 'Protein in grams' },
          carbs: { type: 'number', description: 'Carbs in grams' },
          fat: { type: 'number', description: 'Fat in grams' }
        }
      },
      Meal: {
        type: 'object',
        properties: {
          mealType: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
          name: { type: 'string' },
          description: { type: 'string' },
          ingredients: { type: 'array', items: { type: 'string' } },
          benefits: { type: 'array', items: { type: 'string' } },
          calories: { type: 'number' },
          macros: { $ref: '#/components/schemas/MealMacros' }
        }
      },
      MealPlanDay: {
        type: 'object',
        properties: {
          day: { type: 'integer', description: 'Day number (1-based, global across all weeks)' },
          title: { type: 'string', description: 'e.g. "Day 1", "Day 14"' },
          theme: { type: 'string' },
          totalCalories: { type: 'number' },
          macros: { $ref: '#/components/schemas/MealMacros' },
          meals: { type: 'array', items: { $ref: '#/components/schemas/Meal' } },
          tips: { type: 'array', items: { type: 'string' } }
        }
      },
      MealPlanDuration: {
        type: 'object',
        description: 'Plan duration metadata. Calculated from goal and weight delta.',
        properties: {
          weeks: { type: 'integer', description: 'Number of weeks (1-52)' },
          totalDays: { type: 'integer', description: 'Total days (weeks * 7)' }
        }
      },
      MealPlan: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          userId: { type: 'string' },
          healthProfileId: { type: 'string' },
          title: { type: 'string', description: 'e.g. "7-Day Meal Plan" or "20-Week Meal Plan"' },
          days: { type: 'array', items: { $ref: '#/components/schemas/MealPlanDay' }, description: 'All days in the plan. A 7-day template is generated via AI and replicated across weeks.' },
          duration: { $ref: '#/components/schemas/MealPlanDuration' },
          aiModel: { type: 'string' },
          prompt: { type: 'string' },
          rawAiResponse: { type: 'string', nullable: true },
          notes: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      GenerateMealPlanResponse: {
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
          message: { type: 'string' },
          mealPlan: { $ref: '#/components/schemas/MealPlan' },
          disclaimer: { type: 'string', description: 'Medical disclaimer, included when diseases are present' },
          unsupportedDiseases: { type: 'array', items: { type: 'string' }, description: 'List of diseases not supported by the engine' }
        }
      },
      MealPlanListResponse: {
        type: 'object',
        properties: {
          mealPlans: { type: 'array', items: { $ref: '#/components/schemas/MealPlan' } },
          total: { type: 'integer' },
          limit: { type: 'integer' },
          skip: { type: 'integer' }
        }
      }
    }
  },
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register new user',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Register' } } } },
        responses: { '201': { description: 'Created' }, '409': { description: 'Email already registered' } }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login user',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Login' } } } },
        responses: { '200': { description: 'OK' }, '401': { description: 'Invalid credentials' } }
      }
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout user',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Logged out successfully' }, '401': { description: 'Unauthorized' } }
      }
    },
    '/api/auth/profile': {
      get: {
        tags: ['Auth'],
        summary: 'Get user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          '401': { description: 'Unauthorized' },
          '404': { description: 'User not found' }
        }
      },
      put: {
        tags: ['Auth'],
        summary: 'Update user profile',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                minProperties: 1,
                properties: {
                  fullName: { type: 'string', maxLength: 100 },
                  username: { type: 'string', maxLength: 50 },
                  phone: { type: 'string', maxLength: 20 },
                  birthday: { type: 'string', format: 'date' },
                  gender: { type: 'string', enum: ['male', 'female', 'other'] }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          '400': { description: 'Validation failed' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'User not found' },
          '409': { description: 'Username already taken' }
        }
      }
    },
    '/api/auth/{id}': {
      delete: {
        tags: ['Auth'],
        summary: 'Delete a user (self or admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Deleted' }, '401': { description: 'Unauthorized' }, '403': { description: 'Forbidden' }, '404': { description: 'User not found' } }
      }
    },
    '/api/health-profile': {
      post: {
        tags: ['Health Profile'],
        summary: 'Create or update health profile',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthProfile' } } } },
        responses: { '201': { description: 'Created' }, '200': { description: 'Updated' }, '401': { description: 'Unauthorized' } }
      },
      get: {
        tags: ['Health Profile'],
        summary: 'Get health profile for authenticated user',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthProfile' } } } }, '401': { description: 'Unauthorized' }, '404': { description: 'Health profile not found' } }
      },
      delete: {
        tags: ['Health Profile'],
        summary: 'Delete health profile',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Deleted' }, '401': { description: 'Unauthorized' }, '404': { description: 'Health profile not found' } }
      }
    },
    '/api/meal-plans/generate': {
      post: {
        tags: ['Meal Plans'],
        summary: 'Generate personalized meal plan using LM Studio AI',
        description: 'Generates a 7-day weekly template via AI, validates it, then replicates across the calculated number of weeks based on the user\'s goal and weight delta. Duration: lose-weight uses 0.5 kg/week rate, gain-weight uses 0.25 kg/week rate, improve-health defaults to 1 week. Clamped to [1, 52] weeks.',
        security: [{ bearerAuth: [] }],
        responses: {
          '201': {
            description: 'Meal plan generated successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/GenerateMealPlanResponse' } } }
          },
          '400': { description: 'Health profile missing required fields (gender, age, currentWeight, height)' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Health profile not found' },
          '500': { description: 'Generation failed (AI error, safety validation failed, or infeasible disease combination)' }
        }
      }
    },
    '/api/meal-plans/latest': {
      get: {
        tags: ['Meal Plans'],
        summary: 'Get most recent meal plan',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/MealPlan' } } }
          },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Meal plan not found' }
        }
      }
    },
    '/api/meal-plans': {
      get: {
        tags: ['Meal Plans'],
        summary: 'Get all meal plans (paginated)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'skip', in: 'query', schema: { type: 'integer', default: 0 } }
        ],
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/MealPlanListResponse' } } }
          },
          '401': { description: 'Unauthorized' }
        }
      },
      delete: {
        tags: ['Meal Plans'],
        summary: 'Delete all meal plans for authenticated user',
        security: [{ bearerAuth: [] }],
        responses: { 
          '200': { description: 'All meal plans deleted successfully' }, 
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/api/meal-plans/{id}': {
      delete: {
        tags: ['Meal Plans'],
        summary: 'Delete a meal plan',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 
          '200': { description: 'Deleted' }, 
          '401': { description: 'Unauthorized' }, 
          '404': { description: 'Meal plan not found' }
        }
      }
    }
  }
};

export default swaggerSpec;
