const router = require("express").Router();
const webpush = require("web-push");
const { protect } = require("../middleware/auth");
const PushSubscription = require("../models/PushSubscription");

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// GET /api/push/vapid-public-key
router.get("/vapid-public-key", (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// POST /api/push/subscribe
router.post("/subscribe", protect, async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth)
      return res.status(400).json({ message: "Invalid subscription" });

    await PushSubscription.findOneAndUpdate(
      { user: req.user._id, endpoint },
      { user: req.user._id, endpoint, keys },
      { upsert: true, new: true }
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("[push/subscribe]", err.message);
    res.status(500).json({ message: "Failed to save subscription" });
  }
});

// DELETE /api/push/unsubscribe
router.delete("/unsubscribe", protect, async (req, res) => {
  try {
    const { endpoint } = req.body;
    await PushSubscription.deleteOne({ user: req.user._id, endpoint });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to remove subscription" });
  }
});

// Helper used by scheduler
async function sendToUser(userId, payload) {
  const subs = await PushSubscription.find({ user: userId });
  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        JSON.stringify(payload)
      ).catch(async (err) => {
        // 410 Gone = subscription expired, clean up
        if (err.statusCode === 410) {
          await PushSubscription.deleteOne({ _id: sub._id });
        }
        throw err;
      })
    )
  );
  return results;
}

module.exports = { router, sendToUser };
