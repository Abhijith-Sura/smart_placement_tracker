const express = require('express');
const router  = express.Router();
const {
    createEvent,
    getEvents,
    getEventDetails,
    updateEvent,
    deleteEvent,
    rsvpToEvent,
    cancelRsvpToEvent,
    uploadMedia,
} = require('../controllers/eventController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadEventMedia } = require('../utils/multerConfig');

// All event routes require authentication
router.use(protect);

// Admin & Company routes for event management
router.post('/',             authorize('admin', 'company'), createEvent);
router.post('/upload-media', authorize('admin', 'company'), uploadEventMedia.single('file'), uploadMedia);
router.put('/:id',           authorize('admin', 'company'), updateEvent);
router.delete('/:id',        authorize('admin', 'company'), deleteEvent);

// RSVP toggles for students
router.post('/:id/rsvp',   authorize('student'), rsvpToEvent);
router.delete('/:id/rsvp', authorize('student'), cancelRsvpToEvent);

// Common read routes for all roles
router.get('/',    getEvents);
router.get('/:id', getEventDetails);

module.exports = router;
