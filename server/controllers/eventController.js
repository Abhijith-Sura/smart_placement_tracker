const asyncHandler = require('express-async-handler');
const Event = require('../models/Event');
const Job = require('../models/Job');
const StudentProfile = require('../models/StudentProfile');
const User = require('../models/User');
const { createNotification } = require('./notificationController');
const { sendEventEmail } = require('../utils/sendEmail');

// ─── @route  POST /api/events ────────────────────────────
// ─── @access Private (Admin, Company) ─────────────────────
const createEvent = asyncHandler(async (req, res) => {
    const {
        title,
        description,
        type,
        mode,
        location,
        dateTime,
        duration,
        companyName,
        relatedJob,
        imageUrl,
        videoUrl,
        audioUrl,
    } = req.body;

    if (!title || !type || !location || !dateTime) {
        res.status(400);
        throw new Error('Please provide title, type, location, and date/time');
    }

    let finalCompanyName = companyName;

    // Company user can only schedule events for their own company
    if (req.user.role === 'company') {
        finalCompanyName = req.user.companyName || req.user.name;
    } else if (!finalCompanyName) {
        res.status(400);
        throw new Error('Company name is required');
    }

    const event = await Event.create({
        title,
        description,
        type,
        mode,
        location,
        dateTime,
        duration,
        companyName: finalCompanyName,
        relatedJob: relatedJob || null,
        createdBy: req.user._id,
        imageUrl: imageUrl || '',
        videoUrl: videoUrl || '',
        audioUrl: audioUrl || '',
    });

    // Notify matching students in the background
    const io = req.app.get('io');
    
    // Find students to notify
    let recipientIds = [];

    if (relatedJob) {
        // 1. Fetch the related job details
        const job = await Job.findById(relatedJob);
        if (job) {
            // Find all student profiles matching the job criteria
            const matchingProfiles = await StudentProfile.find({
                CGPA: { $gte: job.criteria.minCGPA },
                backlogs: { $lte: job.criteria.maxBacklogs },
                $or: [
                    { branch: { $in: job.criteria.allowedBranches } },
                    { branch: 'ALL' },
                    { branch: { $exists: true } } // Default fallback
                ]
            }).select('userId');
            
            recipientIds = matchingProfiles.map(p => p.userId);
        }
    } else {
        // Broadcast notification to ALL students
        const allStudents = await User.find({ role: 'student' }).select('_id');
        recipientIds = allStudents.map(s => s._id);
    }

    // Deliver notifications asynchronously
    if (recipientIds.length > 0) {
        const formattedDate = new Date(dateTime).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
        const notifTitle = `📅 New Event: ${title}`;
        const notifMessage = `${finalCompanyName} has scheduled a ${type} (${mode}) on ${formattedDate} at ${location}.`;

        Promise.all(
            recipientIds.map((userId) =>
                createNotification(
                    userId,
                    'announcement',
                    notifTitle,
                    notifMessage,
                    { eventId: event._id, relatedJob },
                    io
                ).catch((err) => console.error(`Error notifying user ${userId}:`, err))
            )
        );

        // Fetch emails and dispatch emails asynchronously
        User.find({ _id: { $in: recipientIds } }).select('email').then(users => {
            users.forEach(u => {
                sendEventEmail(u.email, {
                    type,
                    title,
                    date: dateTime,
                    location,
                    description,
                }).catch(() => {});
            });
        }).catch(err => console.error('Failed to send event emails', err));
    }

    res.status(201).json({
        success: true,
        message: 'Event scheduled and broadcasted successfully',
        event,
    });
});

// ─── @route  GET /api/events ─────────────────────────────
// ─── @access Private (All Roles) ──────────────────────────
const getEvents = asyncHandler(async (req, res) => {
    let query = {};

    // Company user only sees their own events
    if (req.user.role === 'company') {
        const companyName = req.user.companyName || req.user.name;
        query = { companyName };
    }

    const events = await Event.find(query)
        .populate('relatedJob', 'role package location status')
        .sort({ dateTime: 1 }) // Order by upcoming events first
        .lean();

    // Map through events to add status labels and registration flags for students
    const enrichedEvents = events.map((event) => {
        const isPast = new Date(event.dateTime) < new Date();
        const computedStatus = event.status === 'Cancelled' 
            ? 'Cancelled' 
            : isPast 
                ? 'Completed' 
                : 'Scheduled';

        const isRegistered = event.registeredStudents?.some(
            (id) => id.toString() === req.user._id.toString()
        ) || false;

        return {
            ...event,
            status: computedStatus,
            isRegistered,
            registrationCount: event.registeredStudents?.length || 0,
        };
    });

    res.status(200).json({
        success: true,
        count: enrichedEvents.length,
        events: enrichedEvents,
    });
});

// ─── @route  GET /api/events/:id ──────────────────────────
// ─── @access Private (All Roles) ──────────────────────────
const getEventDetails = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id)
        .populate('relatedJob', 'role package location status description')
        .populate('registeredStudents', 'name email role');

    if (!event) {
        res.status(404);
        throw new Error('Event not found');
    }

    const isPast = new Date(event.dateTime) < new Date();
    const computedStatus = event.status === 'Cancelled' 
        ? 'Cancelled' 
        : isPast 
            ? 'Completed' 
            : 'Scheduled';

    const isRegistered = event.registeredStudents?.some(
        (student) => student._id.toString() === req.user._id.toString()
    ) || false;

    // Fetch matching student profiles if they are registered (for Admin/Company details)
    let registeredProfiles = [];
    if (req.user.role !== 'student' && event.registeredStudents.length > 0) {
        const studentIds = event.registeredStudents.map(s => s._id);
        registeredProfiles = await StudentProfile.find({ userId: { $in: studentIds } });
    }

    const enrichedRegistered = event.registeredStudents.map(student => {
        const profile = registeredProfiles.find(p => p.userId.toString() === student._id.toString());
        return {
            _id: student._id,
            name: student.name,
            email: student.email,
            rollNo: profile?.rollNo || '—',
            branch: profile?.branch || '—',
            CGPA: profile?.CGPA || '—',
            backlogs: profile?.backlogs || 0,
        };
    });

    res.status(200).json({
        success: true,
        event: {
            ...event.toObject(),
            status: computedStatus,
            isRegistered,
            registrationCount: event.registeredStudents.length,
            registeredStudents: enrichedRegistered,
        },
    });
});

// ─── @route  PUT /api/events/:id ──────────────────────────
// ─── @access Private (Admin, Company) ─────────────────────
const updateEvent = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);

    if (!event) {
        res.status(404);
        throw new Error('Event not found');
    }

    // Protection check
    if (req.user.role === 'company') {
        const companyName = req.user.companyName || req.user.name;
        if (event.companyName !== companyName && event.createdBy.toString() !== req.user._id.toString()) {
            res.status(403);
            throw new Error('Unauthorized to modify this event');
        }
    }

    const allowedFields = [
        'title',
        'description',
        'type',
        'mode',
        'location',
        'dateTime',
        'duration',
        'status',
        'relatedJob',
        'imageUrl',
        'videoUrl',
        'audioUrl',
    ];

    allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
            event[field] = req.body[field];
        }
    });

    await event.save();

    res.status(200).json({
        success: true,
        message: 'Event updated successfully',
        event,
    });
});

// ─── @route  DELETE /api/events/:id ───────────────────────
// ─── @access Private (Admin, Company) ─────────────────────
const deleteEvent = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);

    if (!event) {
        res.status(404);
        throw new Error('Event not found');
    }

    // Protection check
    if (req.user.role === 'company') {
        const companyName = req.user.companyName || req.user.name;
        if (event.companyName !== companyName && event.createdBy.toString() !== req.user._id.toString()) {
            res.status(403);
            throw new Error('Unauthorized to delete this event');
        }
    }

    await event.deleteOne();

    res.status(200).json({
        success: true,
        message: 'Event deleted successfully',
    });
});

// ─── @route  POST /api/events/:id/rsvp ────────────────────
// ─── @access Private (Student) ────────────────────────────
const rsvpToEvent = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);

    if (!event) {
        res.status(404);
        throw new Error('Event not found');
    }

    if (event.status === 'Cancelled') {
        res.status(400);
        throw new Error('Cannot RSVP to a cancelled event');
    }

    if (new Date(event.dateTime) < new Date()) {
        res.status(400);
        throw new Error('Cannot RSVP to a past event');
    }

    // Add student to registration list if not already there
    const alreadyRegistered = event.registeredStudents.some(
        (id) => id.toString() === req.user._id.toString()
    );

    if (alreadyRegistered) {
        return res.status(200).json({
            success: true,
            message: 'Already RSVP\'d to this event',
        });
    }

    event.registeredStudents.push(req.user._id);
    await event.save();

    res.status(200).json({
        success: true,
        message: 'Successfully RSVP\'d for the event',
        isRegistered: true,
    });
});

// ─── @route  DELETE /api/events/:id/rsvp ──────────────────
// ─── @access Private (Student) ────────────────────────────
const cancelRsvpToEvent = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);

    if (!event) {
        res.status(404);
        throw new Error('Event not found');
    }

    event.registeredStudents = event.registeredStudents.filter(
        (id) => id.toString() !== req.user._id.toString()
    );

    await event.save();

    res.status(200).json({
        success: true,
        message: 'RSVP cancelled successfully',
        isRegistered: false,
    });
});

// ─── @route  POST /api/events/upload-media ────────────────
// ─── @access Private (Admin, Company) ─────────────────────
const uploadMedia = asyncHandler(async (req, res) => {
    if (!req.file) {
        res.status(400);
        throw new Error('Please upload a file');
    }
    
    const fileUrl = req.file.path || req.file.secure_url;
    const cleanUrl = fileUrl.startsWith('http') 
        ? fileUrl 
        : `/uploads/events/${req.file.filename}`;

    res.status(200).json({
        success: true,
        message: 'File uploaded successfully',
        url: cleanUrl,
        mimetype: req.file.mimetype,
        filename: req.file.filename,
    });
});

module.exports = {
    createEvent,
    getEvents,
    getEventDetails,
    updateEvent,
    deleteEvent,
    rsvpToEvent,
    cancelRsvpToEvent,
    uploadMedia,
};
