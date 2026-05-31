const mongoose = require('mongoose');

const referralListingSchema = new mongoose.Schema(
    {
        alumniId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        companyName: {
            type: String,
            required: [true, 'Company name is required'],
            trim: true,
        },
        role: {
            type: String,
            required: [true, 'Job role is required'],
            trim: true,
        },
        location: {
            type: String,
            required: [true, 'Location is required'],
            trim: true,
            default: 'Remote',
        },
        package: {
            type: String, // e.g. "12 LPA" or "Competitive"
            trim: true,
        },
        requirements: {
            type: String,
            required: [true, 'Job requirements/description are required'],
            trim: true,
        },
        jobLink: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
            enum: ['open', 'closed'],
            default: 'open',
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
referralListingSchema.index({ alumniId: 1 });
referralListingSchema.index({ companyName: 1 });
referralListingSchema.index({ status: 1 });

module.exports = mongoose.model('ReferralListing', referralListingSchema);
