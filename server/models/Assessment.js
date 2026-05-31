const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    inputFormat: {
        type: String,
        default: ''
    },
    outputFormat: {
        type: String,
        default: ''
    },
    constraints: {
        type: String,
        default: ''
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    },
    points: {
        type: Number,
        default: 10
    },
    starterCode: [
        {
            language: {
                type: String,
                enum: ['javascript', 'python', 'java', 'cpp', 'c'],
                required: true
            },
            code: {
                type: String,
                required: true
            }
        }
    ],
    testCases: [
        {
            input: {
                type: String,
                default: ''
            },
            output: {
                type: String,
                required: true
            },
            isPrivate: {
                type: Boolean,
                default: false
            }
        }
    ]
});

const assessmentSchema = new mongoose.Schema(
    {
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        jobId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Job',
            required: true
        },
        title: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            required: true
        },
        duration: {
            type: Number, // in minutes
            default: 45
        },
        questions: [questionSchema]
    },
    {
        timestamps: true
    }
);

// Prevent multiple assessments for the same job posting (keep it 1-to-1)
assessmentSchema.index({ jobId: 1 }, { unique: true });

module.exports = mongoose.model('Assessment', assessmentSchema);
