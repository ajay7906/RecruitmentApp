'use strict';

const ADMIN_ROLES = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MODERATOR: 'MODERATOR',
  SUPPORT_ADMIN: 'SUPPORT_ADMIN',
  JOB_APPROVER: 'JOB_APPROVER',
});

const ADMIN_ROLE_LIST = Object.freeze(Object.values(ADMIN_ROLES));

/**
 * Complete catalog of platform administrative permissions with metadata for UI & validation.
 */
const PERMISSIONS_CATALOG = Object.freeze([
  // User Management
  { key: 'users.read', category: 'Users', label: 'View Users', description: 'List and view user accounts and activity summaries.' },
  { key: 'users.read_contact', category: 'Users', label: 'View User Contact Info', description: 'Access sensitive user contact fields such as phone numbers.' },
  { key: 'users.update', category: 'Users', label: 'Update Users', description: 'Edit permitted non-credential user profile fields.' },
  { key: 'users.suspend', category: 'Users', label: 'Suspend Users', description: 'Suspend active candidate, recruiter, or lower-privilege accounts.' },
  { key: 'users.activate', category: 'Users', label: 'Activate Users', description: 'Reactivate suspended or inactive user accounts.' },
  { key: 'users.deactivate', category: 'Users', label: 'Deactivate Users', description: 'Deactivate user accounts and revoke active sessions.' },

  // Company Management
  { key: 'companies.read', category: 'Companies', label: 'View Companies', description: 'View registered companies, recruiters, and approval status history.' },
  { key: 'companies.approve', category: 'Companies', label: 'Approve Companies', description: 'Approve pending company registrations.' },
  { key: 'companies.reject', category: 'Companies', label: 'Reject Companies', description: 'Reject pending company registrations with a mandatory reason.' },
  { key: 'companies.suspend', category: 'Companies', label: 'Suspend Companies', description: 'Suspend approved companies and restrict new job publishing.' },
  { key: 'companies.activate', category: 'Companies', label: 'Reactivate Companies', description: 'Restore suspended companies to approved status.' },

  // Job Management & Moderation
  { key: 'jobs.read', category: 'Jobs', label: 'View Jobs', description: 'Browse and inspect all job postings, moderation logs, and metrics.' },
  { key: 'jobs.approve', category: 'Jobs', label: 'Approve Jobs', description: 'Approve pending, under-review, or flagged job postings for publication.' },
  { key: 'jobs.reject', category: 'Jobs', label: 'Reject Jobs', description: 'Reject job postings with a mandatory reason.' },
  { key: 'jobs.close', category: 'Jobs', label: 'Close Jobs', description: 'Close active job postings while preserving candidate applications.' },
  { key: 'jobs.suspend', category: 'Jobs', label: 'Suspend / Restrict Jobs', description: 'Pause or restrict policy-violating job postings.' },
  { key: 'jobs.flag', category: 'Jobs', label: 'Flag Jobs', description: 'Flag suspicious job postings for moderation review.' },

  // Applications & Hiring Privacy
  { key: 'applications.read', category: 'Applications', label: 'View Applications', description: 'Monitor job applications, interview stages, and hiring pipeline status.' },
  { key: 'applications.read_resume', category: 'Applications', label: 'Access Candidate Resumes', description: 'View or download candidate resumes attached to job applications.' },
  { key: 'applications.read_notes', category: 'Applications', label: 'View Internal Recruiter Notes', description: 'Read private recruiter notes and internal interview feedback.' },

  // Platform Monitoring, Reports, Analytics & Audit
  { key: 'activities.read', category: 'Monitoring', label: 'View Platform Activities', description: 'Monitor real-time platform activity timeline across modules.' },
  { key: 'notifications.read', category: 'Monitoring', label: 'View Notification Deliveries', description: 'Monitor email and in-app notification processing status and failures.' },
  { key: 'notifications.manage', category: 'Monitoring', label: 'Manage & Retry Notifications', description: 'Retry failed email deliveries and manage notification templates.' },
  { key: 'reports.read', category: 'Moderation Reports', label: 'View Moderation & Platform Reports', description: 'View moderation reports and generate platform business reports.' },
  { key: 'reports.manage', category: 'Moderation Reports', label: 'Manage Moderation Reports', description: 'Assign, investigate, add notes, and resolve or dismiss reports.' },
  { key: 'reports.export', category: 'Moderation Reports', label: 'Export Platform Reports', description: 'Export platform reports to CSV, Excel, or printable formats.' },
  { key: 'analytics.read', category: 'Analytics', label: 'View Platform Analytics', description: 'Access platform growth, company, job, and recruitment funnel analytics.' },
  { key: 'audit_logs.read', category: 'Security & Audit', label: 'View Audit Logs', description: 'Inspect immutable administrative and security audit logs.' },

  // Administrative Governance
  { key: 'admins.read', category: 'Administration', label: 'View Administrators', description: 'View platform administrators, assigned roles, and permission matrices.' },
  { key: 'admins.manage', category: 'Administration', label: 'Manage Administrators', description: 'Create administrators, assign admin roles, and configure user permission overrides.' },
  { key: 'platform_settings.manage', category: 'Administration', label: 'Manage Platform Settings', description: 'Configure role permission defaults and global governance policies.' },
]);

const ALL_PERMISSION_KEYS = Object.freeze(PERMISSIONS_CATALOG.map((p) => p.key));

const DEFAULT_ROLE_PERMISSIONS = Object.freeze({
  [ADMIN_ROLES.SUPER_ADMIN]: [...ALL_PERMISSION_KEYS],
  [ADMIN_ROLES.ADMIN]: [
    'users.read',
    'users.read_contact',
    'users.update',
    'users.suspend',
    'users.activate',
    'users.deactivate',
    'companies.read',
    'companies.approve',
    'companies.reject',
    'companies.suspend',
    'companies.activate',
    'jobs.read',
    'jobs.approve',
    'jobs.reject',
    'jobs.close',
    'jobs.suspend',
    'jobs.flag',
    'applications.read',
    'applications.read_resume',
    'applications.read_notes',
    'activities.read',
    'notifications.read',
    'notifications.manage',
    'reports.read',
    'reports.manage',
    'reports.export',
    'analytics.read',
    'audit_logs.read',
    'admins.read',
  ],
  [ADMIN_ROLES.MODERATOR]: [
    'users.read',
    'users.suspend',
    'companies.read',
    'companies.approve',
    'companies.reject',
    'companies.suspend',
    'jobs.read',
    'jobs.approve',
    'jobs.reject',
    'jobs.close',
    'jobs.suspend',
    'jobs.flag',
    'activities.read',
    'notifications.read',
    'reports.read',
    'reports.manage',
  ],
  [ADMIN_ROLES.SUPPORT_ADMIN]: [
    'users.read',
    'users.read_contact',
    'users.update',
    'users.activate',
    'companies.read',
    'jobs.read',
    'applications.read',
    'activities.read',
    'notifications.read',
    'reports.read',
    'reports.manage',
  ],
  [ADMIN_ROLES.JOB_APPROVER]: [
    'companies.read',
    'jobs.read',
    'jobs.approve',
    'jobs.reject',
    'jobs.flag',
    'reports.read',
  ],
});

/**
 * Resolves the effective set of permission keys for a given user and adminRole.
 * Combines role permissions from DB (falling back to DEFAULT_ROLE_PERMISSIONS)
 * with per-user GRANT/DENY overrides in `admin_user_permissions`.
 * `SUPER_ADMIN` always holds all permissions.
 */
async function resolveUserPermissions(userId, adminRole, db) {
  if (!adminRole) return [];
  if (adminRole === ADMIN_ROLES.SUPER_ADMIN) {
    return [...ALL_PERMISSION_KEYS];
  }

  const prismaClient = db || require('../../config/prisma');

  const [roleRows, overrideRows] = await Promise.all([
    prismaClient.adminRolePermission.findMany({
      where: { role: adminRole },
      select: { permission: true },
    }),
    userId
      ? prismaClient.adminUserPermission.findMany({
          where: { userId },
          select: { permission: true, effect: true },
        })
      : Promise.resolve([]),
  ]);

  const basePermissions =
    roleRows && roleRows.length > 0
      ? roleRows.map((r) => r.permission)
      : DEFAULT_ROLE_PERMISSIONS[adminRole] || [];

  const effective = new Set(basePermissions);

  for (const ov of overrideRows) {
    if (ov.effect === 'DENY') {
      effective.delete(ov.permission);
    } else if (ov.effect === 'GRANT') {
      effective.add(ov.permission);
    }
  }

  return Array.from(effective).sort();
}

module.exports = {
  ADMIN_ROLES,
  ADMIN_ROLE_LIST,
  PERMISSIONS_CATALOG,
  ALL_PERMISSION_KEYS,
  DEFAULT_ROLE_PERMISSIONS,
  resolveUserPermissions,
};
