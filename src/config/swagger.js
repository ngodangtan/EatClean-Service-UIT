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
          height: { type: 'number', description: 'Height in cm' },
          currentWeight: { type: 'number', description: 'Current weight in kg' },
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
          activityLevel: { type: 'string', enum: ['sedentary', 'lightly-active', 'moderately-active', 'very-active', 'extremely-active'] },
          sleepDuration: { type: 'number', description: 'Sleep duration in hours' },
          diseases: {
            type: 'array',
            description: 'Diseases the user has, with optional medical-test indicator values. `key` must come from GET /api/diseases.',
            items: { $ref: '#/components/schemas/HealthProfileDiseaseEntry' }
          },
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
          purpose: {
            type: 'string',
            enum: ['daily_health_based', 'weight_management', 'disease_based'],
            description: 'Generation intent at the time the plan was created'
          },
          title: { type: 'string', description: 'e.g. "7-Day Meal Plan"' },
          days: { type: 'array', items: { $ref: '#/components/schemas/MealPlanDay' } },
          duration: { $ref: '#/components/schemas/MealPlanDuration' },
          aiModel: { type: 'string' },
          notes: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      HealthSnapshot: {
        type: 'object',
        description: 'Apple Watch / HealthKit telemetry for purpose=daily_health_based.',
        properties: {
          activeEnergyKcal: { type: 'number', minimum: 0, maximum: 8000, description: 'kcal burned through movement today (HealthKit activeEnergyBurned)' },
          restingEnergyKcal: { type: 'number', minimum: 0, maximum: 5000, description: 'Resting/basal energy estimate (HealthKit basalEnergyBurned)' },
          steps: { type: 'integer', minimum: 0 },
          heartRateAvg: { type: 'number', minimum: 20, maximum: 250 },
          sleepHours: { type: 'number', minimum: 0, maximum: 24 },
          measuredAt: { type: 'string', format: 'date-time' }
        }
      },
      GenerateMealPlanRequest: {
        type: 'object',
        required: ['purpose'],
        properties: {
          purpose: {
            type: 'string',
            enum: ['daily_health_based', 'weight_management', 'disease_based'],
            description:
              'daily_health_based: 1-day plan (optional Apple Watch snapshot). ' +
              'weight_management: 1/2/4-week plan with weightGoal + desiredWeight. ' +
              'disease_based: 1/2/4-week plan tailored to existing conditions.'
          },
          weightGoal: {
            type: 'string',
            enum: ['lose-weight', 'gain-weight', 'muscle-gain'],
            description: 'Required when purpose=weight_management. Must be compatible with the user\'s recorded conditions.'
          },
          desiredWeight: {
            type: 'number',
            minimum: 20,
            maximum: 500,
            description: 'Target weight in kg. Required when purpose=weight_management.'
          },
          durationWeeks: {
            type: 'integer',
            enum: [1, 2, 4],
            description: 'Plan duration in weeks. Required for weight_management and disease_based. ' +
              'Forbidden for daily_health_based (always 1 day).'
          },
          healthSnapshot: { $ref: '#/components/schemas/HealthSnapshot' }
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
      DiseaseIndicator: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Stable indicator identifier (use this when submitting values)', example: 'fasting_glucose' },
          name: { type: 'string', description: 'Vietnamese display name', example: 'Đường huyết lúc đói' },
          unit: { type: 'string', description: 'Measurement unit', example: 'mg/dL' },
          normalRange: { type: 'string', description: 'Normal value range', example: '70 - 100' }
        }
      },
      Disease: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Stable disease identifier (use this when submitting health profile)', example: 'diabetes' },
          name: { type: 'string', description: 'Vietnamese display name', example: 'Tiểu đường' },
          supported: {
            type: 'boolean',
            description: 'true if the AI meal generator adjusts macros and filters ingredients for this disease. ' +
              'Unsupported diseases can still be recorded but will not influence meal generation.'
          },
          relatedIndicators: { type: 'array', items: { $ref: '#/components/schemas/DiseaseIndicator' } }
        }
      },
      HealthProfileIndicatorValue: {
        type: 'object',
        required: ['key', 'value'],
        properties: {
          key: { type: 'string', description: 'Indicator key from GET /api/diseases', example: 'hba1c' },
          value: { type: 'number', description: 'User-entered measurement', example: 6.8 },
          unit: { type: 'string', description: 'Snapshotted from catalog if omitted', example: '%' },
          measuredAt: { type: 'string', format: 'date-time', description: 'When the test was taken' },
          note: { type: 'string', maxLength: 500 }
        }
      },
      HealthProfileDiseaseEntry: {
        type: 'object',
        required: ['key'],
        properties: {
          key: { type: 'string', description: 'Disease key from GET /api/diseases', example: 'diabetes' },
          diagnosedAt: { type: 'string', format: 'date-time', description: 'When the user was diagnosed (optional)' },
          stage: { type: 'integer', minimum: 1, maximum: 5, description: 'Disease stage (applies to kidney-disease CKD stages 1–5). Stage 4+ blocks AI meal plan generation.' },
          indicators: {
            type: 'array',
            description: 'Optional. Each indicator key must belong to this disease in the catalog.',
            items: { $ref: '#/components/schemas/HealthProfileIndicatorValue' }
          }
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
                  gender: { type: 'string', enum: ['male', 'female', 'other'] },
                  height: { type: 'number', minimum: 1, maximum: 300, description: 'Height in cm' },
                  currentWeight: { type: 'number', minimum: 1, maximum: 500, description: 'Current weight in kg' }
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
        summary: 'Create or update health profile (upsert)',
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
          '400': { description: 'Validation failed (Joi schema or disease catalog mismatch)' },
          '401': { description: 'Unauthorized' }
        }
      },
      put: {
        tags: ['Health Profile'],
        summary: 'Update health profile',
        description: 'Update an existing health profile (e.g. when the user has new medical test results). ' +
          'Accepts partial payloads — omitted fields are preserved. ' +
          'Array fields like `diseases` are replaced as a whole, so the frontend should send the complete current array, not a delta. ' +
          'Behaves identically to POST; this alias exists for semantic clarity. If no profile exists yet, one is created.',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthProfile' } } } },
        responses: {
          '200': {
            description: 'Updated',
            content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, profile: { $ref: '#/components/schemas/HealthProfile' } } } } }
          },
          '201': {
            description: 'Created (no existing profile)',
            content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, profile: { $ref: '#/components/schemas/HealthProfile' } } } } }
          },
          '400': { description: 'Validation failed (Joi schema or disease catalog mismatch)' },
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
        description:
          'Generates a meal plan via LM Studio AI. **Each user has at most one active plan — generating a new plan replaces the previous one.**\n\n' +
          'The shape of the plan depends on `purpose`:\n\n' +
          '- **daily_health_based** — generates a single day, optionally driven by an Apple Watch ' +
          '`healthSnapshot` (resting + active energy override the BMR-based TDEE).\n' +
          '- **weight_management** — generates a 1/2/4-week plan tied to a request-scoped `weightGoal` ' +
          '(`lose-weight | gain-weight | muscle-gain`) and `desiredWeight`. The request is rejected if the ' +
          'chosen `weightGoal` is medically contraindicated by the user\'s recorded conditions ' +
          '(e.g. `gain-weight` is blocked for users with obesity, high-cholesterol, heart-disease, or hypertension).\n' +
          '- **disease_based** — generates a 1/2/4-week plan focused on managing existing conditions. ' +
          'Goal is internally forced to `improve-health`. Requires at least one disease on the profile.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/GenerateMealPlanRequest' } } }
        },
        responses: {
          '201': { description: 'Generated', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenerateMealPlanResponse' } } } },
          '400': { description: 'Validation failed, health profile missing required fields, or weight goal medically contraindicated' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Health profile not found' },
          '500': { description: 'Generation failed (AI error, safety validation failed, or infeasible disease combination)' }
        }
      }
    },
    '/api/meal-plans': {
      get: {
        tags: ['Meal Plans'],
        summary: 'Get the current meal plan',
        description: 'Returns the user\'s active meal plan. Each user has at most one plan at a time.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MealPlan' },
                example: {
                  _id: '664a1b2c3d4e5f6789abcdef',
                  userId: '663f1a0b2c3d4e5f6789ab01',
                  healthProfileId: '663f1a0b2c3d4e5f6789ab02',
                  purpose: 'daily_health_based',
                  title: 'Kế hoạch ăn uống 1 ngày',
                  duration: { weeks: 0, totalDays: 1 },
                  days: [
                    {
                      day: 1,
                      title: 'Ngày 1',
                      theme: 'Thanh đạm & giàu chất xơ',
                      totalCalories: 1850,
                      macros: { protein: 138, carbs: 231, fat: 41 },
                      meals: [
                        {
                          mealType: 'breakfast',
                          name: 'Cháo yến mạch chuối mật ong',
                          description: 'Bữa sáng nhẹ nhàng, cung cấp năng lượng bền vững với yến mạch nguyên cám và chuối chín.',
                          ingredients: ['Yến mạch nguyên cám', 'Chuối', 'Mật ong', 'Sữa hạt óc chó'],
                          benefits: ['Giàu chất xơ hòa tan giúp ổn định đường huyết', 'Cung cấp kali từ chuối tốt cho tim mạch'],
                          calories: 370,
                          macros: { protein: 12, carbs: 65, fat: 7 }
                        },
                        {
                          mealType: 'lunch',
                          name: 'Cơm gạo lứt ức gà áp chảo rau củ',
                          description: 'Bữa trưa cân bằng với protein nạc, tinh bột phức hợp và rau xanh đa dạng.',
                          ingredients: ['Gạo lứt', 'Ức gà', 'Bông cải xanh', 'Cà rốt', 'Dầu ô liu', 'Tỏi'],
                          benefits: ['Protein nạc hỗ trợ phục hồi cơ bắp', 'Gạo lứt cung cấp năng lượng lâu dài'],
                          calories: 620,
                          macros: { protein: 52, carbs: 78, fat: 12 }
                        },
                        {
                          mealType: 'snack',
                          name: 'Sữa chua Hy Lạp hạt chia',
                          description: 'Bữa phụ giàu protein và probiotics hỗ trợ tiêu hóa.',
                          ingredients: ['Sữa chua Hy Lạp không đường', 'Hạt chia', 'Dâu tây'],
                          benefits: ['Probiotics tốt cho hệ tiêu hóa', 'Hạt chia giàu omega-3'],
                          calories: 210,
                          macros: { protein: 18, carbs: 22, fat: 5 }
                        },
                        {
                          mealType: 'dinner',
                          name: 'Cá hồi áp chảo rau cải luộc',
                          description: 'Bữa tối thanh đạm với cá hồi giàu omega-3 và rau xanh hấp giữ nguyên dưỡng chất.',
                          ingredients: ['Cá hồi', 'Cải thìa', 'Đậu Hà Lan', 'Chanh', 'Dầu ô liu', 'Gừng'],
                          benefits: ['Omega-3 từ cá hồi hỗ trợ tim mạch và não bộ', 'Ít calo, phù hợp cho bữa tối'],
                          calories: 650,
                          macros: { protein: 56, carbs: 66, fat: 17 }
                        }
                      ],
                      tips: [
                        'Uống đủ 2–2.5 lít nước trong ngày.',
                        'Ăn chậm, nhai kỹ để hỗ trợ tiêu hóa tốt hơn.',
                        'Nên ăn bữa tối trước 20:00 để cơ thể có thời gian tiêu hóa trước khi ngủ.'
                      ]
                    }
                  ],
                  aiModel: 'lm-studio',
                  notes: null,
                  createdAt: '2026-05-06T07:30:00.000Z',
                  updatedAt: '2026-05-06T07:30:00.000Z'
                }
              }
            }
          },
          '401': { description: 'Unauthorized' },
          '404': { description: 'No meal plan found' }
        }
      },
      delete: {
        tags: ['Meal Plans'],
        summary: 'Delete the current meal plan',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Deleted' },
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
          '404': { description: 'Not found' }
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

  }
};

export default swaggerSpec;
