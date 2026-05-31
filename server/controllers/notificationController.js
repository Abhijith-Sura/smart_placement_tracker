const asyncHandler  = require('express-async-handler');
const Notification   = require('../models/Notification');
const { emitToUser, EVENTS } = require('../utils/socketManager');

// ─────────────────────────────────────────────────────────────
// INTERNAL HELPER — not a route handler
// Call this from any controller to create + emit a notification
// ─────────────────────────────────────────────────────────────

/**
 * Create a persisted notification and push it to the user via Socket.io.
 *
 * @param {string|ObjectId} userId  - Recipient user _id
 * @param {string}          type    - Notification type (see Notification model enum)
 * @param {string}          title   - Short heading
 * @param {string}          message - Full notification body
 * @param {object}          meta    - Optional extra data (jobId, applicationId, …)
 * @param {Server}          [io]    - Socket.io Server instance (optional; pass when available)
 */
const createNotification = async (userId, type, title, message, meta = {}, io = null) => {
    const notification = await Notification.create({ userId, type, title, message, meta });

    // Real-time push if io instance is provided
    if (io) {
        emitToUser(io, userId, EVENTS.NEW_NOTIFICATION, {
            notificationId: notification._id,
            type,
            title,
            message,
            meta,
        });
    }

    return notification;
};

// ─── @route  GET /api/notifications ──────────────────────
// ─── @access Private ──────────────────────────────────────
const getMyNotifications = asyncHandler(async (req, res) => {
    const page  = parseInt(req.query.page,  10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip  = (page - 1) * limit;

    const [notifications, unreadCount] = await Promise.all([
        Notification.find({ userId: req.user._id })
            .sort('-createdAt')
            .skip(skip)
            .limit(limit)
            .lean(),
        Notification.countDocuments({ userId: req.user._id, isRead: false }),
    ]);

    const total = await Notification.countDocuments({ userId: req.user._id });

    res.status(200).json({
        success: true,
        page,
        totalPages: Math.ceil(total / limit),
        total,
        unreadCount,
        notifications,
    });
});

// ─── @route  GET /api/notifications/unread-count ─────────
// ─── @access Private ──────────────────────────────────────
const getUnreadCount = asyncHandler(async (req, res) => {
    const count = await Notification.countDocuments({
        userId: req.user._id,
        isRead: false,
    });

    res.status(200).json({ success: true, count });
});

// ─── @route  PATCH /api/notifications/:id/read ───────────
// ─── @access Private ──────────────────────────────────────
const markAsRead = asyncHandler(async (req, res) => {
    const notification = await Notification.findOne({
        _id:    req.params.id,
        userId: req.user._id,   // owner check
    });

    if (!notification) {
        res.status(404);
        throw new Error('Notification not found');
    }

    if (!notification.isRead) {
        notification.isRead = true;
        notification.readAt = new Date();
        await notification.save();
    }

    res.status(200).json({ success: true, notification });
});

// ─── @route  PATCH /api/notifications/read-all ───────────
// ─── @access Private ──────────────────────────────────────
const markAllRead = asyncHandler(async (req, res) => {
    const now = new Date();

    await Notification.updateMany(
        { userId: req.user._id, isRead: false },
        { $set: { isRead: true, readAt: now } }
    );

    res.status(200).json({ success: true, message: 'All notifications marked as read' });
});

module.exports = {
    // Route handlers
    getMyNotifications,
    getUnreadCount,
    markAsRead,
    markAllRead,
    // Internal helper (used by other controllers)
    createNotification,
};
