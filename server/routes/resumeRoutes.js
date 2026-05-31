const express = require('express');
const router  = express.Router();
const { analyzeResume, generateResumePdf, extractResumeInfo } = require('../controllers/resumeController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Student: analyze their own resume against a job
router.post('/analyze',  authorize('student'), analyzeResume);

// Student: extract info from resume to auto-fill profile
router.post('/extract',  authorize('student'), extractResumeInfo);

// Student: generate a PDF resume from profile data
router.get('/generate',  authorize('student'), generateResumePdf);

module.exports = router;
