const express = require('express');
const router  = express.Router();
const {
    applyForJob,
    getMyApplications,
    getJobApplications,
    getKanbanBoard,
    updateApplicationStatus,
    reorderKanban,
    withdrawApplication,
    getApplicationRounds,
    addRound,
    updateRound,
    deleteRound,
    exportJobApplications,
    backfillMatchScores,
} = require('../controllers/applicationController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Backfill Match Scores
router.post('/backfill-match-scores',  authorize('admin'), backfillMatchScores);

// Student routes
router.post('/:jobId/apply',          authorize('student'), applyForJob);
router.get('/my',                      authorize('student'), getMyApplications);
router.delete('/:id/withdraw',        authorize('student'), withdrawApplication);

// Admin / Company routes
router.get('/job/:jobId',              authorize('admin', 'company'), getJobApplications);
router.get('/job/:jobId/export',       authorize('admin', 'company'), exportJobApplications);
router.get('/kanban/:jobId',           authorize('admin', 'company'), getKanbanBoard);
router.patch('/kanban/reorder',        authorize('admin', 'company'), reorderKanban);
router.patch('/:id/status',            authorize('admin', 'company'), updateApplicationStatus);

// Interview Rounds routes
router.get('/:id/rounds',               getApplicationRounds);  // student can view own (auth enforced in controller)
router.post('/:id/rounds',              authorize('admin', 'company'), addRound);
router.patch('/:id/rounds/:roundIndex', authorize('admin', 'company'), updateRound);
router.delete('/:id/rounds/:roundIndex', authorize('admin', 'company'), deleteRound);

module.exports = router;
