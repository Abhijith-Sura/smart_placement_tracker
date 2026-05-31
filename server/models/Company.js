const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
        },
        companyName: {
            type: String,
            required: [true, 'Company name is required'],
            trim: true,
        },
        website: {
            type: String,
            default: '',
        },
        industry: {
            type: String,
            enum: [
                'IT & Software', 'Banking & Finance', 'Manufacturing',
                'Consulting', 'Healthcare', 'E-Commerce', 'Telecom',
                'FMCG', 'Education', 'Government', 'Other',
            ],
            default: 'IT & Software',
        },
        description: {
            type: String,
            maxlength: [1000, 'Description cannot exceed 1000 characters'],
            default: '',
        },
        logoUrl: {
            type: String,
            default: '',
        },
        logoPublicId: {
            type: String,
            default: '',
        },
        hrName: {
            type: String,
            default: '',
        },
        hrContact: {
            type: String,
            default: '',
        },
        address: {
            type: String,
            default: '',
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        totalHires: {
            type: Number,
            default: 0,
        },
        // Track visits for analytics
        lastActivity: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ─── Virtual: Jobs posted by this company ─────────────────
companySchema.virtual('jobs', {
    ref: 'Job',
    localField: 'userId',
    foreignField: 'postedBy',
});

module.exports = mongoose.model('Company', companySchema);
