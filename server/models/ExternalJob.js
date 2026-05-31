const mongoose = require('mongoose');

const externalJobSchema = new mongoose.Schema(
    {
        source: {
            type:    String,
            enum:    ['remotive', 'adzuna', 'arbeitnow', 'remoteok'],
            default: 'remotive',
        },
        externalId: {
            type:     String,
            required: true,
        },
        title: {
            type:     String,
            required: true,
            trim:     true,
        },
        companyName: {
            type: String,
            trim: true,
            default: '',
        },
        companyLogo: {
            type:    String,
            default: '',
        },
        jobType: {
            type:    String,
            enum:    ['Full-Time', 'Internship', 'Part-Time', 'Contract', 'Remote'],
            default: 'Full-Time',
        },
        location: {
            type:    String,
            default: 'Remote',
        },
        salary: {
            type:    String,
            default: '',
        },
        description: {
            type:    String,
            default: '',
        },
        applyUrl: {
            type:     String,
            required: true,
        },
        tags: {
            type:    [String],
            default: [],
        },
        category: {
            type:    String,
            default: '',
        },
        publishedAt: {
            type: Date,
            default: Date.now,
        },
        isActive: {
            type:    Boolean,
            default: true,
        },
        fetchedAt: {
            type:    Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

// ─── Unique constraint: prevent duplicate external jobs ────
externalJobSchema.index({ externalId: 1, source: 1 }, { unique: true });

// ─── Fast queries ──────────────────────────────────────────
externalJobSchema.index({ isActive: 1, publishedAt: -1 });
externalJobSchema.index({ tags: 1 });

// ─── TTL: auto-delete after 7 days (will be re-fetched) ───
externalJobSchema.index({ fetchedAt: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model('ExternalJob', externalJobSchema);
