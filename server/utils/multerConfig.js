const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');

// ─── Configure Cloudinary ─────────────────────────────────
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Check if Cloudinary is configured ───────────────────
const isCloudinaryConfigured = () =>
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name';

// ─── Resume Storage (Cloudinary or Local) ────────────────
const getResumeStorage = () => {
    if (isCloudinaryConfigured()) {
        return new CloudinaryStorage({
            cloudinary,
            params: {
                folder:         'smart_placement/resumes',
                allowed_formats: ['pdf', 'doc', 'docx'],
                resource_type:  'raw', // Cloudinary uses 'raw' for non-image files
                transformation: [],
            },
        });
    }
    // Local fallback
    return multer.diskStorage({
        destination: (req, file, cb) => cb(null, 'uploads/resumes/'),
        filename:    (req, file, cb) =>
            cb(null, `${req.user._id}-resume-${Date.now()}${path.extname(file.originalname)}`),
    });
};

// ─── Profile Picture Storage ──────────────────────────────
const getProfilePicStorage = () => {
    if (isCloudinaryConfigured()) {
        return new CloudinaryStorage({
            cloudinary,
            params: {
                folder:         'smart_placement/profile_pics',
                allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
                transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
            },
        });
    }
    return multer.diskStorage({
        destination: (req, file, cb) => cb(null, 'uploads/profiles/'),
        filename:    (req, file, cb) =>
            cb(null, `${req.user._id}-avatar-${Date.now()}${path.extname(file.originalname)}`),
    });
};

// ─── Company Logo Storage ─────────────────────────────────
const getLogoStorage = () => {
    if (isCloudinaryConfigured()) {
        return new CloudinaryStorage({
            cloudinary,
            params: {
                folder:         'smart_placement/logos',
                allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'svg'],
                transformation: [{ width: 200, height: 200, crop: 'pad', background: 'transparent' }],
            },
        });
    }
    return multer.diskStorage({
        destination: (req, file, cb) => cb(null, 'uploads/logos/'),
        filename:    (req, file, cb) =>
            cb(null, `${req.user._id}-logo-${Date.now()}${path.extname(file.originalname)}`),
    });
};

// ─── File Filters ──────────────────────────────────────────
const resumeFileFilter = (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Only PDF and Word documents are allowed for resumes'), false);
    }
};

const imageFileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'), false);
    }
};

// ─── Multer Upload Instances ──────────────────────────────
const uploadResume = multer({
    storage: getResumeStorage(),
    fileFilter: resumeFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

const uploadProfilePic = multer({
    storage: getProfilePicStorage(),
    fileFilter: imageFileFilter,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});

const uploadLogo = multer({
    storage: getLogoStorage(),
    fileFilter: imageFileFilter,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});

// ─── Bulk Upload (Excel — memory storage) ────────────────
const uploadExcel = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (['.xlsx', '.xls', '.csv'].includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only Excel or CSV files are allowed'), false);
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ─── Cloudinary Delete Helper ─────────────────────────────
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
    if (!isCloudinaryConfigured() || !publicId) return;
    try {
        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (err) {
        console.error(`⚠️  Cloudinary delete failed for ${publicId}:`, err.message);
    }
};

// ─── Event Media Storage (Cloudinary or Local) ─────────────
const getEventMediaStorage = () => {
    if (isCloudinaryConfigured()) {
        return new CloudinaryStorage({
            cloudinary,
            params: {
                folder:         'smart_placement/event_media',
                resource_type:  'auto',
            },
        });
    }
    
    // Ensure local folder exists
    const fs = require('fs');
    if (!fs.existsSync('uploads/events/')) {
        fs.mkdirSync('uploads/events/', { recursive: true });
    }
    
    return multer.diskStorage({
        destination: (req, file, cb) => cb(null, 'uploads/events/'),
        filename:    (req, file, cb) =>
            cb(null, `event-${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`),
    });
};

const eventMediaFileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image, video, and audio files are allowed for event attachments'), false);
    }
};

const uploadEventMedia = multer({
    storage: getEventMediaStorage(),
    fileFilter: eventMediaFileFilter,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// ─── Verification Document Storage (Cloudinary or Local) ─────────────
const getVerificationStorage = () => {
    if (isCloudinaryConfigured()) {
        return new CloudinaryStorage({
            cloudinary,
            params: {
                folder:         'smart_placement/verifications',
                allowed_formats: ['pdf', 'jpg', 'jpeg', 'png', 'webp'],
                resource_type:  'auto',
            },
        });
    }
    
    // Ensure local folder exists
    const fs = require('fs');
    if (!fs.existsSync('uploads/verifications/')) {
        fs.mkdirSync('uploads/verifications/', { recursive: true });
    }
    
    return multer.diskStorage({
        destination: (req, file, cb) => cb(null, 'uploads/verifications/'),
        filename:    (req, file, cb) =>
            cb(null, `${req.user._id}-verification-${Date.now()}${path.extname(file.originalname)}`),
    });
};

const verificationFileFilter = (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Only PDF and image files (JPG, PNG, WEBP) are allowed for verification documents'), false);
    }
};

const uploadVerificationDoc = multer({
    storage: getVerificationStorage(),
    fileFilter: verificationFileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

module.exports = {
    uploadResume,
    uploadProfilePic,
    uploadLogo,
    uploadExcel,
    uploadEventMedia,
    uploadVerificationDoc,
    deleteFromCloudinary,
    cloudinary,
};
