const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Eat Clean API',
    version: '1.0.0',
    description: 'REST API for health-focused meal planning with AI-powered generation'
  },
  servers: [
    { url: 'http://localhost:4000', description: 'Local development server' }
  ],
  tags: [
    { name: 'System', description: 'Health check' },
    { name: 'Auth', description: 'Authentication & user management' },
    { name: 'Health Profile', description: 'User health profiles' },
    { name: 'Diseases', description: 'Disease catalog for health profile selection' },
    { name: 'Meal Plans', description: 'AI-powered meal plan generation & management' },
    { name: 'Recipes', description: 'Recipe management' },
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
          role: { type: 'string', enum: ['user', 'admin'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      AuthResponse: {
        type: 'object',
        properties: {
          accessToken: { type: 'string', description: 'JWT access token (15 min expiry)' },
          refreshToken: { type: 'string', description: 'Opaque refresh token (30 day expiry)' },
          user: { $ref: '#/components/schemas/User' }
        }
      },
      Register: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          username: { type: 'string', maxLength: 50 },
          fullName: { type: 'string', maxLength: 100 },
          phone: { type: 'string', maxLength: 20 },
          birthday: { type: 'string', format: 'date' },
          gender: { type: 'string', enum: ['male', 'female', 'other'] },
          height: { type: 'number', description: 'Height in cm — pre-fills health profile' },
          currentWeight: { type: 'number', description: 'Current weight in kg — pre-fills health profile' }
        }
      },
      Login: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' }
        }
      },
      HealthProfile: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          gender: { type: 'string', enum: ['male', 'female'], readOnly: true, description: 'Auto-populated from user account' },
          age: { type: 'number', readOnly: true, description: 'Auto-calculated from user birthday' },
          goal: { type: 'string', enum: ['lose-weight', 'gain-weight', 'improve-health'] },
          triedHealthyBefore: { type: 'boolean' },
          hungryTime: { type: 'string' },
          favoriteMeal: { type: 'string' },
          desiredWeight: { type: 'number', description: 'Desired weight in kg' },
          activityLevel: { type: 'string', enum: ['sedentary', 'lightly-active', 'moderately-active', 'very-active', 'extremely-active'] },
          averageDay: { type: 'string' },
          workSchedule: { type: 'string' },
          sleepDuration: { type: 'number', description: 'Sleep duration in hours' },
          diseases: { type: 'array', items: { type: 'string', enum: ['diabetes', 'kidney-disease', 'high-uric-acid', 'hypertension'] } },
          dietPreference: { type: 'string' },
          mealsPerDay: { type: 'number', minimum: 1, maximum: 6 },
          cuisinePreference: { type: 'array', items: { type: 'string' }, maxItems: 10 }
        }
      },
      MealMacros: {
        type: 'object',
        properties: {
          protein: { type: 'number', minimum: 0, description: 'Protein in grams' },
          carbs: { type: 'number', minimum: 0, description: 'Carbs in grams' },
          fat: { type: 'number', minimum: 0, description: 'Fat in grams' }
        }
      },
      Meal: {
        type: 'object',
        required: ['mealType', 'name', 'calories', 'macros'],
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
          weeks: { type: 'integer', description: 'Number of weeks (1–52)' },
          totalDays: { type: 'integer', description: 'Total days (weeks * 7)' }
        }
      },
      MealPlan: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          userId: { type: 'string' },
          healthProfileId: { type: 'string' },
          title: { type: 'string', description: 'e.g. "7-Day Meal Plan"' },
          days: { type: 'array', items: { $ref: '#/components/schemas/MealPlanDay' } },
          duration: { $ref: '#/components/schemas/MealPlanDuration' },
          swapCount: { type: 'integer', description: 'Number of meals swapped so far' },
          aiModel: { type: 'string' },
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
          disclaimer: { type: 'string', description: 'Medical disclaimer, present when diseases are set' },
          unsupportedDiseases: { type: 'array', items: { type: 'string' }, description: 'Disease names not supported by the engine' }
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
      },
      Recipe: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          calories: { type: 'number', default: 0 },
          protein: { type: 'number', default: 0 },
          carbs: { type: 'number', default: 0 },
          fat: { type: 'number', default: 0 },
          tags: { type: 'array', items: { type: 'string' } },
          ingredients: { type: 'array', items: { type: 'string' } },
          steps: { type: 'array', items: { type: 'string' } },
          imageUrl: { type: 'string', format: 'uri' },
          author: { type: 'string', description: 'User ID of author' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      RecipeInput: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          calories: { type: 'number' },
          protein: { type: 'number' },
          carbs: { type: 'number' },
          fat: { type: 'number' },
          tags: { type: 'array', items: { type: 'string' } },
          ingredients: { type: 'array', items: { type: 'string' } },
          steps: { type: 'array', items: { type: 'string' } },
          imageUrl: { type: 'string', format: 'uri' }
        }
      },
      DiseaseIndicator: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Indicator name (Vietnamese + English)', example: 'Đường huyết lúc đói (Fasting Glucose)' },
          unit: { type: 'string', description: 'Measurement unit', example: 'mg/dL' },
          normalRange: { type: 'string', description: 'Normal value range', example: '70 - 100' }
        }
      },
      Disease: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Disease identifier used in health profile', example: 'diabetes' },
          name: { type: 'string', description: 'Vietnamese display name', example: 'Tiểu đường' },
          relatedIndicators: { type: 'array', items: { $ref: '#/components/schemas/DiseaseIndicator' } }
        }
      },
      DiseaseListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'array', items: { $ref: '#/components/schemas/Disease' } }
        }
      }
    }
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        responses: { '200': { description: 'Server is running' } }
      }
    },

    // ── Auth ──────────────────────────────────────────────────────────────
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register new user',
        description: 'Creates a new user account. Optional `height` and `currentWeight` are stored on the user and automatically pre-fill the health profile.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Register' } } } },
        responses: {
          '201': { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          '409': { description: 'Email already registered' }
        }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Login' } } } },
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          '401': { description: 'Invalid credentials' }
        }
      }
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout',
        description: 'Blacklists the current access token. Optionally revokes a refresh token.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  refreshToken: { type: 'string', description: 'If provided, this refresh token is also revoked' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Logged out', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' } } } } } },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/api/auth/refresh-token': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        description: 'Exchange a valid refresh token for a new access token.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: { refreshToken: { type: 'string' } }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'New access token issued',
            content: { 'application/json': { schema: { type: 'object', properties: { accessToken: { type: 'string' } } } } }
          },
          '400': { description: 'Refresh token required' },
          '401': { description: 'Invalid or expired refresh token' }
        }
      }
    },
    '/api/auth/revoke-token': {
      post: {
        tags: ['Auth'],
        summary: 'Revoke a refresh token',
        description: 'Permanently removes a refresh token from the user\'s token list (sign out from one device).',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: { refreshToken: { type: 'string' } }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Revoked', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' } } } } } },
          '400': { description: 'Refresh token required' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/api/auth/profile': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user profile',
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
        responses: {
          '200': { description: 'Deleted' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'User not found' }
        }
      }
    },

    // ── Health Profile ────────────────────────────────────────────────────
    '/api/health-profile': {
      post: {
        tags: ['Health Profile'],
        summary: 'Create or update health profile',
        description: '`gender`, `age`, `height`, and `currentWeight` are sourced automatically from the user account (set at registration) and do not need to be sent in the body.',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthProfile' } } } },
        responses: {
          '201': {
            description: 'Created',
            content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, profile: { $ref: '#/components/schemas/HealthProfile' } } } } }
          },
          '200': {
            description: 'Updated',
            content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, profile: { $ref: '#/components/schemas/HealthProfile' } } } } }
          },
          '401': { description: 'Unauthorized' }
        }
      },
      get: {
        tags: ['Health Profile'],
        summary: 'Get health profile',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthProfile' } } } },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Health profile not found' }
        }
      },
      delete: {
        tags: ['Health Profile'],
        summary: 'Delete health profile',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Deleted' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Health profile not found' }
        }
      }
    },

    // ── Meal Plans ────────────────────────────────────────────────────────
    '/api/meal-plans/generate': {
      post: {
        tags: ['Meal Plans'],
        summary: 'Generate personalized meal plan via AI',
        description: 'Generates a 7-day weekly template via LM Studio AI, validates it, then replicates across calculated weeks based on goal and weight delta. Duration: lose-weight at 0.5 kg/week, gain-weight at 0.25 kg/week, improve-health defaults to 1 week (clamped 1–52 weeks).',
        security: [{ bearerAuth: [] }],
        responses: {
          '201': { description: 'Generated', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenerateMealPlanResponse' } } } },
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
          '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/MealPlan' } } } },
          '401': { description: 'Unauthorized' },
          '404': { description: 'No meal plan found' }
        }
      }
    },
    '/api/meal-plans': {
      get: {
        tags: ['Meal Plans'],
        summary: 'List meal plans (paginated)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'skip', in: 'query', schema: { type: 'integer', default: 0 } }
        ],
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/MealPlanListResponse' } } } },
          '401': { description: 'Unauthorized' }
        }
      },
      delete: {
        tags: ['Meal Plans'],
        summary: 'Delete all meal plans',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'All deleted' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/api/meal-plans/{id}': {
      get: {
        tags: ['Meal Plans'],
        summary: 'Get a meal plan by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/MealPlan' } } } },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Not found' }
        }
      },
      delete: {
        tags: ['Meal Plans'],
        summary: 'Delete a meal plan',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Deleted' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Not found' }
        }
      }
    },
    '/api/meal-plans/{planId}/swap': {
      post: {
        tags: ['Meal Plans'],
        summary: 'Swap a meal in a plan',
        description: 'Regenerates a single meal in-place using the same macros and user health context. Limited to a maximum number of swaps per plan.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'planId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['day', 'mealIndex'],
                properties: {
                  day: { type: 'integer', description: 'Day number (1-based) from the plan' },
                  mealIndex: { type: 'integer', description: 'Index of the meal within the day\'s meals array' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Meal swapped',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean' },
                    message: { type: 'string' },
                    swapCount: { type: 'integer' },
                    swappedMeal: { $ref: '#/components/schemas/Meal' }
                  }
                }
              }
            }
          },
          '400': { description: 'Missing fields or swap limit reached' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Plan, day, or meal not found' },
          '500': { description: 'Could not generate a safe replacement meal' }
        }
      }
    },
    // ── Diseases ──────────────────────────────────────────────────────────
    '/api/diseases': {
      get: {
        tags: ['Diseases'],
        summary: 'List available diseases',
        description: 'Returns all diseases the user can select when creating a health profile, along with their related health indicators and normal ranges.',
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/DiseaseListResponse' } } } }
        }
      }
    },

    // ── Recipes ───────────────────────────────────────────────────────────
    '/api/recipes': {
      get: {
        tags: ['Recipes'],
        summary: 'List recipes',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Title search (case-insensitive)' },
          { name: 'tag', in: 'query', schema: { type: 'string' }, description: 'Filter by tag' }
        ],
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Recipe' } } } } }
        }
      },
      post: {
        tags: ['Recipes'],
        summary: 'Create a recipe',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RecipeInput' } } } },
        responses: {
          '201': { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Recipe' } } } },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/api/recipes/{id}': {
      get: {
        tags: ['Recipes'],
        summary: 'Get a recipe by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Recipe' } } } },
          '404': { description: 'Not found' }
        }
      },
      put: {
        tags: ['Recipes'],
        summary: 'Update a recipe',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RecipeInput' } } } },
        responses: {
          '200': { description: 'Updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Recipe' } } } },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Not found' }
        }
      },
      delete: {
        tags: ['Recipes'],
        summary: 'Delete a recipe',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Deleted' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Not found' }
        }
      }
    },

  }
};

export default swaggerSpec;
