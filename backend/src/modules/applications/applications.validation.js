const { z } = require('zod');

const APPLICATION_STATUSES = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'INTERVIEW',
  'OFFERED',
  'HIRED',
  'REJECTED',
  'WITHDRAWN',
];

const RECRUITER_TARGET_STATUSES = [
  'UNDER_REVIEW',
  'SHORTLISTED',
  'INTERVIEW',
  'OFFERED',
  'HIRED',
  'REJECTED',
];

const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional();

const resumeUploadSchema = z
  .object({
    title: optionalText(120),
    fileName: z.string().trim().min(1, 'Resume file name is required').max(255),
    mimeType: z.string().trim().max(120).optional(),
    contentBase64: z.string().min(10, 'Resume file content is required'),
  })
  .strict();

const answerItemSchema = z
  .object({
    questionId: z.string().trim().max(100).optional(),
    question: z.string().trim().min(1).max(500),
    type: z.string().trim().max(60).optional(),
    required: z.boolean().optional(),
    answer: z.union([
      z.string().max(4000),
      z.array(z.string().max(500)).max(25),
      z.boolean(),
      z.null(),
    ]),
  })
  .strict();

exports.submitApplication = z.object({
  body: z
    .object({
      jobId: z.string().uuid('Valid job ID is required'),
      resumeId: z
        .preprocess(
          (v) => (v === '' || v === null ? undefined : v),
          z.string().uuid('Invalid resume ID').optional()
        ),
      useProfileResume: z.boolean().optional().default(false),
      saveResumeToProfile: z.boolean().optional().default(true),
      resumeUpload: resumeUploadSchema.nullable().optional(),
      coverLetter: optionalText(8000),
      answers: z.array(answerItemSchema).max(30).optional().default([]),
      additionalInformation: optionalText(4000),
      candidateSkills: z
        .array(z.string().trim().min(1).max(80))
        .max(50)
        .optional(),
    })
    .strict(),
});

exports.applicationIdParam = z.object({
  params: z.object({
    id: z.string().uuid('Invalid application ID'),
  }),
});

exports.jobIdParam = z.object({
  params: z.object({
    jobId: z.string().uuid('Invalid job ID'),
  }),
});

exports.withdrawApplication = z.object({
  params: z.object({
    id: z.string().uuid('Invalid application ID'),
  }),
  body: z
    .object({
      reason: optionalText(1000),
    })
    .strict()
    .optional()
    .default({}),
});

exports.updateApplicationStatus = z.object({
  params: z.object({
    id: z.string().uuid('Invalid application ID'),
  }),
  body: z
    .object({
      status: z.enum(RECRUITER_TARGET_STATUSES, {
        errorMap: () => ({ message: 'Invalid target application status' }),
      }),
      reason: optionalText(1500),
      notes: optionalText(2000),
    })
    .strict(),
});

exports.addRecruiterNote = z.object({
  params: z.object({
    id: z.string().uuid('Invalid application ID'),
  }),
  body: z
    .object({
      note: z
        .string()
        .trim()
        .min(1, 'Internal note cannot be empty')
        .max(3000, 'Internal note must be 3000 characters or fewer'),
    })
    .strict(),
});

exports.listCandidateApplications = z.object({
  query: z.object({
    q: z.string().trim().max(150).optional(),
    search: z.string().trim().max(150).optional(),
    companyId: z
      .preprocess((v) => (v === '' ? undefined : v), z.string().uuid().optional()),
    company: z.string().trim().max(150).optional(),
    status: z
      .preprocess(
        (v) => (v === '' ? undefined : v),
        z.enum(APPLICATION_STATUSES).optional()
      ),
    appliedFrom: z
      .preprocess(
        (v) => (v === '' || !v ? undefined : v),
        z.coerce.date().optional()
      ),
    appliedTo: z
      .preprocess(
        (v) => (v === '' || !v ? undefined : v),
        z.coerce.date().optional()
      ),
    sortBy: z
      .enum(['appliedAt', 'lastStatusUpdatedAt'])
      .optional()
      .default('appliedAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  }),
});

exports.listRecruiterApplications = z.object({
  query: z.object({
    q: z.string().trim().max(150).optional(),
    search: z.string().trim().max(150).optional(),
    candidateName: z.string().trim().max(150).optional(),
    jobTitle: z.string().trim().max(150).optional(),
    companyId: z
      .preprocess((v) => (v === '' ? undefined : v), z.string().uuid().optional()),
    jobId: z
      .preprocess((v) => (v === '' ? undefined : v), z.string().uuid().optional()),
    status: z
      .preprocess(
        (v) => (v === '' ? undefined : v),
        z.enum(APPLICATION_STATUSES).optional()
      ),
    minExperience: z
      .preprocess(
        (v) => (v === '' || v === undefined ? undefined : v),
        z.coerce.number().min(0).max(60).optional()
      ),
    maxExperience: z
      .preprocess(
        (v) => (v === '' || v === undefined ? undefined : v),
        z.coerce.number().min(0).max(60).optional()
      ),
    skill: z.string().trim().max(200).optional(),
    skills: z.string().trim().max(200).optional(),
    appliedFrom: z
      .preprocess(
        (v) => (v === '' || !v ? undefined : v),
        z.coerce.date().optional()
      ),
    appliedTo: z
      .preprocess(
        (v) => (v === '' || !v ? undefined : v),
        z.coerce.date().optional()
      ),
    sortBy: z
      .enum(['appliedAt', 'lastStatusUpdatedAt', 'candidateExperience'])
      .optional()
      .default('appliedAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  }),
});

exports.recruiterStatsQuery = z.object({
  query: z.object({
    companyId: z
      .preprocess((v) => (v === '' ? undefined : v), z.string().uuid().optional()),
    jobId: z
      .preprocess((v) => (v === '' ? undefined : v), z.string().uuid().optional()),
    status: z
      .preprocess(
        (v) => (v === '' ? undefined : v),
        z.enum(APPLICATION_STATUSES).optional()
      ),
    appliedFrom: z
      .preprocess(
        (v) => (v === '' || !v ? undefined : v),
        z.coerce.date().optional()
      ),
    appliedTo: z
      .preprocess(
        (v) => (v === '' || !v ? undefined : v),
        z.coerce.date().optional()
      ),
  }),
});

exports.APPLICATION_STATUSES = APPLICATION_STATUSES;
exports.RECRUITER_TARGET_STATUSES = RECRUITER_TARGET_STATUSES;
