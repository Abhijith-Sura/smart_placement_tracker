const { z } = require('zod');
const { validate } = require('./authValidator');

const jobSchema = z.object({
    companyName: z
        .string({ required_error: 'Company name is required' })
        .min(2, 'Company name must be at least 2 characters')
        .trim(),
    role: z
        .string({ required_error: 'Job role is required' })
        .min(2, 'Role must be at least 2 characters')
        .trim(),
    jobType: z
        .enum(['Full-Time', 'Internship', 'Part-Time', 'Contract'])
        .default('Full-Time'),
    package: z
        .number({ required_error: 'Package is required' })
        .min(0, 'Package cannot be negative'),
    location: z
        .string({ required_error: 'Location is required' })
        .min(2, 'Location is required')
        .trim(),
    description: z
        .string({ required_error: 'Job description is required' })
        .min(20, 'Description must be at least 20 characters'),
    responsibilities: z.array(z.string()).default([]),
    requirements: z.array(z.string()).default([]),
    criteria: z
        .object({
            minCGPA: z.number().min(0).max(10).default(0),
            allowedBranches: z
                .array(
                    z.enum([
                        'CSE', 'ECE', 'EEE', 'ME', 'CE', 'IT',
                        'AIDS', 'AIML', 'CSD', 'CSM', 'IOT', 'OTHER', 'ALL',
                    ])
                )
                .default(['ALL']),
            maxBacklogs: z.number().min(0).default(0),
            allowedYears: z.array(z.number().min(1).max(5)).default([4]),
        })
        .default({}),
    deadline: z
        .string({ required_error: 'Deadline is required' })
        .datetime({ message: 'Deadline must be a valid ISO date' }),
    driveDate: z.string().datetime().optional(),
    tags: z.array(z.string()).default([]),
    status: z.enum(['open', 'closed', 'draft']).default('open'),
});

const updateJobStatusSchema = z.object({
    status: z.enum(['open', 'closed', 'draft'], {
        errorMap: () => ({ message: 'Status must be open, closed, or draft' }),
    }),
});

module.exports = { jobSchema, updateJobStatusSchema, validate };
