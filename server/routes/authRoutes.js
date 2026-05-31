const express = require('express');
const router = express.Router();
const {
    registerUser,
    verifyOTP,
    resendOTP,
    loginUser,
    forgotPassword,
    resetPassword,
    getMe,
    logoutUser,
    updateName,
    changePassword,
    updateProfile,
    testWebhook,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { registerSchema, loginSchema, validate } = require('../validators/authValidator');

// Public routes
router.post('/register', validate(registerSchema), registerUser);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/login',    validate(loginSchema),    loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// Protected routes
router.get('/me',              protect, getMe);
router.post('/logout',         protect, logoutUser);
router.patch('/update-name',   protect, updateName);
router.patch('/update-profile', protect, updateProfile);
router.patch('/change-password', protect, changePassword);
router.post('/test-webhook', protect, testWebhook);

module.exports = router;