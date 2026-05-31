const mongoose = require('mongoose');

const referralApplicationSchema = new mongoose.Schema(
    {
        referralJobId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ReferralListing',
            required: true,
        },
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        resumeUrl: {
            type: String,
            required: [true, 'Resume is required'],
        },
        coverNote: {
            type: String,
            maxlength: [1000, 'Cover note cannot exceed 1000 characters'],
            trim: true,
        },
        status: {
            type: String,
            enum: ['pending', 'referred', 'rejected'],
            default: 'pending',
        },
        feedback: {
            type: String,
            trim: true,
            default: '',
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
referralApplicationSchema.index({ referralJobId: 1 });
referralApplicationSchema.index({ studentId: 1 });
referralApplicationSchema.index({ referralJobId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('ReferralApplication', referralApplicationSchema);
