export const defaultProgress = {
  water: 4,
  steps: 4200,
  sleep: 7,
  mood: 3,
  meals: 2,
  activity: 20,
};

export const mealSlots = ["breakfast", "lunch", "dinner", "snack"];

export const progressTargets = {
  water: 8,
  steps: 8000,
  sleep: 8,
  mood: 5,
  meals: 3,
  activity: 30,
};

export function clamp(value, min, max) {
  const numericValue = Number(value);
  return Math.max(min, Math.min(max, Number.isFinite(numericValue) ? numericValue : min));
}

export function calculateWellbeingScore(progress = defaultProgress) {
  const keys = Object.keys(progressTargets);
  return Math.round(
    (keys.reduce((total, key) => {
      const current = Number(progress[key] ?? 0);
      return total + Math.min(current / progressTargets[key], 1);
    }, 0) /
      keys.length) *
      100,
  );
}

export function moodToScore(moodId) {
  const scores = {
    sad: 2,
    stressed: 2,
    anxious: 2,
    tired: 3,
    happy: 4,
    motivated: 5,
  };
  return scores[moodId] ?? 3;
}

export function nudgeForMood(moodId) {
  const nudges = {
    anxious: {
      title: "Try a breathing meditation",
      action: "Breathe in for 4 counts, hold for 2, breathe out for 6. Repeat four times, then name one thing you can control.",
      route: "therapist",
    },
    stressed: {
      title: "Do a five-minute reset",
      action: "Try a short meditation: relax your shoulders, slow your breathing, then write one task to do now and one to delay.",
      route: "therapist",
    },
    tired: {
      title: "Choose sleep yoga",
      action: "Use a gentle wind-down yoga flow and plan a screen-free routine before sleep.",
      route: "yoga",
    },
    sad: {
      title: "Reconnect gently",
      action: "Try a calm grounding meditation, message one trusted person, and take a few minutes near daylight or fresh air.",
      route: "therapist",
    },
    happy: {
      title: "Anchor the good energy",
      action: "Log one healthy habit so the day's progress is protected.",
      route: "dashboard",
    },
    motivated: {
      title: "Use the momentum",
      action: "Complete a short movement routine, yoga flow, or family challenge while energy is high.",
      route: "exercise",
    },
  };

  return nudges[moodId] || nudges.stressed;
}

export function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function entryTimeLabel(entry) {
  const value = entry?.date || entry?.createdAt;
  if (!value) return "time unknown";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "time unknown";
  return parsed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function isEntryFromToday(entry, now = new Date()) {
  const value = entry?.date || entry?.createdAt;
  if (!value) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return todayKey(parsed) === todayKey(now);
}

export function todaysEntries(entries = [], now = new Date()) {
  return entries.filter((entry) => isEntryFromToday(entry, now));
}

export function readableList(items = [], fallback = "None logged yet") {
  const clean = items.map((item) => String(item || "").trim()).filter(Boolean);
  return clean.length ? clean.join(", ") : fallback;
}

export function mealNutrientNames(meal) {
  return (meal?.nutrients || [])
    .map((nutrient) => nutrient?.name || nutrient?.label || nutrient)
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 6);
}

export function parseCalories(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  const text = String(value || "");
  const numbers = text.match(/\d+(?:\.\d+)?/g)?.map(Number).filter(Number.isFinite) || [];
  if (!numbers.length) return fallback;
  return Math.max(0, Math.round(numbers.reduce((total, item) => total + item, 0) / numbers.length));
}

export function estimateCaloriesBurned({ type = "movement", minutes = 0, intensity = 2 } = {}) {
  const rateByType = {
    yoga: 3.2,
    stretch: 2.4,
    walk: 4.2,
    beginner: 5,
    exercise: 5.2,
    movement: 4,
  };
  const baseRate = rateByType[type] || rateByType.movement;
  const intensityFactor = 0.75 + clamp(Number(intensity || 2), 1, 5) * 0.12;
  return Math.max(1, Math.round(Number(minutes || 0) * baseRate * intensityFactor));
}

export function foodItemsFromMeal(meal) {
  const detectedFoods = meal?.foodItems?.length
    ? meal.foodItems
    : (meal?.detectedFoods || []).map((name) => ({ name, calories: "" }));
  const totalCalories = parseCalories(meal?.calories || meal?.estimatedCalories);
  const knownItems = detectedFoods.map((item) =>
    typeof item === "string" ? { name: item, calories: "" } : item,
  );
  const missingCalories = knownItems.filter((item) => !parseCalories(item.calories)).length;
  const sharedCalories = missingCalories && totalCalories ? Math.round(totalCalories / knownItems.length) : 0;

  return knownItems.map((item) => ({
    name: item.name || item.label || "Food item",
    calories: parseCalories(item.calories || item.kcal, sharedCalories),
  }));
}

export function mealSlotLabel(slot) {
  const labels = {
    breakfast: "Breakfast",
    lunch: "Lunch",
    dinner: "Dinner",
    snack: "Snack",
  };
  return labels[slot] || "Meal";
}

export function summarizeDailyCalories(meals = [], movement = []) {
  const todayMeals = todaysEntries(meals);
  const todayMovement = todaysEntries(movement);
  const totalEaten = todayMeals.reduce(
    (total, meal) => total + (meal.totalCalories || parseCalories(meal.calories || meal.estimatedCalories)),
    0,
  );
  const totalBurned = todayMovement.reduce(
    (total, session) =>
      total +
      (Number(session.caloriesBurned) ||
        estimateCaloriesBurned({
          type: session.type,
          minutes: Number(session.minutes || 0),
          intensity: Number(session.intensity || 2),
        })),
    0,
  );

  return {
    totalEaten,
    totalBurned,
    netCalories: Math.max(0, totalEaten - totalBurned),
  };
}

export function summarizeMealsForContext(meals = []) {
  const todayMeals = todaysEntries(meals).slice(0, 4);
  if (!todayMeals.length) return "No meals reviewed today.";

  return todayMeals
    .map((meal) => {
      const foods = readableList(meal.detectedFoods || [], "foods unknown");
      const nutrients = readableList(mealNutrientNames(meal), "nutrients unknown");
      const slot = mealSlotLabel(meal.mealSlot || "snack");
      return `${slot} at ${entryTimeLabel(meal)}: ${meal.dishName || "Meal"} (${meal.totalCalories || meal.calories || meal.estimatedCalories || "calories unknown"} kcal, balance ${meal.balanceScore ?? "unknown"}%). Foods: ${foods}. Nutrients: ${nutrients}.`;
    })
    .join(" ");
}

export function summarizeMovementForContext(sessions = []) {
  const todaySessions = todaysEntries(sessions).slice(0, 5);
  if (!todaySessions.length) return "No movement sessions logged today.";

  return todaySessions
    .map((session) => `${session.title || session.type || "Movement"} at ${entryTimeLabel(session)} for ${session.minutes || 0} minutes, about ${session.caloriesBurned || estimateCaloriesBurned(session)} kcal burned`)
    .join("; ");
}

export function buildDailyWellnessContext({
  progress = defaultProgress,
  lastMood = null,
  meals = [],
  movement = [],
} = {}) {
  const todayMeals = todaysEntries(meals);
  const todayMovement = todaysEntries(movement);
  const totalMovementMinutes = todayMovement.reduce((total, item) => total + Number(item.minutes || 0), 0);
  const nutrients = [...new Set(todayMeals.flatMap((meal) => mealNutrientNames(meal)))].slice(0, 8);
  const calories = summarizeDailyCalories(todayMeals, todayMovement);

  return {
    score: calculateWellbeingScore(progress),
    progress,
    mood: lastMood?.label || lastMood?.id || "not checked in",
    meals: todayMeals.map((meal) => ({
      dishName: meal.dishName || "Meal",
      mealSlot: meal.mealSlot || "snack",
      time: entryTimeLabel(meal),
      calories: meal.totalCalories || meal.calories || meal.estimatedCalories || "unknown",
      balanceScore: meal.balanceScore ?? "unknown",
      detectedFoods: meal.detectedFoods || [],
      nutrients: mealNutrientNames(meal),
      suggestions: meal.suggestions || [],
    })),
    movement: todayMovement.map((session) => ({
      title: session.title || session.type || "Movement",
      minutes: Number(session.minutes || 0),
      type: session.type || "movement",
      time: entryTimeLabel(session),
      caloriesBurned: session.caloriesBurned || estimateCaloriesBurned(session),
    })),
    summary: {
      food: summarizeMealsForContext(meals),
      movement: summarizeMovementForContext(movement),
      nutrients: readableList(nutrients, "No nutrient pattern yet"),
      movementMinutes: totalMovementMinutes,
      calories,
    },
  };
}

export function currentProceedingPeriod(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "morning";
  if (hour >= 18) return "night";
  return "midday";
}

export function practiceForMood(moodId, period = "midday") {
  const nudge = nudgeForMood(moodId);
  if (moodId === "anxious") {
    return {
      title: period === "night" ? "Night breathing meditation" : "Breathing meditation",
      route: "therapist",
      detail: "Use 4-2-6 breathing for four rounds, then write one safe next step.",
    };
  }
  if (moodId === "stressed") {
    return {
      title: "Grounding meditation",
      route: "therapist",
      detail: "Slow your breathing, unclench your jaw, and list one task to do, delay, and ask help for.",
    };
  }
  if (moodId === "tired") {
    return {
      title: "Sleep yoga flow",
      route: "yoga",
      detail: "Choose the sleep wind-down flow and keep movement gentle.",
    };
  }
  if (moodId === "motivated") {
    return {
      title: "Movement routine",
      route: "exercise",
      detail: "Use your energy for a short routine or family challenge.",
    };
  }
  return {
    title: nudge.title,
    route: nudge.route,
    detail: nudge.action,
  };
}

export function saveProceedingEntry(entries = [], entry) {
  const next = [
    {
      id: `${entry.day}-${entry.period}-${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...entry,
    },
    ...entries,
  ];
  return next.slice(0, 120);
}

export function summarizeProceedings(entries = [], now = new Date()) {
  const ranges = [
    ["weekly", 7],
    ["monthly", 30],
  ];

  return ranges.reduce((summary, [key, days]) => {
    const since = now.getTime() - days * 24 * 60 * 60 * 1000;
    const scoped = entries.filter((entry) => new Date(entry.createdAt).getTime() >= since);
    const mornings = scoped.filter((entry) => entry.period === "morning").length;
    const nights = scoped.filter((entry) => entry.period === "night").length;
    const counts = scoped.reduce((acc, entry) => {
      acc[entry.mood] = (acc[entry.mood] || 0) + 1;
      return acc;
    }, {});
    const topMood = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

    summary[key] = {
      total: scoped.length,
      mornings,
      nights,
      topMood: topMood?.[0] || "none",
      message: scoped.length
        ? `${mornings} morning and ${nights} night check-ins. Most common mood: ${topMood?.[0] || "none"}.`
        : "No morning or night proceedings recorded yet.",
    };
    return summary;
  }, {});
}

export function applyProgressDelta(progress = defaultProgress, delta = {}) {
  return {
    ...defaultProgress,
    ...progress,
    water: clamp(Number(progress.water ?? defaultProgress.water) + Number(delta.water ?? 0), 0, 12),
    steps: clamp(Number(progress.steps ?? defaultProgress.steps) + Number(delta.steps ?? 0), 0, 15000),
    sleep: clamp(Number(progress.sleep ?? defaultProgress.sleep) + Number(delta.sleep ?? 0), 0, 12),
    mood: clamp(Number(delta.mood ?? progress.mood ?? defaultProgress.mood), 1, 5),
    meals: clamp(Number(progress.meals ?? defaultProgress.meals) + Number(delta.meals ?? 0), 0, 5),
    activity: clamp(
      Number(progress.activity ?? defaultProgress.activity) + Number(delta.activity ?? 0),
      0,
      120,
    ),
  };
}

export function upsertDailySession(sessions = [], session) {
  const next = [
    {
      id: `${Date.now()}`,
      date: new Date().toISOString(),
      ...session,
    },
    ...sessions,
  ];
  return next.slice(0, 120);
}

export function addMoodEntry(history = [], mood) {
  const next = [
    {
      id: `${Date.now()}`,
      date: new Date().toISOString(),
      ...mood,
    },
    ...history,
  ];
  return next.slice(0, 90);
}

export function summarizeMoodPatterns(history = [], now = new Date()) {
  const ranges = [
    ["weekly", 7],
    ["monthly", 30],
  ];

  return ranges.reduce((summary, [key, days]) => {
    const since = now.getTime() - days * 24 * 60 * 60 * 1000;
    const entries = history.filter((entry) => new Date(entry.date).getTime() >= since);
    const counts = entries.reduce((acc, entry) => {
      acc[entry.id] = (acc[entry.id] || 0) + 1;
      return acc;
    }, {});
    const topMood = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    const anxiousOrStressed = entries.filter((entry) => ["anxious", "stressed"].includes(entry.id)).length;

    summary[key] = {
      total: entries.length,
      topMood: topMood?.[0] || "none",
      topMoodCount: topMood?.[1] || 0,
      anxiousOrStressed,
      message: entries.length
        ? `${entries.length} check-ins. Most common: ${topMood?.[0] || "none"}.`
        : "No check-ins in this period yet.",
    };
    return summary;
  }, {});
}
