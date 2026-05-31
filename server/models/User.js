const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            maxlength: [100, 'Name cannot exceed 100 characters'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters'],
            select: false, // Never return password in queries
        },
        role: {
            type: String,
            enum: ['admin', 'student', 'company', 'alumni'],
            default: 'student',
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        lastLogin: {
            type: Date,
        },
        avatar: {
            type: String,
            default: '',
        },
        otp: {
            type: String,
            select: false,
        },
        otpExpires: {
            type: Date,
            select: false,
        },
        resetPasswordToken: {
            type: String,
            select: false,
        },
        resetPasswordExpires: {
            type: Date,
            select: false,
        },
        slackWebhook: {
            type: String,
            default: '',
        },
        graduationYear: {
            type: Number,
        },
        companyName: {
            type: String,
            trim: true,
        },
        linkedinUrl: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ─── Pre-save: Hash password ──────────────────────────────
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// ─── Instance method: Match password ─────────────────────
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// ─── Instance method: Generate OTP ───────────────────────
userSchema.methods.generateOTP = function () {
    // Generate 6 digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // Hash it for DB storage
    this.otp = crypto.createHash('sha256').update(otp).digest('hex');
    // Set expiry to 10 minutes
    this.otpExpires = Date.now() + 10 * 60 * 1000;
    return otp; // Return unhashed to send via email
};

// ─── Instance method: Generate Password Reset Token ──────
userSchema.methods.generateResetToken = function () {
    // Generate random token
    const resetToken = crypto.randomBytes(20).toString('hex');
    // Hash token for DB storage
    this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    // Set expiry to 15 minutes
    this.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    return resetToken; // Return unhashed token to email
};

// ─── Virtuals: Link to role-specific profiles ─────────────
userSchema.virtual('studentProfile', {
    ref: 'StudentProfile',
    localField: '_id',
    foreignField: 'userId',
    justOne: true,
});

userSchema.virtual('companyProfile', {
    ref: 'Company',
    localField: '_id',
    foreignField: 'userId',
    justOne: true,
});

module.exports = mongoose.model('User', userSchema);
