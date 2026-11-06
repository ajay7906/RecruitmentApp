const { z } = require('zod');

const EMPLOYMENT_TYPES = ['Full Time', 'Part Time', 'Contract', 'Internship', 'Temporary', 'Freelance'];
const WORK_MODES = ['Onsite', 'Remote', 'Hybrid'];
const SALARY_PERIODS = ['Yearly', 'Monthly', 'Hourly'];
const QUESTION_TYPES = ['SHORT_TEXT', 'LONG_TEXT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'YES_NO'];
const JOB_STATUSES = [
  'DRAFT',
  'PENDING_APPROVAL',
  'PUBLISHED',
  'PAUSED',
  'CLOSED',
  'REJECTED',
  'EXPIRED',
  'ARCHIVED',
];

const emptyToNull = (val) => (typeof val === 'string' && val.trim() === '' ? null : val);

const optionalText = (max) =>
  z.preprocess(emptyToNull, z.string().trim().max(max).nullable().optional());

const optionalEmail = z.preprocess(
  emptyToNull,
  z.string().trim().toLowerCase().email('Invalid contact email').max(150).nullable().optional()
);

const optionalNumber = (min = 0, max = 1_000_000_000) =>
  z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : v),
    z.coerce.number().min(min).max(max).nullable().optional()
  );

const optionalInt = (min = 1, max = 1_000_000) =>
  z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : v),
    z.coerce.number().int().min(min).max(max).nullable().optional()
  );

const stringArray = (maxItems = 50, maxItemLen = 300) =>
  z.preprocess(
    (v) => {
      if (v === null || v === undefined || v === '') return [];
      if (typeof v === 'string') {
        return v
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
      if (Array.isArray(v)) {
        return v.map((s) => String(s).trim()).filter(Boolean);
      }
      return [];
    },
    z.array(z.string().max(maxItemLen)).max(maxItems).optional().default([])
  );

const applicationQuestionSchema = z.object({
  id: z.string().trim().optional(),
  question: z.string().trim().min(2, 'Question text is required').max(500),
  type: z.enum(QUESTION_TYPES).default('SHORT_TEXT'),
  required: z.boolean().optional().default(false),
  options: z
    .array(z.string().trim().min(1).max(200))
    .max(20)
    .optional()
    .default([]),
});

const baseJobFields = {
  title: z.string().trim().min(3, 'Job title must be at least 3 characters').max(150).optional(),
  jobTitle: z.string().trim().min(3, 'Job title must be at least 3 characters').max(150).optional(),
  companyId: z.string().uuid('Select a valid company').optional(),

  department: optionalText(100),
  category: optionalText(100),
  jobCategory: optionalText(100),
  description: z.string().trim().min(20, 'Job description must be at least 20 characters').max(15000).optional(),
  jobDescription: z.string().trim().min(20, 'Job description must be at least 20 characters').max(15000).optional(),
  summary: optionalText(1000),
  jobSummary: optionalText(1000),

  numberOfOpenings: optionalInt(1, 5000),
  numberOfVacancies: optionalInt(1, 5000),
  employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
  workMode: z.enum(WORK_MODES).optional(),

  experienceLevel: optionalText(100),
  experienceRequired: optionalText(100),
  minExperience: optionalNumber(0, 60),
  minimumExperience: optionalNumber(0, 60),
  maxExperience: optionalNumber(0, 60),
  maximumExperience: optionalNumber(0, 60),

  minSalary: optionalNumber(0, 10_000_000_000),
  minimumSalary: optionalNumber(0, 10_000_000_000),
  maxSalary: optionalNumber(0, 10_000_000_000),
  maximumSalary: optionalNumber(0, 10_000_000_000),
  salaryCurrency: z.string().trim().max(10).optional(),
  currency: z.string().trim().max(10).optional(),
  salaryPeriod: z.enum(SALARY_PERIODS).optional(),
  discloseSalary: z.boolean().optional(),

  country: optionalText(100),
  state: optionalText(100),
  city: optionalText(100),
  officeLocation: optionalText(300),
  pincode: optionalText(20),
  location: optionalText(200),

  requiredSkills: stringArray(50, 100),
  preferredSkills: stringArray(50, 100),
  educationalQualification: optionalText(300),
  minEducationLevel: optionalText(150),
  preferredQualifications: optionalText(1000),
  requiredCertifications: stringArray(30, 150),
  experienceDescription: optionalText(2000),
  additionalRequirements: optionalText(2000),

  responsibilities: stringArray(50, 500),
  benefits: stringArray(50, 300),
  perks: stringArray(50, 300),
  additionalInfo: optionalText(3000),
  applicationInstructions: optionalText(2000),
  contactEmail: optionalEmail,

  applicationDeadline: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : v),
    z.coerce.date().nullable().optional()
  ),
  allowAfterDeadline: z.boolean().optional(),
  requireResume: z.boolean().optional(),
  requireCoverLetter: z.boolean().optional(),
  maxApplications: optionalInt(1, 1_000_000),
  applicationQuestions: z.array(applicationQuestionSchema).max(25).optional(),
  requireAdminApproval: z.boolean().optional(),
};

function normalizeJobPayload(data) {
  const out = { ...data };

  if (out.jobTitle !== undefined) {
    if (out.title === undefined) out.title = out.jobTitle;
    delete out.jobTitle;
  }
  if (out.jobCategory !== undefined) {
    if (out.category === undefined) out.category = out.jobCategory;
    delete out.jobCategory;
  }
  if (out.jobDescription !== undefined) {
    if (out.description === undefined) out.description = out.jobDescription;
    delete out.jobDescription;
  }
  if (out.jobSummary !== undefined) {
    if (out.summary === undefined) out.summary = out.jobSummary;
    delete out.jobSummary;
  }
  if (out.numberOfVacancies !== undefined) {
    if (out.numberOfOpenings === undefined) out.numberOfOpenings = out.numberOfVacancies;
    delete out.numberOfVacancies;
  }
  if (out.experienceRequired !== undefined) {
    if (out.experienceLevel === undefined) out.experienceLevel = out.experienceRequired;
    delete out.experienceRequired;
  }
  if (out.minimumExperience !== undefined) {
    if (out.minExperience === undefined) out.minExperience = out.minimumExperience;
    delete out.minimumExperience;
  }
  if (out.maximumExperience !== undefined) {
    if (out.maxExperience === undefined) out.maxExperience = out.maximumExperience;
    delete out.maximumExperience;
  }
  if (out.minimumSalary !== undefined) {
    if (out.minSalary === undefined) out.minSalary = out.minimumSalary;
    delete out.minimumSalary;
  }
  if (out.maximumSalary !== undefined) {
    if (out.maxSalary === undefined) out.maxSalary = out.maximumSalary;
    delete out.maximumSalary;
  }
  if (out.currency !== undefined) {
    if (out.salaryCurrency === undefined) out.salaryCurrency = out.currency;
    delete out.currency;
  }

  if (out.city || out.state || out.country) {
    const parts = [out.city, out.state, out.country].filter(Boolean);
    if (parts.length > 0 && !out.location) {
      out.location = parts.join(', ');
    }
  } else if (out.workMode === 'Remote' && !out.location) {
    out.location = 'Remote';
  }

  return out;
}

function validateRanges(data, ctx) {
  const minExp = data.minExperience ?? data.minimumExperience;
  const maxExp = data.maxExperience ?? data.maximumExperience;
  if (minExp != null && maxExp != null && Number(maxExp) < Number(minExp)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Maximum experience must be greater than or equal to minimum experience',
      path: ['maxExperience'],
    });
  }

  const minSal = data.minSalary ?? data.minimumSalary;
  const maxSal = data.maxSalary ?? data.maximumSalary;
  if (minSal != null && maxSal != null && Number(maxSal) < Number(minSal)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Maximum salary must be greater than or equal to minimum salary',
      path: ['maxSalary'],
    });
  }
}

exports.createJob = z.object({
  body: z
    .object(baseJobFields)
    .strict()
    .superRefine((data, ctx) => {
      if (!data.title && !data.jobTitle) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Job title is required',
          path: ['title'],
        });
      }
      if (!data.companyId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Company is required',
          path: ['companyId'],
        });
      }
      if (!data.description && !data.jobDescription) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Job description is required',
          path: ['description'],
        });
      }
      if (!data.employmentType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Employment type is required',
          path: ['employmentType'],
        });
      }
      if (!data.workMode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Work mode is required',
          path: ['workMode'],
        });
      }
      if (data.applicationDeadline) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (new Date(data.applicationDeadline) < today) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Application deadline cannot be in the past',
            path: ['applicationDeadline'],
          });
        }
      }
      validateRanges(data, ctx);
    })
    .transform(normalizeJobPayload),
});

exports.updateJob = z.object({
  params: z.object({ id: z.string().uuid('Invalid job ID') }),
  body: z
    .object({
      ...baseJobFields,
      companyId: undefined, // companyId cannot be reassigned after creation
    })
    .strict()
    .superRefine(validateRanges)
    .transform(normalizeJobPayload),
});

exports.jobIdParam = z.object({
  params: z.object({ id: z.string().uuid('Invalid job ID') }),
});

exports.publishJob = z.object({
  params: z.object({ id: z.string().uuid('Invalid job ID') }),
  body: z
    .object({
      submitForApproval: z.boolean().optional().default(false),
    })
    .optional()
    .default({}),
});

exports.rejectJob = z.object({
  params: z.object({ id: z.string().uuid('Invalid job ID') }),
  body: z
    .object({
      reason: z.string().trim().min(5, 'Please provide a rejection reason (at least 5 characters)').max(1000),
    })
    .strict(),
});

exports.listRecruiterJobs = z.object({
  query: z.object({
    q: z.string().trim().optional().default(''),
    search: z.string().trim().optional(),
    companyId: z.preprocess((v) => (v === '' || v === 'ALL' ? undefined : v), z.string().uuid().optional()),
    status: z.preprocess((v) => (v === '' || v === 'ALL' ? undefined : v), z.enum(JOB_STATUSES).optional()),
    employmentType: z.preprocess(
      (v) => (v === '' || v === 'ALL' ? undefined : v),
      z.enum(EMPLOYMENT_TYPES).optional()
    ),
    workMode: z.preprocess((v) => (v === '' || v === 'ALL' ? undefined : v), z.enum(WORK_MODES).optional()),
    location: z.string().trim().optional(),
    sortBy: z.enum(['createdAt', 'publishedAt', 'title', 'applicationDeadline']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  }),
});

exports.listPublicJobs = z.object({
  query: z.object({
    q: z.string().trim().optional().default(''),
    search: z.string().trim().optional(),
    skill: z.string().trim().optional(),
    skills: z.string().trim().optional(),
    location: z.string().trim().optional(),
    employmentType: z.preprocess(
      (v) => (v === '' || v === 'ALL' ? undefined : v),
      z.enum(EMPLOYMENT_TYPES).optional()
    ),
    workMode: z.preprocess((v) => (v === '' || v === 'ALL' ? undefined : v), z.enum(WORK_MODES).optional()),
    minExperience: optionalNumber(0, 60),
    maxExperience: optionalNumber(0, 60),
    minSalary: optionalNumber(0, 10_000_000_000),
    maxSalary: optionalNumber(0, 10_000_000_000),
    industry: z.string().trim().optional(),
    companyId: z.preprocess((v) => (v === '' || v === 'ALL' ? undefined : v), z.string().uuid().optional()),
    category: z.string().trim().optional(),
    sortBy: z.enum(['publishedAt', 'createdAt', 'minSalary']).optional().default('publishedAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  }),
});

exports.EMPLOYMENT_TYPES = EMPLOYMENT_TYPES;
exports.WORK_MODES = WORK_MODES;
exports.SALARY_PERIODS = SALARY_PERIODS;
exports.QUESTION_TYPES = QUESTION_TYPES;
exports.JOB_STATUSES = JOB_STATUSES;
