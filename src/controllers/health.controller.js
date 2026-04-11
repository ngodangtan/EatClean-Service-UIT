import HealthProfile from '../models/HealthProfile.js';
import User from '../models/User.js';
import {
  validateDiseasesAgainstCatalog,
  snapshotIndicatorUnits
} from '../validators/healthProfile.validator.js';

export async function createOrUpdateHealthProfile(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const {
      goal,
      triedHealthyBefore,
      hungryTime,
      favoriteMeal,
      desiredWeight,
      activityLevel,
      averageDay,
      workSchedule,
      sleepDuration,
      diseases,
      dietPreference,
      mealsPerDay,
      cuisinePreference
    } = req.body;

    // Catalog cross-check for diseases (Joi can't reach the catalog).
    if (diseases !== undefined) {
      const catalogCheck = validateDiseasesAgainstCatalog(diseases);
      if (!catalogCheck.valid) {
        return res.status(400).json({
          message: 'Validation failed',
          statusCode: 400,
          errors: catalogCheck.errors
        });
      }
      snapshotIndicatorUnits(diseases);
    }

    // gender, birthday, height, currentWeight come from the User account (set at registration)
    const user = await User.findById(userId).select('gender birthday height currentWeight');
    const gender = user?.gender;
    const age = user?.birthday
      ? Math.floor((Date.now() - new Date(user.birthday).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : undefined;
    const height = user?.height;
    const currentWeight = user?.currentWeight;

    // Find and update or create if not exists
    let profile = await HealthProfile.findOne({ userId });

    if (profile) {
      // Update existing profile
      profile.gender = gender ?? profile.gender;
      profile.age = age ?? profile.age;
      profile.goal = goal ?? profile.goal;
      profile.triedHealthyBefore = triedHealthyBefore ?? profile.triedHealthyBefore;
      profile.hungryTime = hungryTime ?? profile.hungryTime;
      profile.favoriteMeal = favoriteMeal ?? profile.favoriteMeal;
      profile.height = height ?? profile.height;
      profile.currentWeight = currentWeight ?? profile.currentWeight;
      profile.desiredWeight = desiredWeight ?? profile.desiredWeight;
      profile.activityLevel = activityLevel ?? profile.activityLevel;
      profile.averageDay = averageDay ?? profile.averageDay;
      profile.workSchedule = workSchedule ?? profile.workSchedule;
      profile.sleepDuration = sleepDuration ?? profile.sleepDuration;
      profile.diseases = diseases ?? profile.diseases;
      profile.dietPreference = dietPreference ?? profile.dietPreference;
      profile.mealsPerDay = mealsPerDay ?? profile.mealsPerDay;
      profile.cuisinePreference = cuisinePreference ?? profile.cuisinePreference;

      await profile.save();
      return res.json({ ok: true, profile });
    } else {
      // Create new profile
      profile = await HealthProfile.create({
        userId,
        gender,
        age,
        goal,
        triedHealthyBefore,
        hungryTime,
        favoriteMeal,
        height,
        currentWeight,
        desiredWeight,
        activityLevel,
        averageDay,
        workSchedule,
        sleepDuration,
        diseases,
        dietPreference,
        mealsPerDay,
        cuisinePreference
      });
      return res.status(201).json({ ok: true, profile });
    }
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

export async function getHealthProfile(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const profile = await HealthProfile.findOne({ userId });
    if (!profile) return res.status(404).json({ message: 'Health profile not found' });

    return res.json(profile);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

export async function deleteHealthProfile(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const deleted = await HealthProfile.findOneAndDelete({ userId });
    if (!deleted) return res.status(404).json({ message: 'Health profile not found' });

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}
