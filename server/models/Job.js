const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
    {
        postedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        companyName: {
            type: String,
            required: [true, 'Company name is required'],
            trim: true,
        },
        companyLogo: {
            type: String,
            default: '',
        },
        role: {
            type: String,
            required: [true, 'Job role is required'],
            trim: true,
        },
        jobType: {
            type: String,
            enum: ['Full-Time', 'Internship', 'Part-Time', 'Contract'],
            default: 'Full-Time',
        },
        package: {
            type: Number, // In LPA
            required: [true, 'Package is required'],
            min: 0,
        },
        location: {
            type: String,
            required: [true, 'Location is required'],
            trim: true,
        },
        description: {
            type: String,
            required: [true, 'Job description is required'],
        },
        responsibilities: {
            type: [String],
            default: [],
        },
        requirements: {
            type: [String],
            default: [],
        },
        criteria: {
            minCGPA: {
                type: Number,
                default: 0,
                min: 0,
                max: 10,
            },
            allowedBranches: {
                type: [String],
                enum: ['CSE', 'ECE', 'EEE', 'ME', 'CE', 'IT', 'AIDS', 'AIML', 'CSD', 'CSM', 'IOT', 'OTHER', 'ALL'],
                default: ['ALL'],
            },
            maxBacklogs: {
                type: Number,
                default: 0,
                min: 0,
            },
            allowedYears: {
                type: [Number],
                default: [4],
            },
        },
        deadline: {
            type: Date,
            required: [true, 'Application deadline is required'],
        },
        driveDate: {
            type: Date,
        },
        status: {
            type: String,
            enum: ['open', 'closed', 'draft'],
            default: 'open',
        },
        totalApplicants: {
            type: Number,
            default: 0,
        },
        selectedCount: {
            type: Number,
            default: 0,
        },
        tags: {
            type: [String],
            default: [],
        },
        isHighlighted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ─── Virtual: Is deadline passed ──────────────────────────
jobSchema.virtual('isExpired').get(function () {
    return this.deadline < new Date();
});

// ─── Virtual: Days until deadline ────────────────────────
jobSchema.virtual('daysLeft').get(function () {
    const diff = this.deadline - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

// ─── Indexes ──────────────────────────────────────────────
jobSchema.index({ status: 1, deadline: 1, 'criteria.minCGPA': 1 });
jobSchema.index({ companyName: 'text', role: 'text', description: 'text' });

module.exports = mongoose.model('Job', jobSchema);
