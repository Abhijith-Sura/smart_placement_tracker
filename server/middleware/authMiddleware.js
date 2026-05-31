const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// ─── Protect: Authenticate JWT (header OR cookie) ─────────
const protect = asyncHandler(async (req, res, next) => {
    let token;

    // 1. Check Authorization header (Bearer token)
    if (req.headers.authorization?.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    // 2. Check HTTP-only cookie
    else if (req.cookies?.token) {
        token = req.cookies.token;
    }

    if (!token) {
        res.status(401);
        throw new Error('Not authorized — no token provided');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            res.status(401);
            throw new Error('Not authorized — user not found');
        }

        if (!req.user.isActive) {
            res.status(403);
            throw new Error('Your account has been deactivated. Contact the admin.');
        }

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            res.status(401);
            throw new Error('Not authorized — invalid token');
        }
        if (error.name === 'TokenExpiredError') {
            res.status(401);
            throw new Error('Not authorized — token expired, please log in again');
        }
        throw error;
    }
});

// ─── Authorize: Role-Based Access Control (RBAC) ──────────
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401);
            throw new Error('Not authorized');
        }
        if (!roles.includes(req.user.role)) {
            res.status(403);
            throw new Error(
                `Access denied — role '${req.user.role}' is not authorized to access this resource`
            );
        }
        next();
    };
};

// ─── Optional Auth: Attach user if token present, no error if not ──
const optionalAuth = asyncHandler(async (req, res, next) => {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
        token = req.cookies.token;
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
        } catch {
            // Silently ignore invalid tokens in optional auth
        }
    }
    next();
});

module.exports = { protect, authorize, optionalAuth };