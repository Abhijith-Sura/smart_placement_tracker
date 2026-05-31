const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema(
    {
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            }
        ],
        lastMessage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Message',
        },
        // To enforce professional standards, chat rooms can be linked to a specific application context
        applicationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Application',
            default: null,
        },
        // WhatsApp-like Group Chat support
        isGroup: {
            type: Boolean,
            default: false,
        },
        groupName: {
            type: String,
            default: '',
        },
        groupAvatar: {
            type: String,
            default: '',
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        groupAdmins: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            }
        ],
        // Jitsi videoconferencing integration
        meetingLink: {
            type: String,
            default: '',
        },
        meetingActive: {
            type: Boolean,
            default: false,
        },
        // Group action/audit logs
        groupLogs: [
            {
                action: {
                    type: String,
                    required: true,
                },
                performedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                },
                timestamp: {
                    type: Date,
                    default: Date.now,
                },
            }
        ],
    },
    { timestamps: true }
);

// Ensure fast lookups for a user's chat rooms
chatRoomSchema.index({ participants: 1, updatedAt: -1 });

module.exports = mongoose.model('ChatRoom', chatRoomSchema);
