const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema(
    {
        subject: {
            type: String,
            required: [true, 'Campaign subject is required'],
            trim: true
        },
        content: {
            type: String,
            required: [true, 'Campaign body content is required']
        },
        filters: {
            branch: {
                type: String,
                default: 'ALL'
            },
            minCgpa: {
                type: Number,
                default: 0
            },
            placementStatus: {
                type: String,
                enum: ['ALL', 'not_placed', 'placed'],
                default: 'ALL'
            },
            jobId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Job',
                default: null
            }
        },
        sentCount: {
            type: Number,
            default: 0
        },
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Campaign', campaignSchema);
