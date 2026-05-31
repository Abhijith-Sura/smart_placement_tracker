const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
    {
        userId: {
            type:     mongoose.Schema.Types.ObjectId,
            ref:      'User',
            required: true,
        },
        type: {
            type: String,
            enum: [
                'application_status',
                'new_job',
                'interview_scheduled',
                'result_declared',
                'announcement',
                'round_update',
            ],
            required: true,
        },
        title: {
            type:     String,
            required: [true, 'Notification title is required'],
            trim:     true,
        },
        message: {
            type:     String,
            required: [true, 'Notification message is required'],
            trim:     true,
        },
        isRead: {
            type:    Boolean,
            default: false,
        },
        readAt: {
            type: Date,
        },
        // Flexible metadata — store jobId, applicationId, status, etc.
        meta: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

// ─── Index: fast unread-count + paginated feed queries ────
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

// ─── TTL Index: auto-delete after 90 days ─────────────────
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('Notification', notificationSchema);
