const express = require('express');
const router  = express.Router();
const {
    createJob,
    getAllJobs,
    getPublicJobs,
    getJobById,
    updateJob,
    deleteJob,
    getEligibleStudentsForJob,
    updateJobStatus,
    getJobsByCompanyName,
} = require('../controllers/jobController');
const { protect, authorize, optionalAuth } = require('../middleware/authMiddleware');

// Public
router.get('/public', getPublicJobs);

// Authenticated – company dashboard (must come before /:id)
router.get('/company/:companyName', getJobsByCompanyName);

// Authenticated routes
router.use(protect);

router.get('/',    authorize('admin', 'company'), getAllJobs);
router.post('/',   authorize('admin', 'company'), createJob);
router.get('/:id', getJobById);

router.patch('/:id',        authorize('admin', 'company'), updateJob);
router.delete('/:id',       authorize('admin'),            deleteJob);
router.patch('/:id/status', authorize('admin', 'company'), updateJobStatus);
router.get('/:id/eligible-students', authorize('admin', 'company'), getEligibleStudentsForJob);

module.exports = router;
