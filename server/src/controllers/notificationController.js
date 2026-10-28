import Notification from '../models/Notification.js';

// ── GET /api/notifications (List all user notifications) ───────────────────
export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const notifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = await Notification.countDocuments({ recipient: userId, read: false });

    res.status(200).json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/notifications/:id/read (Mark single notification as read) ───
export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: userId },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    res.status(200).json({ success: true, notification });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/notifications/read-all (Mark all notifications as read) ─────
export const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.session.userId;

    await Notification.updateMany({ recipient: userId, read: false }, { read: true });

    res.status(200).json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
};
