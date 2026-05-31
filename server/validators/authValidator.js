const { z } = require('zod');

const registerSchema = z.object({
    name: z
        .string({ required_error: 'Name is required' })
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name cannot exceed 100 characters')
        .trim(),
    email: z
        .string({ required_error: 'Email is required' })
        .email('Please enter a valid email')
        .toLowerCase()
        .trim(),
    password: z
        .string({ required_error: 'Password is required' })
        .min(6, 'Password must be at least 6 characters')
        .max(100, 'Password is too long'),
    role: z
        .enum(['student', 'company', 'admin', 'alumni'], {
            errorMap: () => ({ message: 'Role must be student, company, admin, or alumni' }),
        })
        .default('student'),
    // Optional role-specific fields
    rollNo: z.string().optional(),
    branch: z
        .enum(['CSE', 'ECE', 'EEE', 'ME', 'CE', 'IT', 'AIDS', 'AIML', 'CSD', 'CSM', 'IOT', 'OTHER'])
        .optional(),
    companyName: z.string().optional(),
    industry: z.string().optional(),
    graduationYear: z.preprocess(
        (val) => (val === '' || val === undefined ? undefined : Number(val)),
        z.number().int().min(1900).max(2100).optional()
    ),
    linkedinUrl: z.string().optional(),
});

const loginSchema = z.object({
    email: z
        .string({ required_error: 'Email is required' })
        .email('Please enter a valid email'),
    password: z
        .string({ required_error: 'Password is required' })
        .min(1, 'Password is required'),
});

// ─── Middleware-style validator factory ───────────────────
const validate = (schema) => (req, res, next) => {
    try {
        req.body = schema.parse(req.body);
        next();
    } catch (err) {
        const errors = err.errors?.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
        }));
        res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors,
        });
    }
};

module.exports = { registerSchema, loginSchema, validate };
