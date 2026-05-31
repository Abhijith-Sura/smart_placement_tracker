const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const Company = require('../models/Company');
const { generateToken, setTokenCookie } = require('../utils/generateToken');
const { sendWelcomeEmail, sendOTPEmail, sendPasswordResetEmail } = require('../utils/sendEmail');
const { logAuditActivity } = require('../utils/auditHelper');

// ─── @route  POST /api/auth/register ─────────────────────
// ─── @access Public ───────────────────────────────────────
const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password, role, rollNo, branch, companyName, industry, graduationYear, linkedinUrl } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        res.status(409);
        throw new Error('An account with this email already exists');
    }

    const user = new User({
        name,
        email,
        password,
        role,
        isVerified: false,
        companyName: role === 'alumni' ? companyName : undefined,
        graduationYear: role === 'alumni' ? graduationYear : undefined,
        linkedinUrl: role === 'alumni' ? linkedinUrl : undefined,
    });
    
    // Generate OTP
    const otp = user.generateOTP();
    await user.save();

    // Create role-specific profile
    if (role === 'student') {
        await StudentProfile.create({ userId: user._id, rollNo: rollNo || '', branch: branch || 'CSE' });
    } else if (role === 'company') {
        await Company.create({ userId: user._id, companyName: companyName || name, industry: industry || 'IT & Software' });
    }

    // Log user registration
    await logAuditActivity(
        { headers: req.headers, ip: req.ip },
        'USER_REGISTER',
        { email: user.email, name: user.name, role: user.role }
    );

    // Send OTP email
    sendOTPEmail(user.email, otp, user.name).catch(() => {});

    res.status(201).json({
        success: true,
        message: 'Account created. Please check your email for the OTP.',
        requiresVerification: true,
        email: user.email
    });
});

// ─── @route  POST /api/auth/verify-otp ───────────────────
// ─── @access Public ───────────────────────────────────────
const verifyOTP = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        res.status(400);
        throw new Error('Email and OTP are required');
    }

    const user = await User.findOne({ email }).select('+otp +otpExpires');
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    if (user.isVerified) {
        res.status(400);
        throw new Error('User is already verified');
    }

    // Check expiry
    if (!user.otpExpires || user.otpExpires < Date.now()) {
        res.status(400);
        throw new Error('OTP has expired. Please request a new one.');
    }

    // Check hash
    const hashedOtp = crypto.createHash('sha256').update(otp.toString()).digest('hex');
    if (user.otp !== hashedOtp) {
        res.status(400);
        throw new Error('Invalid OTP');
    }

    // Mark as verified and clear OTP
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    // Log OTP Verification
    await logAuditActivity(
        { headers: req.headers, ip: req.ip, user },
        'USER_VERIFY',
        { email: user.email, role: user.role }
    );

    // Send welcome email now that they are verified
    sendWelcomeEmail(user).catch(() => {});

    // Log them in
    const token = generateToken(user._id, user.role);
    setTokenCookie(res, token);

    let avatarUrl = '';
    if (user.role === 'student') {
        const studentProfile = await StudentProfile.findOne({ userId: user._id });
        avatarUrl = studentProfile?.profilePicUrl || '';
    } else if (user.role === 'company') {
        const companyProfile = await Company.findOne({ userId: user._id });
        avatarUrl = companyProfile?.logoUrl || '';
    }

    res.status(200).json({
        success: true,
        message: 'Email verified successfully',
        token,
        user: {
            _id: user._id, name: user.name, email: user.email, role: user.role, isVerified: user.isVerified, avatar: avatarUrl
        },
    });
});

// ─── @route  POST /api/auth/resend-otp ───────────────────
// ─── @access Public ───────────────────────────────────────
const resendOTP = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }
    if (user.isVerified) {
        res.status(400);
        throw new Error('User is already verified');
    }

    const otp = user.generateOTP();
    await user.save();
    sendOTPEmail(user.email, otp, user.name).catch(() => {});

    res.status(200).json({ 
        success: true, 
        message: 'A new OTP has been sent to your email.'
    });
});

// ─── @route  POST /api/auth/login ────────────────────────
// ─── @access Public ───────────────────────────────────────
const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
        res.status(401);
        throw new Error('Invalid email or password');
    }

    if (!user.isActive) {
        res.status(403);
        throw new Error('Your account has been deactivated. Contact the admin.');
    }

    if (!user.isVerified) {
        // Generate new OTP, send email, and return requiresVerification
        const otp = user.generateOTP();
        await user.save();
        sendOTPEmail(user.email, otp, user.name).catch(() => {});

        res.status(403).json({
            success: false,
            message: 'Email not verified. A new OTP has been sent.',
            requiresVerification: true,
            email: user.email
        });
        return;
    }

    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    const token = generateToken(user._id, user.role);
    setTokenCookie(res, token);

    let avatarUrl = '';
    if (user.role === 'student') {
        const studentProfile = await StudentProfile.findOne({ userId: user._id });
        avatarUrl = studentProfile?.profilePicUrl || '';
    } else if (user.role === 'company') {
        const companyProfile = await Company.findOne({ userId: user._id });
        avatarUrl = companyProfile?.logoUrl || '';
    }

    res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: { _id: user._id, name: user.name, email: user.email, role: user.role, isVerified: user.isVerified, avatar: avatarUrl, lastLogin: user.lastLogin },
    });
});

// ─── @route  POST /api/auth/forgot-password ──────────────
// ─── @access Public ───────────────────────────────────────
const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        res.status(404);
        throw new Error('No user found with this email');
    }

    const resetToken = user.generateResetToken();
    await user.save({ validateBeforeSave: false });

    // Ensure link is fully dynamic across localhost, Vercel, and Render
    // First try the Origin header (where the request actually came from), then env var, then fallback
    const clientUrl = req.headers.origin || process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

    try {
        await sendPasswordResetEmail(user.email, resetUrl, user.name);
        res.status(200).json({ success: true, message: 'Password reset link sent to email' });
    } catch (err) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save({ validateBeforeSave: false });
        res.status(500);
        throw new Error('Email could not be sent');
    }
});

// ─── @route  POST /api/auth/reset-password/:token ────────
// ─── @access Public ───────────────────────────────────────
const resetPassword = asyncHandler(async (req, res) => {
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
        res.status(400);
        throw new Error('Invalid or expired password reset token');
    }

    if (!req.body.password || req.body.password.length < 6) {
        res.status(400);
        throw new Error('Password must be at least 6 characters');
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successful. You can now login.' });
});

// ─── @route  GET /api/auth/me ─────────────────────────────
const getMe = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).populate('studentProfile').populate('companyProfile');
    res.status(200).json({ success: true, user });
});

// ─── @route  POST /api/auth/logout ───────────────────────
const logoutUser = asyncHandler(async (req, res) => {
    res.cookie('token', '', { httpOnly: true, expires: new Date(0), sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
    res.status(200).json({ success: true, message: 'Logged out successfully' });
});

// ─── @route  PATCH /api/auth/update-name ─────────────────
const updateName = asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name || name.trim().length < 2) { res.status(400); throw new Error('Invalid name'); }
    const user = await User.findByIdAndUpdate(req.user._id, { name: name.trim() }, { new: true, runValidators: true });
    res.status(200).json({ success: true, message: 'Name updated successfully', user: { _id: user._id, name: user.name, email: user.email, role: user.role } });
});

// ─── @route  PATCH /api/auth/change-password ─────────────
const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) { res.status(400); throw new Error('Invalid input'); }
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.matchPassword(currentPassword))) { res.status(401); throw new Error('Current password incorrect'); }
    user.password = newPassword;
    await user.save();
    res.status(200).json({ success: true, message: 'Password changed successfully' });
});

// ─── @route  PATCH /api/auth/update-profile ──────────────
const updateProfile = asyncHandler(async (req, res) => {
    const { name, avatar, slackWebhook, graduationYear, companyName, linkedinUrl } = req.body;
    const updates = {};
    if (name) {
        if (name.trim().length < 2) { res.status(400); throw new Error('Name must be at least 2 characters'); }
        updates.name = name.trim();
    }
    if (avatar !== undefined) {
        updates.avatar = avatar;
    }
    if (slackWebhook !== undefined) {
        const cleanWebhook = slackWebhook.trim();
        if (cleanWebhook && !cleanWebhook.startsWith('https://hooks.slack.com/services/')) {
            res.status(400);
            throw new Error('Invalid Slack webhook format. Must start with https://hooks.slack.com/services/');
        }
        updates.slackWebhook = cleanWebhook;
    }
    if (req.user.role === 'alumni') {
        if (graduationYear !== undefined) updates.graduationYear = graduationYear;
        if (companyName !== undefined) updates.companyName = companyName.trim();
        if (linkedinUrl !== undefined) updates.linkedinUrl = linkedinUrl.trim();
    }
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    
    // Log profile update
    await logAuditActivity(req, 'PROFILE_UPDATE', {
        updatedFields: Object.keys(updates)
    });

    res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        user: { 
            _id: user._id, 
            name: user.name, 
            email: user.email, 
            role: user.role, 
            avatar: user.avatar, 
            slackWebhook: user.slackWebhook,
            graduationYear: user.graduationYear,
            companyName: user.companyName,
            linkedinUrl: user.linkedinUrl
        }
    });
});

// ─── @route  POST /api/auth/test-webhook ─────────────────
// ─── @access Private ──────────────────────────────────────
const testWebhook = asyncHandler(async (req, res) => {
    const { webhookUrl } = req.body;

    if (!webhookUrl) {
        res.status(400);
        throw new Error('Slack Webhook URL is required');
    }

    if (!webhookUrl.startsWith('https://hooks.slack.com/services/')) {
        res.status(400);
        throw new Error('Invalid Slack webhook format. Must start with https://hooks.slack.com/services/');
    }

    const { sendSlackNotification } = require('../utils/slackWebhook');

    const payload = {
        blocks: [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `🔔 *PlaceIQ Integration Test Alert!* 🚀\nThis is a verification notification sent by *${req.user.name}* (${req.user.email}). Your Slack incoming webhook is successfully configured and working!`
                }
            },
            {
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: `Time of test: ${new Date().toLocaleString('en-IN')}`
                    }
                ]
            }
        ]
    };

    try {
        await sendSlackNotification(webhookUrl, payload);
        res.status(200).json({
            success: true,
            message: 'Slack verification test payload dispatched successfully!'
        });
    } catch (err) {
        res.status(500);
        throw new Error(`Failed to send webhook request: ${err.message}`);
    }
});

module.exports = { registerUser, verifyOTP, resendOTP, loginUser, forgotPassword, resetPassword, getMe, logoutUser, updateName, changePassword, updateProfile, testWebhook };
