const asyncHandler = require('express-async-handler');
const StudentProfile = require('../models/StudentProfile');
const Application = require('../models/Application');
const Job = require('../models/Job');
const { uploadResume, uploadProfilePic, deleteFromCloudinary, uploadToCloudinary } = require('../utils/multerConfig');
const APIFeatures = require('../utils/apiFeatures');
const fs = require('fs');

// ─── @route  GET /api/students/profile ───────────────────
// ─── @access Private (student) ────────────────────────────
const getMyProfile = asyncHandler(async (req, res) => {
    const profile = await StudentProfile.findOne({ userId: req.user._id });

    if (!profile) {
        res.status(404);
        throw new Error('Student profile not found');
    }

    res.status(200).json({
        success: true,
        profile,
        user: {
            name:              req.user.name,
            email:             req.user.email,
            isVerified:        req.user.isVerified,
            profileCompletion: profile.completionPercentage,
        },
    });
});

// ─── @route  PATCH /api/students/profile ─────────────────
// ─── @access Private (student) ────────────────────────────
const updateMyProfile = asyncHandler(async (req, res) => {
    const allowedFields = [
        'rollNo', 'branch', 'year', 'batchYear', 'CGPA', 'backlogs',
        'skills', 'phone', 'linkedin', 'github', 'about',
        'interests', 'projects', 'internships', 'experiences',
        'certificates', 'achievements', 'tenthPercent', 'twelfthPercent',
        'profilePicUrl', 'profilePicPublicId'
    ];

    const updates = {};
    allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const profile = await StudentProfile.findOne({ userId: req.user._id });

    if (!profile) {
        res.status(404);
        throw new Error('Student profile not found');
    }

    // Assign all allowed fields so the pre-save hook fires correctly
    allowedFields.forEach((field) => {
        if (updates[field] !== undefined) profile[field] = updates[field];
    });

    await profile.save();

    res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        profile,
        user: {
            name:              req.user.name,
            email:             req.user.email,
            isVerified:        req.user.isVerified,
            profileCompletion: profile.completionPercentage,
        },
    });
});

// ─── @route  POST /api/students/upload-resume ────────────
// ─── @access Private (student) ────────────────────────────
const uploadStudentResume = asyncHandler(async (req, res) => {
    if (!req.file) {
        res.status(400);
        throw new Error('No resume file provided');
    }

    const profile = await StudentProfile.findOne({ userId: req.user._id });

    const localPath = req.file.path.replace(/\\/g, '/');
    const folder = 'smart_placement/resumes';
    const cloudinaryData = await uploadToCloudinary(localPath, folder, 'raw');

    let resumeUrl = `/uploads/resumes/${req.file.filename}`;
    let resumePublicId = '';

    if (cloudinaryData && cloudinaryData.url) {
        resumeUrl = cloudinaryData.url;
        resumePublicId = cloudinaryData.publicId;

        if (profile.resumePublicId) {
            await deleteFromCloudinary(profile.resumePublicId, 'raw');
        }

        fs.unlink(req.file.path, (err) => {
            if (err) console.error('[Cleanup] Failed to delete local temp file:', err.message);
        });
    }

    await StudentProfile.findOneAndUpdate(
        { userId: req.user._id },
        { resumeUrl, resumePublicId }
    );

    // AI Trigger: Background parse resume PDF and update student profile fields
    const { extractAndUpdateProfile } = require('./resumeController');
    extractAndUpdateProfile(req.user._id, resumeUrl)
        .then(() => console.log(`[AI Parser] Background parsing finished for student user ${req.user._id}`))
        .catch(err => console.error('[AI Parser] Background parsing failed:', err.message));

    res.status(200).json({
        success:   true,
        message:   'Resume uploaded successfully. Profile auto-parsing started in background.',
        resumeUrl,
    });
});

// ─── @route  POST /api/students/upload-pic ───────────────
// ─── @access Private (student) ────────────────────────────
const uploadProfilePicture = asyncHandler(async (req, res) => {
    if (!req.file) {
        res.status(400);
        throw new Error('No image file provided');
    }

    const profile = await StudentProfile.findOne({ userId: req.user._id });

    const localPath = req.file.path.replace(/\\/g, '/');
    const folder = 'smart_placement/profile_pics';
    const cloudinaryData = await uploadToCloudinary(localPath, folder, 'image');

    let profilePicUrl = `/uploads/profiles/${req.file.filename}`;
    let profilePicPublicId = '';

    if (cloudinaryData && cloudinaryData.url) {
        profilePicUrl = cloudinaryData.url;
        profilePicPublicId = cloudinaryData.publicId;

        if (profile.profilePicPublicId) {
            await deleteFromCloudinary(profile.profilePicPublicId, 'image');
        }

        fs.unlink(req.file.path, (err) => {
            if (err) console.error('[Cleanup] Failed to delete local temp file:', err.message);
        });
    }

    await StudentProfile.findOneAndUpdate(
        { userId: req.user._id },
        { profilePicUrl, profilePicPublicId }
    );

    res.status(200).json({
        success:       true,
        message:       'Profile picture uploaded successfully',
        profilePicUrl,
    });
});

// ─── @route  GET /api/students/eligible-jobs ─────────────
// ─── @access Private (student) ────────────────────────────
const getEligibleJobs = asyncHandler(async (req, res) => {
    const profile = await StudentProfile.findOne({ userId: req.user._id });

    if (!profile) {
        res.status(404);
        throw new Error('Complete your profile to view eligible jobs');
    }

    // Smart eligibility filter using MongoDB query
    const eligibleFilter = {
        status:  'open',
        deadline: { $gte: new Date() },
        'criteria.minCGPA':   { $lte: profile.CGPA },
        'criteria.maxBacklogs': { $gte: profile.backlogs },
        $or: [
            { 'criteria.allowedBranches': 'ALL' },
            { 'criteria.allowedBranches': profile.branch },
        ],
    };

    const features = new APIFeatures(Job.find(eligibleFilter), req.query)
        .search(['companyName', 'role', 'location'])
        .sort()
        .paginate();

    const jobs  = await features.query.select('-__v');
    const total = await Job.countDocuments(eligibleFilter);

    res.status(200).json({
        success: true,
        pagination: features.getPaginationMeta(total),
        jobs,
    });
});

// ─── @route  GET /api/students/all-jobs ──────────────────
// ─── @access Private (student) — returns ALL jobs with eligibility flag
const getAllJobsWithEligibility = asyncHandler(async (req, res) => {
    const profile = await StudentProfile.findOne({ userId: req.user._id });

    const features = new APIFeatures(
        Job.find({ status: 'open', deadline: { $gte: new Date() } }),
        req.query
    )
        .search(['companyName', 'role', 'location'])
        .sort()
        .paginate();

    const jobs  = await features.query.select('-__v');
    const total = await Job.countDocuments({ status: 'open', deadline: { $gte: new Date() } });

    // Attach eligibility flag to each job
    const jobsWithEligibility = jobs.map((job) => {
        const j = job.toObject();
        if (!profile) {
            j.isEligible = false;
            j.ineligibleReason = 'Complete your profile first';
        } else {
            const cgpaOk    = profile.CGPA >= job.criteria.minCGPA;
            const backlogOk = profile.backlogs <= job.criteria.maxBacklogs;
            const branchOk  =
                job.criteria.allowedBranches.includes('ALL') ||
                job.criteria.allowedBranches.includes(profile.branch);

            j.isEligible = cgpaOk && backlogOk && branchOk;
            if (!j.isEligible) {
                const reasons = [];
                if (!cgpaOk)    reasons.push(`Min CGPA: ${job.criteria.minCGPA}`);
                if (!backlogOk) reasons.push(`Max backlogs: ${job.criteria.maxBacklogs}`);
                if (!branchOk)  reasons.push('Branch not eligible');
                j.ineligibleReason = reasons.join(' · ');
            }
        }
        return j;
    });

    res.status(200).json({
        success: true,
        pagination: features.getPaginationMeta(total),
        jobs: jobsWithEligibility,
    });
});

// ─── @route  GET /api/students/dashboard-stats ───────────
// ─── @access Private (student) ────────────────────────────
const getStudentDashboardStats = asyncHandler(async (req, res) => {
    const profile = await StudentProfile.findOne({ userId: req.user._id });

    const applicationStats = await Application.aggregate([
        { $match: { studentId: req.user._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const statsMap = applicationStats.reduce((acc, s) => {
        acc[s._id] = s.count;
        return acc;
    }, {});

    const totalEligibleJobs = profile
        ? await Job.countDocuments({
            status:  'open',
            deadline: { $gte: new Date() },
            'criteria.minCGPA':    { $lte: profile.CGPA },
            'criteria.maxBacklogs': { $gte: profile.backlogs },
            $or: [
                { 'criteria.allowedBranches': 'ALL' },
                { 'criteria.allowedBranches': profile.branch },
            ],
          })
        : 0;

    const recentApplications = await Application.find({ studentId: req.user._id })
        .populate('jobId')
        .sort({ createdAt: -1 })
        .limit(3);

    res.status(200).json({
        success: true,
        recentApplications,
        stats: {
            totalApplications: Object.values(statsMap).reduce((a, b) => a + b, 0),
            applied:           statsMap.applied     || 0,
            appliedCount:      statsMap.applied     || 0,
            shortlisted:       statsMap.shortlisted  || 0,
            shortlistedCount:  statsMap.shortlisted  || 0,
            interview:         statsMap.interview    || 0,
            interviewCount:    statsMap.interview    || 0,
            selected:          statsMap.selected     || 0,
            selectedCount:     statsMap.selected     || 0,
            rejected:          statsMap.rejected     || 0,
            rejectedCount:     statsMap.rejected     || 0,
            eligibleJobs:      totalEligibleJobs,
            profileComplete:   profile?.isProfileComplete || false,
            completionPct:     profile?.completionPercentage || 0,
        },
    });
});

// ─── @route  POST /api/students/verification/upload ──────
// ─── @access Private (student) ────────────────────────────
const uploadVerificationDocument = asyncHandler(async (req, res) => {
    if (!req.file) {
        res.status(400);
        throw new Error('No document file provided');
    }

    const { docName } = req.body;
    if (!docName) {
        res.status(400);
        throw new Error('Document name (docName) is required');
    }

    const profile = await StudentProfile.findOne({ userId: req.user._id });
    if (!profile) {
        res.status(404);
        throw new Error('Student profile not found');
    }

    const localPath = req.file.path.replace(/\\/g, '/');
    const folder = 'smart_placement/verifications';
    const cloudinaryData = await uploadToCloudinary(localPath, folder, 'raw');

    let fileUrl = `/uploads/verifications/${req.file.filename}`;
    let filePublicId = '';

    if (cloudinaryData && cloudinaryData.url) {
        fileUrl = cloudinaryData.url;
        filePublicId = cloudinaryData.publicId;

        fs.unlink(req.file.path, (err) => {
            if (err) console.error('[Cleanup] Failed to delete local temp file:', err.message);
        });
    }

    // Append document to array
    profile.verificationDocuments.push({
        name: docName,
        fileUrl,
        filePublicId
    });

    await profile.save();

    res.status(200).json({
        success: true,
        message: 'Document uploaded to locker successfully',
        documents: profile.verificationDocuments
    });
});

// ─── @route  DELETE /api/students/verification/:docId ────
// ─── @access Private (student) ────────────────────────────
const deleteVerificationDocument = asyncHandler(async (req, res) => {
    const profile = await StudentProfile.findOne({ userId: req.user._id });
    if (!profile) {
        res.status(404);
        throw new Error('Student profile not found');
    }

    const doc = profile.verificationDocuments.id(req.params.docId);
    if (!doc) {
        res.status(404);
        throw new Error('Document not found in locker');
    }

    // Delete from Cloudinary if public_id exists
    if (doc.filePublicId) {
        await deleteFromCloudinary(doc.filePublicId, 'raw');
    }

    // Remove from mongoose array
    doc.deleteOne();
    await profile.save();

    res.status(200).json({
        success: true,
        message: 'Document deleted from locker successfully',
        documents: profile.verificationDocuments
    });
});

// ─── @route  POST /api/students/verification/submit ──────
// ─── @access Private (student) ────────────────────────────
const submitVerificationRequest = asyncHandler(async (req, res) => {
    const profile = await StudentProfile.findOne({ userId: req.user._id });
    if (!profile) {
        res.status(404);
        throw new Error('Student profile not found');
    }

    if (profile.verificationDocuments.length === 0) {
        res.status(400);
        throw new Error('Please upload at least one verification document (e.g. B.Tech transcript) before submitting');
    }

    profile.verificationStatus = 'pending';
    profile.verificationFeedback = ''; // Clear previous feedback if any
    await profile.save();

    res.status(200).json({
        success: true,
        message: 'Profile verification request submitted to TPO Admin',
        status: profile.verificationStatus
    });
});

module.exports = {
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
};
