const asyncHandler = require('express-async-handler');
const Company = require('../models/Company');
const Job = require('../models/Job');
const Application = require('../models/Application');
const { uploadLogo, deleteFromCloudinary, uploadToCloudinary } = require('../utils/multerConfig');
const fs = require('fs');

// ─── @route  GET /api/companies/profile ──────────────────
// ─── @access Private (company) ────────────────────────────
const getCompanyProfile = asyncHandler(async (req, res) => {
    const company = await Company.findOne({ userId: req.user._id });

    if (!company) {
        res.status(404);
        throw new Error('Company profile not found');
    }

    res.status(200).json({ success: true, company });
});

// ─── @route  PATCH /api/companies/profile ────────────────
// ─── @access Private (company) ────────────────────────────
const updateCompanyProfile = asyncHandler(async (req, res) => {
    const allowedFields = [
        'companyName', 'website', 'industry', 'description',
        'hrName', 'hrContact', 'address',
    ];

    const updates = {};
    allowedFields.forEach((f) => {
        if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    const company = await Company.findOneAndUpdate(
        { userId: req.user._id },
        { ...updates, lastActivity: new Date() },
        { new: true, runValidators: true }
    );

    if (!company) {
        res.status(404);
        throw new Error('Company profile not found');
    }

    res.status(200).json({
        success: true,
        message: 'Company profile updated',
        company,
    });
});

// ─── @route  POST /api/companies/upload-logo ─────────────
// ─── @access Private (company) ────────────────────────────
const uploadCompanyLogo = asyncHandler(async (req, res) => {
    if (!req.file) {
        res.status(400);
        throw new Error('No logo image provided');
    }

    const company = await Company.findOne({ userId: req.user._id });

    const localPath = req.file.path.replace(/\\/g, '/');
    const folder = 'smart_placement/logos';
    const cloudinaryData = await uploadToCloudinary(localPath, folder, 'image');

    let logoUrl = `/uploads/logos/${req.file.filename}`;
    let logoPublicId = '';

    if (cloudinaryData && cloudinaryData.url) {
        logoUrl = cloudinaryData.url;
        logoPublicId = cloudinaryData.publicId;

        if (company.logoPublicId) {
            await deleteFromCloudinary(company.logoPublicId);
        }

        fs.unlink(req.file.path, (err) => {
            if (err) console.error('[Cleanup] Failed to delete local temp file:', err.message);
        });
    }

    await Company.findOneAndUpdate(
        { userId: req.user._id },
        { logoUrl, logoPublicId }
    );

    res.status(200).json({ success: true, logoUrl });
});

// ─── @route  GET /api/companies/dashboard ────────────────
// ─── @access Private (company) ────────────────────────────
const getCompanyDashboard = asyncHandler(async (req, res) => {
    const [company, totalJobs, activeJobs, totalHires, recentJobs] = await Promise.all([
        Company.findOne({ userId: req.user._id }),
        Job.countDocuments({ postedBy: req.user._id }),
        Job.countDocuments({ postedBy: req.user._id, status: 'open' }),
        Job.aggregate([
            { $match: { postedBy: req.user._id } },
            { $group: { _id: null, total: { $sum: '$selectedCount' } } },
        ]),
        Job.find({ postedBy: req.user._id })
            .sort('-createdAt')
            .limit(5)
            .select('companyName role status totalApplicants selectedCount deadline'),
    ]);

    res.status(200).json({
        success: true,
        company,
        stats: {
            totalJobs,
            activeJobs,
            totalHires: totalHires[0]?.total || 0,
            totalApplications: 0, // Will aggregate separately if needed
        },
        recentJobs,
    });
});

// ─── @route  GET /api/companies ──────────────────────────
// ─── @access Private (admin) ──────────────────────────────
const getAllCompanies = asyncHandler(async (req, res) => {
    const { verified, search, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (verified !== undefined && verified !== '') filter.isVerified = verified === 'true';

    if (search) {
        filter.$or = [
            { companyName: { $regex: search, $options: 'i' } },
            { industry:    { $regex: search, $options: 'i' } },
        ];
    }

    const [companies, total] = await Promise.all([
        Company.find(filter)
            .populate('userId', 'name email isVerified isActive lastLogin')
            .sort('-createdAt')
            .skip((page - 1) * limit)
            .limit(parseInt(limit)),
        Company.countDocuments(filter),
    ]);

    res.status(200).json({
        success: true,
        pagination: {
            currentPage:  parseInt(page),
            totalPages:   Math.ceil(total / limit),
            totalItems:   total,
            itemsPerPage: parseInt(limit),
        },
        companies,
    });
});

module.exports = {
    getCompanyProfile,
    updateCompanyProfile,
    uploadCompanyLogo,
    getCompanyDashboard,
    getAllCompanies,
};
