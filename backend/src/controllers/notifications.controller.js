import { query } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../middleware/errorHandler.js';

export const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await query(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
    [req.user.id],
  );
  res.json({
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      isRead: Boolean(n.is_read),
      createdAt: n.created_at,
    })),
  });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const [notification] = await query('SELECT * FROM notifications WHERE id = ?', [req.params.id]);
  if (!notification) throw new HttpError(404, 'Notification not found.');
  if (notification.user_id !== req.user.id) throw new HttpError(403, 'Not your notification.');

  await query('UPDATE notifications SET is_read = 1 WHERE id = ?', [req.params.id]);
  res.json({ message: 'Marked as read.' });
});
