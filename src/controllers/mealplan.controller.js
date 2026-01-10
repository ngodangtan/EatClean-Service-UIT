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
        temperature: 0.5, // Lower temperature for more consistent output
        max_tokens: 8000, // Increased from 4000 to allow full response
        top_p: 0.9
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

  return `You are a professional nutritionist. Generate a 3-day personalized meal plan. Return ONLY valid JSON, nothing else.

User Profile:
- Goal: ${goal}
- Height: ${height}cm, Current: ${currentWeight}kg, Desired: ${desiredWeight}kg
- Activity: ${activityLevel}, Sleep: ${sleepDuration}h
- Diet: ${dietPreference}, Meals/day: ${mealsPerDay}
- Cuisines: ${cuisineList}
- Favorite: ${favoriteMeal}
- Conditions: ${diseasesList}
- Schedule: ${workSchedule}

Return ONLY this JSON (no markdown, no text):
{
  "title": "3-Day Meal Plan",
  "days": [
    {
      "day": 1,
      "title": "Day 1",
      "theme": "balanced nutrition",
      "macros": {"protein": 100, "carbs": 200, "fat": 50},
      "totalCalories": 1800,
      "meals": [
        {
          "mealType": "breakfast",
          "name": "meal name",
          "description": "short description",
          "ingredients": ["item1", "item2"],
          "benefits": ["benefit1"],
          "calories": 400,
          "macros": {"protein": 20, "carbs": 50, "fat": 10}
        }
      ],
      "tips": ["tip1"]
    }
  ]
}

STRICT RULES:
1. Return JSON ONLY - no code blocks, no markdown, no text
2. All strings must have double quotes: "value" not value
3. No trailing commas
4. Valid numbers only: 100, 50.5 (not "100")
5. Ensure complete, valid JSON - no truncated strings`;
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
      // Extract JSON from response, handling markdown code blocks
      let jsonText = aiResponse.trim();
      
      // Remove markdown code block markers if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      jsonText = jsonText.trim();
      
      // If still not valid JSON, try to extract JSON object
      if (!jsonText.startsWith('{')) {
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }
        jsonText = jsonMatch[0];
      }
      
      // Validate JSON before parsing - check for common issues
      // Look for unterminated strings by checking quote pairs
      let inString = false;
      let escapeNext = false;
      for (let i = 0; i < jsonText.length; i++) {
        const char = jsonText[i];
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
        if (char === '"') {
          inString = !inString;
        }
      }
      
      if (inString) {
        // Unterminated string detected - try to fix by removing last incomplete section
        const lastBracketIndex = jsonText.lastIndexOf('}');
        if (lastBracketIndex > 0) {
          jsonText = jsonText.substring(0, lastBracketIndex + 1);
        }
      }
      
      // Try to parse with standard JSON parser
      try {
        parsedPlan = JSON.parse(jsonText);
      } catch (firstAttemptError) {
        // If first attempt fails, try to clean up the JSON
        // Remove any trailing commas before closing brackets
        jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1');
        
        // Try parsing again
        try {
          parsedPlan = JSON.parse(jsonText);
        } catch (secondAttemptError) {
          // Log detailed error info
          console.error('JSON parsing failed:', firstAttemptError.message);
          const errorMatch = firstAttemptError.message.match(/position (\d+)/);
          const errorPos = errorMatch ? parseInt(errorMatch[1]) : 0;
          
          const contextStart = Math.max(0, errorPos - 80);
          const contextEnd = Math.min(jsonText.length, errorPos + 80);
          console.error('Problem area:', jsonText.substring(contextStart, contextEnd));
          
          throw secondAttemptError;
        }
      }
    } catch (parseError) {
      console.error('Failed to parse LM Studio response:', parseError);
      console.error('Raw response length:', aiResponse.length);
      return res.status(500).json({ 
        message: 'Failed to parse meal plan from AI response',
        error: parseError.message,
        rawResponse: aiResponse.substring(0, 300)
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

// Delete all meal plans for user
export async function deleteAllMealPlans(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    await MealPlan.deleteMany({ userId });
    return res.json({ ok: true, message: 'All meal plans deleted successfully' });
  } catch (error) {
    console.error('Delete all meal plans error:', error);
    return res.status(500).json({ message: error.message });
  }
}
