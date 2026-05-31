const express  = require('express');
const router   = express.Router();
const {
    getMyNotifications,
    getUnreadCount,
    markAllRead,
    markAsRead,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

// All notification routes require authentication
router.use(protect);

// ─── GET /api/notifications ────────────────────────────────
router.get('/',              getMyNotifications);

// ─── GET /api/notifications/unread-count ──────────────────
// Must be declared BEFORE /:id/read to avoid param collision
router.get('/unread-count',  getUnreadCount);

// ─── PATCH /api/notifications/read-all ────────────────────
router.patch('/read-all',    markAllRead);

// ─── PATCH /api/notifications/:id/read ────────────────────
router.patch('/:id/read',    markAsRead);

module.exports = router;
