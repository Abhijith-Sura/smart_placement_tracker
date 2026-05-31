const express = require('express');
const router  = express.Router();
const {
    getMyProfile,
    updateMyProfile,
    uploadStudentResume,
    uploadProfilePicture,
    getEligibleJobs,
    getAllJobsWithEligibility,
    getStudentDashboardStats,
    uploadVerificationDocument,
    deleteVerificationDocument,
    submitVerificationRequest,
} = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadResume, uploadProfilePic, uploadVerificationDoc } = require('../utils/multerConfig');

// All student routes require authentication + student role
router.use(protect, authorize('student'));

router.get('/profile',         getMyProfile);
router.patch('/profile',       updateMyProfile);
router.get('/dashboard-stats', getStudentDashboardStats);
router.get('/eligible-jobs',   getEligibleJobs);
router.get('/jobs',            getAllJobsWithEligibility);

router.post('/upload-resume', uploadResume.single('resume'),         uploadStudentResume);
router.post('/upload-pic',    uploadProfilePic.single('profilePic'), uploadProfilePicture);

router.post('/verification/upload', uploadVerificationDoc.single('docFile'), uploadVerificationDocument);
router.delete('/verification/:docId', deleteVerificationDocument);
router.post('/verification/submit', submitVerificationRequest);

module.exports = router;
