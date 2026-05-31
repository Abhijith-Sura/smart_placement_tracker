const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Event title is required'],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        type: {
            type: String,
            enum: ['PPT', 'Aptitude Test', 'Technical Interview', 'HR Interview', 'Placement Drive', 'Guest Lecture', 'Other'],
            required: [true, 'Event type is required'],
        },
        mode: {
            type: String,
            enum: ['Physical', 'Virtual'],
            default: 'Physical',
        },
        location: {
            type: String,
            required: [true, 'Event location or link is required'],
            trim: true,
        },
        dateTime: {
            type: Date,
            required: [true, 'Event date and time is required'],
        },
        duration: {
            type: Number, // In minutes
            default: 60,
            min: [5, 'Duration must be at least 5 minutes'],
        },
        companyName: {
            type: String,
            required: [true, 'Company name is required'],
            trim: true,
        },
        relatedJob: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Job',
            default: null,
        },
        registeredStudents: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            }
        ],
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        status: {
            type: String,
            enum: ['Scheduled', 'Completed', 'Cancelled'],
            default: 'Scheduled',
        },
        imageUrl: {
            type: String,
            default: '',
        },
        videoUrl: {
            type: String,
            default: '',
        },
        audioUrl: {
            type: String,
            default: '',
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for fast querying of event feeds
eventSchema.index({ dateTime: 1, status: 1 });
eventSchema.index({ type: 1 });
eventSchema.index({ createdBy: 1 });
eventSchema.index({ relatedJob: 1 });

module.exports = mongoose.model('Event', eventSchema);
