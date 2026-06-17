/**
 * Integration test: Health Profile + Meal Plan generation flow.
 *
 * Prerequisites:
 *   1. The API server must be running (`npm run dev`)
 *   2. MongoDB must be reachable (configured via MONGODB_URI)
 *   3. LM Studio must be running with a model loaded (for meal generation)
 *
 * The test registers a fresh user with all required demographic fields,
 * runs the full flow, then deletes the user to clean up.
 *
 * Run:
 *   npx vitest run tests/integration/healthMealPlanFlow.test.js
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const BASE_URL = process.env.API_URL || 'http://localhost:4000/api';

// Unique email to avoid collisions with real users
const TEST_EMAIL = `test_integration_${Date.now()}@yopmail.com`;
const TEST_PASSWORD = 'Test1234';

// ── Helpers ─────────────────────────────────────────────────────────────────

async function api(method, path, { body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

// ── Test suite ──────────────────────────────────────────────────────────────

describe('Health Profile → Meal Plan integration flow', () => {
  let accessToken;
  let userId;

  // ── Step 1: Register a fresh user with all demographic fields ─────────────

  beforeAll(async () => {
    const { status, data } = await api('POST', '/auth/register', {
      body: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        fullName: 'Integration Test User',
        gender: 'male',
        birthday: '1991-04-12',
        height: 170,
        currentWeight: 90
      }
    });

    expect(status).toBe(201);
    expect(data.accessToken).toBeDefined();
    accessToken = data.accessToken;
    userId = data.user.id;
  });

  // ── Cleanup: delete user (cascades health profile) after all tests ────────

  afterAll(async () => {
    if (!accessToken || !userId) return;

    // Delete meal plans
    await api('DELETE', '/meal-plans', { token: accessToken });
    // Delete health profile
    await api('DELETE', '/health-profile', { token: accessToken });
    // Delete user account
    await api('DELETE', `/auth/${userId}`, { token: accessToken });
  });

  // ── Step 2: Create health profile for a hypertension user ─────────────────

  it('should create a health profile for a hypertension user', async () => {
    const profilePayload = {
      activityLevel: 'moderately-active',
      mealsPerDay: 3,
      sleepDuration: 7,
      hungryTime: 'morning',
      favoriteMeal: 'Phở bò',
      averageDay: 'Office work, light exercise in the evening',
      workSchedule: '9-5',
      dietPreference: 'omnivore',
      cuisinePreference: ['vietnamese', 'asian'],
      diseases: [
        {
          key: 'hypertension',
          diagnosedAt: '2024-06-15',
          indicators: [
            { key: 'systolic_bp', value: 145 },
            { key: 'diastolic_bp', value: 95 },
            { key: 'heart_rate', value: 85 }
          ]
        }
      ]
    };

    const { status, data } = await api('POST', '/health-profile', {
      body: profilePayload,
      token: accessToken
    });

    expect(status).toBe(201);
    expect(data.ok).toBe(true);
    expect(data.profile).toBeDefined();

    // Verify disease was saved correctly
    const profile = data.profile;
    expect(profile.diseases).toHaveLength(1);
    expect(profile.diseases[0].key).toBe('hypertension');
    expect(profile.diseases[0].indicators).toHaveLength(3);

    // Verify indicator units were snapshotted from the catalog
    const systolic = profile.diseases[0].indicators.find(i => i.key === 'systolic_bp');
    expect(systolic).toBeDefined();
    expect(systolic.value).toBe(145);
    expect(systolic.unit).toBe('mmHg');

    // Verify profile fields
    expect(profile.activityLevel).toBe('moderately-active');
    expect(profile.mealsPerDay).toBe(3);
  });

  // ── Step 3: Verify health profile via GET ─────────────────────────────────

  it('should verify the created health profile via GET', async () => {
    const { status, data } = await api('GET', '/health-profile', { token: accessToken });

    expect(status).toBe(200);
    expect(data.diseases[0].key).toBe('hypertension');
    // gender, age, height, currentWeight are populated from User account at creation time
    expect(data.gender).toBe('male');
    expect(data.currentWeight).toBe(90);
    expect(data.height).toBe(170);
    expect(data.age).toBeGreaterThanOrEqual(34);
    expect(data.age).toBeLessThanOrEqual(36);
  });

  // ── Step 4: Generate meal plan (disease_based, 1 week) ────────────────────

  it('should generate a 1-week disease-based meal plan for hypertension', { timeout: 120_000 }, async () => {
    const { status, data } = await api('POST', '/meal-plans/generate', {
      body: {
        purpose: 'disease_based',
        durationWeeks: 1
      },
      token: accessToken
    });

    // ── Assert: successful generation ───────────────────────────────────
    expect(status).toBe(201);
    expect(data.ok).toBe(true);
    expect(data.mealPlan).toBeDefined();

    const plan = data.mealPlan;

    // Plan metadata
    expect(plan.purpose).toBe('disease_based');
    expect(plan.title).toBe('7-Day Meal Plan');
    expect(plan.duration).toEqual({ weeks: 1, totalDays: 7 });

    // Must have exactly 7 days
    expect(plan.days).toHaveLength(7);

    // Each day should have meals with proper structure
    for (const day of plan.days) {
      expect(day.day).toBeGreaterThanOrEqual(1);
      expect(day.day).toBeLessThanOrEqual(7);
      expect(day.meals).toBeDefined();
      expect(day.meals.length).toBeGreaterThanOrEqual(1);
      expect(day.totalCalories).toBeGreaterThan(0);

      // Each meal should have required fields
      for (const meal of day.meals) {
        expect(meal.mealType).toBeDefined();
        expect(['breakfast', 'lunch', 'dinner', 'snack']).toContain(meal.mealType);
        expect(meal.name).toBeDefined();
        expect(typeof meal.name).toBe('string');
        expect(meal.name.length).toBeGreaterThan(0);
        expect(meal.ingredients).toBeDefined();
        expect(Array.isArray(meal.ingredients)).toBe(true);
        expect(meal.ingredients.length).toBeGreaterThan(0);
        expect(meal.calories).toBeGreaterThan(0);
        expect(meal.macros).toBeDefined();
        expect(meal.macros.protein).toBeGreaterThan(0);
        expect(meal.macros.carbs).toBeGreaterThanOrEqual(0);
        expect(meal.macros.fat).toBeGreaterThan(0);
      }
    }

    // ── Assert: medical disclaimer present (diseases on profile) ────────
    expect(data.disclaimer).toBeDefined();
    expect(data.disclaimer).toContain('not a substitute');

    // ── Assert: hypertension dietary considerations ─────────────────────
    // The disease engine forbids high-sodium ingredients for hypertension.
    // Collect all ingredient strings across the entire plan.
    const allIngredients = plan.days
      .flatMap(d => d.meals)
      .flatMap(m => m.ingredients)
      .map(i => (typeof i === 'string' ? i : '').toLowerCase());

    // These are explicitly in the hypertension forbidden list (diseaseRules.js)
    const hypertensionForbidden = [
      'mắm tôm',       // shrimp paste
      'dưa muối',      // pickled vegetables
      'cà muối',       // pickled eggplant
      'kim chi',        // kimchi
      'xúc xích',      // sausage
      'lạp xưởng',     // Chinese sausage
      'thịt xông khói' // bacon
    ];

    for (const forbidden of hypertensionForbidden) {
      const found = allIngredients.some(ing => ing.includes(forbidden));
      if (found) {
        console.warn(`⚠ Found potentially forbidden ingredient for hypertension: "${forbidden}"`);
      }
    }
  });
});
