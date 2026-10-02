import fs from "fs";
import path from "path";
import Profile, { DOC_KEYS } from "../Models/profile.js";
import { UPLOAD_ROOT } from "../middleware/upload.js";

const removeFile = (userId, filename) => {
  if (!filename) return;
  fs.unlink(path.join(UPLOAD_ROOT, String(userId), filename), () => {}); // ignore if already gone
};

// GET /api/profile
export const getProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });
    res.json(profile); // null if the user hasn't saved yet
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/profile  (multipart/form-data)
export const saveProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const personal = JSON.parse(req.body.personal || "{}");
    const academic = JSON.parse(req.body.academic || "{}");
    const guardian = JSON.parse(req.body.guardian || "{}");

    const existing = await Profile.findOne({ user: userId });
    const documents = existing ? existing.toObject().documents || {} : {};

    // For every newly uploaded file: delete the old one, record the new metadata
    for (const key of DOC_KEYS) {
      const file = req.files?.[key]?.[0];
      if (!file) continue;
      removeFile(userId, documents[key]?.filename);
      documents[key] = {
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      };
    }

    const profile = await Profile.findOneAndUpdate(
      { user: userId },
      { personal, academic, guardian, documents },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/profile/documents/:key  — only the owner can fetch their own files
export const getDocument = async (req, res) => {
  try {
    const { key } = req.params;
    if (!DOC_KEYS.includes(key)) return res.status(400).json({ message: "Invalid document" });

    const profile = await Profile.findOne({ user: req.user.id });
    const doc = profile?.documents?.[key];
    if (!doc?.filename) return res.status(404).json({ message: "Not found" });

    res.type(doc.mimeType);
    res.sendFile(path.join(UPLOAD_ROOT, String(req.user.id), doc.filename));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
