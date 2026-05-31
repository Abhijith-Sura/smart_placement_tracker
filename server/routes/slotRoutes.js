const express = require('express');
const router = express.Router();
const {
    createInterviewSlots,
    getJobSlots,
    getAvailableSlots,
    bookInterviewSlot,
    deleteInterviewSlot,
} = require('../controllers/slotController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Recruiter/Admin endpoints
router.post('/job/:jobId', authorize('admin', 'company'), createInterviewSlots);
router.get('/job/:jobId', authorize('admin', 'company'), getJobSlots);
router.delete('/:slotId', authorize('admin', 'company'), deleteInterviewSlot);

// Student endpoints
router.get('/application/:appId/available', authorize('student'), getAvailableSlots);
router.post('/booking/:slotId', authorize('student'), bookInterviewSlot);

module.exports = router;
