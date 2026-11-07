'use strict';

const { z } = require('zod');
const { ADMIN_ROLE_LIST, ALL_PERMISSION_KEYS } = require('./admin.permissions');

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const dateRangeQuerySchema = z.object({
  range: z.enum(['today', '7d', '30d', '90d', 'this_month', 'last_month', 'custom', 'all']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

// ---------------- Dashboard ----------------
exports.dashboardStatsQuery = z.object({
  query: dateRangeQuerySchema,
});

exports.dashboardActivitiesQuery = z.object({
  query: paginationSchema.merge(dateRangeQuerySchema).extend({
    type: z.string().optional(),
  }),
});

// ---------------- Users ----------------
exports.listUsersQuery = z.object({
  query: paginationSchema.merge(dateRangeQuerySchema).extend({
    q: z.string().trim().max(200).optional(),
    role: z.enum(['candidate', 'recruiter', 'admin', 'CANDIDATE', 'RECRUITER', 'ADMIN']).optional(),
    adminRole: z.enum(ADMIN_ROLE_LIST).optional(),
    status: z
      .enum([
        'active',
        'inactive',
        'suspended',
        'pending_verification',
        'ACTIVE',
        'INACTIVE',
        'SUSPENDED',
        'PENDING_VERIFICATION',
      ])
      .optional(),
    sortBy: z.enum(['createdAt', 'fullName', 'email', 'lastLoginAt', 'status']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

exports.userIdParam = z.object({
  params: z.object({ id: z.string().uuid() }),
});

exports.updateUserBody = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    fullName: z.string().trim().min(2).max(120).optional(),
    emailVerified: z.boolean().optional(),
    phone: z.string().trim().max(40).optional(),
    headline: z.string().trim().max(180).optional(),
    location: z.string().trim().max(160).optional(),
    designation: z.string().trim().max(120).optional(),
    department: z.string().trim().max(120).optional(),
    reason: z.string().trim().max(500).optional(),
  }),
});

exports.updateUserStatusBody = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z
    .object({
      status: z.enum(['active', 'inactive', 'suspended', 'ACTIVE', 'INACTIVE', 'SUSPENDED']),
      reason: z.string().trim().max(500).optional(),
    })
    .superRefine((data, ctx) => {
      const normalized = data.status.toLowerCase();
      if ((normalized === 'suspended' || normalized === 'inactive') && (!data.reason || data.reason.trim().length < 5)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['reason'],
          message: 'A reason of at least 5 characters is required when suspending or deactivating a user.',
        });
      }
    }),
});

// ---------------- Companies ----------------
exports.listCompaniesQuery = z.object({
  query: paginationSchema.merge(dateRangeQuerySchema).extend({
    q: z.string().trim().max(200).optional(),
    status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUSPENDED']).optional(),
    industry: z.string().trim().max(120).optional(),
    companySize: z.string().trim().max(60).optional(),
    sortBy: z.enum(['createdAt', 'name', 'status', 'approvedAt']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

exports.companyIdParam = z.object({
  params: z.object({ id: z.string().uuid() }),
});

exports.companyApprovalBody = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    reason: z.string().trim().max(500).optional(),
  }),
});

exports.companyReasonRequiredBody = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    reason: z.string().trim().min(5, 'Reason must be at least 5 characters').max(500),
  }),
});

// ---------------- Jobs ----------------
exports.listJobsQuery = z.object({
  query: paginationSchema.merge(dateRangeQuerySchema).extend({
    q: z.string().trim().max(200).optional(),
    status: z
      .enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PUBLISHED', 'PAUSED', 'CLOSED', 'EXPIRED', 'ARCHIVED'])
      .optional(),
    moderationStatus: z.enum(['CLEARED', 'FLAGGED', 'UNDER_REVIEW', 'ACTION_REQUIRED']).optional(),
    flaggedOnly: z.coerce.boolean().optional(),
    pendingOnly: z.coerce.boolean().optional(),
    companyId: z.string().uuid().optional(),
    employmentType: z
      .enum(['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT', 'TEMPORARY', 'FREELANCE'])
      .optional(),
    workMode: z.enum(['ON_SITE', 'REMOTE', 'HYBRID']).optional(),
    location: z.string().trim().max(150).optional(),
    publishedFrom: z.string().optional(),
    publishedTo: z.string().optional(),
    sortBy: z.enum(['createdAt', 'publishedAt', 'title', 'status', 'reportCount']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

exports.jobIdParam = z.object({
  params: z.object({ id: z.string().uuid() }),
});

exports.jobApproveBody = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    notes: z.string().trim().max(1000).optional(),
    reason: z.string().trim().max(1000).optional(),
  }),
});

exports.jobReasonRequiredBody = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    reason: z.string().trim().min(5, 'Reason must be at least 5 characters').max(1000),
    category: z
      .enum([
        'Fake Job Posting',
        'Misleading Job Description',
        'Fraudulent Company Information',
        'Inappropriate Content',
        'Duplicate Job',
        'Policy Violation',
        'Other',
      ])
      .optional(),
    notes: z.string().trim().max(1000).optional(),
  }),
});

// ---------------- Applications ----------------
exports.listApplicationsQuery = z.object({
  query: paginationSchema.merge(dateRangeQuerySchema).extend({
    q: z.string().trim().max(200).optional(),
    companyId: z.string().uuid().optional(),
    jobId: z.string().uuid().optional(),
    candidateId: z.string().uuid().optional(),
    status: z
      .enum(['SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'OFFERED', 'HIRED', 'REJECTED', 'WITHDRAWN'])
      .optional(),
    sortBy: z.enum(['appliedAt', 'updatedAt', 'status']).optional().default('appliedAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

exports.applicationIdParam = z.object({
  params: z.object({ id: z.string().uuid() }),
});

// ---------------- Audit Logs & Activities ----------------
exports.listAuditLogsQuery = z.object({
  query: paginationSchema.merge(dateRangeQuerySchema).extend({
    q: z.string().trim().max(200).optional(),
    actorId: z.string().uuid().optional(),
    action: z.string().trim().max(120).optional(),
    entityType: z.string().trim().max(60).optional(),
    entityId: z.string().trim().max(120).optional(),
  }),
});

exports.listActivitiesQuery = z.object({
  query: paginationSchema.merge(dateRangeQuerySchema).extend({
    type: z.string().trim().max(60).optional(),
    q: z.string().trim().max(200).optional(),
  }),
});

// ---------------- Reports ----------------
exports.createReportBody = z.object({
  body: z.object({
    entityType: z.enum(['USER', 'COMPANY', 'JOB']),
    entityId: z.string().uuid(),
    reason: z.string().trim().min(3).max(200),
    description: z.string().trim().max(2000).optional(),
  }),
});

exports.listReportsQuery = z.object({
  query: paginationSchema.merge(dateRangeQuerySchema).extend({
    q: z.string().trim().max(200).optional(),
    entityType: z.enum(['USER', 'COMPANY', 'JOB']).optional(),
    status: z.enum(['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED']).optional(),
    assignedAdminId: z.string().uuid().optional(),
  }),
});

exports.reportIdParam = z.object({
  params: z.object({ id: z.string().uuid() }),
});

exports.updateReportStatusBody = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    status: z.enum(['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED']),
    resolutionNotes: z.string().trim().max(2000).optional(),
  }),
});

exports.assignReportBody = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    assignedAdminId: z.string().uuid().nullable(),
  }),
});

exports.addReportNoteBody = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    note: z.string().trim().min(2).max(2000),
  }),
});

// ---------------- Analytics ----------------
exports.analyticsQuery = z.object({
  query: dateRangeQuerySchema,
});

// ---------------- Administrators & Permissions ----------------
exports.createAdministratorBody = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email().max(254),
    fullName: z.string().trim().min(2).max(120).optional(),
    password: z
      .string()
      .min(8)
      .max(72)
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/\d/, 'Must contain a number')
      .regex(/[^A-Za-z0-9]/, 'Must contain a special character')
      .optional(),
    adminRole: z.enum(ADMIN_ROLE_LIST),
    reason: z.string().trim().min(3).max(500).optional(),
  }),
});

exports.updateAdminRoleBody = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    adminRole: z.enum(ADMIN_ROLE_LIST).nullable(),
    demoteToRole: z.enum(['candidate', 'recruiter']).optional(),
    reason: z.string().trim().min(5, 'Reason must be at least 5 characters').max(500),
  }),
});

exports.updateAdminUserPermissionsBody = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    overrides: z.array(
      z.object({
        permission: z.enum(ALL_PERMISSION_KEYS),
        effect: z.enum(['GRANT', 'DENY']),
      })
    ),
    reason: z.string().trim().min(3).max(500).optional(),
  }),
});

exports.updateRolePermissionsBody = z.object({
  params: z.object({
    role: z.enum(ADMIN_ROLE_LIST),
  }),
  body: z.object({
    permissions: z.array(z.enum(ALL_PERMISSION_KEYS)),
    reason: z.string().trim().min(3).max(500).optional(),
  }),
});
