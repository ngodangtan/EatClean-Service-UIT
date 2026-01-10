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
          diseases: { type: 'array', items: { type: 'string' } },
          dietPreference: { type: 'string' },
          mealsPerDay: { type: 'number', minimum: 1, maximum: 6 },
          cuisinePreference: { type: 'array', items: { type: 'string' } }
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
        security: [{ bearerAuth: [] }],
        responses: { 
          '201': { description: 'Meal plan generated successfully' }, 
          '401': { description: 'Unauthorized' }, 
          '404': { description: 'Health profile not found' },
          '500': { description: 'LM Studio error' }
        }
      }
    },
    '/api/meal-plans/latest': {
      get: {
        tags: ['Meal Plans'],
        summary: 'Get most recent meal plan',
        security: [{ bearerAuth: [] }],
        responses: { 
          '200': { description: 'OK' }, 
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
          '200': { description: 'OK' }, 
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
