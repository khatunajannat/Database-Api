import multer from "multer";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 }, // 4 MB
  fileFilter: (req, file, cb) =>
    ALLOWED.includes(file.mimetype) ? cb(null, true) : cb(new Error("Only JPG, PNG or WebP images are allowed")),
});

const handler = upload.single("image");

// mimetype comes from the client, so also check the file's first bytes
const looksValid = ({ mimetype, buffer }) => {
  if (mimetype === "image/jpeg") return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (mimetype === "image/png") return buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  if (mimetype === "image/webp")
    return buffer.subarray(0, 4).toString("latin1") === "RIFF" && buffer.subarray(8, 12).toString("latin1") === "WEBP";
  return false;
};

export const uploadBannerImage = (req, res, next) =>
  handler(req, res, (err) => {
    if (err) {
      const message = err.code === "LIMIT_FILE_SIZE" ? "Image too large (max 4 MB)" : err.message;
      return res.status(400).json({ message });
    }
    if (req.file && !looksValid(req.file)) {
      return res.status(400).json({ message: "That file is not a valid JPG, PNG or WebP image" });
    }
    next();
  });
