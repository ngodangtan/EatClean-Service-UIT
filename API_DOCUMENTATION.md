# Eat Clean API Documentation

## Overview
This API provides endpoints for user authentication, health profile management, recipe management, and personalized meal plan generation using AI.

Base URL: `http://localhost:4000/api`

Rate limiting: 100 requests per minute is applied to routes under `/api`.

## Authentication
Most endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## 1. Health Check
### GET /health
Check if the API is running.

#### Request
```bash
curl -X GET http://localhost:4000/api/health
```

#### Success Response (200 OK)
```json
{
  "ok": true,
  "time": "2025-12-13T12:00:00.000Z"
}
```

---

## 2. Authentication Endpoints

### 2.1 POST /auth/register
Register a new user account.

#### Request
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "username": "username",
    "phone": "+1234567890",
    "fullName": "Full Name",
    "birthday": "1990-01-01",
    "gender": "male"
  }'
```

#### Parameters
- `email` (string, required): User's email address
- `password` (string, required): Password (min 6 characters)
- `username` (string): Unique username
- `phone` (string): Phone number
- `fullName` (string): Full name
- `birthday` (string): Date of birth (ISO format)
- `gender` (string): 'male', 'female', or 'other'

#### Success Response (201 Created)
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a1b2c3d4e5f6...",
  "user": {
    "id": "6737d5f8c1e2a4b5c6d7e8f0",
    "email": "user@example.com",
    "username": "username",
    "fullName": "Full Name",
    "phone": "+1234567890",
    "birthday": "1990-01-01T00:00:00.000Z",
    "gender": "male"
  }
}
```

> **Note:** `accessToken` expires in 15 minutes. Use `refreshToken` (30-day expiry) to obtain new access tokens via POST /auth/refresh-token.

#### Error Response (409 Conflict)
```json
{
  "message": "Email already registered"
}
```

#### Error Response (500 Internal Server Error)
```json
{
  "message": "Error message"
}
```

### 2.2 POST /auth/login
Authenticate user and get JWT token. Rate-limited to prevent brute force.

#### Request
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

#### Parameters
- `email` (string, required): User's email
- `password` (string, required): User's password

#### Success Response (200 OK)
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a1b2c3d4e5f6...",
  "user": {
    "id": "6737d5f8c1e2a4b5c6d7e8f0",
    "email": "user@example.com",
    "username": "username",
    "fullName": "Full Name",
    "phone": "+1234567890",
    "birthday": "1990-01-01T00:00:00.000Z",
    "gender": "male"
  }
}
```

#### Error Response (401 Unauthorized)
```json
{
  "message": "Invalid credentials"
}
```

### 2.3 POST /auth/logout
Logout the authenticated user. Blacklists the access token and optionally removes a refresh token.

#### Request
```bash
curl -X POST http://localhost:4000/api/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{ "refreshToken": "a1b2c3d4e5f6..." }'
```

#### Parameters
- `refreshToken` (string, optional): Refresh token to revoke

#### Success Response (200 OK)
```json
{
  "ok": true
}
```

#### Error Response (401 Unauthorized)
```json
{
  "message": "Unauthorized"
}
```

### 2.4 PUT /auth/profile
Update the authenticated user's profile information.

#### Request
```bash
curl -X PUT http://localhost:4000/api/auth/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "fullName": "Updated Name",
    "username": "newusername",
    "phone": "+0987654321",
    "birthday": "1990-06-15",
    "gender": "male"
  }'
```

#### Parameters (all optional)
- `fullName` (string): Updated full name
- `username` (string): Updated username (must be unique)
- `phone` (string): Updated phone number
- `birthday` (string): Updated date of birth (ISO format)
- `gender` (string): Updated gender

#### Success Response (200 OK)
```json
{
  "id": "6737d5f8c1e2a4b5c6d7e8f0",
  "email": "user@example.com",
  "username": "newusername",
  "fullName": "Updated Name",
  "phone": "+0987654321",
  "birthday": "1990-06-15T00:00:00.000Z",
  "gender": "male",
  "role": "user",
  "createdAt": "2025-12-13T12:00:00.000Z",
  "updatedAt": "2025-12-14T10:00:00.000Z"
}
```

#### Error Response (409 Conflict)
```json
{
  "message": "Username already taken"
}
```

### 2.5 POST /auth/refresh-token
Get a new access token using a valid refresh token. No authentication header required.

#### Request
```bash
curl -X POST http://localhost:4000/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{ "refreshToken": "a1b2c3d4e5f6..." }'
```

#### Parameters
- `refreshToken` (string, required): A valid, non-expired refresh token

#### Success Response (200 OK)
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Error Response (400 Bad Request)
```json
{
  "message": "Refresh token required"
}
```

#### Error Response (401 Unauthorized)
```json
{
  "message": "Invalid or expired refresh token"
}
```

### 2.6 POST /auth/revoke-token
Revoke a specific refresh token. Requires authentication.

#### Request
```bash
curl -X POST http://localhost:4000/api/auth/revoke-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{ "refreshToken": "a1b2c3d4e5f6..." }'
```

#### Parameters
- `refreshToken` (string, required): Refresh token to revoke

#### Success Response (200 OK)
```json
{
  "ok": true
}
```

#### Error Response (400 Bad Request)
```json
{
  "message": "Refresh token required"
}
```

### 2.7 DELETE /auth/{id}
Delete a user account (self or admin only).

#### Request
```bash
curl -X DELETE http://localhost:4000/api/auth/6737d5f8c1e2a4b5c6d7e8f0 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Parameters
- `id` (path, required): User ID to delete

#### Success Response (200 OK)
```json
{
  "ok": true
}
```

#### Error Response (401 Unauthorized)
```json
{
  "message": "Unauthorized"
}
```

#### Error Response (403 Forbidden)
```json
{
  "message": "Forbidden"
}
```

#### Error Response (404 Not Found)
```json
{
  "message": "User not found"
}
```

### 2.8 GET /auth/profile
Get the authenticated user's profile information.

#### Request
```bash
curl -X GET http://localhost:4000/api/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Success Response (200 OK)
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

#### Error Response (401 Unauthorized)
```json
{
  "message": "Unauthorized"
}
```

#### Error Response (404 Not Found)
```json
{
  "message": "User not found"
}
```

---

## 3. Health Profile Endpoints

### 3.1 POST /health-profile
Create or update health profile for authenticated user.

#### Request
```bash
curl -X POST http://localhost:4000/api/health-profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "gender": "male",
    "age": 30,
    "goal": "lose-weight",
    "triedHealthyBefore": true,
    "hungryTime": "morning",
    "favoriteMeal": "salad",
    "height": 170,
    "currentWeight": 70,
    "desiredWeight": 65,
    "activityLevel": "moderately-active",
    "averageDay": "busy work day",
    "workSchedule": "9-5",
    "sleepDuration": 8,
    "diseases": ["diabetes"],
    "dietPreference": "omnivore",
    "mealsPerDay": 3,
    "cuisinePreference": ["mediterranean", "asian"]
  }'
```

#### Parameters
- `gender` (string, required): 'male' or 'female' (required for BMR calculation)
- `age` (number, required): Age in years, 1-120 (required for BMR calculation)
- `goal` (string): 'lose-weight', 'gain-weight', 'improve-health'
- `triedHealthyBefore` (boolean): Has tried healthy eating before
- `hungryTime` (string): When user feels hungry
- `favoriteMeal` (string): Favorite meal
- `height` (number): Height in cm
- `currentWeight` (number): Current weight in kg
- `desiredWeight` (number): Desired weight in kg
- `activityLevel` (string): 'sedentary', 'lightly-active', 'moderately-active', 'very-active', 'extremely-active'
- `averageDay` (string): Description of average day
- `workSchedule` (string): Work schedule description
- `sleepDuration` (number): Sleep hours per night
- `diseases` (array): List of diseases. Supported values: `'diabetes'`, `'kidney-disease'`, `'high-uric-acid'`, `'hypertension'`
- `dietPreference` (string): Diet preference (e.g., 'omnivore', 'vegetarian', 'vegan', 'keto', 'paleo')
- `mealsPerDay` (number): Meals per day (1-6)
- `cuisinePreference` (array): Preferred cuisines

#### Success Response (200 OK - Update)
```json
{
  "ok": true,
  "profile": {
    "_id": "6737d5f8c1e2a4b5c6d7e8f1",
    "userId": "6737d5f8c1e2a4b5c6d7e8f0",
    "gender": "male",
    "age": 30,
    "goal": "lose-weight",
    "triedHealthyBefore": true,
    "hungryTime": "morning",
    "favoriteMeal": "salad",
    "height": 170,
    "currentWeight": 70,
    "desiredWeight": 65,
    "activityLevel": "moderately-active",
    "averageDay": "busy work day",
    "workSchedule": "9-5",
    "sleepDuration": 8,
    "diseases": ["diabetes"],
    "dietPreference": "omnivore",
    "mealsPerDay": 3,
    "cuisinePreference": ["mediterranean", "asian"],
    "createdAt": "2025-12-13T12:00:00.000Z",
    "updatedAt": "2025-12-13T12:00:00.000Z",
    "__v": 0
  }
}
```

#### Success Response (201 Created - New)
```json
{
  "ok": true,
  "profile": {
    "_id": "6737d5f8c1e2a4b5c6d7e8f1",
    "userId": "6737d5f8c1e2a4b5c6d7e8f0",
    "gender": "male",
    "age": 30,
    "goal": "lose-weight",
    "triedHealthyBefore": true,
    "hungryTime": "morning",
    "favoriteMeal": "salad",
    "height": 170,
    "currentWeight": 70,
    "desiredWeight": 65,
    "activityLevel": "moderately-active",
    "averageDay": "busy work day",
    "workSchedule": "9-5",
    "sleepDuration": 8,
    "diseases": ["diabetes"],
    "dietPreference": "omnivore",
    "mealsPerDay": 3,
    "cuisinePreference": ["mediterranean", "asian"],
    "createdAt": "2025-12-13T12:00:00.000Z",
    "updatedAt": "2025-12-13T12:00:00.000Z",
    "__v": 0
  }
}
```

#### Error Response (401 Unauthorized)
```json
{
  "message": "Unauthorized"
}
```

### 3.2 GET /health-profile
Get health profile for authenticated user.

#### Request
```bash
curl -X GET http://localhost:4000/api/health-profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Success Response (200 OK)
```json
{
  "_id": "6737d5f8c1e2a4b5c6d7e8f1",
  "userId": "6737d5f8c1e2a4b5c6d7e8f0",
  "gender": "male",
  "age": 30,
  "goal": "lose-weight",
  "triedHealthyBefore": true,
  "hungryTime": "morning",
  "favoriteMeal": "salad",
  "height": 170,
  "currentWeight": 70,
  "desiredWeight": 65,
  "activityLevel": "moderately-active",
  "averageDay": "busy work day",
  "workSchedule": "9-5",
  "sleepDuration": 8,
  "diseases": ["diabetes"],
  "dietPreference": "omnivore",
  "mealsPerDay": 3,
  "cuisinePreference": ["mediterranean", "asian"],
  "createdAt": "2025-12-13T12:00:00.000Z",
  "updatedAt": "2025-12-13T12:00:00.000Z",
  "__v": 0
}
```

#### Error Response (401 Unauthorized)
```json
{
  "message": "Unauthorized"
}
```

#### Error Response (404 Not Found)
```json
{
  "message": "Health profile not found"
}
```

### 3.3 DELETE /health-profile
Delete health profile for authenticated user.

#### Request
```bash
curl -X DELETE http://localhost:4000/api/health-profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Success Response (200 OK)
```json
{
  "ok": true
}
```

#### Error Response (401 Unauthorized)
```json
{
  "message": "Unauthorized"
}
```

#### Error Response (404 Not Found)
```json
{
  "message": "Health profile not found"
}
```

---

## 4. Recipe Endpoints

### 4.1 GET /recipes
List all recipes with optional filtering.

#### Request
```bash
curl -X GET "http://localhost:4000/api/recipes?q=salad&tag=healthy"
```

#### Parameters
- `q` (query): Search term for recipe title
- `tag` (query): Filter by tag

#### Success Response (200 OK)
```json
[
  {
    "_id": "6737d5f8c1e2a4b5c6d7e8f2",
    "title": "Greek Salad",
    "description": "Fresh and healthy Greek salad",
    "calories": 250,
    "protein": 10,
    "carbs": 20,
    "fat": 15,
    "tags": ["healthy", "vegetarian"],
    "ingredients": ["tomatoes", "cucumbers", "olives", "feta"],
    "steps": ["Chop vegetables", "Mix ingredients", "Serve"],
    "imageUrl": "https://example.com/image.jpg",
    "author": "6737d5f8c1e2a4b5c6d7e8f0",
    "createdAt": "2025-12-13T12:00:00.000Z",
    "updatedAt": "2025-12-13T12:00:00.000Z",
    "__v": 0
  }
]
```

### 4.2 GET /recipes/{id}
Get a specific recipe by ID.

#### Request
```bash
curl -X GET http://localhost:4000/api/recipes/6737d5f8c1e2a4b5c6d7e8f2
```

#### Parameters
- `id` (path, required): Recipe ID

#### Success Response (200 OK)
```json
{
  "_id": "6737d5f8c1e2a4b5c6d7e8f2",
  "title": "Greek Salad",
  "description": "Fresh and healthy Greek salad",
  "calories": 250,
  "protein": 10,
  "carbs": 20,
  "fat": 15,
  "tags": ["healthy", "vegetarian"],
  "ingredients": ["tomatoes", "cucumbers", "olives", "feta"],
  "steps": ["Chop vegetables", "Mix ingredients", "Serve"],
  "imageUrl": "https://example.com/image.jpg",
  "author": "6737d5f8c1e2a4b5c6d7e8f0",
  "createdAt": "2025-12-13T12:00:00.000Z",
  "updatedAt": "2025-12-13T12:00:00.000Z",
  "__v": 0
}
```

#### Error Response (404 Not Found)
```json
{
  "message": "Not found"
}
```

### 4.3 POST /recipes
Create a new recipe (authenticated users only).

#### Request
```bash
curl -X POST http://localhost:4000/api/recipes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "title": "Greek Salad",
    "description": "Fresh and healthy Greek salad",
    "calories": 250,
    "protein": 10,
    "carbs": 20,
    "fat": 15,
    "tags": ["healthy", "vegetarian"],
    "ingredients": ["tomatoes", "cucumbers", "olives", "feta"],
    "steps": ["Chop vegetables", "Mix ingredients", "Serve"],
    "imageUrl": "https://example.com/image.jpg"
  }'
```

#### Parameters
- `title` (string, required): Recipe title
- `description` (string): Recipe description
- `calories` (number): Calories per serving
- `protein` (number): Protein in grams
- `carbs` (number): Carbohydrates in grams
- `fat` (number): Fat in grams
- `tags` (array): List of tags
- `ingredients` (array): List of ingredients
- `steps` (array): Cooking steps
- `imageUrl` (string): Image URL

#### Success Response (201 Created)
```json
{
  "_id": "6737d5f8c1e2a4b5c6d7e8f2",
  "title": "Greek Salad",
  "description": "Fresh and healthy Greek salad",
  "calories": 250,
  "protein": 10,
  "carbs": 20,
  "fat": 15,
  "tags": ["healthy", "vegetarian"],
  "ingredients": ["tomatoes", "cucumbers", "olives", "feta"],
  "steps": ["Chop vegetables", "Mix ingredients", "Serve"],
  "imageUrl": "https://example.com/image.jpg",
  "author": "6737d5f8c1e2a4b5c6d7e8f0",
  "createdAt": "2025-12-13T12:00:00.000Z",
  "updatedAt": "2025-12-13T12:00:00.000Z",
  "__v": 0
}
```

### 4.4 PUT /recipes/{id}
Update a recipe (authenticated users only).

#### Request
```bash
curl -X PUT http://localhost:4000/api/recipes/6737d5f8c1e2a4b5c6d7e8f2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "title": "Updated Greek Salad",
    "calories": 300
  }'
```

#### Parameters
- `id` (path, required): Recipe ID

#### Success Response (200 OK)
```json
{
  "_id": "6737d5f8c1e2a4b5c6d7e8f2",
  "title": "Updated Greek Salad",
  "description": "Fresh and healthy Greek salad",
  "calories": 300,
  "protein": 10,
  "carbs": 20,
  "fat": 15,
  "tags": ["healthy", "vegetarian"],
  "ingredients": ["tomatoes", "cucumbers", "olives", "feta"],
  "steps": ["Chop vegetables", "Mix ingredients", "Serve"],
  "imageUrl": "https://example.com/image.jpg",
  "author": "6737d5f8c1e2a4b5c6d7e8f0",
  "createdAt": "2025-12-13T12:00:00.000Z",
  "updatedAt": "2025-12-13T12:00:00.000Z",
  "__v": 0
}
```

#### Error Response (404 Not Found)
```json
{
  "message": "Not found"
}
```

### 4.5 DELETE /recipes/{id}
Delete a recipe (authenticated users only).

#### Request
```bash
curl -X DELETE http://localhost:4000/api/recipes/6737d5f8c1e2a4b5c6d7e8f2 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Parameters
- `id` (path, required): Recipe ID

#### Success Response (200 OK)
```json
{
  "ok": true
}
```

#### Error Response (404 Not Found)
```json
{
  "message": "Not found"
}
```

---

## 5. Meal Plan Endpoints

### 5.1 POST /meal-plans/generate
Generate a personalized meal plan using LM Studio AI based on user's health profile.

#### Request
```bash
curl -X POST http://localhost:4000/api/meal-plans/generate \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Success Response (201 Created)
```json
{
  "ok": true,
  "message": "Meal plan generated successfully",
  "mealPlan": {
    "_id": "6737d5f8c1e2a4b5c6d7e8f9",
    "userId": "6737d5f8c1e2a4b5c6d7e8f0",
    "healthProfileId": "6737d5f8c1e2a4b5c6d7e8f1",
    "title": "2-Week Meal Plan",
    "aiModel": "lm-studio",
    "duration": {
      "weeks": 2,
      "totalDays": 14
    },
    "days": [
      {
        "day": 1,
        "title": "Day 1",
        "theme": "balanced nutrition",
        "macros": {
          "protein": 100,
          "carbs": 200,
          "fat": 50
        },
        "totalCalories": 1800,
        "meals": [
          {
            "mealType": "breakfast",
            "name": "meal name",
            "description": "short description",
            "ingredients": ["item1", "item2"],
            "benefits": ["benefit1"],
            "calories": 400,
            "macros": {
              "protein": 20,
              "carbs": 50,
              "fat": 10
            }
          }
        ],
        "tips": ["tip1"]
      }
    ],
    "prompt": "per-meal-generation",
    "rawAiResponse": null,
    "notes": null,
    "createdAt": "2025-12-13T12:00:00.000Z",
    "updatedAt": "2025-12-13T12:00:00.000Z",
    "__v": 0
  },
  "disclaimer": "This meal plan is generated by AI and is not a substitute for professional medical or dietary advice. Consult your healthcare provider before making dietary changes related to your health conditions.",
  "unsupportedDiseases": []
}
```

> **Note:** The `disclaimer` field is only included when the user's health profile has diseases. The `unsupportedDiseases` field lists any disease names that are not in the supported set.

#### Error Response (400 Bad Request)
```json
{
  "message": "Health profile is missing required fields: gender, age."
}
```

#### Error Response (401 Unauthorized)
```json
{
  "message": "Unauthorized"
}
```

#### Error Response (404 Not Found)
```json
{
  "message": "Health profile not found. Please complete your health profile first."
}
```

#### Error Response (500 Internal Server Error)
```json
{
  "message": "Failed to generate meal plan",
  "error": "connect ECONNREFUSED 127.0.0.1:1234"
}
```

#### Error Response (500 - Disease Safety Failure)
```json
{
  "message": "Unable to generate safe meal plan for selected health conditions",
  "reason": "disease safety validation failed",
  "errors": ["Unable to generate safe meal plan for selected health conditions"]
}
```

### 5.2 GET /meal-plans/latest
Retrieve the most recently generated meal plan for the authenticated user. Populates the linked health profile.

#### Request
```bash
curl -X GET http://localhost:4000/api/meal-plans/latest \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Success Response (200 OK)
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
      "theme": "balanced nutrition",
      "macros": {
        "protein": 100,
        "carbs": 200,
        "fat": 50
      },
      "totalCalories": 1800,
      "meals": [
        {
          "mealType": "breakfast",
          "name": "meal name",
          "description": "short description",
          "ingredients": ["item1", "item2"],
          "benefits": ["benefit1"],
          "calories": 400,
          "macros": {
            "protein": 20,
            "carbs": 50,
            "fat": 10
          }
        }
      ],
      "tips": ["tip1"]
    }
  ],
  "createdAt": "2025-12-13T12:00:00.000Z",
  "updatedAt": "2025-12-13T12:00:00.000Z"
}
```

#### Error Response (401 Unauthorized)
```json
{
  "message": "Unauthorized"
}
```

#### Error Response (404 Not Found)
```json
{
  "message": "Meal plan not found"
}
```

### 5.3 GET /meal-plans
Retrieve all meal plans for the authenticated user with pagination. Populates the linked health profile.

#### Request
```bash
curl -X GET "http://localhost:4000/api/meal-plans?limit=5&skip=0" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Parameters
- `limit` (query, default: 10): Number of meal plans to return per page
- `skip` (query, default: 0): Number of meal plans to skip (offset)

#### Success Response (200 OK)
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
          "theme": "balanced nutrition",
          "macros": {
            "protein": 100,
            "carbs": 200,
            "fat": 50
          },
          "totalCalories": 1800,
          "meals": [
            {
              "mealType": "breakfast",
              "name": "meal name",
              "description": "short description",
              "ingredients": ["item1", "item2"],
              "benefits": ["benefit1"],
              "calories": 400,
              "macros": {
                "protein": 20,
                "carbs": 50,
                "fat": 10
              }
            }
          ],
          "tips": ["tip1"]
        }
      ],
      "createdAt": "2025-12-13T12:00:00.000Z",
      "updatedAt": "2025-12-13T12:00:00.000Z"
    }
  ],
  "total": 1,
  "limit": 5,
  "skip": 0
}
```

#### Error Response (401 Unauthorized)
```json
{
  "message": "Unauthorized"
}
```

### 5.4 DELETE /meal-plans/{id}
Delete a specific meal plan by ID.

#### Request
```bash
curl -X DELETE http://localhost:4000/api/meal-plans/6737d5f8c1e2a4b5c6d7e8f9 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Parameters
- `id` (path, required): Meal plan ID

#### Success Response (200 OK)
```json
{
  "ok": true
}
```

#### Error Response (401 Unauthorized)
```json
{
  "message": "Unauthorized"
}
```

#### Error Response (404 Not Found)
```json
{
  "message": "Meal plan not found"
}
```

### 5.5 POST /meal-plans/{planId}/swap
Swap a specific meal in a meal plan with a newly AI-generated replacement. The new meal keeps the same macros/calories but different content.

#### Request
```bash
curl -X POST http://localhost:4000/api/meal-plans/6737d5f8c1e2a4b5c6d7e8f9/swap \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "day": 1,
    "mealIndex": 0
  }'
```

#### Parameters
- `planId` (path, required): Meal plan ID
- `day` (number, required): Day number in the plan
- `mealIndex` (number, required): Index of the meal to swap within that day's meals array

#### Success Response (200 OK)
```json
{
  "ok": true,
  "message": "Meal swapped successfully",
  "swapCount": 1,
  "swappedMeal": {
    "mealType": "breakfast",
    "name": "New meal name",
    "description": "New meal description",
    "ingredients": ["ingredient1", "ingredient2"],
    "benefits": ["benefit1"],
    "calories": 450,
    "macros": {
      "protein": 15,
      "carbs": 65,
      "fat": 15
    }
  }
}
```

#### Error Response (400 Bad Request)
```json
{
  "message": "day and mealIndex are required"
}
```

```json
{
  "message": "Maximum swap limit (5) reached for this plan"
}
```

#### Error Response (404 Not Found)
```json
{
  "message": "Meal plan not found"
}
```

### 5.6 GET /meal-plans/{planId}/shopping-list
Generate a shopping list from a meal plan's ingredients, optionally filtered by day range.

#### Request
```bash
curl -X GET "http://localhost:4000/api/meal-plans/6737d5f8c1e2a4b5c6d7e8f9/shopping-list?startDay=1&endDay=7" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Parameters
- `planId` (path, required): Meal plan ID
- `startDay` (query, default: 1): Start day for the shopping list
- `endDay` (query, default: all days): End day for the shopping list

#### Success Response (200 OK)
```json
{
  "ok": true,
  "shoppingList": ["Whole-grain bread", "Fresh tomato", "Olive oil", "Feta cheese"]
}
```

#### Error Response (404 Not Found)
```json
{
  "message": "Meal plan not found"
}
```

### 5.7 DELETE /meal-plans
Delete all meal plans for the authenticated user.

#### Request
```bash
curl -X DELETE http://localhost:4000/api/meal-plans \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Success Response (200 OK)
```json
{
  "ok": true,
  "message": "All meal plans deleted successfully"
}
```

#### Error Response (401 Unauthorized)
```json
{
  "message": "Unauthorized"
}
```

---

## 6. Favorite Endpoints

### 6.1 POST /favorites
Add an item (recipe or meal plan) to favorites.

#### Request
```bash
curl -X POST http://localhost:4000/api/favorites \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "targetType": "recipe",
    "targetId": "6737d5f8c1e2a4b5c6d7e8f2",
    "note": "Love this salad"
  }'
```

#### Parameters
- `targetType` (string, required): `'meal-plan'` or `'recipe'`
- `targetId` (string, required): ID of the item to favorite
- `note` (string, optional): Personal note (max 500 chars)

#### Success Response (201 Created)
```json
{
  "_id": "6737d5f8c1e2a4b5c6d7e900",
  "userId": "6737d5f8c1e2a4b5c6d7e8f0",
  "targetType": "recipe",
  "targetId": "6737d5f8c1e2a4b5c6d7e8f2",
  "note": "Love this salad",
  "createdAt": "2025-12-13T12:00:00.000Z",
  "updatedAt": "2025-12-13T12:00:00.000Z"
}
```

#### Error Response (400 Bad Request)
```json
{
  "message": "targetType and targetId are required"
}
```

#### Error Response (409 Conflict)
```json
{
  "message": "Already in favorites"
}
```

### 6.2 GET /favorites
List favorites for the authenticated user with optional filtering and pagination.

#### Request
```bash
curl -X GET "http://localhost:4000/api/favorites?targetType=recipe&limit=10&skip=0" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Parameters
- `targetType` (query, optional): Filter by `'meal-plan'` or `'recipe'`
- `limit` (query, default: 20): Number of favorites to return
- `skip` (query, default: 0): Number of favorites to skip

#### Success Response (200 OK)
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

### 6.3 GET /favorites/check
Check if a specific item is in the user's favorites.

#### Request
```bash
curl -X GET "http://localhost:4000/api/favorites/check?targetType=recipe&targetId=6737d5f8c1e2a4b5c6d7e8f2" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Parameters
- `targetType` (query, required): `'meal-plan'` or `'recipe'`
- `targetId` (query, required): ID of the item to check

#### Success Response (200 OK)
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

#### Error Response (400 Bad Request)
```json
{
  "message": "targetType and targetId query params are required"
}
```

### 6.4 DELETE /favorites/{id}
Remove an item from favorites.

#### Request
```bash
curl -X DELETE http://localhost:4000/api/favorites/6737d5f8c1e2a4b5c6d7e900 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Parameters
- `id` (path, required): Favorite ID

#### Success Response (200 OK)
```json
{
  "ok": true
}
```

#### Error Response (404 Not Found)
```json
{
  "message": "Favorite not found"
}
```

---

## Complete Object Structures

### User Object
```json
{
  "_id": "MongoDB ObjectId",
  "email": "user@example.com",
  "password": "hashed_password",
  "username": "username",
  "fullName": "Full Name",
  "phone": "+1234567890",
  "birthday": "1990-01-01T00:00:00.000Z",
  "gender": "male|female|other",
  "role": "user|admin",
  "createdAt": "ISO 8601 timestamp",
  "updatedAt": "ISO 8601 timestamp",
  "__v": 0
}
```

### Health Profile Object
```json
{
  "_id": "MongoDB ObjectId",
  "userId": "User ObjectId",
  "gender": "male|female",
  "age": 30,
  "goal": "lose-weight|gain-weight|improve-health",
  "triedHealthyBefore": true,
  "hungryTime": "morning|afternoon|evening|night",
  "favoriteMeal": "string",
  "height": 170,
  "currentWeight": 70,
  "desiredWeight": 65,
  "activityLevel": "sedentary|lightly-active|moderately-active|very-active|extremely-active",
  "averageDay": "string",
  "workSchedule": "string",
  "sleepDuration": 8,
  "diseases": ["diabetes", "kidney-disease", "high-uric-acid", "hypertension"],
  "dietPreference": "string",
  "mealsPerDay": 3,
  "cuisinePreference": ["cuisine1", "cuisine2"],
  "createdAt": "ISO 8601 timestamp",
  "updatedAt": "ISO 8601 timestamp",
  "__v": 0
}
```

### Recipe Object
```json
{
  "_id": "MongoDB ObjectId",
  "title": "Recipe Title",
  "description": "Recipe description",
  "calories": 250,
  "protein": 10,
  "carbs": 20,
  "fat": 15,
  "tags": ["tag1", "tag2"],
  "ingredients": ["ingredient1", "ingredient2"],
  "steps": ["step1", "step2"],
  "imageUrl": "https://example.com/image.jpg",
  "author": "User ObjectId",
  "createdAt": "ISO 8601 timestamp",
  "updatedAt": "ISO 8601 timestamp",
  "__v": 0
}
```

### Favorite Object
```json
{
  "_id": "MongoDB ObjectId",
  "userId": "User ObjectId",
  "targetType": "meal-plan|recipe",
  "targetId": "MongoDB ObjectId (MealPlan or Recipe)",
  "note": "Optional personal note (max 500 chars)",
  "createdAt": "ISO 8601 timestamp",
  "updatedAt": "ISO 8601 timestamp",
  "__v": 0
}
```

### Meal Plan Object
```json
{
  "_id": "MongoDB ObjectId",
  "userId": "User ObjectId",
  "healthProfileId": "HealthProfile ObjectId",
  "title": "Meal plan title",
  "duration": {
    "weeks": 1,
    "totalDays": 7
  },
  "days": [
    {
      "day": 1,
      "title": "Day 1",
      "theme": "Theme description",
      "macros": {
        "protein": 100,
        "carbs": 200,
        "fat": 50
      },
      "totalCalories": 1800,
      "meals": [
        {
          "mealType": "breakfast|lunch|dinner|snack",
          "name": "Meal name",
          "description": "Brief description",
          "ingredients": ["ingredient1", "ingredient2"],
          "benefits": ["benefit1", "benefit2"],
          "calories": 400,
          "macros": {
            "protein": 20,
            "carbs": 50,
            "fat": 10
          }
        }
      ],
      "tips": ["tip1", "tip2"]
    }
  ],
  "aiModel": "lm-studio",
  "prompt": "per-meal-generation",
  "rawAiResponse": null,
  "notes": "Optional notes",
  "createdAt": "ISO 8601 timestamp",
  "updatedAt": "ISO 8601 timestamp",
  "__v": 0
}
```

---

## HTTP Status Codes

| Code | Meaning | When |
|------|---------|------|
| 200  | OK      | GET/PUT/DELETE request successful |
| 201  | Created | Resource created successfully |
| 400  | Bad Request | Missing required fields or invalid parameters |
| 401  | Unauthorized | Missing or invalid JWT token |
| 403  | Forbidden | Insufficient permissions |
| 404  | Not Found | Resource not found |
| 409  | Conflict | Resource already exists |
| 500  | Server Error | Internal server error |

---

## Frontend Usage Examples

### JavaScript/TypeScript Examples

```typescript
// Register user
async function register(email: string, password: string, username: string) {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, username })
  });
  return response.json();
}

// Login
async function login(email: string, password: string) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  if (data.token) localStorage.setItem('token', data.token);
  return data;
}

// Logout
async function logout(token: string) {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  if (data.ok) localStorage.removeItem('token');
  return data;
}

// Get user profile
async function getProfile(token: string) {
  const response = await fetch('/api/auth/profile', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
}

// Create health profile
async function createHealthProfile(token: string, profileData: object) {
  const response = await fetch('/api/health-profile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(profileData)
  });
  return response.json();
}

// Generate meal plan
async function generateMealPlan(token: string) {
  const response = await fetch('/api/meal-plans/generate', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  return data.mealPlan;
}

// Get recipes
async function getRecipes(search?: string, tag?: string) {
  const params = new URLSearchParams();
  if (search) params.append('q', search);
  if (tag) params.append('tag', tag);
  const response = await fetch(`/api/recipes?${params}`);
  return response.json();
}

// Create recipe
async function createRecipe(token: string, recipeData: object) {
  const response = await fetch('/api/recipes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(recipeData)
  });
  return response.json();
}

// Update profile
async function updateProfile(token: string, updates: object) {
  const response = await fetch('/api/auth/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(updates)
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
async function getShoppingList(token: string, planId: string) {
  const response = await fetch(`/api/meal-plans/${planId}/shopping-list`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
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
```</content>
<parameter name="filePath">/Users/felixngo/Desktop/UIT-Project/eat-clean-api/API_DOCUMENTATION.md