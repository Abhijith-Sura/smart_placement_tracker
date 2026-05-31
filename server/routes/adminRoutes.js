const express = require('express');
const router  = express.Router();
const {
    getDashboardStats,
    getAllStudents,
    bulkUploadStudents,
    verifyUser,
    toggleUserStatus,
    getPlacementAnalytics,
    exportPlacedStudents,
    sendAnnouncement,
    verifyCompany,
    getPendingVerifications,
    reviewStudentVerification,
    exportPlacementPDF,
} = require('../controllers/adminController');
const { getAllCompanies } = require('../controllers/companyController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadExcel } = require('../utils/multerConfig');

// All admin routes are protected
router.use(protect, authorize('admin'));

router.get('/dashboard-stats',  getDashboardStats);
router.get('/students',         getAllStudents);
router.get('/analytics',        getPlacementAnalytics);
router.get('/export-placed',    exportPlacedStudents);
router.get('/export-pdf',       exportPlacementPDF);
router.get('/companies',        getAllCompanies);
router.get('/verifications/pending', getPendingVerifications);

router.post('/bulk-upload',     uploadExcel.single('file'), bulkUploadStudents);
router.post('/announcement',    sendAnnouncement);

router.patch('/verify-user/:id',  verifyUser);
router.patch('/verify-company/:id', verifyCompany);
router.patch('/toggle-user/:id',  toggleUserStatus);
router.patch('/verifications/:profileId/review', reviewStudentVerification);

module.exports = router;
