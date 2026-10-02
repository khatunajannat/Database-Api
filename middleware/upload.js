import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { DOC_KEYS } from "../Models/profile.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_ROOT = path.join(__dirname, "..", "uploads");
const ALLOWED = ["image/jpeg", "image/png", "application/pdf"];

const storage = multer.diskStorage({
  // verifyToken must run BEFORE this so req.user exists
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_ROOT, String(req.user.id));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  // Never trust the client's filename: generate our own
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB per file
  fileFilter: (req, file, cb) =>
    ALLOWED.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Only JPG, PNG or PDF files are allowed")),
});

const handler = upload.fields(DOC_KEYS.map((name) => ({ name, maxCount: 1 })));

// Wrapper so multer errors come back as clean JSON instead of a stack trace
export const uploadDocs = (req, res, next) =>
  handler(req, res, (err) => {
    if (!err) return next();
    const message = err.code === "LIMIT_FILE_SIZE" ? "File too large (max 2 MB)" : err.message;
    res.status(400).json({ message });
  });
