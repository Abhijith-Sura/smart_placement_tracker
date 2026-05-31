const express = require('express');
const router  = express.Router();
const {
    getCompanyProfile,
    updateCompanyProfile,
    uploadCompanyLogo,
    getCompanyDashboard,
} = require('../controllers/companyController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadLogo } = require('../utils/multerConfig');

router.use(protect, authorize('company'));

router.get('/profile',      getCompanyProfile);
router.patch('/profile',    updateCompanyProfile);
router.get('/dashboard',    getCompanyDashboard);
router.post('/upload-logo', uploadLogo.single('logo'), uploadCompanyLogo);

module.exports = router;
