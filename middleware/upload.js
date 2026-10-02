import multer from "multer";
import { DOC_KEYS } from "../Models/profile.js";

const ALLOWED = ["image/jpeg", "image/png", "application/pdf"];

// Files are kept in memory (max 2 MB each) and streamed to Cloudinary by the controller.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB per file
  fileFilter: (req, file, cb) =>
    ALLOWED.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Only JPG, PNG or PDF files are allowed")),
});

const handler = upload.fields(DOC_KEYS.map((name) => ({ name, maxCount: 1 })));

// The mimetype comes from the client and can be faked, so also check the file's first bytes.
const looksValid = ({ mimetype, buffer }) => {
  if (mimetype === "image/jpeg") return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (mimetype === "image/png") return buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  if (mimetype === "application/pdf") return buffer.subarray(0, 4).toString("latin1") === "%PDF";
  return false;
};

// Wrapper so upload errors come back as clean JSON instead of a stack trace
export const uploadDocs = (req, res, next) =>
  handler(req, res, (err) => {
    if (err) {
      const message = err.code === "LIMIT_FILE_SIZE" ? "File too large (max 2 MB)" : err.message;
      return res.status(400).json({ message });
    }
    const files = Object.values(req.files || {}).flat();
    const bad = files.find((f) => !looksValid(f));
    if (bad) return res.status(400).json({ message: `${bad.originalname} is not a valid JPG, PNG or PDF file` });
    next();
  });
