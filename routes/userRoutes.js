import express from 'express';
import {
  getAllUsers,
  createUser,
  loginUser,
  getUserById,
  getMe,
} from '../controllers/userControllers.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.post('/signup', createUser);
router.post('/login', loginUser);
router.get('/me', verifyToken, getMe); // must stay above '/:id'
router.get('/', verifyToken, requireAdmin, getAllUsers);
router.get('/:id', verifyToken, getUserById);

export default router;