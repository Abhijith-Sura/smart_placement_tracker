const { z } = require('zod');
const { validate } = require('./authValidator');

const updateProfileSchema = z.object({
    rollNo: z.string().trim().optional(),
    branch: z
        .enum(['CSE', 'ECE', 'EEE', 'ME', 'CE', 'IT', 'AIDS', 'AIML', 'CSD', 'CSM', 'IOT', 'OTHER'])
        .optional(),
    year: z.number().min(1).max(5).optional(),
    CGPA: z.number().min(0).max(10).optional(),
    backlogs: z.number().min(0).optional(),
    skills: z.array(z.string().trim()).max(30, 'Cannot add more than 30 skills').optional(),
    phone: z.string().optional(),
    linkedin: z.string().url('Invalid LinkedIn URL').optional().or(z.literal('')),
    github: z.string().url('Invalid GitHub URL').optional().or(z.literal('')),
    about: z.string().max(500, 'About cannot exceed 500 characters').optional(),
});

const applyJobSchema = z.object({
    coverNote: z
        .string()
        .max(500, 'Cover note cannot exceed 500 characters')
        .optional()
        .default(''),
});

module.exports = { updateProfileSchema, applyJobSchema, validate };
