const mongoose = require("mongoose");

const progressPhotoSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    filename: { type: String, required: true },
    angle: { type: String, enum: ["front", "side", "back", "other"], default: "front" },
    note: { type: String, default: "" },
    takenAt: { type: String, required: true }, // ISO date string YYYY-MM-DD
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProgressPhoto", progressPhotoSchema);
