import express from "express";

import {
  getAllAssessments,
  getAssessmentById,
  createAssessment,
  updateAssessment,
  deleteAssessment,
} from "../controllers/assessmentControllers.js";

import { verifyToken, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// Public
router.get("/", getAllAssessments);
router.get("/:id", getAssessmentById);

// Admin only
router.post("/", verifyToken, requireAdmin, createAssessment);
router.put("/:id", verifyToken, requireAdmin, updateAssessment);
router.delete("/:id", verifyToken, requireAdmin, deleteAssessment);

export default router;