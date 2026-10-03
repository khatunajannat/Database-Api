import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
  getMyNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
  deleteNotification,
} from '../controllers/notificationControllers.js';

const router = express.Router();

// Every notification route needs a logged-in user
router.use(verifyToken);

router.get('/', getMyNotifications);
router.get('/unread-count', getUnreadCount);

// These two fixed paths must stay above the "/:id" routes
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);

router.delete('/:id', deleteNotification);

export default router;
