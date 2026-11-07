'use strict';

const router = require('express').Router();
const c = require('./admin.controller');
const v = require('./admin.validation');
const validate = require('../../middlewares/validate');
const { authenticate } = require('../../middlewares/authenticate');
const {
  requireAdmin,
  requirePermission,
  requireAnyPermission,
} = require('../../middlewares/authorize');

router.use(authenticate);
router.use(requireAdmin());

// ── Current Admin Profile & Effective Permissions ─────────────────────────
router.get('/me', c.getCurrentAdmin);

// ── Dashboard Overview & Platform Stats ───────────────────────────────────
router.get('/dashboard/stats', validate(v.dashboardStatsQuery), c.getDashboardStats);
router.get('/dashboard/activities', validate(v.dashboardActivitiesQuery), c.getDashboardActivities);

// ── User Management ───────────────────────────────────────────────────────
router.get('/users', requirePermission('users.read'), validate(v.listUsersQuery), c.listUsers);
router.get('/users/:id', requirePermission('users.read'), validate(v.userIdParam), c.getUserDetails);
router.patch('/users/:id', requirePermission('users.update'), validate(v.updateUserBody), c.updateUser);
router.patch(
  '/users/:id/status',
  requireAnyPermission('users.suspend', 'users.activate', 'users.deactivate'),
  validate(v.updateUserStatusBody),
  c.updateUserStatus
);
router.get(
  '/users/:id/activities',
  requirePermission('users.read'),
  validate(v.userIdParam),
  c.getUserActivities
);

// ── Company Management & Approvals ────────────────────────────────────────
router.get(
  '/companies',
  requirePermission('companies.read'),
  validate(v.listCompaniesQuery),
  c.listCompanies
);
router.get(
  '/companies/:id',
  requirePermission('companies.read'),
  validate(v.companyIdParam),
  c.getCompanyDetails
);
router.patch(
  '/companies/:id/approve',
  requirePermission('companies.approve'),
  validate(v.companyApprovalBody),
  c.approveCompany
);
router.patch(
  '/companies/:id/reject',
  requirePermission('companies.reject'),
  validate(v.companyReasonRequiredBody),
  c.rejectCompany
);
router.patch(
  '/companies/:id/suspend',
  requirePermission('companies.suspend'),
  validate(v.companyReasonRequiredBody),
  c.suspendCompany
);
router.patch(
  '/companies/:id/activate',
  requirePermission('companies.activate'),
  validate(v.companyApprovalBody),
  c.activateCompany
);

// ── Job Management, Approvals & Moderation ────────────────────────────────
router.get('/jobs', requirePermission('jobs.read'), validate(v.listJobsQuery), c.listJobs);
router.get('/jobs/:id', requirePermission('jobs.read'), validate(v.jobIdParam), c.getJobDetails);
router.patch(
  '/jobs/:id/approve',
  requirePermission('jobs.approve'),
  validate(v.jobApproveBody),
  c.approveJob
);
router.patch(
  '/jobs/:id/reject',
  requirePermission('jobs.reject'),
  validate(v.jobReasonRequiredBody),
  c.rejectJob
);
router.patch(
  '/jobs/:id/close',
  requirePermission('jobs.close'),
  validate(v.jobReasonRequiredBody),
  c.closeJob
);
router.patch(
  '/jobs/:id/suspend',
  requirePermission('jobs.suspend'),
  validate(v.jobReasonRequiredBody),
  c.suspendJob
);
router.post(
  '/jobs/:id/flag',
  requirePermission('jobs.flag'),
  validate(v.jobReasonRequiredBody),
  c.flagJob
);

// ── Application & Hiring Monitoring ───────────────────────────────────────
router.get(
  '/applications',
  requirePermission('applications.read'),
  validate(v.listApplicationsQuery),
  c.listApplications
);
router.get(
  '/applications/:id',
  requirePermission('applications.read'),
  validate(v.applicationIdParam),
  c.getApplicationDetails
);

// ── Audit Logs & Platform Activities ──────────────────────────────────────
router.get(
  '/audit-logs',
  requirePermission('audit_logs.read'),
  validate(v.listAuditLogsQuery),
  c.listAuditLogs
);
router.get(
  '/activities',
  requirePermission('activities.read'),
  validate(v.listActivitiesQuery),
  c.listActivities
);

// ── Reports & Moderation Queue ────────────────────────────────────────────
router.post('/reports', validate(v.createReportBody), c.createReport);
router.get(
  '/reports',
  requirePermission('reports.read'),
  validate(v.listReportsQuery),
  c.listReports
);
router.get(
  '/reports/:id',
  requirePermission('reports.read'),
  validate(v.reportIdParam),
  c.getReportDetails
);
router.patch(
  '/reports/:id/status',
  requirePermission('reports.manage'),
  validate(v.updateReportStatusBody),
  c.updateReportStatus
);
router.patch(
  '/reports/:id/assign',
  requirePermission('reports.manage'),
  validate(v.assignReportBody),
  c.assignReport
);
router.post(
  '/reports/:id/notes',
  requirePermission('reports.manage'),
  validate(v.addReportNoteBody),
  c.addReportNote
);

// ── Platform Analytics ────────────────────────────────────────────────────
router.get(
  '/analytics/users',
  requirePermission('analytics.read'),
  validate(v.analyticsQuery),
  c.getUserAnalytics
);
router.get(
  '/analytics/companies',
  requirePermission('analytics.read'),
  validate(v.analyticsQuery),
  c.getCompanyAnalytics
);
router.get(
  '/analytics/jobs',
  requirePermission('analytics.read'),
  validate(v.analyticsQuery),
  c.getJobAnalytics
);
router.get(
  '/analytics/recruitment',
  requirePermission('analytics.read'),
  validate(v.analyticsQuery),
  c.getRecruitmentAnalytics
);

// ── Administrators & Permissions Governance ───────────────────────────────
router.get(
  '/administrators',
  requirePermission('admins.read'),
  c.listAdministrators
);
router.post(
  '/administrators',
  requirePermission('admins.manage'),
  validate(v.createAdministratorBody),
  c.createAdministrator
);
router.patch(
  '/administrators/:id/role',
  requirePermission('admins.manage'),
  validate(v.updateAdminRoleBody),
  c.updateAdministratorRole
);
router.patch(
  '/administrators/:id/permissions',
  requirePermission('admins.manage'),
  validate(v.updateAdminUserPermissionsBody),
  c.updateAdministratorPermissions
);
router.get(
  '/permissions',
  requirePermission('admins.read'),
  c.getPermissionsCatalog
);
router.put(
  '/permissions/roles/:role',
  requirePermission('platform_settings.manage'),
  validate(v.updateRolePermissionsBody),
  c.updateRolePermissions
);

module.exports = router;
