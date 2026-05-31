const asyncHandler = require('express-async-handler');
const InterviewSlot = require('../models/InterviewSlot');
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const { sendInterviewScheduleEmail } = require('../utils/sendEmail');
const { createNotification } = require('./notificationController');
const { emitToUser, emitToAdmins, EVENTS } = require('../utils/socketManager');
const { createGoogleCalendarEvent } = require('../utils/googleCalendar');
const { logAuditActivity } = require('../utils/auditHelper');

// @desc    Create multiple interview slots
// @route   POST /api/slots/job/:jobId
// @access  Private (admin | company)
const createInterviewSlots = asyncHandler(async (req, res) => {
    const { jobId } = req.params;
    const { slots } = req.body; // array of { dateTime, duration, roundName, meetingLink }

    if (!slots || !Array.isArray(slots) || slots.length === 0) {
        res.status(400);
        throw new Error('Please provide at least one slot');
    }

    const job = await Job.findById(jobId);
    if (!job) {
        res.status(404);
        throw new Error('Job not found');
    }

    // Insert slots
    const slotDocs = slots.map(slot => ({
        jobId,
        interviewerId: req.user._id,
        dateTime: new Date(slot.dateTime),
        duration: slot.duration || 45,
        status: 'available',
        roundName: slot.roundName || 'Technical Interview',
        meetingLink: slot.meetingLink || '',
    }));

    const createdSlots = await InterviewSlot.insertMany(slotDocs);

    res.status(201).json({
        success: true,
        message: `${createdSlots.length} interview slots created successfully`,
        slots: createdSlots,
    });
});

// @desc    Get all slots for a job (recruiter view)
// @route   GET /api/slots/job/:jobId
// @access  Private (admin | company)
const getJobSlots = asyncHandler(async (req, res) => {
    const { jobId } = req.params;

    const slots = await InterviewSlot.find({ jobId })
        .populate('bookedBy', 'name email avatar')
        .populate('interviewerId', 'name email')
        .sort('dateTime');

    res.status(200).json({
        success: true,
        total: slots.length,
        slots,
    });
});

// @desc    Get available slots for a student booking
// @route   GET /api/slots/application/:appId/available
// @access  Private (student)
const getAvailableSlots = asyncHandler(async (req, res) => {
    const { appId } = req.params;

    const application = await Application.findById(appId);
    if (!application) {
        res.status(404);
        throw new Error('Application not found');
    }

    // Check if the application belongs to the student
    if (application.studentId.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized to view slots for this application');
    }

    const slots = await InterviewSlot.find({
        jobId: application.jobId,
        status: 'available',
        dateTime: { $gt: new Date() }, // Future slots only
    })
        .populate('interviewerId', 'name email')
        .sort('dateTime');

    res.status(200).json({
        success: true,
        total: slots.length,
        slots,
    });
});

// @desc    Book an interview slot
// @route   POST /api/slots/booking/:slotId
// @access  Private (student)
const bookInterviewSlot = asyncHandler(async (req, res) => {
    const { slotId } = req.params;
    const { applicationId } = req.body;

    if (!applicationId) {
        res.status(400);
        throw new Error('applicationId is required');
    }

    const slot = await InterviewSlot.findById(slotId);
    if (!slot) {
        res.status(404);
        throw new Error('Interview slot not found');
    }

    if (slot.status !== 'available') {
        res.status(400);
        throw new Error('This interview slot is already booked');
    }

    const application = await Application.findById(applicationId)
        .populate('studentId', 'name email')
        .populate('jobId', 'companyName role');

    if (!application) {
        res.status(404);
        throw new Error('Application not found');
    }

    if (application.studentId._id.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized to book for this application');
    }

    // Book the slot
    slot.status = 'booked';
    slot.bookedBy = req.user._id;
    slot.applicationId = applicationId;

    const interviewer = await User.findById(slot.interviewerId);

    // Call Google Calendar Sync
    let googleMeetLink = '';
    if (interviewer && interviewer.email && application.studentId && application.studentId.email) {
        try {
            const calEvent = await createGoogleCalendarEvent({
                studentEmail: application.studentId.email,
                recruiterEmail: interviewer.email,
                dateTime: slot.dateTime,
                duration: slot.duration || 45,
                subject: `${slot.roundName}: ${application.jobId.companyName} (${application.jobId.role})`,
                description: `Interview scheduled on PlaceIQ for role: ${application.jobId.role}.`
            });

            if (calEvent && calEvent.googleMeetLink) {
                googleMeetLink = calEvent.googleMeetLink;
            }
        } catch (calErr) {
            console.error('[Google Calendar Integration Error]:', calErr);
        }
    }

    if (googleMeetLink) {
        slot.meetingLink = googleMeetLink;
    } else if (!slot.meetingLink) {
        // Fallback local meeting URL
        const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        slot.meetingLink = `${baseUrl}/meeting/${slot._id}`;
    }

    await slot.save();

    // Log slot booking activity
    await logAuditActivity(req, 'SLOT_BOOK', {
        slotId: slot._id,
        roundName: slot.roundName,
        jobId: application.jobId._id,
        companyName: application.jobId.companyName,
        role: application.jobId.role,
        studentId: application.studentId._id,
        studentName: application.studentId.name,
        meetingLink: slot.meetingLink
    });

    // Dispatch Slack Booking Notification
    if (interviewer && interviewer.slackWebhook) {
        const { sendInterviewBookingAlert } = require('../utils/slackWebhook');
        sendInterviewBookingAlert(
            interviewer.slackWebhook,
            slot,
            application.studentId,
            interviewer.name
        ).catch(err => {
            console.error('[Slack Interview Booking Alert Error]:', err.message);
        });
    }

    // Map round type based on slot name
    let roundType = 'technical';
    const nameLower = slot.roundName.toLowerCase();
    if (nameLower.includes('hr')) roundType = 'hr';
    else if (nameLower.includes('aptitude')) roundType = 'aptitude';
    else if (nameLower.includes('gd') || nameLower.includes('group')) roundType = 'group_discussion';
    else if (nameLower.includes('coding')) roundType = 'coding';

    // Create a new round on the application
    const newRound = {
        name: slot.roundName,
        type: roundType,
        status: 'scheduled',
        scheduledAt: slot.dateTime,
        venue: slot.meetingLink || 'Online',
        mode: slot.meetingLink ? 'online' : 'offline',
        conductedBy: interviewer ? interviewer.name : 'Recruiter',
    };

    const oldStatus = application.status;
    application.rounds.push(newRound);
    
    // Auto-advance application status to 'interview' if it was 'applied' or 'shortlisted'
    if (application.status === 'applied' || application.status === 'shortlisted') {
        application.status = 'interview';
    }
    
    await application.save();

    const roundIndex = application.rounds.length - 1;
    const round = application.rounds[roundIndex];

    // Send ICS notification email to student
    sendInterviewScheduleEmail(
        application.studentId,
        application.jobId,
        application,
        round
    ).catch(err => console.error('Error sending student invite email:', err));

    // Also send an invitation email to the interviewer (recruiter)
    if (interviewer && interviewer.email) {
        sendInterviewScheduleEmail(
            interviewer, // Send to interviewer, acts as user
            application.jobId,
            application,
            round
        ).catch(err => console.error('Error sending recruiter invite email:', err));
    }

    // Push socket events & notification
    const io = req.app.get('io');
    if (io) {
        emitToUser(io, application.studentId._id, EVENTS.ROUND_UPDATED, {
            applicationId: application._id,
            roundIndex,
            round,
            action: 'scheduled',
        });
        emitToAdmins(io, EVENTS.ROUND_UPDATED, {
            applicationId: application._id,
            roundIndex,
            round,
            action: 'scheduled',
        });
    }

    createNotification(
        application.studentId._id,
        'application_status',
        `Interview Scheduled: ${application.jobId.companyName}`,
        `Your ${slot.roundName} has been scheduled for ${slot.dateTime.toLocaleString('en-IN')}.`,
        {
            applicationId: application._id,
            jobId: application.jobId._id,
            companyName: application.jobId.companyName,
            role: application.jobId.role,
            roundName: slot.roundName,
        },
        io
    ).catch(() => {});

    res.status(200).json({
        success: true,
        message: 'Interview slot booked successfully',
        slot,
        application,
    });
});

const deleteInterviewSlot = asyncHandler(async (req, res) => {
    const { slotId } = req.params;

    const slot = await InterviewSlot.findById(slotId);
    if (!slot) {
        res.status(404);
        throw new Error('Interview slot not found');
    }

    if (slot.status === 'booked') {
        res.status(400);
        throw new Error('Cannot delete a slot that is already booked by a student.');
    }

    await slot.deleteOne();

    res.status(200).json({
        success: true,
        message: 'Interview slot deleted successfully',
    });
});

module.exports = {
    createInterviewSlots,
    getJobSlots,
    getAvailableSlots,
    bookInterviewSlot,
    deleteInterviewSlot,
};
