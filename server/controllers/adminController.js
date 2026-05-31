const asyncHandler = require('express-async-handler');
const xlsx = require('xlsx');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const Company = require('../models/Company');
const Job = require('../models/Job');
const Application = require('../models/Application');
const APIFeatures = require('../utils/apiFeatures');
const { sendWelcomeEmail, sendAccountVerifiedEmail, sendAnnouncementEmail } = require('../utils/sendEmail');
const { emitToAdmins } = require('../utils/socketManager');
const { EVENTS } = require('../utils/socketManager');
const { logAuditActivity } = require('../utils/auditHelper');

// ─── @route  GET /api/admin/dashboard-stats ──────────────
// ─── @access Private (admin) ──────────────────────────────
const getDashboardStats = asyncHandler(async (req, res) => {
    const [
        totalStudents,
        placedStudents,
        activeJobs,
        totalCompanies,
        totalApplications,
        recentApplications,
    ] = await Promise.all([
        User.countDocuments({ role: 'student' }),
        StudentProfile.countDocuments({ placementStatus: 'placed' }),
        Job.countDocuments({ status: 'open', deadline: { $gte: new Date() } }),
        Company.countDocuments(),
        Application.countDocuments(),
        Application.find()
            .sort('-createdAt')
            .limit(5)
            .populate('studentId', 'name email')
            .populate('jobId', 'companyName role'),
    ]);

    const placementRate = totalStudents > 0
        ? ((placedStudents / totalStudents) * 100).toFixed(1)
        : 0;

    res.status(200).json({
        success: true,
        stats: {
            totalStudents,
            placedStudents,
            notPlaced:         totalStudents - placedStudents,
            placementRate:     parseFloat(placementRate),
            activeJobs,
            totalCompanies,
            totalApplications,
        },
        recentApplications,
    });
});

// ─── @route  GET /api/admin/students ─────────────────────
// ─── @access Private (admin) ──────────────────────────────
const getAllStudents = asyncHandler(async (req, res) => {
    const { branch, status, cgpaMin, cgpaMax, verified, search, page = 1, limit = 20 } = req.query;

    // Build aggregation pipeline for flexible multi-field filtering
    const matchStage = {};
    if (branch)   matchStage.branch = branch;
    if (status)   matchStage.placementStatus = status;
    if (cgpaMin || cgpaMax) {
        matchStage.CGPA = {};
        if (cgpaMin) matchStage.CGPA.$gte = parseFloat(cgpaMin);
        if (cgpaMax) matchStage.CGPA.$lte = parseFloat(cgpaMax);
    }

    const pipeline = [
        { $match: matchStage },
        {
            $lookup: {
                from:         'users',
                localField:   'userId',
                foreignField: '_id',
                as:           'user',
            },
        },
        { $unwind: '$user' },
        ...(verified !== undefined && verified !== '' ? [{ $match: { 'user.isVerified': verified === 'true' } }] : []),
        ...(search
            ? [{
                $match: {
                    $or: [
                        { 'user.name':  { $regex: search, $options: 'i' } },
                        { 'user.email': { $regex: search, $options: 'i' } },
                        { rollNo:       { $regex: search, $options: 'i' } },
                    ],
                },
              }]
            : []),
        {
            $project: {
                rollNo:          1,
                branch:          1,
                CGPA:            1,
                backlogs:        1,
                skills:          1,
                placementStatus: 1,
                placedCompany:   1,
                placedPackage:   1,
                resumeUrl:       1,
                isProfileComplete: 1,
                createdAt:       1,
                'user._id':      1,
                'user.name':     1,
                'user.email':    1,
                'user.isVerified': 1,
                'user.isActive': 1,
                'user.lastLogin': 1,
            },
        },
        { $sort: { createdAt: -1 } },
        { $skip: (parseInt(page) - 1) * parseInt(limit) },
        { $limit: parseInt(limit) },
    ];

    const countPipeline = [
        { $match: matchStage },
        {
            $lookup: {
                from:         'users',
                localField:   'userId',
                foreignField: '_id',
                as:           'user',
            },
        },
        { $unwind: '$user' },
        { $count: 'total' },
    ];

    const [students, countResult] = await Promise.all([
        StudentProfile.aggregate(pipeline),
        StudentProfile.aggregate(countPipeline),
    ]);

    const total = countResult[0]?.total || 0;

    res.status(200).json({
        success: true,
        pagination: {
            currentPage:  parseInt(page),
            totalPages:   Math.ceil(total / limit),
            totalItems:   total,
            itemsPerPage: parseInt(limit),
        },
        students,
    });
});

// ─── @route  POST /api/admin/bulk-upload ─────────────────
// ─── @access Private (admin) ──────────────────────────────
const bulkUploadStudents = asyncHandler(async (req, res) => {
    if (!req.file) {
        res.status(400);
        throw new Error('Please upload an Excel or CSV file');
    }

    // Parse Excel from buffer
    const workbook  = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet     = workbook.Sheets[sheetName];
    const rows      = xlsx.utils.sheet_to_json(sheet);

    if (!rows || rows.length === 0) {
        res.status(400);
        throw new Error('Excel file is empty or has no data');
    }

    const results = { created: 0, skipped: 0, errors: [] };

    for (const row of rows) {
        try {
            const email = (row.Email || row.email || '').toString().toLowerCase().trim();
            const name  = (row.Name  || row.name  || '').toString().trim();

            if (!email || !name) {
                results.skipped++;
                results.errors.push({ row: JSON.stringify(row), reason: 'Missing name or email' });
                continue;
            }

            // Check if user already exists
            const exists = await User.findOne({ email });
            if (exists) {
                results.skipped++;
                continue;
            }

            // Default password = rollNo or 'Student@123'
            const rollNo   = (row.RollNo || row.rollno || row['Roll No'] || '').toString().trim();
            const password = rollNo || 'Student@123';

            const user = await User.create({
                name,
                email,
                password,
                role:       'student',
                isVerified: true, // Bulk uploaded students are auto-verified
            });

            await StudentProfile.create({
                userId:   user._id,
                rollNo,
                branch:   (row.Branch || row.branch || 'CSE').toString().trim(),
                year:     parseInt(row.Year || row.year || 4),
                CGPA:     parseFloat(row.CGPA || row.cgpa || 0),
                backlogs: parseInt(row.Backlogs || row.backlogs || 0),
                skills:   row.Skills ? row.Skills.split(',').map((s) => s.trim()) : [],
                phone:    (row.Phone || row.phone || '').toString().trim(),
            });

            // Send welcome email (non-blocking)
            sendWelcomeEmail(user).catch(() => {});

            results.created++;
        } catch (err) {
            results.skipped++;
            results.errors.push({ reason: err.message });
        }
    }

    res.status(201).json({
        success: true,
        message: `Bulk upload complete: ${results.created} created, ${results.skipped} skipped`,
        results,
    });
});

// ─── @route  PATCH /api/admin/verify-user/:id ────────────
// ─── @access Private (admin) ──────────────────────────────
const verifyUser = asyncHandler(async (req, res) => {
    const { isVerified = true } = req.body;

    const user = await User.findByIdAndUpdate(
        req.params.id,
        { isVerified },
        { new: true }
    ).select('-password');

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // If verified successfully, trigger email
    if (isVerified && user.role === 'student') {
        sendAccountVerifiedEmail(user).catch(() => {});
    }

    res.status(200).json({
        success: true,
        message: `User ${isVerified ? 'verified' : 'unverified'} successfully`,
        user,
    });
});

// ─── @route  PATCH /api/admin/verify-company/:id ─────────
// ─── @access Private (admin) ──────────────────────────────
const verifyCompany = asyncHandler(async (req, res) => {
    const { isVerified = true } = req.body;

    // The ID passed could be the Company ID or the User ID
    // We will assume it's the Company ID, as it is the company we want to verify.
    let company = await Company.findById(req.params.id);

    if (!company) {
        // Fallback: check if it's the userId
        company = await Company.findOne({ userId: req.params.id });
        if (!company) {
            res.status(404);
            throw new Error('Company not found');
        }
    }

    company.isVerified = isVerified;
    await company.save();

    res.status(200).json({
        success: true,
        message: `Company profile ${isVerified ? 'verified' : 'unverified'} successfully`,
        company,
    });
});

// ─── @route  PATCH /api/admin/toggle-user/:id ────────────
// ─── @access Private (admin) ──────────────────────────────
const toggleUserStatus = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    if (user.role === 'admin') {
        res.status(400);
        throw new Error('Cannot deactivate admin accounts');
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
        success: true,
        message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
        isActive: user.isActive,
    });
});

// ─── @route  GET /api/admin/analytics ────────────────────
// ─── @access Private (admin) ──────────────────────────────
const getPlacementAnalytics = asyncHandler(async (req, res) => {
    const currentYear = new Date().getFullYear();

    const [
        branchWise,
        topRecruiters,
        packageDistribution,
        monthlyPlacements,
        applicationFunnel,
    ] = await Promise.all([

        // Branch-wise placement stats
        StudentProfile.aggregate([
            {
                $group: {
                    _id:         '$branch',
                    total:       { $sum: 1 },
                    placed:      { $sum: { $cond: [{ $eq: ['$placementStatus', 'placed'] }, 1, 0] } },
                    avgCGPA:     { $avg: '$CGPA' },
                    avgPackage:  { $avg: '$placedPackage' },
                },
            },
            { $sort: { placed: -1 } },
        ]),

        // Top recruiters by selection count
        StudentProfile.aggregate([
            { $match: { placementStatus: 'placed', placedCompany: { $ne: '' } } },
            {
                $group: {
                    _id:        '$placedCompany',
                    hireCount:  { $sum: 1 },
                    avgPackage: { $avg: '$placedPackage' },
                    maxPackage: { $max: '$placedPackage' },
                },
            },
            { $sort: { hireCount: -1 } },
            { $limit: 10 },
        ]),

        // Package distribution
        StudentProfile.aggregate([
            { $match: { placementStatus: 'placed', placedPackage: { $gt: 0 } } },
            {
                $bucket: {
                    groupBy:    '$placedPackage',
                    boundaries: [0, 3, 5, 8, 12, 20, 100],
                    default:    '20+',
                    output: { count: { $sum: 1 } },
                },
            },
        ]),

        // Monthly placement trend (last 12 months)
        StudentProfile.aggregate([
            {
                $match: {
                    placementStatus: 'placed',
                    placedAt:        { $gte: new Date(new Date().setMonth(new Date().getMonth() - 12)) },
                },
            },
            {
                $group: {
                    _id: {
                        year:  { $year: '$placedAt' },
                        month: { $month: '$placedAt' },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]),

        // Application funnel
        Application.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
    ]);

    // Format monthly placements into labeled data
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedMonthly = monthlyPlacements.map((m) => ({
        label: `${months[m._id.month - 1]} ${m._id.year}`,
        count: m.count,
    }));

    const funnelMap = applicationFunnel.reduce((acc, f) => {
        acc[f._id] = f.count;
        return acc;
    }, {});

    res.status(200).json({
        success: true,
        analytics: {
            branchWise,
            topRecruiters,
            packageDistribution,
            monthlyPlacements: formattedMonthly,
            applicationFunnel: {
                applied:     funnelMap.applied     || 0,
                shortlisted: funnelMap.shortlisted  || 0,
                interview:   funnelMap.interview    || 0,
                selected:    funnelMap.selected     || 0,
                rejected:    funnelMap.rejected     || 0,
            },
        },
    });
});

// ─── @route  GET /api/admin/export-placed ────────────────
// ─── @access Private (admin) ──────────────────────────────
const exportPlacedStudents = asyncHandler(async (req, res) => {
    const placedProfiles = await StudentProfile.find({ placementStatus: 'placed' })
        .populate('userId', 'name email');

    const data = placedProfiles.map((p) => ({
        Name:           p.userId?.name || '',
        Email:          p.userId?.email || '',
        'Roll No':      p.rollNo,
        Branch:         p.branch,
        CGPA:           p.CGPA,
        Company:        p.placedCompany,
        Role:           p.placedRole,
        'Package (LPA)': p.placedPackage,
        'Placed Date':  p.placedAt ? new Date(p.placedAt).toLocaleDateString('en-IN') : '',
    }));

    const wb   = xlsx.utils.book_new();
    const ws   = xlsx.utils.json_to_sheet(data);
    xlsx.utils.book_append_sheet(wb, ws, 'Placed Students');

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    await logAuditActivity(req, 'REPORT_EXPORT', {
        format: 'xlsx',
        reportType: 'placed_students_list'
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=placed_students_${Date.now()}.xlsx`);
    res.send(buffer);
});

// ─── @route  POST /api/admin/announcement ────────────────
// ─── @access Private (admin) ──────────────────────────────
const sendAnnouncement = asyncHandler(async (req, res) => {
    const { message, title } = req.body;

    if (!message || !title) {
        res.status(400);
        throw new Error('Title and message are required');
    }

    const io = req.app.get('io');
    if (io) {
        // Broadcast to all connected users
        io.emit(EVENTS.TPO_ANNOUNCEMENT, {
            title,
            message,
            postedBy:  req.user.name,
            timestamp: new Date().toISOString(),
        });
    }

    // Fetch all active students to send email asynchronously
    const students = await User.find({ role: 'student', isActive: true, isVerified: true }).select('email');
    students.forEach((student) => {
        sendAnnouncementEmail(student.email, title, message).catch(() => {});
    });

    res.status(200).json({
        success: true,
        message: 'Announcement sent to all connected users and emails dispatched',
    });
});

// ─── @route  GET /api/admin/verifications/pending ────────
// ─── @access Private (admin) ──────────────────────────────
const getPendingVerifications = asyncHandler(async (req, res) => {
    const pendingProfiles = await StudentProfile.find({ verificationStatus: 'pending' })
        .populate({
            path: 'userId',
            select: 'name email isVerified'
        })
        .sort('-updatedAt');

    res.status(200).json({
        success: true,
        profiles: pendingProfiles
    });
});

// ─── @route  PATCH /api/admin/verifications/:profileId/review ─
// ─── @access Private (admin) ──────────────────────────────
const reviewStudentVerification = asyncHandler(async (req, res) => {
    const { status, feedback } = req.body;

    if (!['verified', 'rejected'].includes(status)) {
        res.status(400);
        throw new Error('Status must be either "verified" or "rejected"');
    }

    if (status === 'rejected' && !feedback) {
        res.status(400);
        throw new Error('Feedback/rejection reason is required for rejection');
    }

    const profile = await StudentProfile.findById(req.params.profileId).populate('userId');
    if (!profile) {
        res.status(404);
        throw new Error('Student profile not found');
    }

    profile.verificationStatus = status;
    profile.verificationFeedback = status === 'rejected' ? feedback : '';
    
    if (status === 'verified') {
        profile.verifiedAt = new Date();
        profile.verifiedBy = req.user._id;
    } else {
        profile.verifiedAt = undefined;
        profile.verifiedBy = undefined;
    }

    await profile.save();

    // Send verification update email (non-blocking)
    if (profile.userId) {
        const { sendProfileVerificationEmail } = require('../utils/sendEmail');
        sendProfileVerificationEmail(profile.userId, status, feedback).catch(() => {});
    }

    await logAuditActivity(req, status === 'verified' ? 'STUDENT_VERIFIED' : 'STUDENT_REJECTED', {
        studentId: profile.userId?._id,
        studentName: profile.userId?.name,
        studentEmail: profile.userId?.email,
        feedback: status === 'rejected' ? feedback : undefined
    });

    res.status(200).json({
        success: true,
        message: `Student verification updated to ${status}`,
        profile
    });
});

const exportPlacementPDF = asyncHandler(async (req, res) => {
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });

    await logAuditActivity(req, 'REPORT_EXPORT', {
        format: 'pdf',
        reportType: 'boardroom_placement'
    });

    // Stream the PDF directly to the client response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=placement_boardroom_report_${Date.now()}.pdf`);
    doc.pipe(res);

    // Retrieve stats to build PDF
    const [
        totalCount,
        placedCount,
        branchWise,
        topRecruiters
    ] = await Promise.all([
        StudentProfile.countDocuments(),
        StudentProfile.countDocuments({ placementStatus: 'placed' }),
        StudentProfile.aggregate([
            {
                $group: {
                    _id:         '$branch',
                    total:       { $sum: 1 },
                    placed:      { $sum: { $cond: [{ $eq: ['$placementStatus', 'placed'] }, 1, 0] } },
                    avgCGPA:     { $avg: '$CGPA' },
                    avgPackage:  { $avg: { $cond: [{ $eq: ['$placementStatus', 'placed'] }, '$placedPackage', null] } },
                },
            },
        ]),
        StudentProfile.aggregate([
            { $match: { placementStatus: 'placed', placedCompany: { $ne: '' } } },
            { $group: { _id: '$placedCompany', hireCount: { $sum: 1 }, avgPackage: { $avg: '$placedPackage' }, maxPackage: { $max: '$placedPackage' } } },
            { $sort: { hireCount: -1 } },
            { $limit: 5 },
        ]),
    ]);

    const placementRate = totalCount > 0 ? ((placedCount / totalCount) * 100).toFixed(1) : '0';

    // ─── Header Section ───
    doc.fillColor('#4f46e5')
       .fontSize(24)
       .font('Helvetica-Bold')
       .text('PlaceIQ Placement Cell', { align: 'center' });

    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#64748b')
       .text('Executive Placement Boardroom Report', { align: 'center' })
       .moveDown(1.5);

    // Divider line
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').stroke().moveDown(2);

    // ─── Summary Grid ───
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('1. Executive Placement Summary', { underline: true }).moveDown(1.2);

    const summaryY = doc.y;
    // Box 1: Total Candidates
    doc.rect(50, summaryY, 150, 60).fillColor('#f8fafc').fillAndStroke('#e2e8f0');
    doc.fillColor('#64748b').fontSize(10).font('Helvetica-Bold').text('TOTAL CANDIDATES', 60, summaryY + 15);
    doc.fillColor('#0f172a').fontSize(18).font('Helvetica-Bold').text(totalCount.toString(), 60, summaryY + 32);

    // Box 2: Total Hires
    doc.rect(215, summaryY, 150, 60).fillColor('#f8fafc').fillAndStroke('#e2e8f0');
    doc.fillColor('#64748b').fontSize(10).font('Helvetica-Bold').text('PLACED CANDIDATES', 225, summaryY + 15);
    doc.fillColor('#10b981').fontSize(18).font('Helvetica-Bold').text(placedCount.toString(), 225, summaryY + 32);

    // Box 3: Placement Rate
    doc.rect(380, summaryY, 165, 60).fillColor('#f8fafc').fillAndStroke('#e2e8f0');
    doc.fillColor('#64748b').fontSize(10).font('Helvetica-Bold').text('PLACEMENT RATE', 390, summaryY + 15);
    doc.fillColor('#f97316').fontSize(18).font('Helvetica-Bold').text(`${placementRate}%`, 390, summaryY + 32);

    doc.y = summaryY + 80;
    doc.moveDown(1);

    // ─── Branch-wise Placement Table ───
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('2. Departmental Performance (Branch-wise)', { underline: true }).moveDown(1.2);

    // Table Header
    const tableHeaderY = doc.y;
    doc.rect(50, tableHeaderY, 495, 20).fillColor('#1e293b').fill();
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
    doc.text('Branch', 60, tableHeaderY + 5);
    doc.text('Total', 150, tableHeaderY + 5);
    doc.text('Placed', 220, tableHeaderY + 5);
    doc.text('Rate', 290, tableHeaderY + 5);
    doc.text('Avg Package', 380, tableHeaderY + 5);

    let rowY = tableHeaderY + 20;
    doc.font('Helvetica').fontSize(10).fillColor('#334155');

    branchWise.forEach((b, idx) => {
        const rate = b.total > 0 ? ((b.placed / b.total) * 100).toFixed(0) : '0';
        const avgPkg = b.avgPackage ? `₹${b.avgPackage.toFixed(1)} LPA` : '—';
        
        if (idx % 2 === 1) {
            doc.rect(50, rowY, 495, 20).fillColor('#f8fafc').fill();
        }
        doc.fillColor('#334155');
        doc.text(b._id || 'UNKNOWN', 60, rowY + 5);
        doc.text(b.total.toString(), 150, rowY + 5);
        doc.text(b.placed.toString(), 220, rowY + 5);
        doc.text(`${rate}%`, 290, rowY + 5);
        doc.text(avgPkg, 380, rowY + 5);

        rowY += 20;
    });

    doc.y = rowY + 20;

    // ─── Top Recruiters Section ───
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('3. Top Recruiter Cohorts', { underline: true }).moveDown(1.2);

    const recHeaderY = doc.y;
    doc.rect(50, recHeaderY, 495, 20).fillColor('#1e293b').fill();
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
    doc.text('Company Name', 60, recHeaderY + 5);
    doc.text('Total Hires', 220, recHeaderY + 5);
    doc.text('Avg CTC', 320, recHeaderY + 5);
    doc.text('Max CTC', 420, recHeaderY + 5);

    let recY = recHeaderY + 20;
    doc.font('Helvetica').fontSize(10).fillColor('#334155');

    topRecruiters.forEach((r, idx) => {
        if (idx % 2 === 1) {
            doc.rect(50, recY, 495, 20).fillColor('#f8fafc').fill();
        }
        doc.fillColor('#334155');
        doc.text(r._id, 60, recY + 5);
        doc.text(`${r.hireCount} Placed`, 220, recY + 5);
        doc.text(r.avgPackage ? `₹${r.avgPackage.toFixed(1)} LPA` : '—', 320, recY + 5);
        doc.text(r.maxPackage ? `₹${r.maxPackage.toFixed(1)} LPA` : '—', 420, recY + 5);

        recY += 20;
    });

    // Footnotes pagination
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8)
           .fillColor('#94a3b8')
           .text(
               `Page ${i + 1} of ${pages.count} • Generated automatically by PlaceIQ TPO Administration`,
               50,
               780,
               { align: 'center', width: 495 }
           );
    }

    doc.end();
});

module.exports = {
    getDashboardStats,
    getAllStudents,
    bulkUploadStudents,
    verifyUser,
    verifyCompany,
    toggleUserStatus,
    getPlacementAnalytics,
    exportPlacedStudents,
    sendAnnouncement,
    getPendingVerifications,
    reviewStudentVerification,
    exportPlacementPDF,
};
