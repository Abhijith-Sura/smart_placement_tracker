const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
    {
        roomId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ChatRoom',
            required: true,
            index: true,
        },
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        content: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000,
        },
        readStatus: {
            type: Boolean,
            default: false,
        },
        // Group & 1-to-1 read receipts tracking (Seen By info)
        readBy: [
            {
                userId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                    required: true,
                },
                readAt: {
                    type: Date,
                    default: Date.now,
                }
            }
        ],
        // Interactive live polls support
        isPoll: {
            type: Boolean,
            default: false,
        },
        pollQuestion: {
            type: String,
            default: '',
        },
        pollOptions: [
            {
                optionText: {
                    type: String,
                    required: true,
                },
                votes: [
                    {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'User',
                    }
                ]
            }
        ]
    },
    { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);
