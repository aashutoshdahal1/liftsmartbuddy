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

async function sendMorningMotivation(userId) {
  const user = await User.findById(userId);
  if (!user) return;
  const weights = await WeightEntry.find({ user: userId }).sort({ date: -1 }).limit(7);
  const weekDelta = weights[0] && weights[6] ? (weights[0].kg - weights[6].kg).toFixed(1) : null;
  const firstName = user.name?.split(" ")[0] ?? "there";
  const prompt = `1 sentence motivational morning message for ${firstName}. Goal: ${user.goal}. ${weekDelta !== null ? `Weight: ${Number(weekDelta) >= 0 ? "+" : ""}${weekDelta}kg this week.` : ""} Under 15 words, no quotes.`;
  const body = await chatCompletion(
    [{ role: "user", content: prompt }],
    { maxTokens: 60, temperature: 0.8 }
  ).catch(() => `Good morning ${firstName}! Time to crush your ${user.goal} goal today.`);
  await sendToUser(userId, {
    title: `Good morning, ${firstName}! 💪`,
    body: body.trim(),
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: "morning-motivation",
    data: { url: "/dashboard" },
  });
}

async function sendFoodReminder(userId) {
  const log = await NutritionLog.findOne({ user: userId, date: todayStr() });
  if (log && log.meals.some((m) => m.items.length > 0)) return;
  const user = await User.findById(userId);
  if (!user) return;
  const firstName = user.name?.split(" ")[0] ?? "there";
  await sendToUser(userId, {
    title: "Log your food 🍽️",
    body: `Hey ${firstName}, you haven't logged any food today. Keep your ${user.goal} on track!`,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: "food-reminder",
    data: { url: "/food" },
  });
}

async function sendWorkoutReminder(userId) {
  const workout = await Workout.findOne({ user: userId, date: todayStr() });
  if (workout) return;
  const user = await User.findById(userId);
  if (!user) return;
  const firstName = user.name?.split(" ")[0] ?? "there";
  await sendToUser(userId, {
    title: "Workout logged? 🏋️",
    body: `${firstName}, did you train today? Log it to track your ${user.goal} progress.`,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: "workout-reminder",
    data: { url: "/workout" },
  });
}

async function sendWeightReminder(userId) {
  const entry = await WeightEntry.findOne({ user: userId, date: todayStr() });
  if (entry) return;
  const user = await User.findById(userId);
  if (!user) return;
  const firstName = user.name?.split(" ")[0] ?? "there";
  await sendToUser(userId, {
    title: "Log your weight ⚖️",
    body: `${firstName}, don't forget to log your weight — it helps LiftSmart adjust your plan.`,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: "weight-reminder",
    data: { url: "/progress" },
  });
}

// Run every minute, dispatch notifications to users whose scheduled time matches now
async function tick() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const currentTime = `${hh}:${mm}`;

  const subs = await PushSubscription.find({});
  for (const sub of subs) {
    const t = sub.notifTimes || {};
    try {
      if ((t.morning || "06:00") === currentTime) await sendMorningMotivation(sub.user);
      if ((t.food    || "12:00") === currentTime) await sendFoodReminder(sub.user);
      if ((t.workout || "20:00") === currentTime) await sendWorkoutReminder(sub.user);
      if ((t.weight  || "21:00") === currentTime) await sendWeightReminder(sub.user);
    } catch (err) {
      console.error("[scheduler] tick error for user", sub.user, err.message);
    }
  }
}

function startScheduler() {
  // Align to next whole minute, then fire every 60s
  const now = new Date();
  const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
  setTimeout(() => {
    tick();
    setInterval(tick, 60 * 1000);
  }, msToNextMinute);
  console.log(`[scheduler] started, first tick in ${Math.round(msToNextMinute / 1000)}s`);
}

module.exports = { startScheduler };
