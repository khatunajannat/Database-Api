import express from "express";
import {
  getActiveBanners,
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} from "../controllers/bannerControllers.js";
import { verifyToken, requireAdmin } from "../middleware/auth.js";
import { uploadBannerImage } from "../middleware/bannerUpload.js";

const router = express.Router();

// Public: the home page carousel
router.get("/", getActiveBanners);

// Admin only. "/admin/all" is declared before "/:id" routes on purpose.
router.get("/admin/all", verifyToken, requireAdmin, getAllBanners);
router.post("/", verifyToken, requireAdmin, uploadBannerImage, createBanner);
router.put("/:id", verifyToken, requireAdmin, uploadBannerImage, updateBanner);
router.delete("/:id", verifyToken, requireAdmin, deleteBanner);

export default router;
