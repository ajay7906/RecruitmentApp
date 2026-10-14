const { z } = require('zod');

// empty string -> null, so clients can clear a field
const optionalText = (max) =>
  z.string().trim().max(max).transform((v) => (v === '' ? null : v)).nullable().optional();

const optionalUrl = z
  .string()
  .trim()
  .url()
  .max(300)
  .or(z.literal('').transform(() => null))
  .nullable()
  .optional();

const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s-]{7,15}$/, 'Invalid phone number')
  .or(z.literal('').transform(() => null))
  .nullable()
  .optional();

// PATCH-style: every field optional, unknown fields rejected
exports.updateCandidate = z.object({
  body: z
    .object({
      phone,
      dateOfBirth: z.coerce.date().max(new Date(), 'Cannot be in the future').nullable().optional(),
      gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).nullable().optional(),
      headline: optionalText(150),
      bio: optionalText(2000),
      location: optionalText(150),
      city: optionalText(100),
      state: optionalText(100),
      country: optionalText(100),
      yearsOfExperience: z.coerce.number().min(0).max(60).nullable().optional(),
      currentJobTitle: optionalText(100),
      currentCompany: optionalText(100),
      linkedinUrl: optionalUrl,
      githubUrl: optionalUrl,
      portfolioUrl: optionalUrl,
    })
    .strict(),
});

exports.updateRecruiter = z.object({
  body: z
    .object({
      fullName: z.string().trim().min(2).max(100).optional(), // lives on User, not RecruiterProfile
      phone,
      designation: optionalText(100),
      linkedinUrl: optionalUrl,
      companyId: z.string().uuid().nullable().optional(),
    })
    .strict(),
});

exports.createCompany = z.object({
  body: z
    .object({
      name: z.string().trim().min(2).max(150),
      website: optionalUrl,
      description: optionalText(2000),
      industry: optionalText(100),
      companySize: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']).nullable().optional(),
      location: optionalText(150),
    })
    .strict(),
});

exports.updateCompany = z.object({
  body: exports.createCompany.shape.body.partial().strict(),
});