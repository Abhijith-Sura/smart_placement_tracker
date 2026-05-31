const asyncHandler = require('express-async-handler');
const Job = require('../models/Job');
const Company = require('../models/Company');
const StudentProfile = require('../models/StudentProfile');
const User = require('../models/User');
const APIFeatures = require('../utils/apiFeatures');
const { emitNewJob } = require('../utils/socketManager');
const { sendNewJobAlert } = require('../utils/sendEmail');
const { logAuditActivity } = require('../utils/auditHelper');

// ─── @route  POST /api/jobs ───────────────────────────────
// ─── @access Private (admin | company) ───────────────────
const createJob = asyncHandler(async (req, res) => {
    // Prevent unverified companies from posting jobs
    if (req.user.role === 'company') {
        const company = await Company.findOne({ userId: req.user._id });
        if (!company || !company.isVerified) {
            res.status(403);
            throw new Error('Your company profile is pending admin verification. You cannot post jobs yet.');
        }
    }

    const finalCompanyName = req.user.role === 'company' 
        ? (req.user.companyName || req.user.name) 
        : (req.body.companyName || req.user.name);

    if (!req.body.role || !req.body.package) {
        res.status(400);
        throw new Error('Please provide job role and package');
    }

    // Prevent duplicate active job postings
    const duplicate = await Job.findOne({
        companyName: new RegExp(`^${finalCompanyName.trim()}$`, 'i'),
        role: new RegExp(`^${req.body.role.trim()}$`, 'i'),
        package: req.body.package,
        status: 'open'
    });

    if (duplicate) {
        res.status(400);
        throw new Error(`An active job posting for ${finalCompanyName} (${req.body.role}) with package ${req.body.package} LPA already exists.`);
    }

    const job = await Job.create({
        ...req.body,
        postedBy: req.user._id,
        companyName: finalCompanyName,
    });

    await logAuditActivity(req, 'JOB_CREATE', {
        jobId: job._id,
        companyName: job.companyName,
        role: job.role,
        package: job.package,
    });

    // Dispatch Slack Job Alerts
    const { sendJobAlert } = require('../utils/slackWebhook');
    if (req.user.slackWebhook) {
        sendJobAlert(req.user.slackWebhook, job).catch(err => {
            console.error('[Slack Job Alert Recruiter Error]:', err.message);
        });
    }
    const adminUser = await User.findOne({ role: 'admin', slackWebhook: { $ne: '' } });
    if (adminUser && adminUser.slackWebhook && adminUser.slackWebhook !== req.user.slackWebhook) {
        sendJobAlert(adminUser.slackWebhook, job).catch(err => {
            console.error('[Slack Job Alert Admin Error]:', err.message);
        });
    }

    // Real-time notification to all connected users
    const io = req.app.get('io');
    if (io) {
        emitNewJob(io, {
            _id:         job._id,
            companyName: job.companyName,
            role:        job.role,
            package:     job.package,
            location:    job.location,
            deadline:    job.deadline,
        });
    }

    // Fetch eligible students to send emails asynchronously
    const pipeline = [
        {
            $match: {
                CGPA:     { $gte: job.criteria.minCGPA },
                backlogs: { $lte: job.criteria.maxBacklogs },
                ...(job.criteria.allowedBranches.includes('ALL')
                    ? {}
                    : { branch: { $in: job.criteria.allowedBranches } }),
                placementStatus: 'not_placed',
            },
        },
        {
            $lookup: {
                from:         'users',
                localField:   'userId',
                foreignField: '_id',
                as:           'user',
            },
        },
        { $unwind: '$user' },
        {
            $match: { 'user.isVerified': true, 'user.isActive': true },
        },
        {
            $project: {
                'user.name':  1,
                'user.email': 1,
            },
        },
    ];

    StudentProfile.aggregate(pipeline).then((students) => {
        students.forEach((s) => {
            sendNewJobAlert(s.user, job).catch(() => {});
        });
    }).catch((err) => console.error('Failed to send job alert emails', err));

    res.status(201).json({
        success: true,
        message: 'Job posted successfully',
        job,
    });
});

// ─── @route  GET /api/jobs ────────────────────────────────
// ─── @access Private (admin | company) ───────────────────
const getAllJobs = asyncHandler(async (req, res) => {
    // Admin sees all; company sees only their own
    const baseFilter = req.user.role === 'company'
        ? { postedBy: req.user._id }
        : {};

    const features = new APIFeatures(Job.find(baseFilter), req.query)
        .filter()
        .search(['companyName', 'role', 'location'])
        .sort()
        .paginate();

    const jobs  = await features.query.populate('postedBy', 'name email').select('-__v');
    const total = await Job.countDocuments(baseFilter);

    res.status(200).json({
        success: true,
        pagination: features.getPaginationMeta(total),
        jobs,
    });
});

// ─── @route  GET /api/jobs/public ────────────────────────
// ─── @access Public ───────────────────────────────────────
const getPublicJobs = asyncHandler(async (req, res) => {
    const filter = { status: 'open', deadline: { $gte: new Date() } };

    const features = new APIFeatures(Job.find(filter), req.query)
        .search(['companyName', 'role', 'location'])
        .sort()
        .paginate();

    const jobs  = await features.query.select('companyName role package location deadline jobType criteria tags');
    const total = await Job.countDocuments(filter);

    res.status(200).json({
        success: true,
        pagination: features.getPaginationMeta(total),
        jobs,
    });
});

// ─── @route  GET /api/jobs/:id ───────────────────────────
// ─── @access Private ──────────────────────────────────────
const getJobById = asyncHandler(async (req, res) => {
    const job = await Job.findById(req.params.id)
        .populate('postedBy', 'name email');

    if (!job) {
        res.status(404);
        throw new Error('Job not found');
    }

    res.status(200).json({ success: true, job });
});

// ─── @route  PATCH /api/jobs/:id ─────────────────────────
// ─── @access Private (admin | company) ───────────────────
const updateJob = asyncHandler(async (req, res) => {
    let job = await Job.findById(req.params.id);

    if (!job) {
        res.status(404);
        throw new Error('Job not found');
    }

    // Companies can only edit their own jobs
    if (req.user.role === 'company' && job.postedBy.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized to edit this job');
    }

    job = await Job.findByIdAndUpdate(req.params.id, req.body, {
        new:            true,
        runValidators:  true,
    });

    res.status(200).json({ success: true, message: 'Job updated successfully', job });
});

// ─── @route  DELETE /api/jobs/:id ────────────────────────
// ─── @access Private (admin) ──────────────────────────────
const deleteJob = asyncHandler(async (req, res) => {
    const job = await Job.findById(req.params.id);

    if (!job) {
        res.status(404);
        throw new Error('Job not found');
    }

    await job.deleteOne();

    res.status(200).json({ success: true, message: 'Job deleted successfully' });
});

// ─── @route  GET /api/jobs/:id/eligible-students ─────────
// ─── @access Private (admin | company) ───────────────────
const getEligibleStudentsForJob = asyncHandler(async (req, res) => {
    const job = await Job.findById(req.params.id);

    if (!job) {
        res.status(404);
        throw new Error('Job not found');
    }

    // MongoDB Aggregation Pipeline — smart filter
    const pipeline = [
        {
            $match: {
                CGPA:     { $gte: job.criteria.minCGPA },
                backlogs: { $lte: job.criteria.maxBacklogs },
                ...(job.criteria.allowedBranches.includes('ALL')
                    ? {}
                    : { branch: { $in: job.criteria.allowedBranches } }),
                placementStatus: 'not_placed',
            },
        },
        {
            $lookup: {
                from:         'users',
                localField:   'userId',
                foreignField: '_id',
                as:           'user',
            },
        },
        { $unwind: '$user' },
        {
            $match: { 'user.isVerified': true, 'user.isActive': true },
        },
        {
            $project: {
                rollNo:      1,
                branch:      1,
                CGPA:        1,
                backlogs:    1,
                skills:      1,
                resumeUrl:   1,
                phone:       1,
                'user.name':  1,
                'user.email': 1,
                'user._id':   1,
            },
        },
        { $sort: { CGPA: -1 } },
    ];

    const students = await StudentProfile.aggregate(pipeline);

    res.status(200).json({
        success:  true,
        total:    students.length,
        students,
    });
});

// ─── @route  PATCH /api/jobs/:id/status ──────────────────
// ─── @access Private (admin | company) ───────────────────
const updateJobStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const validStatuses = ['open', 'closed', 'draft'];

    if (!validStatuses.includes(status)) {
        res.status(400);
        throw new Error(`Status must be one of: ${validStatuses.join(', ')}`);
    }

    const job = await Job.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
    );

    if (!job) {
        res.status(404);
        throw new Error('Job not found');
    }

    await logAuditActivity(req, 'JOB_STATUS_CHANGE', {
        jobId: job._id,
        companyName: job.companyName,
        role: job.role,
        newStatus: status,
    });

    res.status(200).json({ success: true, message: `Job status updated to '${status}'`, job });
});

// ─── @route  GET /api/jobs/company/:companyName ──────────
// ─── @access Public (company dashboard uses this) ─────────
const getJobsByCompanyName = asyncHandler(async (req, res) => {
    const { companyName } = req.params;

    const jobs = await Job.find({ companyName: new RegExp(`^${companyName}$`, 'i') })
        .sort('-createdAt')
        .select('-__v');

    res.status(200).json({ success: true, total: jobs.length, jobs });
});

module.exports = {
    createJob,
    getAllJobs,
    getPublicJobs,
    getJobById,
    updateJob,
    deleteJob,
    getEligibleStudentsForJob,
    updateJobStatus,
    getJobsByCompanyName,
};
