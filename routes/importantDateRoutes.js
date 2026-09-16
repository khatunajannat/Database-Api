import express from 'express';
import {
  getAllImportantDates,
  getImportantDateById,
  createImportantDate,
  updateImportantDate,
  deleteImportantDate,
} from '../controllers/importantDateControllers.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public — used by the Important Dates page
router.get('/', getAllImportantDates);
router.get('/:id', getImportantDateById);

// Admin only — used by the admin panel
router.post('/', verifyToken, requireAdmin, createImportantDate);
router.put('/:id', verifyToken, requireAdmin, updateImportantDate);
router.delete('/:id', verifyToken, requireAdmin, deleteImportantDate);

export default router;
