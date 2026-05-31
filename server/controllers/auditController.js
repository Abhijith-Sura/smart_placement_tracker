const asyncHandler = require('express-async-handler');
const AuditLog = require('../models/AuditLog');

// @desc    Get all audit logs (paginated, with filters)
// @route   GET /api/audit
// @access  Private (admin)
const getAuditLogs = asyncHandler(async (req, res) => {
    const { action, search, startDate, endDate, page = 1, limit = 50 } = req.query;

    const query = {};

    // 1. Filter by specific action
    if (action && action !== 'all') {
        query.action = action;
    }

    // 2. Search by actor name, email, or IP address
    if (search) {
        query.$or = [
            { actorName: { $regex: search, $options: 'i' } },
            { actorEmail: { $regex: search, $options: 'i' } },
            { ipAddress: { $regex: search, $options: 'i' } },
        ];
    }

    // 3. Date range filter
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
            query.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query.createdAt.$lte = end;
        }
    }

    // Pagination calculations
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('actorId', 'name email role');

    // Get list of unique action types for filter dropdown
    const actionTypes = await AuditLog.distinct('action');

    res.status(200).json({
        success: true,
        count: logs.length,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        actionTypes,
        logs,
    });
});

module.exports = {
    getAuditLogs,
};
