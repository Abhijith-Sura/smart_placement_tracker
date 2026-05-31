const mongoose = require('mongoose');

const studentProfileSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
        },
        rollNo: {
            type: String,
            trim: true,
            default: '',
        },
        branch: {
            type: String,
            enum: [
                'CSE', 'ECE', 'EEE', 'ME', 'CE', 'IT',
                'AIDS', 'AIML', 'CSD', 'CSM', 'IOT', 'OTHER',
            ],
            default: 'CSE',
        },
        year: {
            type: Number,
            min: 1,
            max: 5,
            default: 4,
        },
        batchYear: {
            type: Number,
            default: null,
        },
        tenthPercent: {
            type: Number,
            default: 0,
        },
        twelfthPercent: {
            type: Number,
            default: 0,
        },
        CGPA: {
            type: Number,
            min: 0,
            max: 10,
            default: 0,
        },
        backlogs: {
            type: Number,
            default: 0,
            min: 0,
        },
        skills: {
            type: [String],
            default: [],
        },
        resumeUrl: {
            type: String,
            default: '',
        },
        resumePublicId: {
            type: String,  // Cloudinary public_id for deletion
            default: '',
        },
        profilePicUrl: {
            type: String,
            default: '',
        },
        profilePicPublicId: {
            type: String,
            default: '',
        },
        phone: {
            type: String,
            default: '',
        },
        linkedin: {
            type: String,
            default: '',
        },
        github: {
            type: String,
            default: '',
        },
        about: {
            type: String,
            maxlength: [500, 'About section cannot exceed 500 characters'],
            default: '',
        },
        placementStatus: {
            type: String,
            enum: ['not_placed', 'placed'],
            default: 'not_placed',
        },
        placedAt: {
            type: Date,
        },
        placedCompany: {
            type: String,
            default: '',
        },
        placedRole: {
            type: String,
            default: '',
        },
        placedPackage: {
            type: Number,  // In LPA
            default: 0,
        },
        interests: {
            type: [String],
            default: [],
        },
        projects: [
            {
                title: String,
                description: String,
                link: String,
                technologies: [String],
            },
        ],
        internships: [
            {
                company: String,
                role: String,
                duration: String,
                description: String,
            },
        ],
        experiences: [
            {
                company: String,
                role: String,
                duration: String,
                description: String,
            },
        ],
        certificates: [
            {
                name: String,
                issuer: String,
                date: String,
                link: String,
            },
        ],
        achievements: {
            type: [String],
            default: [],
        },
        atsAnalysis: {
            atsScore: { type: Number, default: 0 },
            overallFeedback: { type: String, default: '' },
            strengths: { type: [String], default: [] },
            weaknesses: { type: [String], default: [] },
            missingSkills: { type: [String], default: [] },
            keywordMatches: { type: [String], default: [] },
            suggestions: [
                {
                    priority: String,
                    action: String
                }
            ],
            sectionScores: {
                contact: { type: Number, default: 0 },
                summary: { type: Number, default: 0 },
                experience: { type: Number, default: 0 },
                education: { type: Number, default: 0 },
                skills: { type: Number, default: 0 },
                projects: { type: Number, default: 0 },
                formatting: { type: Number, default: 0 }
            },
            estimatedLevel: { type: String, default: '' },
            topSkillsFound: { type: [String], default: [] },
            analyzedAt: { type: Date, default: null }
        },
        isProfileComplete: {
            type: Boolean,
            default: false,
        },
        verificationStatus: {
            type: String,
            enum: ['unverified', 'pending', 'verified', 'rejected'],
            default: 'unverified',
        },
        verificationDocuments: [
            {
                name: { type: String, required: true },
                fileUrl: { type: String, required: true },
                filePublicId: { type: String, default: '' },
                uploadedAt: { type: Date, default: Date.now },
            }
        ],
        verificationFeedback: {
            type: String,
            default: '',
        },
        verifiedAt: {
            type: Date,
        },
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ─── Virtual: Check profile completeness ─────────────────
studentProfileSchema.virtual('completionPercentage').get(function () {
    const fields = ['rollNo', 'branch', 'CGPA', 'resumeUrl', 'phone', 'about'];
    const filled = fields.filter((f) => this[f] && this[f] !== '' && this[f] !== 0);
    
    let score = filled.length;
    let total = fields.length + 4; // base fields + 4 optional sections
    
    if (this.skills && this.skills.length > 0) score += 1;
    if (this.projects && this.projects.length > 0) score += 1;
    if ((this.internships && this.internships.length > 0) || (this.experiences && this.experiences.length > 0)) score += 1;
    if (this.certificates && this.certificates.length > 0) score += 1;

    return Math.round((score / total) * 100);
});

// ─── Pre-save: Auto-set isProfileComplete ─────────────────
studentProfileSchema.pre('save', function (next) {
    this.isProfileComplete =
        this.rollNo !== '' &&
        this.CGPA > 0 &&
        this.resumeUrl !== '' &&
        this.skills.length > 0;
    next();
});

// ─── Index for fast aggregation queries ──────────────────
studentProfileSchema.index({ CGPA: 1, branch: 1, backlogs: 1, placementStatus: 1 });

module.exports = mongoose.model('StudentProfile', studentProfileSchema);
