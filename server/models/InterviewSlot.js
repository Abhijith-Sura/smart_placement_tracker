const mongoose = require('mongoose');

const interviewSlotSchema = new mongoose.Schema(
    {
        jobId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Job',
            required: true,
        },
        interviewerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        dateTime: {
            type: Date,
            required: true,
        },
        duration: {
            type: Number, // in minutes
            default: 45,
        },
        status: {
            type: String,
            enum: ['available', 'booked'],
            default: 'available',
        },
        bookedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', // Student
        },
        applicationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Application',
        },
        roundName: {
            type: String,
            default: 'Technical Interview',
        },
        meetingLink: {
            type: String,
            default: '',
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('InterviewSlot', interviewSlotSchema);
