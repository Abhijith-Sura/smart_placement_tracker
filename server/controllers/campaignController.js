const asyncHandler = require('express-async-handler');
const StudentProfile = require('../models/StudentProfile');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Campaign = require('../models/Campaign');
const { sendEmail } = require('../utils/sendEmail');
const { logAuditActivity } = require('../utils/auditHelper');

// ─── Helper: Asynchronous background mail dispatcher ─────────
const processEmailBroadcast = async ({ recipients, subject, content, senderName }) => {
    console.log(`[Campaign Mailer] Initializing background broadcast of "${subject}" to ${recipients.length} users...`);
    
    const chunkSize = 5;
    for (let i = 0; i < recipients.length; i += chunkSize) {
        const chunk = recipients.slice(i, i + chunkSize);
        await Promise.all(
            chunk.map(async (user) => {
                const formattedHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
                  <div style="text-align: center; margin-bottom: 25px;">
                    <h1 style="color: #f97316; font-size: 26px; margin: 0;">Smart Placement Cell</h1>
                    <p style="color: #64748b; font-size: 13px; margin-top: 4px;">PlaceIQ Updates Alert</p>
                  </div>
                  <h3 style="color: #e2e8f0;">Hello ${user.name},</h3>
                  <div style="color: #cbd5e1; line-height: 1.6; font-size: 14px; white-space: pre-wrap; margin: 20px 0;">
                    ${content}
                  </div>
                  <p style="color: #64748b; font-size: 12px; margin-top: 30px; border-top: 1px solid #1e293b; padding-top: 15px;">
                    Sent by: <strong>${senderName}</strong> • Placement Department.
                  </p>
                </div>`;

                try {
                    await sendEmail({
                        to: user.email,
                        subject: subject,
                        html: formattedHtml,
                        text: content
                    });
                } catch (err) {
                    console.error(`[Campaign Mailer] Failed to send to ${user.email}:`, err.message);
                }
            })
        );
        // Sleep for 300ms between batches to ease rate limit pressures
        await new Promise(r => setTimeout(r, 300));
    }
    console.log(`[Campaign Mailer] Background broadcast completed for subject: "${subject}"`);
};

// ─── Helper: Build student filter query based on role scopes ───
const buildFiltersQuery = async (req, filters) => {
    const userRole = req.user.role;
    const query = {};

    // 1. Resolve eligible students based on Role Scoping (SOC-2/Tenancy Compliance)
    if (userRole === 'company') {
        // Companies can only target applicants of their own drives
        const companyJobs = await Job.find({ postedBy: req.user._id });
        const companyJobIds = companyJobs.map(j => j._id);

        if (filters.jobId) {
            if (!companyJobIds.map(id => id.toString()).includes(filters.jobId.toString())) {
                throw new Error('Forbidden: Recruiter is not authorized to message applicants of this job drive');
            }
            const applications = await Application.find({ jobId: filters.jobId });
            query.userId = { $in: applications.map(a => a.studentId) };
        } else {
            const applications = await Application.find({ jobId: { $in: companyJobIds } });
            query.userId = { $in: applications.map(a => a.studentId) };
        }
    } else {
        // Admin TPO Portal can filter globally, or by a specific job drive
        if (filters.jobId) {
            const applications = await Application.find({ jobId: filters.jobId });
            query.userId = { $in: applications.map(a => a.studentId) };
        }
    }

    // 2. Build StudentProfile filters
    if (filters.branch && filters.branch !== 'ALL') {
        query.branch = filters.branch;
    }
    if (filters.minCgpa > 0) {
        query.CGPA = { $gte: parseFloat(filters.minCgpa) };
    }
    if (filters.placementStatus && filters.placementStatus !== 'ALL') {
        query.placementStatus = filters.placementStatus;
    }

    return query;
};

// @route   POST /api/campaigns/target-count
// @access  Private (admin | company)
const getTargetCount = asyncHandler(async (req, res) => {
    const { branch, minCgpa, placementStatus, jobId } = req.body;

    try {
        const query = await buildFiltersQuery(req, { branch, minCgpa, placementStatus, jobId });
        const profiles = await StudentProfile.find(query).populate({
            path: 'userId',
            match: { isActive: true }
        });

        const validProfiles = profiles.filter(p => p.userId);
        res.status(200).json({ success: true, count: validProfiles.length });
    } catch (err) {
        res.status(400);
        throw new Error(err.message);
    }
});

// @route   POST /api/campaigns/send
// @access  Private (admin | company)
const sendCampaign = asyncHandler(async (req, res) => {
    const { subject, content, branch, minCgpa, placementStatus, jobId } = req.body;

    if (!subject || !content) {
        res.status(400);
        throw new Error('Email subject and body content are required');
    }

    try {
        const query = await buildFiltersQuery(req, { branch, minCgpa, placementStatus, jobId });
        const profiles = await StudentProfile.find(query).populate({
            path: 'userId',
            match: { isActive: true }
        });

        const validProfiles = profiles.filter(p => p.userId);
        const recipients = validProfiles.map(p => ({
            email: p.userId.email,
            name: p.userId.name
        }));

        if (recipients.length === 0) {
            res.status(400);
            throw new Error('No candidates found matching the selected filters');
        }

        // Dispatch background email sender
        processEmailBroadcast({
            recipients,
            subject,
            content,
            senderName: req.user.name
        }).catch(err => {
            console.error('[Bulk Mail Broadcast Error]:', err.message);
        });

        // Save campaign record
        const campaign = await Campaign.create({
            subject,
            content,
            filters: {
                branch: branch || 'ALL',
                minCgpa: minCgpa || 0,
                placementStatus: placementStatus || 'ALL',
                jobId: jobId || null
            },
            sentCount: recipients.length,
            senderId: req.user._id
        });

        // Log campaign broadcast
        await logAuditActivity(req, 'CAMPAIGN_SEND', {
            campaignId: campaign._id,
            subject: campaign.subject,
            sentCount: recipients.length,
            filters: campaign.filters
        });

        res.status(201).json({
            success: true,
            message: `Email campaign queued successfully. Dispatching to ${recipients.length} matching students in the background.`,
            campaign
        });
    } catch (err) {
        res.status(400);
        throw new Error(err.message);
    }
});

// @route   GET /api/campaigns
// @access  Private (admin | company)
const getCampaigns = asyncHandler(async (req, res) => {
    const userRole = req.user.role;
    let query = {};

    if (userRole === 'company') {
        query.senderId = req.user._id;
    }

    const campaigns = await Campaign.find(query)
        .populate('senderId', 'name email role')
        .populate('filters.jobId', 'role companyName')
        .sort('-createdAt');

    res.status(200).json({ success: true, campaigns });
});

module.exports = {
    getTargetCount,
    sendCampaign,
    getCampaigns
};
