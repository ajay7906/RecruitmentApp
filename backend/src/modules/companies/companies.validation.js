const { z } = require('zod');

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];
const COMPANY_TYPES = ['Startup', 'Private Limited', 'Public Limited', 'LLP', 'Partnership', 'Other'];
const COMPANY_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUSPENDED'];
const MEMBER_ROLES = ['OWNER', 'ADMIN', 'RECRUITER'];

const emptyToNull = (val) => (typeof val === 'string' && val.trim() === '' ? null : val);

const optionalText = (max) =>
  z.preprocess(emptyToNull, z.string().trim().max(max).nullable().optional());

const optionalUrl = z.preprocess(
  emptyToNull,
  z
    .string()
    .trim()
    .url('Invalid URL')
    .max(300, 'URL must be 300 characters or fewer')
    .nullable()
    .optional()
);

// Supports either an HTTP/HTTPS URL or a validated image Data URL (PNG, JPEG, WEBP, SVG) up to 2MB
const MAX_LOGO_BASE64_LENGTH = Math.ceil((2 * 1024 * 1024 * 4) / 3) + 256;
const DATA_IMAGE_REGEX = /^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/i;

const optionalLogo = z.preprocess(
  emptyToNull,
  z
    .string()
    .trim()
    .max(MAX_LOGO_BASE64_LENGTH, 'Logo file size must not exceed 2MB')
    .refine((val) => {
      if (DATA_IMAGE_REGEX.test(val)) return true;
      try {
        const parsed = new URL(val);
        return ['http:', 'https:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    }, 'Logo must be a valid image (PNG, JPG, WEBP, SVG up to 2MB) or HTTPS URL')
    .nullable()
    .optional()
);

const optionalEmail = z.preprocess(
  emptyToNull,
  z.string().trim().toLowerCase().email('Invalid company email address').max(150).nullable().optional()
);

const optionalPhone = z.preprocess(
  emptyToNull,
  z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{7,15}$/, 'Invalid contact number')
    .nullable()
    .optional()
);

const optionalGstin = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() !== '' ? v.trim().toUpperCase() : emptyToNull(v)),
  z
    .string()
    .regex(/^[0-9A-Z]{15}$/, 'GSTIN must be a valid 15-character alphanumeric code')
    .nullable()
    .optional()
);

const optionalRegNumber = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() !== '' ? v.trim().toUpperCase() : emptyToNull(v)),
  z
    .string()
    .min(3, 'CIN / Registration Number must be at least 3 characters')
    .max(50, 'CIN / Registration Number must be 50 characters or fewer')
    .nullable()
    .optional()
);

const foundedYear = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? null : v),
  z.coerce
    .number()
    .int('Founded year must be a whole number')
    .min(1800, 'Founded year must be 1800 or later')
    .max(new Date().getFullYear(), 'Founded year cannot be in the future')
    .nullable()
    .optional()
);

const baseCompanyFields = {
  name: z.string().trim().min(2, 'Company name must be at least 2 characters').max(150).optional(),
  companyName: z.string().trim().min(2, 'Company name must be at least 2 characters').max(150).optional(),
  logoUrl: optionalLogo,
  logo: optionalLogo,
  website: optionalUrl,
  email: optionalEmail,
  contactNumber: optionalPhone,
  industry: optionalText(100),
  companySize: z.preprocess(emptyToNull, z.enum(COMPANY_SIZES).nullable().optional()),
  companyType: z.preprocess(emptyToNull, z.enum(COMPANY_TYPES).nullable().optional()),
  foundedYear,
  country: optionalText(100),
  state: optionalText(100),
  city: optionalText(100),
  address: optionalText(500),
  location: optionalText(150),
  description: optionalText(3000),
  linkedinUrl: optionalUrl,
  linkedInUrl: optionalUrl,
  gstin: optionalGstin,
  registrationNumber: optionalRegNumber,
};

function normalizeCompanyBody(data) {
  const out = { ...data };
  if (out.companyName !== undefined) {
    if (out.name === undefined) out.name = out.companyName;
    delete out.companyName;
  }
  if (out.logo !== undefined) {
    if (out.logoUrl === undefined) out.logoUrl = out.logo;
    delete out.logo;
  }
  if (out.linkedInUrl !== undefined) {
    if (out.linkedinUrl === undefined) out.linkedinUrl = out.linkedInUrl;
    delete out.linkedInUrl;
  }
  if (out.city || out.state || out.country) {
    const parts = [out.city, out.state, out.country].filter(Boolean);
    if (parts.length > 0 && !out.location) {
      out.location = parts.join(', ');
    }
  }
  return out;
}

exports.createCompany = z.object({
  body: z
    .object(baseCompanyFields)
    .strict()
    .refine((d) => Boolean(d.name || d.companyName), {
      message: 'Company name is required',
      path: ['name'],
    })
    .transform(normalizeCompanyBody),
});

exports.updateCompany = z.object({
  params: z.object({ id: z.string().uuid('Invalid company ID') }),
  body: z
    .object(baseCompanyFields)
    .strict()
    .transform(normalizeCompanyBody),
});

exports.updateLogo = z.object({
  params: z.object({ id: z.string().uuid('Invalid company ID') }),
  body: z
    .object({
      logoUrl: optionalLogo,
      logo: optionalLogo,
    })
    .strict()
    .transform((d) => ({ logoUrl: d.logoUrl !== undefined ? d.logoUrl : d.logo ?? null })),
});

exports.companyIdParam = z.object({
  params: z.object({ id: z.string().uuid('Invalid company ID') }),
});

exports.listCompanies = z.object({
  query: z.object({
    q: z.string().trim().optional().default(''),
    status: z.preprocess(
      (v) => (v === '' || v === 'ALL' ? undefined : v),
      z.enum(COMPANY_STATUSES).optional()
    ),
    industry: z.string().trim().optional(),
    companySize: z.preprocess(
      (v) => (v === '' || v === 'ALL' ? undefined : v),
      z.enum(COMPANY_SIZES).optional()
    ),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  }),
});

exports.reasonBody = z.object({
  params: z.object({ id: z.string().uuid('Invalid company ID') }),
  body: z
    .object({
      reason: z.string().trim().min(5, 'Please provide a reason (at least 5 characters)').max(1000),
    })
    .strict(),
});

exports.addMember = z.object({
  params: z.object({ id: z.string().uuid('Invalid company ID') }),
  body: z
    .object({
      email: z.string().trim().toLowerCase().email('Enter a valid recruiter email'),
      role: z.enum(['ADMIN', 'RECRUITER']).default('RECRUITER'),
    })
    .strict(),
});

exports.updateMemberRole = z.object({
  params: z.object({
    id: z.string().uuid('Invalid company ID'),
    membershipId: z.string().uuid('Invalid membership ID'),
  }),
  body: z
    .object({
      role: z.enum(MEMBER_ROLES),
    })
    .strict(),
});

exports.removeMember = z.object({
  params: z.object({
    id: z.string().uuid('Invalid company ID'),
    membershipId: z.string().uuid('Invalid membership ID'),
  }),
});

exports.COMPANY_SIZES = COMPANY_SIZES;
exports.COMPANY_TYPES = COMPANY_TYPES;
exports.COMPANY_STATUSES = COMPANY_STATUSES;
