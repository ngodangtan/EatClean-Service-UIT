import HealthProfile from '../models/HealthProfile.js';
import MealPlan from '../models/MealPlan.js';

// Helper function to call LM Studio API
async function callLMStudio(prompt) {
  const lmStudioUrl = process.env.LM_STUDIO_URL || 'http://localhost:1234/v1/chat/completions';
  
  try {
    const response = await fetch(lmStudioUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'local-model', // LM Studio uses this model name
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      throw new Error(`LM Studio error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('LM Studio call failed:', error);
    throw error;
  }
}

// Helper function to build a prompt from health profile
function buildMealPlanPrompt(healthProfile) {
  const {
    goal,
    height,
    currentWeight,
    desiredWeight,
    activityLevel,
    sleepDuration,
    dietPreference,
    mealsPerDay,
    cuisinePreference,
    favoriteMeal,
    diseases,
    workSchedule
  } = healthProfile;

  const cuisineList = (cuisinePreference || []).join(', ') || 'diverse';
  const diseasesList = (diseases || []).length > 0 ? diseases.join(', ') : 'none';

  return `You are a professional nutritionist and meal planner. Generate a detailed 7-day personalized meal plan based on the following user profile:

**User Profile:**
- Goal: ${goal}
- Height: ${height} cm
- Current Weight: ${currentWeight} kg
- Desired Weight: ${desiredWeight} kg
- Activity Level: ${activityLevel}
- Sleep Duration: ${sleepDuration} hours/day
- Diet Preference: ${dietPreference}
- Meals per Day: ${mealsPerDay}
- Cuisine Preferences: ${cuisineList}
- Favorite Meal: ${favoriteMeal}
- Health Conditions: ${diseasesList}
- Work Schedule: ${workSchedule}

**Format your response as a JSON object with this exact structure (very important - return ONLY valid JSON):**
{
  "title": "7-Day Personalized Meal Plan",
  "days": [
    {
      "day": 1,
      "title": "Day 1",
      "theme": "brief theme description",
      "macros": { "protein": number, "carbs": number, "fat": number },
      "totalCalories": number,
      "meals": [
        {
          "mealType": "breakfast|lunch|dinner|snack",
          "name": "meal name",
          "description": "brief description",
          "ingredients": ["ingredient1", "ingredient2"],
          "benefits": ["benefit1", "benefit2"],
          "calories": number,
          "macros": { "protein": number, "carbs": number, "fat": number }
        }
      ],
      "tips": ["tip1", "tip2"]
    }
  ]
}

Make sure the meal plan respects the user's dietary preferences, health conditions, and goals. Include detailed ingredients and health benefits for each meal. Return ONLY valid JSON, no additional text.`;
}

// Generate meal plan by calling LM Studio
export async function generateMealPlan(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Fetch user's health profile
    const healthProfile = await HealthProfile.findOne({ userId });
    if (!healthProfile) {
      return res.status(404).json({ message: 'Health profile not found. Please complete your health profile first.' });
    }

    // Build prompt
    const prompt = buildMealPlanPrompt(healthProfile);

    console.log('Calling LM Studio with prompt...');
    const aiResponse = await callLMStudio(prompt);
    console.log('LM Studio response received');

    // Parse AI response as JSON
    let parsedPlan;
    try {
      // Try to extract JSON from response (in case there's extra text)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      parsedPlan = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse LM Studio response:', parseError);
      return res.status(500).json({ 
        message: 'Failed to parse meal plan from AI response',
        error: parseError.message,
        rawResponse: aiResponse.substring(0, 500) // Show first 500 chars for debugging
      });
    }

    // Save meal plan to database
    const mealPlan = await MealPlan.create({
      userId,
      healthProfileId: healthProfile._id,
      title: parsedPlan.title || '7-Day Meal Plan',
      days: parsedPlan.days || [],
      aiModel: 'lm-studio',
      prompt,
      rawAiResponse: aiResponse
    });

    return res.status(201).json({ 
      ok: true, 
      message: 'Meal plan generated successfully',
      mealPlan 
    });
  } catch (error) {
    console.error('Generate meal plan error:', error);
    return res.status(500).json({ 
      message: 'Failed to generate meal plan',
      error: error.message 
    });
  }
}

// Get existing meal plan for user
export async function getMealPlan(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const mealPlan = await MealPlan.findOne({ userId })
      .sort({ createdAt: -1 }) // Get most recent
      .populate('healthProfileId');
    
    if (!mealPlan) {
      return res.status(404).json({ message: 'Meal plan not found' });
    }

    return res.json(mealPlan);
  } catch (error) {
    console.error('Get meal plan error:', error);
    return res.status(500).json({ message: error.message });
  }
}

// Get all meal plans for user (pagination optional)
export async function getMealPlans(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const limit = parseInt(req.query.limit) || 10;
    const skip = parseInt(req.query.skip) || 0;

    const mealPlans = await MealPlan.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('healthProfileId');

    const total = await MealPlan.countDocuments({ userId });

    return res.json({ 
      mealPlans, 
      total,
      limit,
      skip
    });
  } catch (error) {
    console.error('Get meal plans error:', error);
    return res.status(500).json({ message: error.message });
  }
}

// Delete meal plan
export async function deleteMealPlan(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { id } = req.params;
    const mealPlan = await MealPlan.findOne({ _id: id, userId });

    if (!mealPlan) {
      return res.status(404).json({ message: 'Meal plan not found' });
    }

    await MealPlan.deleteOne({ _id: id });
    return res.json({ ok: true });
  } catch (error) {
    console.error('Delete meal plan error:', error);
    return res.status(500).json({ message: error.message });
  }
}
