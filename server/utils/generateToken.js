const jwt = require('jsonwebtoken');

/**
 * Generate a signed JWT for a user
 * @param {string} userId - MongoDB ObjectId as string
 * @param {string} role - User role (admin | student | company)
 * @returns {string} Signed JWT token
 */
const generateToken = (userId, role) => {
    return jwt.sign(
        { id: userId, role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

/**
 * Set JWT as HTTP-only cookie on the response
 * @param {Response} res - Express response object
 * @param {string} token - JWT token string
 */
const setTokenCookie = (res, token) => {
    const cookieExpireDays = parseInt(process.env.JWT_COOKIE_EXPIRE || '7', 10);
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: cookieExpireDays * 24 * 60 * 60 * 1000,
    });
};

module.exports = { generateToken, setTokenCookie };
