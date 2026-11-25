const router = require("express").Router();
const { protect } = require("../middleware/auth");
const { chatCompletion } = require("../lib/groq");
const WeightEntry = require("../models/WeightEntry");
const NutritionLog = require("../models/NutritionLog");
const Workout = require("../models/Workout");

function buildSystemPrompt(user, context) {
  return `You are LiftSmart AI Coach — a concise, evidence-based fitness and nutrition coach.

User profile:
- Name: ${user.name}
- Age: ${user.age}, Gender: ${user.gender}
- Height: ${user.heightCm}cm, Weight: ${user.weightKg}kg
- Goal: ${user.goal}, Activity level: ${user.activityLevel}
- Experience: ${user.experience}, Gym access: ${user.gymAccess}
- Target training days/week: ${user.targetDays}

${context}

Rules:
- Be direct and specific. No fluff.
- Keep replies under 200 words unless the user asks for more detail.
- Use metric units unless user prefers imperial.
- When suggesting foods, consider: ${user.foodPreferences?.join(", ") || "no specific preferences"}.
- Always ground advice in the user's actual data when available.`;
}

function userApiKey(req) {
  return req.headers["x-groq-key"] || undefined;
}

// POST /api/ai/chat  — freeform AI coach chat
router.post("/chat", protect, async (req, res) => {
  try {
    const { messages, page } = req.body;
    if (!messages || !Array.isArray(messages))
      return res.status(400).json({ message: "messages array is required" });

    // Pull relevant context
    const [recentWeights, todayLog, recentWorkouts] = await Promise.all([
      WeightEntry.find({ user: req.user._id }).sort({ date: -1 }).limit(7),
      NutritionLog.findOne({ user: req.user._id, date: new Date().toISOString().slice(0, 10) }),
      Workout.find({ user: req.user._id }).sort({ date: -1 }).limit(3),
    ]);

    const weightStr = recentWeights.length
      ? `Recent weight: ${recentWeights.map((w) => `${w.date}: ${w.kg}kg`).join(", ")}`
      : "No weight entries logged yet.";

    const nutritionStr = todayLog
      ? `Today's nutrition: ${JSON.stringify(todayLog.consumed)} / water: ${todayLog.water} glasses`
      : "No food logged today.";

    const workoutStr = recentWorkouts.length
      ? `Recent workouts: ${recentWorkouts.map((w) => `${w.date} - ${w.title} (${w.volume}kg volume)`).join("; ")}`
      : "No recent workouts.";

    const context = [weightStr, nutritionStr, workoutStr].join("\n");
    const systemPrompt = buildSystemPrompt(req.user, context);

    const reply = await chatCompletion(
      [{ role: "system", content: systemPrompt }, ...messages],
      { maxTokens: 512, apiKey: userApiKey(req) }
    );

    res.json({ reply });
  } catch (err) {
    console.error("[ai/chat]", err.message);
    res.status(500).json({ message: "AI service error" });
  }
});

// POST /api/ai/suggestions  — page-specific proactive suggestions
router.post("/suggestions", protect, async (req, res) => {
  try {
    const { page } = req.body; // "workout" | "food" | "progress"

    const [recentWeights, todayLog, recentWorkouts] = await Promise.all([
      WeightEntry.find({ user: req.user._id }).sort({ date: -1 }).limit(14),
      NutritionLog.findOne({ user: req.user._id, date: new Date().toISOString().slice(0, 10) }),
      Workout.find({ user: req.user._id }).sort({ date: -1 }).limit(5),
    ]);

    const weightStr = recentWeights.map((w) => `${w.date}: ${w.kg}kg`).join(", ") || "none";
    const consumed = todayLog?.consumed ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const workoutStr = recentWorkouts.map((w) => `${w.date}: ${w.title}, ${w.volume}kg`).join("; ") || "none";

    const pagePrompts = {
      workout: `Based on the user's recent workouts (${workoutStr}), generate 3 short, specific training suggestions. Consider muscle recovery, progression, and their goal (${req.user.goal}).`,
      food: `Based on today's nutrition (calories: ${consumed.calories}, protein: ${consumed.protein}g, carbs: ${consumed.carbs}g, fat: ${consumed.fat}g) and weight trend (${weightStr}), give 3 specific food/meal suggestions to hit targets for their goal (${req.user.goal}).`,
      progress: `Based on weight trend (${weightStr}) and workout history (${workoutStr}), give 3 insights about the user's progress toward their goal (${req.user.goal}).`,
    };

    const prompt = pagePrompts[page] || pagePrompts.workout;
    const systemPrompt = buildSystemPrompt(req.user, "");

    const reply = await chatCompletion([
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt + "\n\nReturn a JSON array of 3 objects: [{title, body, tag}] where tag is one of: 'nutrition', 'training', 'recovery', 'progress'. Reply ONLY with valid JSON, no markdown." },
    ], { temperature: 0.6, maxTokens: 512, apiKey: userApiKey(req) });

    let suggestions;
    try {
      suggestions = JSON.parse(reply);
    } catch {
      // fallback if model adds markdown
      const match = reply.match(/\[[\s\S]*\]/);
      suggestions = match ? JSON.parse(match[0]) : [];
    }

    res.json({ suggestions });
  } catch (err) {
    console.error("[ai/suggestions]", err.message);
    res.status(500).json({ message: "AI service error" });
  }
});

// POST /api/ai/weekly-review  — 7-day nutrition review + next-week calorie/macro adjustment
router.post("/weekly-review", protect, async (req, res) => {
  try {
    const today = new Date();
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return d.toISOString().slice(0, 10);
    });

    const [logs, weights] = await Promise.all([
      NutritionLog.find({ user: req.user._id, date: { $in: dates } }),
      WeightEntry.find({ user: req.user._id }).sort({ date: -1 }).limit(14),
    ]);

    // Compute per-day totals (skip days with no log)
    const dailyTotals = logs.map((log) => {
      const c = log.consumed;
      return { date: log.date, calories: c.calories, protein: c.protein, carbs: c.carbs, fat: c.fat };
    });

    const daysLogged = dailyTotals.length;
    if (daysLogged < 2) {
      return res.json({
        review: null,
        reason: "not_enough_data",
        message: "Log at least 2 days of food to get a weekly review.",
      });
    }

    const avgCal = Math.round(dailyTotals.reduce((s, d) => s + d.calories, 0) / daysLogged);
    const avgProtein = Math.round(dailyTotals.reduce((s, d) => s + d.protein, 0) / daysLogged);
    const avgCarbs = Math.round(dailyTotals.reduce((s, d) => s + d.carbs, 0) / daysLogged);
    const avgFat = Math.round(dailyTotals.reduce((s, d) => s + d.fat, 0) / daysLogged);

    // Compute TDEE from profile (Mifflin-St Jeor BMR × activity multiplier)
    const u = req.user;
    const bmr = u.gender === "female"
      ? 10 * u.weightKg + 6.25 * u.heightCm - 5 * u.age - 161
      : 10 * u.weightKg + 6.25 * u.heightCm - 5 * u.age + 5;
    const activityMultipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, high: 1.725, athlete: 1.9 };
    const tdee = Math.round(bmr * (activityMultipliers[u.activityLevel] ?? 1.55));
    const goalAdjust = { "lean-bulk": 200, bulk: 400, cut: -400, "lose-weight": -500, maintenance: 0 };
    const targetCal = tdee + (goalAdjust[u.goal] ?? 0);

    // Weight trend over the logged window
    const weekWeights = weights.filter((w) => dates.includes(w.date)).sort((a, b) => a.date.localeCompare(b.date));
    const earliestWeight = weekWeights[0] ?? weights[weights.length - 1];
    const latestWeight = weekWeights[weekWeights.length - 1] ?? weights[0];
    const weightDeltaKg = earliestWeight && latestWeight
      ? parseFloat((latestWeight.kg - earliestWeight.kg).toFixed(2))
      : null;

    const weightStr = weights.length
      ? weights.map((w) => `${w.date}: ${w.kg}kg`).join(", ")
      : "no weight data";

    const weightTrendSummary = weightDeltaKg !== null
      ? `${weightDeltaKg >= 0 ? "+" : ""}${weightDeltaKg}kg (${earliestWeight.kg}→${latestWeight.kg}kg)`
      : "no data";

    const calDiff = avgCal - targetCal;

    const prompt = `Weekly nutrition review. Goal:${u.goal}. Target:${targetCal}kcal(TDEE${tdee}). Avg:${avgCal}kcal(${calDiff>0?"+":""}${calDiff}),P${avgProtein}g,C${avgCarbs}g,F${avgFat}g. Days:${daysLogged}/7. Weight:${weightTrendSummary}.
Reply ONLY with this JSON (strings max 12 words each, foodChanges exactly 2 items):
{"weekSummary":"...","adjustment":{"direction":"increase|decrease|maintain","targetCalories":0,"deltaCalories":0,"reason":"..."},"macroTargets":{"protein":0,"carbs":0,"fat":0},"foodChanges":[{"action":"add","food":"...","detail":"..."},{"action":"increase","food":"...","detail":"..."}],"focusNextDays":"..."}`;

    const reply = await chatCompletion([
      { role: "system", content: `You are a concise fitness coach. Reply ONLY with valid JSON, no markdown.` },
      { role: "user", content: prompt },
    ], { temperature: 0.4, maxTokens: 1024, apiKey: userApiKey(req) });

    let review;
    try {
      review = JSON.parse(reply);
    } catch {
      const match = reply.match(/\{[\s\S]*\}/);
      try {
        review = match ? JSON.parse(match[0]) : null;
      } catch (e) {
        console.error("[ai/weekly-review] parse fail, raw reply:", reply.slice(0, 500));
        review = null;
      }
    }

    if (!review) return res.status(500).json({ message: "Could not parse weekly review" });

    res.json({
      review,
      stats: { avgCal, avgProtein, avgCarbs, avgFat, daysLogged, targetCal, tdee, weightDeltaKg },
    });
  } catch (err) {
    console.error("[ai/weekly-review]", err.message);
    res.status(500).json({ message: "AI service error" });
  }
});

// POST /api/ai/workout-plan  — generate a workout routine
router.post("/workout-plan", protect, async (req, res) => {
  try {
    const { focus, equipment } = req.body;

    const prompt = `Generate a single workout routine for:
- Goal: ${req.user.goal}
- Experience: ${req.user.experience}
- Equipment: ${equipment || req.user.gymAccess}
- Focus: ${focus || "full body"}
- Days/week target: ${req.user.targetDays}

Return ONLY valid JSON in this shape:
{
  "title": "string",
  "exercises": [
    { "name": "string", "sets": number, "reps": number, "muscle": "string", "equipment": "string" }
  ]
}
No markdown, no explanation.`;

    const reply = await chatCompletion([
      { role: "user", content: prompt },
    ], { temperature: 0.5, maxTokens: 768, apiKey: userApiKey(req) });

    let plan;
    try {
      plan = JSON.parse(reply);
    } catch {
      const match = reply.match(/\{[\s\S]*\}/);
      plan = match ? JSON.parse(match[0]) : null;
    }

    if (!plan) return res.status(500).json({ message: "Could not parse workout plan" });
    res.json({ plan });
  } catch (err) {
    console.error("[ai/workout-plan]", err.message);
    res.status(500).json({ message: "AI service error" });
  }
});

// POST /api/ai/meal-plan  — generate daily meal suggestions
router.post("/meal-plan", protect, async (req, res) => {
  try {
    const { targetCalories, targetProtein } = req.body;

    const prompt = `Create a full day meal plan for:
- Calorie target: ${targetCalories} kcal
- Protein target: ${targetProtein}g
- Food preferences: ${req.user.foodPreferences?.join(", ") || "none"}
- Goal: ${req.user.goal}

Return ONLY valid JSON:
{
  "meals": [
    {
      "slot": "Breakfast" | "Lunch" | "Dinner" | "Snack",
      "items": [{ "name": "string", "serving": "string", "calories": number, "protein": number, "carbs": number, "fat": number }]
    }
  ]
}`;

    const reply = await chatCompletion([
      { role: "user", content: prompt },
    ], { temperature: 0.6, maxTokens: 1024, apiKey: userApiKey(req) });

    let mealPlan;
    try {
      mealPlan = JSON.parse(reply);
    } catch {
      const match = reply.match(/\{[\s\S]*\}/);
      mealPlan = match ? JSON.parse(match[0]) : null;
    }

    if (!mealPlan) return res.status(500).json({ message: "Could not parse meal plan" });
    res.json(mealPlan);
  } catch (err) {
    console.error("[ai/meal-plan]", err.message);
    res.status(500).json({ message: "AI service error" });
  }
});

module.exports = router;
