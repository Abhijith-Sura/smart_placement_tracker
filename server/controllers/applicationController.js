const asyncHandler = require('express-async-handler');
const Application = require('../models/Application');
const Job = require('../models/Job');
const StudentProfile = require('../models/StudentProfile');
const User = require('../models/User');
const { emitStatusChange, emitToUser, emitToAdmins, EVENTS } = require('../utils/socketManager');
const { sendStatusUpdateEmail, sendInterviewScheduleEmail } = require('../utils/sendEmail');
const { createNotification } = require('./notificationController');
const Groq = require('groq-sdk');

const analyzeFitmentLocal = (studentProfile, studentUser, job) => {
    const jobSkillsSet = new Set();
    
    (job.tags || []).forEach(t => jobSkillsSet.add(t.toLowerCase().trim()));
    
    const commonKeywords = [
        'react', 'node', 'express', 'mongodb', 'javascript', 'python', 'java', 'c++', 'c#', 'ruby', 'php',
        'docker', 'kubernetes', 'aws', 'gcp', 'azure', 'git', 'sql', 'nosql', 'postgres', 'html', 'css',
        'typescript', 'angular', 'vue', 'next.js', 'django', 'flask', 'spring boot', 'machine learning',
        'data science', 'ai', 'devops', 'testing', 'cypress', 'jest', 'rust', 'go', 'kotlin', 'swift'
    ];
    
    (job.requirements || []).forEach(req => {
        const text = req.toLowerCase();
        commonKeywords.forEach(kw => {
            if (text.includes(kw)) {
                jobSkillsSet.add(kw);
            }
        });
    });
    
    const descText = (job.description || '').toLowerCase();
    commonKeywords.forEach(kw => {
        if (descText.includes(kw)) {
            jobSkillsSet.add(kw);
        }
    });

    const targetSkills = Array.from(jobSkillsSet);
    const studentSkills = (studentProfile.skills || []).map(s => s.toLowerCase().trim());
    
    let matches = [];
    let missing = [];
    
    if (targetSkills.length > 0) {
        targetSkills.forEach(skill => {
            if (studentSkills.includes(skill)) {
                matches.push(skill);
            } else {
                missing.push(skill);
            }
        });
    } else {
        matches = studentSkills.slice(0, 3);
    }
    
    let matchRatio = targetSkills.length > 0 ? (matches.length / targetSkills.length) : 0.8;
    let score = matchRatio * 70;
    
    const minCgpa = job.criteria?.minCGPA || 6.0;
    const studentCgpa = studentProfile.CGPA || 7.0;
    if (studentCgpa >= minCgpa) {
        const diff = studentCgpa - minCgpa;
        score += 20 + (diff * 5);
    } else {
        score += (studentCgpa / minCgpa) * 15;
    }
    
    if (studentProfile.backlogs > 0) {
        score -= studentProfile.backlogs * 10;
    }
    
    score = Math.min(Math.max(Math.round(score), 35), 98);
    
    const strengths = [];
    if (studentCgpa >= minCgpa + 1.0) strengths.push(`Strong academic record (CGPA: ${studentCgpa}) exceeding minimum threshold of ${minCgpa}`);
    if (matches.length > 0) strengths.push(`Demonstrated skills matching job requirements: ${matches.join(', ')}`);
    if (studentProfile.projects?.length > 0) strengths.push(`Hands-on experience with ${studentProfile.projects.length} academic/personal projects`);

    const weaknesses = [];
    if (missing.length > 0) weaknesses.push(`Lacks exposure/keywords for some target skills: ${missing.slice(0, 3).join(', ')}`);
    if (studentProfile.backlogs > 0) weaknesses.push(`Contains ${studentProfile.backlogs} active backlog(s), which could affect onboarding eligibility`);
    if (studentSkills.length < 4) weaknesses.push(`Profile lists very few tech skills — expand skills list for better ranking`);

    const suggestions = [];
    if (missing.length > 0) suggestions.push(`Acquire certifications or build projects in ${missing.slice(0, 2).join(' or ')}.`);
    suggestions.push(`Quantify results in project summaries to improve ATS scoring.`);

    const matchFeedback = JSON.stringify({
        atsScore: score,
        overallFeedback: `Candidate is a ${score >= 75 ? 'strong' : score >= 55 ? 'moderate' : 'low'} fit for the role. Matches ${matches.length} key skill requirements. CGPA is ${studentCgpa} vs job threshold ${minCgpa}.`,
        strengths: strengths.length > 0 ? strengths : ['Basic profile criteria met'],
        weaknesses: weaknesses.length > 0 ? weaknesses : ['No major gaps identified'],
        missingSkills: missing,
        keywordMatches: matches,
        suggestions
    });
    
    return { score, feedback: matchFeedback };
};

const calculateFitmentMatch = async (studentProfile, studentUser, job) => {
    if (!process.env.GROQ_API_KEY) {
        console.log('[AI Sourcing] GROQ_API_KEY not configured. Running Jaccard-similarity local matcher...');
        return analyzeFitmentLocal(studentProfile, studentUser, job);
    }

    try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const prompt = `Evaluate candidate fitment for this job.
Job Role: ${job.role}
Job Description: ${job.description}
Job Requirements: ${(job.requirements || []).join(', ')}
Job Tags: ${(job.tags || []).join(', ')}
Min CGPA: ${job.criteria?.minCGPA || 0}
Max Backlogs: ${job.criteria?.maxBacklogs || 0}

Candidate Profile:
Name: ${studentUser.name}
CGPA: ${studentProfile.CGPA}
Backlogs: ${studentProfile.backlogs}
Skills: ${(studentProfile.skills || []).join(', ')}
Projects: ${JSON.stringify((studentProfile.projects || []).map(p => ({ title: p.title, desc: p.description, tech: p.technologies })))}
Experience: ${JSON.stringify((studentProfile.experiences || []).map(e => ({ role: e.role, desc: e.description })))}

Evaluate and return a STRICT JSON object (no formatting, no markdown, no wrapping in code blocks) with this schema:
{
  "atsScore": <number 0-100 representing fit percentage>,
  "overallFeedback": "<2 sentence fit summary>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "missingSkills": ["<skill 1>", "<skill 2>"],
  "keywordMatches": ["<matched skill 1>", "<matched skill 2>"],
  "suggestions": ["<suggestion 1>"]
}`;

        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.1,
            response_format: { type: 'json_object' },
        });

        const rawText = completion.choices[0]?.message?.content || '{}';
        const parsed = JSON.parse(rawText);
        
        const score = parsed.atsScore || 60;
        return {
            score,
            feedback: JSON.stringify(parsed)
        };
    } catch (err) {
        console.error('[AI Sourcing] Groq match failed:', err.message);
        console.log('Running Jaccard-similarity local matcher as fallback...');
        return analyzeFitmentLocal(studentProfile, studentUser, job);
    }
};

// ─── @route  POST /api/applications/:jobId/apply ─────────
// ─── @access Private (student) ────────────────────────────
const applyForJob = asyncHandler(async (req, res) => {
    const { jobId } = req.params;
    const { coverNote } = req.body;

    const job = await Job.findById(jobId);
    if (!job) {
        res.status(404);
        throw new Error('Job not found');
    }

    if (job.status !== 'open') {
        res.status(400);
        throw new Error('This job is no longer accepting applications');
    }

    if (new Date(job.deadline) < new Date()) {
        res.status(400);
        throw new Error('The application deadline for this job has passed');
    }

    const profile = await StudentProfile.findOne({ userId: req.user._id });
    if (!profile) {
        res.status(400);
        throw new Error('Please complete your profile before applying');
    }

    if (!profile.resumeUrl) {
        res.status(400);
        throw new Error('Please upload your resume before applying');
    }

    const cgpaOk    = profile.CGPA >= job.criteria.minCGPA;
    const backlogOk = profile.backlogs <= job.criteria.maxBacklogs;
    const branchOk  =
        job.criteria.allowedBranches.includes('ALL') ||
        job.criteria.allowedBranches.includes(profile.branch);

    if (!cgpaOk || !backlogOk || !branchOk) {
        res.status(403);
        throw new Error('You do not meet the eligibility criteria for this job');
    }

    const existing = await Application.findOne({ jobId, studentId: req.user._id });
    if (existing) {
        res.status(409);
        throw new Error('You have already applied for this job');
    }

    // Compute AI Match Score
    let fitment = { score: 0, feedback: '' };
    try {
        fitment = await calculateFitmentMatch(profile, req.user, job);
    } catch (err) {
        console.error('[AI Match Error]:', err.message);
    }

    const application = await Application.create({
        jobId,
        studentId:   req.user._id,
        coverNote:   coverNote || '',
        resumeUrl:   profile.resumeUrl,
        aiMatchScore: fitment.score,
        aiMatchFeedback: fitment.feedback,
        statusHistory: [{ status: 'applied', changedAt: new Date() }],
    });

    await Job.findByIdAndUpdate(jobId, { $inc: { totalApplicants: 1 } });

    const io = req.app.get('io');
    createNotification(
        req.user._id,
        'application_status',
        'Application Submitted',
        `Your application for ${job.role} at ${job.companyName} has been submitted successfully.`,
        { applicationId: application._id, jobId: job._id, companyName: job.companyName, role: job.role },
        io
    ).catch(() => {});

    res.status(201).json({
        success:     true,
        message:     'Application submitted successfully',
        application,
    });
});

// ─── @route  GET /api/applications/my ────────────────────
// ─── @access Private (student) ────────────────────────────
const getMyApplications = asyncHandler(async (req, res) => {
    const applications = await Application.find({ studentId: req.user._id })
        .populate('jobId', 'companyName role package location deadline status companyLogo')
        .sort('-createdAt');

    res.status(200).json({
        success:      true,
        total:        applications.length,
        applications,
    });
});

// ─── @route  GET /api/applications/job/:jobId ────────────
// ─── @access Private (admin | company) ───────────────────
const getJobApplications = asyncHandler(async (req, res) => {
    const { jobId } = req.params;
    const { status, search } = req.query;

    const filter = { jobId };
    if (status) filter.status = status;

    let query = Application.find(filter)
        .populate({
            path:   'studentId',
            select: 'name email avatar',
            populate: {
                path:   'studentProfile',
                select: 'rollNo branch CGPA backlogs skills resumeUrl phone profilePicUrl verificationStatus',
            },
        })
        .sort('kanbanOrder');

    const applications = await query;

    // Optional name/email search
    const filtered = search
        ? applications.filter((a) => {
            const student = a.studentId;
            const term    = search.toLowerCase();
            return (
                student?.name?.toLowerCase().includes(term) ||
                student?.email?.toLowerCase().includes(term) ||
                student?.studentProfile?.rollNo?.toLowerCase().includes(term)
            );
          })
        : applications;

    res.status(200).json({
        success:      true,
        total:        filtered.length,
        applications: filtered,
    });
});

// ─── @route  GET /api/applications/kanban/:jobId ─────────
// ─── @access Private (admin | company) ───────────────────
const getKanbanBoard = asyncHandler(async (req, res) => {
    const { jobId } = req.params;

    const applications = await Application.find({ jobId })
        .populate({
            path:   'studentId',
            select: 'name email avatar',
            populate: {
                path:   'studentProfile',
                select: 'rollNo branch CGPA backlogs resumeUrl profilePicUrl phone verificationStatus',
            },
        })
        .sort('kanbanOrder');

    // Group by status for Kanban columns
    const columns = {
        applied:     [],
        shortlisted: [],
        interview:   [],
        selected:    [],
        rejected:    [],
    };

    applications.forEach((app) => {
        if (columns[app.status]) {
            columns[app.status].push(app);
        }
    });

    res.status(200).json({ success: true, columns });
});

// ─── @route  PATCH /api/applications/:id/status ──────────
// ─── @access Private (admin | company) ───────────────────
const updateApplicationStatus = asyncHandler(async (req, res) => {
    const { status, tpoNotes, interviewDate, interviewMode, interviewLink, offeredPackage } = req.body;

    const validStatuses = ['applied', 'shortlisted', 'interview', 'selected', 'rejected'];
    if (!validStatuses.includes(status)) {
        res.status(400);
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const application = await Application.findById(req.params.id)
        .populate('studentId', 'name email')
        .populate('jobId', 'companyName role');

    if (!application) {
        res.status(404);
        throw new Error('Application not found');
    }

    const oldStatus = application.status;

    // Update fields
    application.status = status;
    if (tpoNotes    !== undefined) application.tpoNotes      = tpoNotes;
    if (interviewDate)             application.interviewDate  = interviewDate;
    if (interviewMode)             application.interviewMode  = interviewMode;
    if (interviewLink)             application.interviewLink  = interviewLink;
    if (offeredPackage)            application.offeredPackage = offeredPackage;

    // Add changedBy to latest history entry
    application.statusHistory[application.statusHistory.length - 1].changedBy = req.user._id;

    await application.save();

    // When student is moved to 'shortlisted', auto-assign any existing coding assessment
    if (status === 'shortlisted') {
        const Assessment = require('../models/Assessment');
        const assessment = await Assessment.findOne({ jobId: application.jobId._id || application.jobId });

        if (assessment) {
            const hasCodingRound = application.rounds.some(r => r.type === 'coding');
            if (!hasCodingRound) {
                const codingRound = {
                    name: assessment.title || 'Coding Assessment',
                    type: 'coding',
                    status: 'scheduled',
                    scheduledAt: new Date(),
                    venue: 'Online Assessment Platform',
                    mode: 'online',
                    conductedBy: 'System Evaluator',
                };
                application.rounds.push(codingRound);
                await application.save();

                // Send assessment invitation email to student
                sendInterviewScheduleEmail(
                    application.studentId,
                    application.jobId,
                    application,
                    application.rounds[application.rounds.length - 1]
                ).catch(err => console.error('[Shortlist Auto-Assessment Email Error]:', err.message));
            }
        }
    }

    // If student is selected → update StudentProfile placement status
    if (status === 'selected') {
        await StudentProfile.findOneAndUpdate(
            { userId: application.studentId._id },
            {
                placementStatus: 'placed',
                placedAt:        new Date(),
                placedCompany:   application.jobId.companyName,
                placedRole:      application.jobId.role,
                placedPackage:   offeredPackage || application.jobId.package,
            }
        );

        // Update job selected count
        await Job.findByIdAndUpdate(application.jobId._id, { $inc: { selectedCount: 1 } });

        // Broadcast Placement Result Globally
        const io = req.app.get('io');
        if (io) {
            io.emit(EVENTS.TPO_ANNOUNCEMENT, {
                title: '🎉 Placement Alert!',
                message: `${application.studentId.name} has been selected as ${application.jobId.role} at ${application.jobId.companyName}! 🚀`,
                postedBy: 'System',
                timestamp: new Date().toISOString(),
            });
        }
    }

    // Real-time notification to student
    const io = req.app.get('io');
    if (io) {
        emitStatusChange(io, application.studentId._id, {
            applicationId: application._id,
            jobId:         application.jobId._id,
            companyName:   application.jobId.companyName,
            role:          application.jobId.role,
            oldStatus,
            newStatus:     status,
        });
    }

    // Persist notification in DB + real-time push
    createNotification(
        application.studentId._id,
        'application_status',
        `Application Update: ${application.jobId.companyName}`,
        `Your application for ${application.jobId.role} at ${application.jobId.companyName} has been ${status}.`,
        {
            applicationId: application._id,
            jobId:         application.jobId._id,
            companyName:   application.jobId.companyName,
            role:          application.jobId.role,
            oldStatus,
            newStatus:     status,
        },
        io
    ).catch(() => {});

    // Send email notification (non-blocking)
    sendStatusUpdateEmail(
        application.studentId,
        application.jobId,
        status
    ).catch(() => {});

    // If interview scheduled, send interview email
    if (status === 'interview' && interviewDate) {
        sendInterviewScheduleEmail(
            application.studentId,
            application.jobId,
            application
        ).catch(() => {});
    }

    res.status(200).json({
        success:     true,
        message:     `Application status updated to '${status}'`,
        application,
    });
});

// ─── @route  PATCH /api/applications/kanban/reorder ──────
// ─── @access Private (admin | company) ───────────────────
const reorderKanban = asyncHandler(async (req, res) => {
    // Body: { updates: [{ id: '...', kanbanOrder: 0 }, ...] }
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
        res.status(400);
        throw new Error('No reorder updates provided');
    }

    const bulkOps = updates.map(({ id, kanbanOrder }) => ({
        updateOne: {
            filter: { _id: id },
            update: { $set: { kanbanOrder } },
        },
    }));

    await Application.bulkWrite(bulkOps);

    res.status(200).json({ success: true, message: 'Kanban order updated' });
});

// ─── @route  DELETE /api/applications/:id/withdraw ───────
// ─── @access Private (student) ────────────────────────────
const withdrawApplication = asyncHandler(async (req, res) => {
    const application = await Application.findOne({
        _id:       req.params.id,
        studentId: req.user._id,
    });

    if (!application) {
        res.status(404);
        throw new Error('Application not found');
    }

    if (application.status !== 'applied') {
        res.status(400);
        throw new Error('Cannot withdraw an application that is already under review');
    }

    await application.deleteOne();
    await Job.findByIdAndUpdate(application.jobId, { $inc: { totalApplicants: -1 } });

    res.status(200).json({ success: true, message: 'Application withdrawn' });
});

// ─── @route  GET /api/applications/:id/rounds ───────────
// ─── @access Private (admin | company | student-own) ───────
const getApplicationRounds = asyncHandler(async (req, res) => {
    const application = await Application.findById(req.params.id)
        .populate('jobId',     'companyName role package')
        .populate('studentId', 'name email');

    if (!application) {
        res.status(404);
        throw new Error('Application not found');
    }

    // Students can only view their own application rounds
    if (
        req.user.role === 'student' &&
        application.studentId._id.toString() !== req.user._id.toString()
    ) {
        res.status(403);
        throw new Error('Not authorized to view this application');
    }

    res.status(200).json({
        success:     true,
        application,
        rounds:      application.rounds,
        currentRound: application.currentRound,
    });
});

// ─── @route  POST /api/applications/:id/rounds ────────────
// ─── @access Private (admin | company) ─────────────────
const addRound = asyncHandler(async (req, res) => {
    const { name, type, scheduledAt, venue, mode, conductedBy } = req.body;

    if (!name) {
        res.status(400);
        throw new Error('Round name is required');
    }

    const application = await Application.findById(req.params.id)
        .populate('studentId', 'name email')
        .populate({
            path: 'jobId',
            populate: { path: 'postedBy', select: 'name email' }
        });

    if (!application) {
        res.status(404);
        throw new Error('Application not found');
    }

    const newRound = {
        name,
        type:        type        || 'technical',
        status:      scheduledAt ? 'scheduled' : 'pending',
        scheduledAt: scheduledAt || undefined,
        venue:       venue       || '',
        mode:        mode        || 'online',
        conductedBy: conductedBy || '',
    };

    application.rounds.push(newRound);
    await application.save();

    const roundIndex = application.rounds.length - 1;
    const round      = application.rounds[roundIndex];

    // Send ICS interview email if scheduled immediately
    if (round.status === 'scheduled') {
        sendInterviewScheduleEmail(
            application.studentId,
            application.jobId,
            application,
            round
        ).catch((err) => console.error('[Email Student Error]:', err));

        // Also notify the company recruiter
        if (application.jobId && application.jobId.postedBy && application.jobId.postedBy.email) {
            sendInterviewScheduleEmail(
                application.jobId.postedBy,
                application.jobId,
                application,
                round
            ).catch((err) => console.error('[Email Recruiter Error]:', err));
        }
    }

    // Real-time notification to student and admins
    const io = req.app.get('io');
    if (io) {
        emitToUser(io, application.studentId._id, EVENTS.ROUND_UPDATED, {
            applicationId: application._id,
            roundIndex,
            round,
            action: 'added',
        });
        emitToAdmins(io, EVENTS.ROUND_UPDATED, {
            applicationId: application._id,
            roundIndex,
            round,
            action: 'added',
        });
    }

    res.status(201).json({
        success:     true,
        message:     `Round '${name}' added successfully`,
        application,
        roundIndex,
        round,
    });
});

// ─── @route  PATCH /api/applications/:id/rounds/:roundIndex ──
// ─── @access Private (admin | company) ─────────────────
const updateRound = asyncHandler(async (req, res) => {
    const { roundIndex } = req.params;
    const idx = parseInt(roundIndex, 10);

    const { status, feedback, score, conductedAt, conductedBy, name, type, mode, scheduledAt, venue } = req.body;

    const application = await Application.findById(req.params.id)
        .populate('studentId', 'name email')
        .populate({
            path: 'jobId',
            populate: { path: 'postedBy', select: 'name email' }
        });

    if (!application) {
        res.status(404);
        throw new Error('Application not found');
    }

    if (idx < 0 || idx >= application.rounds.length) {
        res.status(400);
        throw new Error(`Round index ${idx} is out of bounds (application has ${application.rounds.length} round(s))`);
    }

    // Merge updates into the round subdocument
    const round = application.rounds[idx];
    const wasPending = round.status !== 'scheduled';
    
    if (status      !== undefined) round.status      = status;
    if (feedback    !== undefined) round.feedback    = feedback;
    if (score       !== undefined) round.score       = score;
    if (conductedAt !== undefined) round.conductedAt = conductedAt;
    if (conductedBy !== undefined) round.conductedBy = conductedBy;
    if (name        !== undefined) round.name        = name;
    if (type        !== undefined) round.type        = type;
    if (mode        !== undefined) round.mode        = mode;
    if (scheduledAt !== undefined) round.scheduledAt = scheduledAt;
    if (venue       !== undefined) round.venue       = venue;

    // Send ICS email if it just got scheduled
    if (wasPending && round.status === 'scheduled') {
        sendInterviewScheduleEmail(
            application.studentId,
            application.jobId,
            application,
            round
        ).catch((err) => console.error('[Email Student Error]:', err));

        // Also notify the company recruiter
        if (application.jobId && application.jobId.postedBy && application.jobId.postedBy.email) {
            sendInterviewScheduleEmail(
                application.jobId.postedBy,
                application.jobId,
                application,
                round
            ).catch((err) => console.error('[Email Recruiter Error]:', err));
        }
    }

    // Advance currentRound pointer to the next round (if there is one)
    if (status === 'pass' && idx >= application.currentRound) {
        application.currentRound = Math.min(idx + 1, application.rounds.length - 1);
    }

    // Only auto-reject for coding assessment rounds (automated evaluation).
    // For all other round types (technical, HR, GD, etc.) the TPO/recruiter
    // moves the Kanban card manually via the pipeline board.
    if (status === 'fail' && round.type === 'coding') {
        application.status = 'rejected';
        application.statusHistory.push({
            status:    'rejected',
            changedAt: new Date(),
            changedBy: req.user._id,
            note:      `Failed at coding assessment: ${round.name}`,
        });
    }

    await application.save();

    // Real-time notification to student and admins
    const io = req.app.get('io');
    if (io) {
        emitToUser(io, application.studentId._id, EVENTS.ROUND_UPDATED, {
            applicationId: application._id,
            roundIndex:    idx,
            round:         application.rounds[idx],
            action:        'updated',
        });
        emitToAdmins(io, EVENTS.ROUND_UPDATED, {
            applicationId: application._id,
            roundIndex:    idx,
            round:         application.rounds[idx],
            action:        'updated',
        });
    }

    res.status(200).json({
        success:     true,
        message:     `Round '${round.name}' updated`,
        application,
        roundIndex:  idx,
        round:       application.rounds[idx],
    });
});

// ─── @route  GET /api/applications/job/:jobId/export ─────
// ─── @access Private (admin | company) ───────────────────
const exportJobApplications = async (req, res) => {
  try {
    const { jobId } = req.params;
    const applications = await Application.find({ jobId })
      .populate({
        path: 'studentId',
        select: 'name email',
        populate: {
          path: 'studentProfile',
          select: 'rollNo branch CGPA backlogs phone',
        },
      })
      .lean();

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Applications');

    sheet.columns = [
      { header: 'Name',       key: 'name',    width: 25 },
      { header: 'Email',      key: 'email',   width: 30 },
      { header: 'Roll No',    key: 'rollNo',  width: 15 },
      { header: 'Branch',     key: 'branch',  width: 20 },
      { header: 'CGPA',       key: 'cgpa',    width: 10 },
      { header: 'Backlogs',   key: 'backlogs',width: 10 },
      { header: 'Status',     key: 'status',  width: 15 },
      { header: 'Applied On', key: 'date',    width: 18 },
    ];

    // Style header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFf97316' } };

    applications.forEach(app => {
      const profile = app.studentId?.studentProfile;
      sheet.addRow({
        name:     app.studentId?.name    || '',
        email:    app.studentId?.email   || '',
        rollNo:   profile?.rollNo        || '',
        branch:   profile?.branch        || '',
        cgpa:     profile?.CGPA          || '',
        backlogs: profile?.backlogs ?? '',
        status:   app.status,
        date:     new Date(app.createdAt).toLocaleDateString('en-IN'),
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="pipeline_${jobId}_export.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Export error:', err);
    if (!res.headersSent) res.status(500).json({ message: err.message });
  }
};

const backfillMatchScores = asyncHandler(async (req, res) => {
    const applications = await Application.find()
        .populate('studentId')
        .populate('jobId');

    let count = 0;
    for (const app of applications) {
        if (!app.studentId || !app.jobId) continue;
        if (!app.aiMatchScore || app.aiMatchScore === 0 || req.body.overwrite === true) {
            const studentProfile = await StudentProfile.findOne({ userId: app.studentId._id });
            if (studentProfile) {
                const fitment = await calculateFitmentMatch(studentProfile, app.studentId, app.jobId);
                app.aiMatchScore = fitment.score;
                app.aiMatchFeedback = fitment.feedback;
                await app.save();
                count++;
            }
        }
    }

    res.status(200).json({
        success: true,
        message: `Successfully computed match scores for ${count} applications.`,
    });
});

const deleteRound = asyncHandler(async (req, res) => {
    const { roundIndex } = req.params;
    const idx = parseInt(roundIndex, 10);

    const application = await Application.findById(req.params.id);

    if (!application) {
        res.status(404);
        throw new Error('Application not found');
    }

    if (idx < 0 || idx >= application.rounds.length) {
        res.status(400);
        throw new Error(`Round index ${idx} is out of bounds (application has ${application.rounds.length} round(s))`);
    }

    const removedRound = application.rounds[idx];
    application.rounds.splice(idx, 1);

    if (application.currentRound >= application.rounds.length) {
        application.currentRound = Math.max(0, application.rounds.length - 1);
    }

    await application.save();

    const io = req.app.get('io');
    if (io) {
        emitToUser(io, application.studentId, EVENTS.ROUND_UPDATED, {
            applicationId: application._id,
            roundIndex:    idx,
            action:        'deleted',
        });
        emitToAdmins(io, EVENTS.ROUND_UPDATED, {
            applicationId: application._id,
            roundIndex:    idx,
            action:        'deleted',
        });
    }

    res.status(200).json({
        success: true,
        message: `Round '${removedRound.name}' deleted successfully`,
        application,
    });
});

module.exports = {
    applyForJob,
    getMyApplications,
    getJobApplications,
    getKanbanBoard,
    updateApplicationStatus,
    reorderKanban,
    withdrawApplication,
    getApplicationRounds,
    addRound,
    updateRound,
    deleteRound,
    exportJobApplications,
    backfillMatchScores,
};
