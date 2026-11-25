const mongoose = require("mongoose");

const pushSubscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    endpoint: { type: String, required: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    notifTimes: {
      morning: { type: String, default: "06:00" },
      food:    { type: String, default: "12:00" },
      workout: { type: String, default: "20:00" },
      weight:  { type: String, default: "21:00" },
    },
  },
  { timestamps: true }
);

pushSubscriptionSchema.index({ user: 1, endpoint: 1 }, { unique: true });

module.exports = mongoose.model("PushSubscription", pushSubscriptionSchema);
