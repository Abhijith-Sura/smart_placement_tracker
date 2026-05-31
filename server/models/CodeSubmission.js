const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
    questionId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    code: {
        type: String,
        required: true
    },
    language: {
        type: String,
        enum: ['javascript', 'python', 'java', 'cpp', 'c'],
        required: true
    },
    passedCount: {
        type: Number,
        default: 0
    },
    totalCount: {
        type: Number,
        default: 0
    },
    score: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['accepted', 'wrong_answer', 'runtime_error', 'time_limit_exceeded', 'compile_error'],
        default: 'compile_error'
    },
    feedback: {
        type: String,
        default: ''
    }
});

const codeSubmissionSchema = new mongoose.Schema(
    {
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        assessmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Assessment',
            required: true
        },
        applicationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Application',
            required: true
        },
        roundIdx: {
            type: Number,
            required: true
        },
        answers: [answerSchema],
        totalScore: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            enum: ['started', 'submitted'],
            default: 'started'
        },
        submittedAt: {
            type: Date
        }
    },
    {
        timestamps: true
    }
);

// Prevent multiple submissions for the same student-assessment-application-round
codeSubmissionSchema.index({ studentId: 1, assessmentId: 1, applicationId: 1, roundIdx: 1 }, { unique: true });

module.exports = mongoose.model('CodeSubmission', codeSubmissionSchema);
