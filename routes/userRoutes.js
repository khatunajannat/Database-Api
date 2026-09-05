import express from 'express';
import { getAllUsers, createUser, loginUser, getUserById } from '../controllers/userControllers.js';

const router = express.Router();

router.get('/', getAllUsers);
router.post('/signup', createUser);
router.post('/login', loginUser);
router.get('/:id', getUserById);

export default router;