# Meal Plan API - Sample Response Data

## 1. GET /api/auth/profile
Get the authenticated user's profile information.

### Request
```bash
curl -X GET http://localhost:4000/api/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Success Response (200 OK)
```json
{
  "id": "6737d5f8c1e2a4b5c6d7e8f0",
  "email": "user@example.com",
  "username": "username",
  "fullName": "Full Name",
  "phone": "+1234567890",
  "birthday": "1990-01-01T00:00:00.000Z",
  "gender": "male",
  "role": "user",
  "createdAt": "2025-12-13T12:00:00.000Z",
  "updatedAt": "2025-12-13T12:00:00.000Z"
}
```

### Error Response (401 Unauthorized)
```json
{
  "message": "Unauthorized"
}
```

### Error Response (404 Not Found)
```json
{
  "message": "User not found"
}
```

---

## 2. POST /api/meal-plans/generate
Generate a personalized meal plan using LM Studio AI based on user's health profile.

### Request
```bash
curl -X POST http://localhost:4000/api/meal-plans/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Success Response (201 Created)
```json
{
  "ok": true,
  "message": "Meal plan generated successfully",
  "mealPlan": {
    "_id": "6737d5f8c1e2a4b5c6d7e8f9",
    "userId": "6737d5f8c1e2a4b5c6d7e8f0",
    "healthProfileId": "6737d5f8c1e2a4b5c6d7e8f1",
    "title": "7-Day Meal Plan",
    "aiModel": "lm-studio",
    "duration": {
      "weeks": 1,
      "totalDays": 7
    },
    "days": [
      {
        "day": 1,
        "title": "Day 1",
        "theme": "Olive oil & colorful greens",
        "macros": {
          "protein": 110,
          "carbs": 220,
          "fat": 70
        },
        "totalCalories": 2000,
        "meals": [
          {
            "mealType": "breakfast",
            "name": "Tomato toast & feta",
            "description": "Whole-grain toast rubbed with tomato + olive oil; crumble of feta; fruit.",
            "ingredients": [
              "Whole-grain bread",
              "Fresh tomato",
              "Extra-virgin olive oil",
              "Feta cheese",
              "Fresh fruit"
            ],
            "benefits": [
              "Olive oil polyphenols and lycopene",
              "Dairy calcium",
              "Fiber",
              "Vitamins A, E, K, C, calcium"
            ],
            "calories": 450,
            "macros": {
              "protein": 15,
              "carbs": 65,
              "fat": 15
            }
          },
          {
            "mealType": "lunch",
            "name": "Greek chickpea salad",
            "description": "Chickpeas, tomato, cucumber, olives, red onion, feta; olive oil & lemon.",
            "ingredients": [
              "Chickpeas (canned)",
              "Cherry tomato",
              "Cucumber",
              "Kalamata olives",
              "Red onion",
              "Feta cheese",
              "Extra-virgin olive oil",
              "Lemon juice"
            ],
            "benefits": [
              "Plant protein and fiber",
              "Heart-healthy fats",
              "Antioxidants",
              "Vitamins Folate, K, C, E"
            ],
            "calories": 520,
            "macros": {
              "protein": 35,
              "carbs": 75,
              "fat": 18
            }
          },
          {
            "mealType": "dinner",
            "name": "Baked salmon & bulgur",
            "description": "Oven salmon with herbs; bulgur; arugula salad with olive oil & lemon.",
            "ingredients": [
              "Salmon fillet",
              "Bulgur wheat",
              "Fresh herbs (dill, parsley)",
              "Arugula",
              "Extra-virgin olive oil",
              "Lemon",
              "Garlic"
            ],
            "benefits": [
              "Omega-3s",
              "Whole-grain carbs",
              "Leafy greens for micronutrients",
              "Vitamins D, B12"
            ],
            "calories": 680,
            "macros": {
              "protein": 60,
              "carbs": 80,
              "fat": 37
            }
          }
        ],
        "tips": [
          "Use extra-virgin olive oil as the main fat source",
          "Build plates around vegetables, legumes and whole grains",
          "Fish or seafood 2–3× weekly"
        ]
      },
      {
        "day": 2,
        "title": "Day 2",
        "theme": "Mediterranean proteins & whole grains",
        "macros": {
          "protein": 115,
          "carbs": 230,
          "fat": 65
        },
        "totalCalories": 2050,
        "meals": [
          {
            "mealType": "breakfast",
            "name": "Greek yogurt & granola",
            "description": "Plain Greek yogurt with homemade granola, berries, honey drizzle",
            "ingredients": [
              "Greek yogurt",
              "Granola (oats, nuts, seeds)",
              "Mixed berries",
              "Honey",
              "Almonds"
            ],
            "benefits": [
              "Probiotics for gut health",
              "High protein content",
              "Antioxidants from berries",
              "Healthy fats from nuts"
            ],
            "calories": 420,
            "macros": {
              "protein": 20,
              "carbs": 58,
              "fat": 12
            }
          },
          {
            "mealType": "lunch",
            "name": "Lentil soup with vegetables",
            "description": "Red lentil soup with onion, carrot, spinach, vegetable broth, lemon",
            "ingredients": [
              "Red lentils",
              "Onion",
              "Carrot",
              "Spinach",
              "Vegetable broth",
              "Lemon juice",
              "Olive oil"
            ],
            "benefits": [
              "Plant-based protein",
              "Iron and folate",
              "Fiber for digestion",
              "Vitamins A, C, K"
            ],
            "calories": 480,
            "macros": {
              "protein": 30,
              "carbs": 72,
              "fat": 10
            }
          },
          {
            "mealType": "dinner",
            "name": "Grilled chicken with quinoa",
            "description": "Herb-grilled chicken breast with quinoa pilaf and roasted vegetables",
            "ingredients": [
              "Chicken breast",
              "Quinoa",
              "Broccoli",
              "Bell pepper",
              "Garlic",
              "Olive oil",
              "Fresh herbs"
            ],
            "benefits": [
              "Lean protein",
              "Complete amino acids",
              "Magnesium and fiber",
              "Vitamins from vegetables"
            ],
            "calories": 650,
            "macros": {
              "protein": 65,
              "carbs": 100,
              "fat": 43
            }
          }
        ],
        "tips": [
          "Vary your protein sources between plant and animal",
          "Include whole grains like quinoa and lentils",
          "Add colorful vegetables for micronutrients"
        ]
      }
    ],
    "prompt": "per-meal-generation",
    "rawAiResponse": null,
    "notes": null,
    "createdAt": "2025-11-21T10:30:45.123Z",
    "updatedAt": "2025-11-21T10:30:45.123Z",
    "__v": 0
  },
  "disclaimer": "This meal plan is generated by AI and is not a substitute for professional medical or dietary advice. Consult your healthcare provider before making dietary changes related to your health conditions.",
  "unsupportedDiseases": []
}
```

> **Note:** The `disclaimer` and `unsupportedDiseases` fields are only included when the user's health profile contains diseases.

### Error Response (400 - Missing Required Fields)
```json
{
  "message": "Health profile is missing required fields: gender, age."
}
```

### Error Response (404 - No Health Profile)
```json
{
  "message": "Health profile not found. Please complete your health profile first."
}
```

### Error Response (500 - LM Studio Unavailable)
```json
{
  "message": "Failed to generate meal plan",
  "error": "connect ECONNREFUSED 127.0.0.1:1234"
}
```

### Error Response (500 - Disease Safety Failure)
```json
{
  "message": "Unable to generate safe meal plan for selected health conditions",
  "reason": "disease safety validation failed",
  "errors": ["Unable to generate safe meal plan for selected health conditions"]
}
```

---

## 3. GET /api/meal-plans/latest
Retrieve the most recently generated meal plan for the authenticated user. Populates the linked health profile.

### Request
```bash
curl -X GET http://localhost:4000/api/meal-plans/latest \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Success Response (200 OK)
```json
{
  "_id": "6737d5f8c1e2a4b5c6d7e8f9",
  "userId": "6737d5f8c1e2a4b5c6d7e8f0",
  "healthProfileId": "6737d5f8c1e2a4b5c6d7e8f1",
  "title": "7-Day Meal Plan",
  "aiModel": "lm-studio",
  "duration": {
    "weeks": 1,
    "totalDays": 7
  },
  "days": [
    {
      "day": 1,
      "title": "Day 1",
      "theme": "Olive oil & colorful greens",
      "macros": {
        "protein": 110,
        "carbs": 220,
        "fat": 70
      },
      "totalCalories": 2000,
      "meals": [
        {
          "mealType": "breakfast",
          "name": "Tomato toast & feta",
          "description": "Whole-grain toast rubbed with tomato + olive oil; crumble of feta; fruit.",
          "ingredients": [
            "Whole-grain bread",
            "Fresh tomato",
            "Extra-virgin olive oil",
            "Feta cheese",
            "Fresh fruit"
          ],
          "benefits": [
            "Olive oil polyphenols and lycopene",
            "Dairy calcium",
            "Fiber",
            "Vitamins A, E, K, C, calcium"
          ],
          "calories": 450,
          "macros": {
            "protein": 15,
            "carbs": 65,
            "fat": 15
          }
        }
      ],
      "tips": [
        "Use extra-virgin olive oil as the main fat source",
        "Build plates around vegetables, legumes and whole grains",
        "Fish or seafood 2–3× weekly"
      ]
    }
  ],
  "createdAt": "2025-11-21T10:30:45.123Z",
  "updatedAt": "2025-11-21T10:30:45.123Z"
}
```

### Error Response (404 - No Meal Plans)
```json
{
  "message": "Meal plan not found"
}
```

---

## 4. GET /api/meal-plans?limit=10&skip=0
Retrieve all meal plans for the authenticated user with pagination. Populates the linked health profile.

### Request
```bash
curl -X GET "http://localhost:4000/api/meal-plans?limit=5&skip=0" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Success Response (200 OK)
```json
{
  "mealPlans": [
    {
      "_id": "6737d5f8c1e2a4b5c6d7e8f9",
      "userId": "6737d5f8c1e2a4b5c6d7e8f0",
      "healthProfileId": "6737d5f8c1e2a4b5c6d7e8f1",
      "title": "7-Day Meal Plan",
      "aiModel": "lm-studio",
      "duration": {
        "weeks": 1,
        "totalDays": 7
      },
      "days": [
        {
          "day": 1,
          "title": "Day 1",
          "theme": "Olive oil & colorful greens",
          "macros": {
            "protein": 110,
            "carbs": 220,
            "fat": 70
          },
          "totalCalories": 2000,
          "meals": [
            {
              "mealType": "breakfast",
              "name": "Tomato toast & feta",
              "description": "Whole-grain toast rubbed with tomato + olive oil; crumble of feta; fruit.",
              "ingredients": [],
              "benefits": [],
              "calories": 450,
              "macros": {
                "protein": 15,
                "carbs": 65,
                "fat": 15
              }
            }
          ],
          "tips": []
        }
      ],
      "createdAt": "2025-11-21T10:30:45.123Z",
      "updatedAt": "2025-11-21T10:30:45.123Z"
    },
    {
      "_id": "6737d5f8c1e2a4b5c6d7e8fa",
      "userId": "6737d5f8c1e2a4b5c6d7e8f0",
      "healthProfileId": "6737d5f8c1e2a4b5c6d7e8f1",
      "title": "2-Week Meal Plan",
      "aiModel": "lm-studio",
      "duration": {
        "weeks": 2,
        "totalDays": 14
      },
      "days": [],
      "createdAt": "2025-11-20T15:20:30.456Z",
      "updatedAt": "2025-11-20T15:20:30.456Z"
    }
  ],
  "total": 2,
  "limit": 5,
  "skip": 0
}
```

### Parameters
- `limit` (default: 10) — Number of meal plans to return per page
- `skip` (default: 0) — Number of meal plans to skip (offset)

### Pagination Example
```
First page:  /api/meal-plans?limit=10&skip=0
Second page: /api/meal-plans?limit=10&skip=10
Third page:  /api/meal-plans?limit=10&skip=20
```

---

## 5. DELETE /api/meal-plans/{id}
Delete a specific meal plan by ID.

### Request
```bash
curl -X DELETE http://localhost:4000/api/meal-plans/6737d5f8c1e2a4b5c6d7e8f9 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Success Response (200 OK)
```json
{
  "ok": true
}
```

### Error Response (404 - Meal Plan Not Found)
```json
{
  "message": "Meal plan not found"
}
```

### Error Response (401 - Unauthorized)
```json
{
  "message": "Unauthorized"
}
```

---

## 6. DELETE /api/meal-plans
Delete all meal plans for the authenticated user.

### Request
```bash
curl -X DELETE http://localhost:4000/api/meal-plans \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Success Response (200 OK)
```json
{
  "ok": true,
  "message": "All meal plans deleted successfully"
}
```

### Error Response (401 - Unauthorized)
```json
{
  "message": "Unauthorized"
}
```

---

## Favorite Object Structure

```json
{
  "_id": "MongoDB ObjectId",
  "userId": "User's MongoDB ObjectId",
  "targetType": "meal-plan|recipe",
  "targetId": "MongoDB ObjectId of the favorited item",
  "note": "Optional personal note (max 500 chars)",
  "createdAt": "ISO 8601 timestamp",
  "updatedAt": "ISO 8601 timestamp",
  "__v": 0
}
```

---

## Complete Meal Object Structure

Each meal in a meal plan has this structure:
```json
{
  "mealType": "breakfast|lunch|dinner|snack",
  "name": "Meal name",
  "description": "Brief description of the meal",
  "ingredients": [
    "ingredient1",
    "ingredient2",
    "ingredient3"
  ],
  "benefits": [
    "Health benefit 1",
    "Health benefit 2",
    "Health benefit 3"
  ],
  "calories": 450,
  "macros": {
    "protein": 15,
    "carbs": 65,
    "fat": 15
  }
}
```

---

## Complete Day Object Structure

Each day in a meal plan has this structure:
```json
{
  "day": 1,
  "title": "Day 1",
  "theme": "Theme description (e.g., 'Olive oil & colorful greens')",
  "macros": {
    "protein": 110,
    "carbs": 220,
    "fat": 70
  },
  "totalCalories": 2000,
  "meals": [
    { /* meal object */ },
    { /* meal object */ },
    { /* meal object */ }
  ],
  "tips": [
    "Tip 1",
    "Tip 2",
    "Tip 3"
  ]
}
```

---

## Complete MealPlan Document Structure

```json
{
  "_id": "MongoDB ObjectId",
  "userId": "User's MongoDB ObjectId",
  "healthProfileId": "HealthProfile's MongoDB ObjectId",
  "title": "Meal plan title",
  "duration": {
    "weeks": 1,
    "totalDays": 7
  },
  "days": [ /* array of day objects */ ],
  "aiModel": "lm-studio",
  "prompt": "per-meal-generation",
  "rawAiResponse": null,
  "notes": "Optional notes about the meal plan",
  "createdAt": "ISO 8601 timestamp",
  "updatedAt": "ISO 8601 timestamp",
  "__v": 0
}
```

---

## HTTP Status Codes

| Code | Meaning | When |
|------|---------|------|
| 200  | OK      | GET/DELETE request successful |
| 201  | Created | Meal plan generated successfully |
| 400  | Bad Request | Missing required health profile fields (gender, age, currentWeight, height) |
| 401  | Unauthorized | Missing or invalid JWT token |
| 404  | Not Found | Meal plan/health profile not found |
| 500  | Server Error | LM Studio unavailable, disease safety failure, or other server error |

---

## 7. POST /api/meal-plans/{planId}/swap
Swap a specific meal in a plan with a newly AI-generated replacement.

### Request
```bash
curl -X POST http://localhost:4000/api/meal-plans/6737d5f8c1e2a4b5c6d7e8f9/swap \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{ "day": 1, "mealIndex": 0 }'
```

### Success Response (200 OK)
```json
{
  "ok": true,
  "message": "Meal swapped successfully",
  "swapCount": 1,
  "swappedMeal": {
    "mealType": "breakfast",
    "name": "Avocado & egg toast",
    "description": "Whole-grain toast topped with mashed avocado, poached egg, and cherry tomatoes.",
    "ingredients": [
      "Whole-grain bread",
      "Avocado",
      "Egg",
      "Cherry tomatoes",
      "Extra-virgin olive oil"
    ],
    "benefits": [
      "Heart-healthy monounsaturated fats",
      "Complete protein from egg",
      "Fiber from whole grains",
      "Vitamins E, K, B6"
    ],
    "calories": 450,
    "macros": {
      "protein": 15,
      "carbs": 65,
      "fat": 15
    }
  }
}
```

### Error Response (400 - Missing Fields)
```json
{
  "message": "day and mealIndex are required"
}
```

### Error Response (400 - Swap Limit)
```json
{
  "message": "Maximum swap limit (5) reached for this plan"
}
```

---

## 8. GET /api/meal-plans/{planId}/shopping-list
Generate a shopping list from a meal plan's ingredients.

### Request
```bash
curl -X GET "http://localhost:4000/api/meal-plans/6737d5f8c1e2a4b5c6d7e8f9/shopping-list?startDay=1&endDay=3" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Success Response (200 OK)
```json
{
  "ok": true,
  "shoppingList": [
    "Whole-grain bread",
    "Fresh tomato",
    "Extra-virgin olive oil",
    "Feta cheese",
    "Fresh fruit",
    "Chickpeas (canned)",
    "Cherry tomato",
    "Cucumber",
    "Kalamata olives",
    "Red onion",
    "Lemon juice",
    "Salmon fillet",
    "Bulgur wheat",
    "Fresh herbs (dill, parsley)",
    "Arugula",
    "Garlic"
  ]
}
```

---

## 9. Favorite Endpoints

### 9.1 POST /api/favorites
```bash
curl -X POST http://localhost:4000/api/favorites \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{ "targetType": "recipe", "targetId": "6737d5f8c1e2a4b5c6d7e8f2", "note": "Love this salad" }'
```

### Success Response (201 Created)
```json
{
  "_id": "6737d5f8c1e2a4b5c6d7e900",
  "userId": "6737d5f8c1e2a4b5c6d7e8f0",
  "targetType": "recipe",
  "targetId": "6737d5f8c1e2a4b5c6d7e8f2",
  "note": "Love this salad",
  "createdAt": "2025-12-13T12:00:00.000Z",
  "updatedAt": "2025-12-13T12:00:00.000Z",
  "__v": 0
}
```

### 9.2 GET /api/favorites
```bash
curl -X GET "http://localhost:4000/api/favorites?targetType=recipe&limit=10&skip=0" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Success Response (200 OK)
```json
{
  "favorites": [
    {
      "_id": "6737d5f8c1e2a4b5c6d7e900",
      "userId": "6737d5f8c1e2a4b5c6d7e8f0",
      "targetType": "recipe",
      "targetId": "6737d5f8c1e2a4b5c6d7e8f2",
      "note": "Love this salad",
      "createdAt": "2025-12-13T12:00:00.000Z",
      "updatedAt": "2025-12-13T12:00:00.000Z"
    }
  ],
  "total": 1,
  "limit": 10,
  "skip": 0
}
```

### 9.3 GET /api/favorites/check
```bash
curl -X GET "http://localhost:4000/api/favorites/check?targetType=recipe&targetId=6737d5f8c1e2a4b5c6d7e8f2" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Success Response (200 OK)
```json
{
  "isFavorite": true,
  "favorite": {
    "_id": "6737d5f8c1e2a4b5c6d7e900",
    "userId": "6737d5f8c1e2a4b5c6d7e8f0",
    "targetType": "recipe",
    "targetId": "6737d5f8c1e2a4b5c6d7e8f2",
    "note": "Love this salad",
    "createdAt": "2025-12-13T12:00:00.000Z",
    "updatedAt": "2025-12-13T12:00:00.000Z"
  }
}
```

### 9.4 DELETE /api/favorites/{id}
```bash
curl -X DELETE http://localhost:4000/api/favorites/6737d5f8c1e2a4b5c6d7e900 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Success Response (200 OK)
```json
{
  "ok": true
}
```

### Error Response (404)
```json
{
  "message": "Favorite not found"
}
```

---

## Example Frontend Usage (JavaScript/TypeScript)

```typescript
// Generate meal plan
async function generateMealPlan(token: string) {
  const response = await fetch('/api/meal-plans/generate', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  return data.mealPlan; // Contains days array with meals
}

// Get latest meal plan
async function getLatestMealPlan(token: string) {
  const response = await fetch('/api/meal-plans/latest', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
}

// Get all meal plans (paginated)
async function getAllMealPlans(token: string, page = 1, pageSize = 10) {
  const skip = (page - 1) * pageSize;
  const response = await fetch(
    `/api/meal-plans?limit=${pageSize}&skip=${skip}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  return response.json(); // { mealPlans, total, limit, skip }
}

// Swap a meal
async function swapMeal(token: string, planId: string, day: number, mealIndex: number) {
  const response = await fetch(`/api/meal-plans/${planId}/swap`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ day, mealIndex })
  });
  return response.json();
}

// Get shopping list
async function getShoppingList(token: string, planId: string, startDay?: number, endDay?: number) {
  const params = new URLSearchParams();
  if (startDay) params.append('startDay', String(startDay));
  if (endDay) params.append('endDay', String(endDay));
  const response = await fetch(
    `/api/meal-plans/${planId}/shopping-list?${params}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  return response.json();
}

// Add to favorites
async function addFavorite(token: string, targetType: string, targetId: string, note?: string) {
  const response = await fetch('/api/favorites', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ targetType, targetId, note })
  });
  return response.json();
}

// Check if item is favorited
async function checkFavorite(token: string, targetType: string, targetId: string) {
  const response = await fetch(
    `/api/favorites/check?targetType=${targetType}&targetId=${targetId}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  return response.json(); // { isFavorite, favorite }
}

// Delete meal plan
async function deleteMealPlan(token: string, id: string) {
  const response = await fetch(`/api/meal-plans/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
}

// Refresh access token
async function refreshAccessToken(refreshToken: string) {
  const response = await fetch('/api/auth/refresh-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  return response.json(); // { accessToken }
}
```
