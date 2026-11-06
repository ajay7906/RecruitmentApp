const { z } = require('zod');

const EDUCATION_LEVELS = [
  'High School',
  'Intermediate',
  'Diploma',
  "Bachelor's Degree",
  "Master's Degree",
  'Doctorate',
  'Other',
];

const EMPLOYMENT_TYPES = [
  'Full Time',
  'Part Time',
  'Contract',
  'Internship',
  'Freelance',
  'Other',
];

const SKILL_PROFICIENCY_LEVELS = [
  'Beginner',
  'Intermediate',
  'Advanced',
  'Expert',
];

const LANGUAGE_PROFICIENCY_LEVELS = [
  'Beginner',
  'Intermediate',
  'Fluent',
  'Native',
];

const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional();

const optionalUrl = z
  .string()
  .trim()
  .url('Enter a valid URL')
  .max(400)
  .or(z.literal('').transform(() => null))
  .nullable()
  .optional();

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s-]{7,15}$/, 'Invalid phone number')
  .or(z.literal('').transform(() => null))
  .nullable()
  .optional();

const optionalDate = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? null : v),
  z.coerce.date().nullable().optional()
);

const requiredDate = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : v),
  z.coerce.date({ required_error: 'Valid date is required' })
);

exports.idParam = z.object({
  params: z.object({
    id: z.string().uuid('Invalid record ID'),
  }),
});

// ── 1. Resume Schemas ────────────────────────────────────────────────────

exports.uploadResume = z.object({
  body: z
    .object({
      title: optionalText(120),
      fileName: z.string().trim().min(1, 'File name is required').max(255),
      mimeType: z.string().trim().max(150).optional(),
      contentBase64: z.string().min(10, 'Resume file content is required'),
      isPrimary: z.boolean().optional().default(false),
    })
    .strict(),
});

exports.replaceResume = z.object({
  params: z.object({
    id: z.string().uuid('Invalid resume ID'),
  }),
  body: z
    .object({
      title: optionalText(120),
      fileName: z.string().trim().min(1, 'File name is required').max(255),
      mimeType: z.string().trim().max(150).optional(),
      contentBase64: z.string().min(10, 'Resume file content is required'),
      makePrimary: z.boolean().optional(),
    })
    .strict(),
});

// ── 2. Candidate Profile Schema ──────────────────────────────────────────

exports.updateProfile = z.object({
  body: z
    .object({
      fullName: z.string().trim().min(2).max(120).optional(),
      profileImageUrl: z.string().trim().max(2500000).nullable().optional(),
      phone: phoneSchema,
      dateOfBirth: z.preprocess(
        (v) => (v === '' || v === null || v === undefined ? null : v),
        z.coerce
          .date()
          .refine((d) => d <= new Date(), 'Date of birth cannot be in the future')
          .nullable()
          .optional()
      ),
      gender: z.preprocess(
        (v) => (v === '' ? null : v),
        z.enum(['male', 'female', 'other', 'prefer_not_to_say']).nullable().optional()
      ),
      headline: optionalText(180),
      bio: optionalText(2500),
      careerSummary: optionalText(3000),
      location: optionalText(180),
      country: optionalText(100),
      state: optionalText(100),
      city: optionalText(100),
      pincode: optionalText(20),
      address: optionalText(400),
      currentJobTitle: optionalText(120),
      currentCompany: optionalText(120),
      yearsOfExperience: z.preprocess(
        (v) => (v === '' || v === null || v === undefined ? null : v),
        z.coerce.number().min(0).max(60).nullable().optional()
      ),
      relevantExperience: z.preprocess(
        (v) => (v === '' || v === null || v === undefined ? null : v),
        z.coerce.number().min(0).max(60).nullable().optional()
      ),
      employmentStatus: optionalText(80),
      expectedSalary: z.preprocess(
        (v) => (v === '' || v === null || v === undefined ? null : v),
        z.coerce.number().min(0).nullable().optional()
      ),
      currentSalary: z.preprocess(
        (v) => (v === '' || v === null || v === undefined ? null : v),
        z.coerce.number().min(0).nullable().optional()
      ),
      salaryCurrency: z.string().trim().min(2).max(10).optional().default('INR'),
      noticePeriod: optionalText(80),
      preferredLocations: z
        .array(z.string().trim().min(1).max(100))
        .max(20)
        .optional(),
      preferredEmploymentType: optionalText(60),
      preferredWorkMode: optionalText(60),
      linkedinUrl: optionalUrl,
      githubUrl: optionalUrl,
      portfolioUrl: optionalUrl,
    })
    .strict(),
});

// ── 3. Skills Schemas ────────────────────────────────────────────────────

const singleSkillInput = z
  .object({
    name: z.string().trim().min(1, 'Skill name is required').max(80),
    category: z.string().trim().min(1).max(60).optional().default('Technical'),
    experienceYears: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? null : v),
      z.coerce.number().min(0).max(50).nullable().optional()
    ),
    proficiencyLevel: z.preprocess(
      (v) => (v === '' ? null : v),
      z.enum(SKILL_PROFICIENCY_LEVELS).nullable().optional()
    ),
    lastUsed: optionalText(40),
  })
  .strict();

exports.createSkill = z.object({
  body: z.union([
    singleSkillInput,
    z.object({
      skills: z.array(singleSkillInput).min(1).max(30),
    }),
  ]),
});

exports.updateSkill = z.object({
  params: z.object({
    id: z.string().uuid('Invalid skill ID'),
  }),
  body: singleSkillInput.partial().strict(),
});

// ── 4. Education Schemas ─────────────────────────────────────────────────

const educationBodySchema = z
  .object({
    degree: z.string().trim().min(1, 'Degree is required').max(150),
    fieldOfStudy: z.string().trim().min(1, 'Field of study is required').max(150),
    institutionName: z.string().trim().min(2, 'Institution name is required').max(200),
    universityName: optionalText(200),
    educationLevel: z.enum(EDUCATION_LEVELS, {
      errorMap: () => ({ message: 'Select a valid education level' }),
    }),
    startDate: requiredDate,
    endDate: optionalDate,
    currentlyStudying: z.boolean().optional().default(false),
    grade: optionalText(50),
    description: optionalText(1500),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!data.currentlyStudying && data.endDate && data.startDate) {
      if (new Date(data.endDate) < new Date(data.startDate)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endDate'],
          message: 'End date cannot be earlier than start date',
        });
      }
    }
  });

exports.createEducation = z.object({
  body: educationBodySchema,
});

exports.updateEducation = z.object({
  params: z.object({
    id: z.string().uuid('Invalid education ID'),
  }),
  body: educationBodySchema,
});

// ── 5. Work Experience Schemas ───────────────────────────────────────────

const experienceBodySchema = z
  .object({
    jobTitle: z.string().trim().min(2, 'Job title is required').max(150),
    companyName: z.string().trim().min(2, 'Company name is required').max(150),
    employmentType: z.enum(EMPLOYMENT_TYPES, {
      errorMap: () => ({ message: 'Select a valid employment type' }),
    }),
    workLocation: optionalText(150),
    startDate: requiredDate,
    endDate: optionalDate,
    currentlyWorking: z.boolean().optional().default(false),
    description: optionalText(3000),
    responsibilities: z
      .array(z.string().trim().min(1).max(400))
      .max(25)
      .optional()
      .default([]),
    skillsUsed: z
      .array(z.string().trim().min(1).max(80))
      .max(30)
      .optional()
      .default([]),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!data.currentlyWorking && data.endDate && data.startDate) {
      if (new Date(data.endDate) < new Date(data.startDate)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endDate'],
          message: 'End date cannot be earlier than start date',
        });
      }
    }
  });

exports.createExperience = z.object({
  body: experienceBodySchema,
});

exports.updateExperience = z.object({
  params: z.object({
    id: z.string().uuid('Invalid experience ID'),
  }),
  body: experienceBodySchema,
});

// ── 6. Projects Schemas ──────────────────────────────────────────────────

const projectBodySchema = z
  .object({
    name: z.string().trim().min(2, 'Project name is required').max(150),
    description: z.string().trim().min(5, 'Project description is required').max(2500),
    technologiesUsed: z
      .array(z.string().trim().min(1).max(80))
      .max(30)
      .optional()
      .default([]),
    projectUrl: optionalUrl,
    githubUrl: optionalUrl,
    startDate: optionalDate,
    endDate: optionalDate,
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate && new Date(data.endDate) < new Date(data.startDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'End date cannot be earlier than start date',
      });
    }
  });

exports.createProject = z.object({
  body: projectBodySchema,
});

exports.updateProject = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
  }),
  body: projectBodySchema,
});

// ── 7. Certifications Schemas ────────────────────────────────────────────

const certificationBodySchema = z
  .object({
    name: z.string().trim().min(2, 'Certification name is required').max(180),
    issuingOrganization: z.string().trim().min(2, 'Issuing organization is required').max(180),
    issueDate: requiredDate,
    expirationDate: optionalDate,
    credentialId: optionalText(120),
    credentialUrl: optionalUrl,
  })
  .strict()
  .superRefine((data, ctx) => {
    if (
      data.issueDate &&
      data.expirationDate &&
      new Date(data.expirationDate) < new Date(data.issueDate)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['expirationDate'],
        message: 'Expiration date cannot be earlier than issue date',
      });
    }
  });

exports.createCertification = z.object({
  body: certificationBodySchema,
});

exports.updateCertification = z.object({
  params: z.object({
    id: z.string().uuid('Invalid certification ID'),
  }),
  body: certificationBodySchema,
});

// ── 8. Achievements Schemas ──────────────────────────────────────────────

const achievementBodySchema = z
  .object({
    title: z.string().trim().min(2, 'Achievement title is required').max(180),
    description: optionalText(1500),
    date: optionalDate,
    issuingOrganization: optionalText(180),
  })
  .strict();

exports.createAchievement = z.object({
  body: achievementBodySchema,
});

exports.updateAchievement = z.object({
  params: z.object({
    id: z.string().uuid('Invalid achievement ID'),
  }),
  body: achievementBodySchema,
});

// ── 9. Languages Schemas ─────────────────────────────────────────────────

const languageBodySchema = z
  .object({
    name: z.string().trim().min(2, 'Language name is required').max(60),
    proficiencyLevel: z.enum(LANGUAGE_PROFICIENCY_LEVELS, {
      errorMap: () => ({ message: 'Select a valid proficiency level' }),
    }),
  })
  .strict();

exports.createLanguage = z.object({
  body: languageBodySchema,
});

exports.updateLanguage = z.object({
  params: z.object({
    id: z.string().uuid('Invalid language ID'),
  }),
  body: languageBodySchema,
});
