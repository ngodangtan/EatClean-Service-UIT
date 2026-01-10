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
    "title": "7-Day Personalized Meal Plan",
    "aiModel": "lm-studio",
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
    "prompt": "You are a professional nutritionist...[long prompt truncated]",
    "rawAiResponse": "{\"title\": \"7-Day Personalized Meal Plan\"...}",
    "notes": null,
    "createdAt": "2025-11-21T10:30:45.123Z",
    "updatedAt": "2025-11-21T10:30:45.123Z",
    "__v": 0
  }
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

---

## 2. GET /api/meal-plans/latest
Retrieve the most recently generated meal plan for the authenticated user.

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
  "title": "7-Day Personalized Meal Plan",
  "aiModel": "lm-studio",
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

## 3. GET /api/meal-plans?limit=10&skip=0
Retrieve all meal plans for the authenticated user with pagination.

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
      "title": "7-Day Personalized Meal Plan",
      "aiModel": "lm-studio",
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
      "title": "7-Day High-Protein Meal Plan",
      "aiModel": "lm-studio",
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

## 4. DELETE /api/meal-plans/{id}
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
  "days": [ /* array of day objects */ ],
  "aiModel": "lm-studio",
  "prompt": "The prompt sent to LM Studio",
  "rawAiResponse": "Raw JSON response from LM Studio",
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
| 200  | OK      | GET request successful |
| 201  | Created | Meal plan generated successfully |
| 400  | Bad Request | Invalid parameters |
| 401  | Unauthorized | Missing or invalid JWT token |
| 404  | Not Found | Meal plan/health profile not found |
| 500  | Server Error | LM Studio unavailable or other server error |

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

// Delete meal plan
async function deleteMealPlan(token: string, id: string) {
  const response = await fetch(`/api/meal-plans/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
}
```
