const express = require('express');
const router  = express.Router();
const { getExternalJobs, getExternalJobById, refreshJobs } = require('../controllers/externalJobController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/',          getExternalJobs);
router.get('/:id',       getExternalJobById);
router.post('/refresh',  authorize('admin'), refreshJobs);

module.exports = router;
