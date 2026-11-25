const { sendToUser } = require("../routes/push");
const { chatCompletion } = require("./groq");
const User = require("../models/User");
const WeightEntry = require("../models/WeightEntry");
const NutritionLog = require("../models/NutritionLog");
const Workout = require("../models/Workout");
const PushSubscription = require("../models/PushSubscription");

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Send 6 AM motivational AI notification to all subscribed users
async function sendMorningMotivation() {
  const subs = await PushSubscription.distinct("user");
  for (const userId of subs) {
    try {
      const user = await User.findById(userId);
      if (!user) continue;

      const weights = await WeightEntry.find({ user: userId }).sort({ date: -1 }).limit(7);
      const latestWeight = weights[0];
      const prevWeight = weights[6];
      const weekDelta = latestWeight && prevWeight
        ? (latestWeight.kg - prevWeight.kg).toFixed(1)
        : null;

      const firstName = user.name?.split(" ")[0] ?? "there";
      const hour = 6;
      const prompt = `Generate a short (1 sentence) motivational Good morning message for ${firstName}. Goal: ${user.goal}. ${weekDelta !== null ? `Weight trend: ${weekDelta > 0 ? "+" : ""}${weekDelta}kg this week.` : ""} Be specific, energetic, under 15 words. No quotes.`;

      const body = await chatCompletion(
        [{ role: "user", content: prompt }],
        { maxTokens: 60, temperature: 0.8 }
      ).catch(() => `Good morning ${firstName}! Time to crush your ${user.goal} goal today.`);

      await sendToUser(userId, {
        title: "Good morning, " + firstName + "! 💪",
        body: body.trim(),
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: "morning-motivation",
        data: { url: "/dashboard" },
      });
    } catch (err) {
      console.error("[scheduler] morning motivation error for user", userId, err.message);
    }
  }
}

// 12 PM: remind to log food if nothing logged today
async function sendFoodReminder() {
  const subs = await PushSubscription.distinct("user");
  const today = todayStr();
  for (const userId of subs) {
    try {
      const log = await NutritionLog.findOne({ user: userId, date: today });
      const hasFood = log && log.meals.some((m) => m.items.length > 0);
      if (hasFood) continue;

      const user = await User.findById(userId);
      if (!user) continue;
      const firstName = user.name?.split(" ")[0] ?? "there";

      await sendToUser(userId, {
        title: "Log your food 🍽️",
        body: `Hey ${firstName}, you haven't logged any food today. Keep your ${user.goal} on track!`,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: "food-reminder",
        data: { url: "/food" },
      });
    } catch (err) {
      console.error("[scheduler] food reminder error", err.message);
    }
  }
}

// 8 PM: remind to log workout if none today
async function sendWorkoutReminder() {
  const subs = await PushSubscription.distinct("user");
  const today = todayStr();
  for (const userId of subs) {
    try {
      const workout = await Workout.findOne({ user: userId, date: today });
      if (workout) continue;

      const user = await User.findById(userId);
      if (!user) continue;
      const firstName = user.name?.split(" ")[0] ?? "there";

      await sendToUser(userId, {
        title: "Workout logged? 🏋️",
        body: `${firstName}, did you train today? Log it to track your progress toward your ${user.goal} goal.`,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: "workout-reminder",
        data: { url: "/workout" },
      });
    } catch (err) {
      console.error("[scheduler] workout reminder error", err.message);
    }
  }
}

// 9 PM: remind to log weight if not logged today
async function sendWeightReminder() {
  const subs = await PushSubscription.distinct("user");
  const today = todayStr();
  for (const userId of subs) {
    try {
      const entry = await WeightEntry.findOne({ user: userId, date: today });
      if (entry) continue;

      const user = await User.findById(userId);
      if (!user) continue;
      const firstName = user.name?.split(" ")[0] ?? "there";

      await sendToUser(userId, {
        title: "Log your weight ⚖️",
        body: `${firstName}, don't forget to log your weight today — it helps LiftSmart adjust your plan.`,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: "weight-reminder",
        data: { url: "/progress" },
      });
    } catch (err) {
      console.error("[scheduler] weight reminder error", err.message);
    }
  }
}

function scheduleAt(hour, minute, fn) {
  function next() {
    const now = new Date();
    const target = new Date();
    target.setHours(hour, minute, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const delay = target - now;
    setTimeout(() => { fn(); setInterval(fn, 24 * 60 * 60 * 1000); }, delay);
    console.log(`[scheduler] ${fn.name} scheduled in ${Math.round(delay / 60000)} min`);
  }
  next();
}

function startScheduler() {
  scheduleAt(6,  0, sendMorningMotivation);
  scheduleAt(12, 0, sendFoodReminder);
  scheduleAt(20, 0, sendWorkoutReminder);
  scheduleAt(21, 0, sendWeightReminder);
}

module.exports = { startScheduler };
