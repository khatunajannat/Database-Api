import mongoose from 'mongoose';
import Notification from '../Models/notification.js';

const FILTERS = {
  all: {},
  unread: { read: false },
  circulars: { category: 'circular' },
  status: { category: 'status' },
};

// GET /api/notifications?filter=all|unread|circulars|status&page=1&limit=20
export const getMyNotifications = async (req, res) => {
  try {
    const filterKey = FILTERS[req.query.filter] ? req.query.filter : 'all';
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);

    const query = { user: req.user.id, ...FILTERS[filterKey] };

    // Fetch one extra row so we know if there is another page
    const rows = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit + 1)
      .lean();

    const hasMore = rows.length > limit;
    const notifications = hasMore ? rows.slice(0, limit) : rows;

    const unreadCount = await Notification.countDocuments({
      user: req.user.id,
      read: false,
    });

    return res.status(200).json({ notifications, unreadCount, page, hasMore });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/notifications/unread-count  (for the bell badge)
export const getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      user: req.user.id,
      read: false,
    });
    return res.status(200).json({ unreadCount });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// PATCH /api/notifications/read-all
export const markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user.id, read: false },
      { $set: { read: true, readAt: new Date() } }
    );
    return res
      .status(200)
      .json({ message: 'All notifications marked as read', updated: result.modifiedCount });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// PATCH /api/notifications/:id/read
export const markAsRead = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid notification id' });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: { read: true, readAt: new Date() } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    return res.status(200).json(notification);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// DELETE /api/notifications/:id
export const deleteNotification = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid notification id' });
    }

    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    return res.status(200).json({ message: 'Notification deleted' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
