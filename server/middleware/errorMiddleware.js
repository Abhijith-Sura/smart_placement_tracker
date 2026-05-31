/**
 * Global error handler middleware.
 * Must be placed LAST in the middleware chain in server.js.
 */
const errorHandler = (err, req, res, next) => {
    let statusCode = res.statusCode !== 200 ? res.statusCode : 500;
    let message    = err.message || 'Internal Server Error';
    let errors     = null;

    // ─── Mongoose: Bad ObjectId ───────────────────────────
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
        statusCode = 404;
        message    = `Resource not found — invalid ID format: ${err.value}`;
    }

    // ─── Mongoose: Duplicate key (e.g., duplicate email) ──
    if (err.code === 11000) {
        statusCode = 409;
        const field = Object.keys(err.keyValue || {})[0] || 'field';
        const value = err.keyValue?.[field];
        message = `Duplicate value: '${value}' already exists for field '${field}'`;
    }

    // ─── Mongoose: Validation errors ─────────────────────
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message    = 'Validation failed';
        errors     = Object.values(err.errors).map((e) => ({
            field:   e.path,
            message: e.message,
        }));
    }

    // ─── JWT errors ───────────────────────────────────────
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message    = 'Invalid token — please log in again';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message    = 'Token expired — please log in again';
    }

    // ─── Multer errors ────────────────────────────────────
    if (err.code === 'LIMIT_FILE_SIZE') {
        statusCode = 413;
        message    = 'File too large — please upload a smaller file';
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        statusCode = 400;
        message    = 'Unexpected file field in upload';
    }

    // ─── Zod validation (from validate() middleware) ──────
    if (err.name === 'ZodError') {
        statusCode = 400;
        message    = 'Validation failed';
        errors     = err.errors?.map((e) => ({
            field:   e.path.join('.'),
            message: e.message,
        }));
    }

    // ─── Log in development ───────────────────────────────
    if (process.env.NODE_ENV === 'development') {
        console.error(`❌ [${statusCode}] ${message}`);
        if (err.stack) console.error(err.stack);
    }

    res.status(statusCode).json({
        success: false,
        message,
        ...(errors && { errors }),
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

module.exports = errorHandler;
