const AuditLog = require('../models/AuditLog');

/**
 * Helper to log critical actions in the application.
 * Logs are saved in the database in a separate async operation.
 * Prevents throwing errors if logging itself fails, preserving the main request flow.
 * 
 * @param {Object} req - Express request object (optional, defaults to system values)
 * @param {string} action - Action code (e.g. 'JOB_CREATE', 'STUDENT_VERIFY')
 * @param {Object} details - Additional metadata related to the action
 */
const logAuditActivity = async (req, action, details = {}) => {
    try {
        const logData = {
            action,
            details,
        };

        if (req) {
            // Extract actor from authenticated user details
            if (req.user) {
                logData.actorId = req.user._id;
                logData.actorName = req.user.name || 'Unknown';
                logData.actorEmail = req.user.email || 'unknown@placeiq.com';
                logData.actorRole = req.user.role || 'system';
            } else {
                logData.actorId = null;
                logData.actorName = 'System';
                logData.actorEmail = 'system@placeiq.com';
                logData.actorRole = 'system';
            }

            // Extract client connection metadata
            logData.ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || '';
            logData.userAgent = req.headers ? req.headers['user-agent'] : '';
        } else {
            // Fallback for system operations
            logData.actorId = null;
            logData.actorName = 'System';
            logData.actorEmail = 'system@placeiq.com';
            logData.actorRole = 'system';
            logData.ipAddress = '127.0.0.1';
            logData.userAgent = 'Internal System Scheduler';
        }

        // Create log record
        await AuditLog.create(logData);
        console.log(`[AuditLog] logged: "${action}" by ${logData.actorEmail}`);
    } catch (err) {
        console.error('[AuditLog Error]: Failed to create audit log entry:', err.message);
    }
};

module.exports = {
    logAuditActivity,
};
