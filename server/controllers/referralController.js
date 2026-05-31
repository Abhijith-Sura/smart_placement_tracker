const asyncHandler = require('express-async-handler');
const ReferralListing = require('../models/ReferralListing');
const ReferralApplication = require('../models/ReferralApplication');
const { logAuditActivity } = require('../utils/auditHelper');

// @desc    Create a referral listing
// @route   POST /api/referrals
// @access  Private (Alumni)
const createReferralListing = asyncHandler(async (req, res) => {
    const { companyName, role, location, package: pkg, requirements, jobLink } = req.body;

    if (!companyName || !role || !requirements) {
        res.status(400);
        throw new Error('Please provide companyName, role, and requirements');
    }

    const listing = await ReferralListing.create({
        alumniId: req.user._id,
        companyName,
        role,
        location: location || 'Remote',
        package: pkg || '',
        requirements,
        jobLink: jobLink || '',
        status: 'open',
    });

    await logAuditActivity(req, 'REFERRAL_LISTING_CREATE', {
        listingId: listing._id,
        companyName: listing.companyName,
        role: listing.role,
    });

    res.status(201).json({
        success: true,
        message: 'Referral listing created successfully',
        listing,
    });
});

// @desc    Get all active referral listings
// @route   GET /api/referrals
// @access  Private
const getReferralListings = asyncHandler(async (req, res) => {
    const { search } = req.query;
    const filter = { status: 'open' };

    if (search) {
        filter.$or = [
            { companyName: new RegExp(search, 'i') },
            { role: new RegExp(search, 'i') },
        ];
    }

    const listings = await ReferralListing.find(filter)
        .populate('alumniId', 'name email companyName graduationYear linkedinUrl avatar')
        .sort('-createdAt');

    res.status(200).json({
        success: true,
        total: listings.length,
        listings,
    });
});

// @desc    Get alumni's own referral listings
// @route   GET /api/referrals/my-posts
// @access  Private (Alumni)
const getMyReferralListings = asyncHandler(async (req, res) => {
    const listings = await ReferralListing.find({ alumniId: req.user._id }).sort('-createdAt');

    // Attach application counts for each listing
    const listingsWithCount = await Promise.all(
        listings.map(async (listing) => {
            const count = await ReferralApplication.countDocuments({ referralJobId: listing._id });
            return {
                ...listing.toObject(),
                applicantCount: count,
            };
        })
    );

    res.status(200).json({
        success: true,
        total: listingsWithCount.length,
        listings: listingsWithCount,
    });
});

// @desc    Update a referral listing
// @route   PATCH /api/referrals/:id
// @access  Private (Alumni)
const updateReferralListing = asyncHandler(async (req, res) => {
    const listing = await ReferralListing.findById(req.params.id);

    if (!listing) {
        res.status(404);
        throw new Error('Referral listing not found');
    }

    if (listing.alumniId.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized to update this listing');
    }

    const updatedListing = await ReferralListing.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );

    await logAuditActivity(req, 'REFERRAL_LISTING_UPDATE', {
        listingId: listing._id,
        companyName: updatedListing.companyName,
        role: updatedListing.role,
    });

    res.status(200).json({
        success: true,
        message: 'Referral listing updated successfully',
        listing: updatedListing,
    });
});

// @desc    Delete a referral listing
// @route   DELETE /api/referrals/:id
// @access  Private (Alumni)
const deleteReferralListing = asyncHandler(async (req, res) => {
    const listing = await ReferralListing.findById(req.params.id);

    if (!listing) {
        res.status(404);
        throw new Error('Referral listing not found');
    }

    if (listing.alumniId.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized to delete this listing');
    }

    await ReferralApplication.deleteMany({ referralJobId: listing._id });
    await listing.deleteOne();

    await logAuditActivity(req, 'REFERRAL_LISTING_DELETE', {
        listingId: listing._id,
        companyName: listing.companyName,
        role: listing.role,
    });

    res.status(200).json({
        success: true,
        message: 'Referral listing deleted successfully',
    });
});

// @desc    Apply for a referral listing
// @route   POST /api/referrals/:id/apply
// @access  Private (Student)
const applyForReferral = asyncHandler(async (req, res) => {
    const { resumeUrl, coverNote } = req.body;

    if (!resumeUrl) {
        res.status(400);
        throw new Error('Resume URL is required');
    }

    const listing = await ReferralListing.findById(req.params.id);
    if (!listing) {
        res.status(404);
        throw new Error('Referral listing not found');
    }

    if (listing.status !== 'open') {
        res.status(400);
        throw new Error('This referral listing is closed');
    }

    const duplicate = await ReferralApplication.findOne({
        referralJobId: listing._id,
        studentId: req.user._id,
    });

    if (duplicate) {
        res.status(400);
        throw new Error('You have already applied for this referral');
    }

    const application = await ReferralApplication.create({
        referralJobId: listing._id,
        studentId: req.user._id,
        resumeUrl,
        coverNote: coverNote || '',
        status: 'pending',
    });

    await logAuditActivity(req, 'REFERRAL_APPLY', {
        applicationId: application._id,
        listingId: listing._id,
        companyName: listing.companyName,
        role: listing.role,
    });

    // Notify Alumni via in-app notification
    const { createNotification } = require('./notificationController');
    await createNotification({
        userId: listing.alumniId,
        title: 'New Referral Application',
        message: `${req.user.name} applied for your referral listing for ${listing.role} at ${listing.companyName}.`,
        type: 'application',
        relatedId: application._id,
    }).catch(err => console.error('Failed to dispatch notification:', err.message));

    res.status(201).json({
        success: true,
        message: 'Applied for referral successfully',
        application,
    });
});

// @desc    Get referral applications
// @route   GET /api/referrals/applications
// @access  Private
const getReferralApplications = asyncHandler(async (req, res) => {
    let applications = [];

    if (req.user.role === 'student') {
        applications = await ReferralApplication.find({ studentId: req.user._id })
            .populate({
                path: 'referralJobId',
                populate: { path: 'alumniId', select: 'name email companyName graduationYear linkedinUrl' }
            })
            .sort('-createdAt');
    } else if (req.user.role === 'alumni') {
        // Find listings owned by this alumni
        const myListings = await ReferralListing.find({ alumniId: req.user._id }).select('_id');
        const listingIds = myListings.map((l) => l._id);

        applications = await ReferralApplication.find({ referralJobId: { $in: listingIds } })
            .populate('studentId', 'name email avatar')
            .populate('referralJobId', 'companyName role location')
            .sort('-createdAt');
    } else if (req.user.role === 'admin') {
        applications = await ReferralApplication.find()
            .populate('studentId', 'name email')
            .populate({
                path: 'referralJobId',
                populate: { path: 'alumniId', select: 'name email' }
            })
            .sort('-createdAt');
    }

    res.status(200).json({
        success: true,
        total: applications.length,
        applications,
    });
});

// @desc    Update a referral application status
// @route   PATCH /api/referrals/applications/:appId
// @access  Private (Alumni)
const updateReferralApplicationStatus = asyncHandler(async (req, res) => {
    const { status, feedback } = req.body;
    const validStatuses = ['referred', 'rejected', 'pending'];

    if (!status || !validStatuses.includes(status)) {
        res.status(400);
        throw new Error('Please provide a valid status: referred, rejected, or pending');
    }

    const application = await ReferralApplication.findById(req.params.appId)
        .populate('studentId', 'name email')
        .populate('referralJobId', 'companyName role alumniId');

    if (!application) {
        res.status(404);
        throw new Error('Referral application not found');
    }

    // Verify ownership
    if (application.referralJobId.alumniId.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized to review this application');
    }

    application.status = status;
    if (feedback !== undefined) {
        application.feedback = feedback.trim();
    }
    await application.save();

    await logAuditActivity(req, 'REFERRAL_STATUS_CHANGE', {
        applicationId: application._id,
        listingId: application.referralJobId._id,
        companyName: application.referralJobId.companyName,
        role: application.referralJobId.role,
        status,
    });

    // Notify student of status update
    const { createNotification } = require('./notificationController');
    const statusText = status === 'referred' ? 'submitted' : 'declined';
    await createNotification({
        userId: application.studentId._id,
        title: `Referral Status Update`,
        message: `Your referral request for ${application.referralJobId.role} at ${application.referralJobId.companyName} has been ${statusText} by the alumni.`,
        type: 'application',
        relatedId: application._id,
    }).catch(err => console.error('Failed to dispatch notification:', err.message));

    res.status(200).json({
        success: true,
        message: `Application status updated to ${status}`,
        application,
    });
});

module.exports = {
    createReferralListing,
    getReferralListings,
    getMyReferralListings,
    updateReferralListing,
    deleteReferralListing,
    applyForReferral,
    getReferralApplications,
    updateReferralApplicationStatus,
};
