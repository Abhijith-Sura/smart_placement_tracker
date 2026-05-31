const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
    {
        jobId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Job',
            required: true,
        },
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        // ATS Pipeline Status
        status: {
            type: String,
            enum: ['applied', 'shortlisted', 'interview', 'selected', 'rejected'],
            default: 'applied',
        },
        // Status change history for timeline view
        statusHistory: [
            {
                status: {
                    type: String,
                    enum: ['applied', 'shortlisted', 'interview', 'selected', 'rejected'],
                },
                changedAt: {
                    type: Date,
                    default: Date.now,
                },
                changedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                },
                note: {
                    type: String,
                    default: '',
                },
            },
        ],
        // Resume snapshot at time of application
        resumeUrl: {
            type: String,
            default: '',
        },
        coverNote: {
            type: String,
            maxlength: [500, 'Cover note cannot exceed 500 characters'],
            default: '',
        },
        // TPO internal notes (not visible to student)
        tpoNotes: {
            type: String,
            default: '',
        },
        // Interview scheduling
        interviewDate: {
            type: Date,
        },
        interviewMode: {
            type: String,
            enum: ['online', 'offline', 'hybrid'],
        },
        interviewLink: {
            type: String,
            default: '',
        },
        // Offer details (set when selected)
        offerLetter: {
            type: String,
            default: '',
        },
        offeredPackage: {
            type: Number, // In LPA
        },
        // Kanban board position (for ordering within columns)
        kanbanOrder: {
            type: Number,
            default: 0,
        },
        aiMatchScore: {
            type: Number,
            default: 0,
        },
        aiMatchFeedback: {
            type: String,
            default: '',
        },

        // ─── Interview Rounds ──────────────────────────────
        rounds: [
            {
                name: { type: String, required: true },
                type: { type: String, enum: ['aptitude', 'technical', 'hr', 'group_discussion', 'coding', 'final'], default: 'technical' },
                status: { type: String, enum: ['pending', 'scheduled', 'pass', 'fail', 'hold'], default: 'pending' },
                scheduledAt: { type: Date },
                conductedAt: { type: Date },
                venue: { type: String, default: '' },
                mode: { type: String, enum: ['online', 'offline'], default: 'online' },
                feedback: { type: String, default: '' },
                score: { type: Number },
                conductedBy: { type: String, default: '' },
                reminderSent: { type: Boolean, default: false },
            },
        ],
        currentRound: { type: Number, default: 0 },

    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ─── Compound index: Prevent duplicate applications ───────
applicationSchema.index({ jobId: 1, studentId: 1 }, { unique: true });

// ─── Index for fast kanban queries ───────────────────────
applicationSchema.index({ jobId: 1, status: 1, kanbanOrder: 1 });

// ─── Auto-push to statusHistory on status change ─────────
applicationSchema.pre('save', function (next) {
    if (this.isModified('status')) {
        this.statusHistory.push({
            status: this.status,
            changedAt: new Date(),
        });
    }
    next();
});

module.exports = mongoose.model('Application', applicationSchema);
