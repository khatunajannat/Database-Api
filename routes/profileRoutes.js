import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { uploadDocs } from "../middleware/upload.js";
import { getProfile, saveProfile, getDocument } from "../controllers/profileControllers.js";

const router = express.Router();

router.get("/", verifyToken, getProfile);
router.put("/", verifyToken, uploadDocs, saveProfile); // auth first, then multer
router.get("/documents/:key", verifyToken, getDocument);

export default router;
