const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');

// ─── Configure Cloudinary ─────────────────────────────────
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Check if Cloudinary is configured ───────────────────
const isCloudinaryConfigured = () =>
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
    process.env.CLOUDINARY_CLOUD_NAME !== 'root';

// ─── Safe Cloudinary Upload Helper ────────────────────────
const uploadToCloudinary = async (filePath, folder, resourceType = 'auto') => {
    if (!isCloudinaryConfigured()) {
        console.log('[Cloudinary] Skipping Cloudinary upload - not configured.');
        return null;
    }
    try {
        console.log(`[Cloudinary] Uploading ${filePath} to folder ${folder}...`);
        const result = await cloudinary.uploader.upload(filePath, {
            folder,
            resource_type: resourceType,
        });
        console.log('[Cloudinary] Upload successful:', result.secure_url);
        return {
            url: result.secure_url,
            publicId: result.public_id,
        };
    } catch (err) {
        console.error(`⚠️ [Cloudinary] Upload failed for ${filePath}:`, err.message || err);
        return null; // Return null so controller falls back to local storage URL
    }
};

// ─── Multer Disk Storages (Always use local disk storage as standard to avoid middleware crash) ───

const getResumeStorage = () => {
    if (!fs.existsSync('uploads/resumes/')) {
        fs.mkdirSync('uploads/resumes/', { recursive: true });
    }
    return multer.diskStorage({
        destination: (req, file, cb) => cb(null, 'uploads/resumes/'),
        filename:    (req, file, cb) =>
            cb(null, `${req.user._id}-resume-${Date.now()}${path.extname(file.originalname)}`),
    });
};

const getProfilePicStorage = () => {
    if (!fs.existsSync('uploads/profiles/')) {
        fs.mkdirSync('uploads/profiles/', { recursive: true });
    }
    return multer.diskStorage({
        destination: (req, file, cb) => cb(null, 'uploads/profiles/'),
        filename:    (req, file, cb) =>
            cb(null, `${req.user._id}-avatar-${Date.now()}${path.extname(file.originalname)}`),
    });
};

const getLogoStorage = () => {
    if (!fs.existsSync('uploads/logos/')) {
        fs.mkdirSync('uploads/logos/', { recursive: true });
    }
    return multer.diskStorage({
        destination: (req, file, cb) => cb(null, 'uploads/logos/'),
        filename:    (req, file, cb) =>
            cb(null, `${req.user._id}-logo-${Date.now()}${path.extname(file.originalname)}`),
    });
};

const getEventMediaStorage = () => {
    if (!fs.existsSync('uploads/events/')) {
        fs.mkdirSync('uploads/events/', { recursive: true });
    }
    return multer.diskStorage({
        destination: (req, file, cb) => cb(null, 'uploads/events/'),
        filename:    (req, file, cb) =>
            cb(null, `event-${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`),
    });
};

const getVerificationStorage = () => {
    if (!fs.existsSync('uploads/verifications/')) {
        fs.mkdirSync('uploads/verifications/', { recursive: true });
    }
    return multer.diskStorage({
        destination: (req, file, cb) => cb(null, 'uploads/verifications/'),
        filename:    (req, file, cb) =>
            cb(null, `${req.user._id}-verification-${Date.now()}${path.extname(file.originalname)}`),
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

const eventMediaFileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image, video, and audio files are allowed for event attachments'), false);
    }
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

const uploadEventMedia = multer({
    storage: getEventMediaStorage(),
    fileFilter: eventMediaFileFilter,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

const uploadVerificationDoc = multer({
    storage: getVerificationStorage(),
    fileFilter: verificationFileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

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

module.exports = {
    uploadResume,
    uploadProfilePic,
    uploadLogo,
    uploadExcel,
    uploadEventMedia,
    uploadVerificationDoc,
    deleteFromCloudinary,
    uploadToCloudinary,
    cloudinary,
};
