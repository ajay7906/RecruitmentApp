const { z } = require('zod');

const password = z
  .string()
  .min(8, 'Min 8 characters')
  .max(72, 'Max 72 characters')
  .regex(/[a-z]/, 'Needs a lowercase letter')
  .regex(/[A-Z]/, 'Needs an uppercase letter')
  .regex(/[0-9]/, 'Needs a number');

const email = z.string().trim().toLowerCase().email();

exports.register = z.object({
  body: z.object({
    fullName: z.string().trim().min(2).max(100),
    email,
    password,
    role: z.enum(['candidate', 'recruiter']).default('candidate'), // admin is never self-registered
  }),
});

exports.login = z.object({ body: z.object({ email, password: z.string().min(1) }) });
exports.verifyEmail = z.object({ body: z.object({ token: z.string().min(10) }) });
exports.emailOnly = z.object({ body: z.object({ email }) });
exports.resetPassword = z.object({ body: z.object({ token: z.string().min(10), newPassword: password }) });
exports.changePassword = z.object({
  body: z.object({ currentPassword: z.string().min(1), newPassword: password }),
});
