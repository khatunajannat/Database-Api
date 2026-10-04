import crypto from "crypto";
import Profile, { DOC_KEYS } from "../models/profile.js";
import cloudinary from "../config/cloudinary.js";

// ---------- Required fields (same as the form; the server must check too) ----------
const REQUIRED = {
  personal: ["nameEn", "nameBn", "dob", "gender", "birthRegNo"],
  academic: [
    "sscBoard", "sscGroup", "sscYear", "sscRoll", "sscRegNo", "sscGpa",
    "hscBoard", "hscGroup", "hscYear", "hscRoll", "hscRegNo", "hscGpa",
  ],
  guardian: [
    "fatherName", "motherName", "applicantPhone",
    "presentAddress", "permanentAddress", "division", "district",
  ],
};

const findMissing = (sections, hasDocument) => {
  const missing = [];
  for (const [section, keys] of Object.entries(REQUIRED)) {
    for (const key of keys) {
      if (!String(sections[section]?.[key] ?? "").trim()) missing.push(`${section}.${key}`);
    }
  }
  for (const key of DOC_KEYS) {
    if (!hasDocument(key)) missing.push(`documents.${key}`);
  }
  return missing;
};

// ---------- Cloudinary helpers ----------

const uploadToCloudinary = (file, userId, key) =>
  new Promise((resolve, reject) => {
    const isPdf = file.mimetype === "application/pdf";
    const id = `${key}-${crypto.randomUUID()}`;
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `admito/${userId}`,
        public_id: isPdf ? `${id}.pdf` : id, // raw files keep their extension in the public_id
        resource_type: isPdf ? "raw" : "image",
        type: "authenticated",
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(file.buffer);
  });

const deleteFromCloudinary = (publicId, resourceType) =>
  cloudinary.uploader
    .destroy(publicId, { resource_type: resourceType || "image", type: "authenticated", invalidate: true })
    .catch((err) => console.error("Cloudinary delete failed:", publicId, err.message));

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
  const uploaded = []; // files sent to Cloudinary during this request (cleaned up if anything fails)
  try {
    const userId = req.user.id;
    const personal = JSON.parse(req.body.personal || "{}");
    const academic = JSON.parse(req.body.academic || "{}");
    const guardian = JSON.parse(req.body.guardian || "{}");

    const existing = await Profile.findOne({ user: userId });
    const documents = existing ? existing.toObject().documents || {} : {};

    // Validate BEFORE uploading anything, so a rejected save never touches Cloudinary
    const missing = findMissing(
      { personal, academic, guardian },
      (key) => req.files?.[key]?.[0] || documents[key]?.publicId
    );
    if (missing.length) {
      return res.status(400).json({ message: `Missing required fields: ${missing.join(", ")}` });
    }

    // Upload the newly picked files in parallel
    const replaced = [];
    await Promise.all(
      DOC_KEYS.map(async (key) => {
        const file = req.files?.[key]?.[0];
        if (!file) return;
        const result = await uploadToCloudinary(file, userId, key);
        uploaded.push({ publicId: result.public_id, resourceType: result.resource_type });
        if (documents[key]?.publicId) {
          replaced.push({ publicId: documents[key].publicId, resourceType: documents[key].resourceType });
        }
        documents[key] = {
          publicId: result.public_id,
          resourceType: result.resource_type,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
        };
      })
    );

    const profile = await Profile.findOneAndUpdate(
      { user: userId },
      { personal, academic, guardian, documents },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    // Safe now: the database points at the new files, so delete the replaced ones
    await Promise.all(replaced.map((f) => deleteFromCloudinary(f.publicId, f.resourceType)));
    res.json(profile);
  } catch (err) {
    console.error("saveProfile failed:", err);
    await Promise.all(uploaded.map((f) => deleteFromCloudinary(f.publicId, f.resourceType)));
    res.status(500).json({ message: err.message });
  }
};

export const getDocument = async (req, res) => {
  try {
    const { key } = req.params;
    if (!DOC_KEYS.includes(key)) return res.status(400).json({ message: "Invalid document" });

    const profile = await Profile.findOne({ user: req.user.id });
    const doc = profile?.documents?.[key];
    if (!doc?.publicId) return res.status(404).json({ message: "Not found" });

    const url = cloudinary.url(doc.publicId, {
      resource_type: doc.resourceType,
      type: "authenticated",
      sign_url: true,
      secure: true,
    });
    const upstream = await fetch(url);
    if (!upstream.ok) {
      console.error("Cloudinary fetch failed:", upstream.status, doc.publicId);
      return res.status(502).json({ message: "Could not load the file from storage" });
    }

    res.set("Content-Type", doc.mimeType);
    res.set("Cache-Control", "private, max-age=300");
    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
