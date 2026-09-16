import express from 'express';
import {
  getAllCirculars,
  getCircularById,
  createCircular,
  updateCircular,
  deleteCircular,
} from '../controllers/circularControllers.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public — used by the Circulars page
router.get('/', getAllCirculars);
router.get('/:id', getCircularById);

// Admin only — used by the admin panel
router.post('/', verifyToken, requireAdmin, createCircular);
router.put('/:id', verifyToken, requireAdmin, updateCircular);
router.delete('/:id', verifyToken, requireAdmin, deleteCircular);

export default router;
