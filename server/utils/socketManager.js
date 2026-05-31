/**
 * Socket.io event emitter helpers
 * 
 * The `io` instance is attached to the Express app via app.set('io', io).
 * Access it in controllers with: const io = req.app.get('io');
 */

const EVENTS = {
    // Application pipeline events
    APPLICATION_STATUS_CHANGED: 'application:status_changed',
    NEW_APPLICATION:            'application:new',

    // Interview round events
    ROUND_UPDATED:              'application:round_updated',

    // Job events
    NEW_JOB_POSTED:             'job:new_posted',
    JOB_CLOSED:                 'job:closed',

    // Admin / TPO broadcast events
    TPO_ANNOUNCEMENT:           'admin:announcement',
    PLACEMENT_RESULT_DECLARED:  'admin:result_declared',

    // Chat events
    CHAT_RECEIVE_MESSAGE:       'chat:receive_message',
    CHAT_TYPING:                'chat:typing',

    // Notification badge events
    NEW_NOTIFICATION:           'notification:new',

    // Real-time stats (admin dashboard)
    STATS_UPDATED:              'admin:stats_updated',
};

/**
 * Emit event to a specific user's private room
 * @param {Server} io - Socket.io server instance
 * @param {string} userId - Target user's MongoDB ObjectId (string)
 * @param {string} event - Event name (use EVENTS constants)
 * @param {any} payload - Data to send
 */
const emitToUser = (io, userId, event, payload) => {
    io.to(userId.toString()).emit(event, {
        ...payload,
        timestamp: new Date().toISOString(),
    });
};

/**
 * Emit event to all connected admin users
 * @param {Server} io
 * @param {string} event
 * @param {any} payload
 */
const emitToAdmins = (io, event, payload) => {
    io.to('room:admins').emit(event, {
        ...payload,
        timestamp: new Date().toISOString(),
    });
};

/**
 * Broadcast to ALL connected users (e.g., new job posted)
 * @param {Server} io
 * @param {string} event
 * @param {any} payload
 */
const broadcast = (io, event, payload) => {
    io.emit(event, {
        ...payload,
        timestamp: new Date().toISOString(),
    });
};

/**
 * Emit application status change to the affected student and all admins
 */
const emitStatusChange = (io, studentId, applicationData) => {
    emitToUser(io, studentId, EVENTS.APPLICATION_STATUS_CHANGED, applicationData);
    emitToAdmins(io, EVENTS.STATS_UPDATED, { trigger: 'application_status_change' });
};

/**
 * Notify all connected users of a new job posting
 */
const emitNewJob = (io, jobData) => {
    broadcast(io, EVENTS.NEW_JOB_POSTED, { job: jobData });
};

module.exports = { EVENTS, emitToUser, emitToAdmins, broadcast, emitStatusChange, emitNewJob };
