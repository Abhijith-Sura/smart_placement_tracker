const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
    {
        actorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        actorName: {
            type: String,
            required: true,
            default: 'System',
        },
        actorEmail: {
            type: String,
            required: true,
            default: 'system@placeiq.com',
        },
        actorRole: {
            type: String,
            enum: ['admin', 'company', 'student', 'system'],
            default: 'system',
        },
        action: {
            type: String,
            required: true,
        },
        ipAddress: {
            type: String,
            default: '',
        },
        userAgent: {
            type: String,
            default: '',
        },
        details: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false }, // only track creation
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes for fast querying, filtering, and sorting
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actorEmail: 1 });
auditLogSchema.index({ action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
