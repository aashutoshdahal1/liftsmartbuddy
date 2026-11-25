const router = require("express").Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const { protect } = require("../middleware/auth");
const ProgressPhoto = require("../models/ProgressPhoto");

const UPLOAD_DIR = path.join(__dirname, "../../uploads/photos");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

// GET /api/photos  — list all photos for the user
router.get("/", protect, async (req, res) => {
  try {
    const photos = await ProgressPhoto.find({ user: req.user._id }).sort({ takenAt: -1 });
    res.json({ photos });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/photos  — upload a new photo
router.post("/", protect, upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const { angle = "front", note = "", takenAt } = req.body;
    const photo = await ProgressPhoto.create({
      user: req.user._id,
      filename: req.file.filename,
      angle,
      note,
      takenAt: takenAt || new Date().toISOString().slice(0, 10),
    });
    res.status(201).json({ photo });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/photos/:id
router.delete("/:id", protect, async (req, res) => {
  try {
    const photo = await ProgressPhoto.findOne({ _id: req.params.id, user: req.user._id });
    if (!photo) return res.status(404).json({ message: "Not found" });
    const filePath = path.join(UPLOAD_DIR, photo.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await photo.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
