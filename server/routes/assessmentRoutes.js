const express = require('express');
const router = express.Router();
const {
    createAssessment,
    getAssessments,
    getJobAssessment,
    runCode,
    submitAssessment,
    generateQuestionWithAi,
    getAssessmentSubmissions
} = require('../controllers/assessmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All assessment routes are protected
router.use(protect);

// Recruiters/Admins can configure and list assessments
router.post('/', authorize('company', 'admin'), createAssessment);
router.get('/', authorize('company', 'admin'), getAssessments);
router.post('/generate-question', authorize('company', 'admin'), generateQuestionWithAi);
router.get('/:id/submissions', authorize('company', 'admin'), getAssessmentSubmissions);

// Student, Recruiter, and Admin can view assessment configurations
router.get('/job/:jobId', getJobAssessment);

// Students take the coding challenge
router.post('/run', authorize('student'), runCode);
router.post('/:id/submit', authorize('student'), submitAssessment);

module.exports = router;
