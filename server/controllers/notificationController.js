import Notification from '../models/Notification.js';
import { ApiError, asyncHandler } from '../middleware/errorMiddleware.js';

/**
 * @desc    Get logged-in user's in-app notifications
 * @route   GET /api/notifications
 * @access  Private
 */
export const getMyNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user._id })
    .sort({ createdAt: -1 })
    .limit(25);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  res.status(200).json({
    success: true,
    message: 'Notifications retrieved',
    data: {
      notifications,
      unreadCount,
    },
  });
});

/**
 * @desc    Mark a single notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private
 */
export const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);
  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  if (String(notification.recipient) !== String(req.user._id)) {
    throw new ApiError(403, 'Not authorized to modify this notification');
  }

  notification.isRead = true;
  await notification.save();

  res.status(200).json({
    success: true,
    message: 'Notification marked as read',
    data: notification,
  });
});

/**
 * @desc    Mark all notifications for current user as read
 * @route   PATCH /api/notifications/read-all
 * @access  Private
 */
export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { $set: { isRead: true } }
  );

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read',
    data: {},
  });
});
