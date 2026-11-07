'use strict';

const bcrypt = require('bcrypt');
const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const { recordAudit } = require('../../services/audit.service');
const authRepo = require('../auth/auth.repository');
const companiesService = require('../companies/companies.service');
const jobsService = require('../jobs/jobs.service');
const {
  ADMIN_ROLES,
  ADMIN_ROLE_LIST,
  PERMISSIONS_CATALOG,
  ALL_PERMISSION_KEYS,
  DEFAULT_ROLE_PERMISSIONS,
  resolveUserPermissions,
} = require('./admin.permissions');

const withTransaction = (fn) => prisma.$transaction(fn);

/**
 * Resolves a query date range (`today | 7d | 30d | 90d | custom | all`) into `{ fromDate, toDate }`.
 */
function resolveDateRange({ range = '30d', from, to } = {}) {
  const now = new Date();
  let fromDate = null;
  let toDate = to ? new Date(to) : now;

  if (Number.isNaN(toDate.getTime())) {
    toDate = now;
  }

  if (from) {
    const parsedFrom = new Date(from);
    if (!Number.isNaN(parsedFrom.getTime())) {
      fromDate = parsedFrom;
    }
  }

  if (!fromDate && range && range !== 'all') {
    const d = new Date(now);
    if (range === 'today') {
      d.setHours(0, 0, 0, 0);
      fromDate = d;
    } else if (range === '7d') {
      d.setDate(d.getDate() - 7);
      fromDate = d;
    } else if (range === '30d') {
      d.setDate(d.getDate() - 30);
      fromDate = d;
    } else if (range === '90d') {
      d.setDate(d.getDate() - 90);
      fromDate = d;
    }
  }

  return { fromDate, toDate, range: range || (from ? 'custom' : 'all') };
}

function buildCreatedAtFilter({ range, from, to }) {
  if (!range && !from && !to) return undefined;
  if (range === 'all' && !from && !to) return undefined;
  const { fromDate, toDate } = resolveDateRange({ range: range || 'custom', from, to });
  const filter = {};
  if (fromDate) filter.gte = fromDate;
  if (toDate) filter.lte = toDate;
  return Object.keys(filter).length > 0 ? filter : undefined;
}

/**
 * Groups an array of rows with a date column into daily `YYYY-MM-DD` buckets between `fromDate` and `toDate`.
 */
function buildDailyTimeSeries(items, dateField, fromDate, toDate) {
  const start = fromDate ? new Date(fromDate) : new Date(Date.now() - 30 * 86400000);
  const end = toDate ? new Date(toDate) : new Date();
  start.setHours(0, 0, 0, 0);

  const buckets = new Map();
  const cursor = new Date(start);
  let safety = 0;
  while (cursor <= end && safety < 366) {
    const key = cursor.toISOString().slice(0, 10);
    buckets.set(key, 0);
    cursor.setDate(cursor.getDate() + 1);
    safety++;
  }

  for (const item of items) {
    const raw = item[dateField];
    if (!raw) continue;
    const key = new Date(raw).toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }

  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
}

async function fetchUserLookupMap(userIds = []) {
  const cleanIds = Array.from(new Set(userIds.filter(Boolean)));
  if (cleanIds.length === 0) return new Map();
  const users = await prisma.user.findMany({
    where: { id: { in: cleanIds } },
    select: { id: true, fullName: true, email: true, role: true, adminRole: true },
  });
  return new Map(users.map((u) => [u.id, u]));
}

function normalizeUserStatusLabel(user) {
  if (!user) return 'ACTIVE';
  if (user.status === 'suspended') return 'SUSPENDED';
  if (user.status === 'inactive') return 'INACTIVE';
  if (!user.emailVerifiedAt) return 'PENDING_VERIFICATION';
  return 'ACTIVE';
}

function sanitizeUserRecord(user, { canReadContact = false } = {}) {
  if (!user) return null;
  const candidatePhone = canReadContact ? user.candidateProfile?.phone || null : undefined;
  const recruiterPhone = canReadContact ? user.recruiterProfile?.phone || null : undefined;
  const counts = user._count || {};

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    roleLabel: String(user.role || '').toUpperCase(),
    adminRole: user.adminRole || null,
    status: user.status,
    statusBadge: normalizeUserStatusLabel(user),
    emailVerified: Boolean(user.emailVerifiedAt),
    emailVerifiedAt: user.emailVerifiedAt,
    lastLoginAt: user.lastLoginAt || null,
    suspendedAt: user.suspendedAt || null,
    suspendedById: user.suspendedById || null,
    suspensionReason: user.suspensionReason || null,
    statusChangedAt: user.statusChangedAt || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    ...(canReadContact ? { phone: candidatePhone || recruiterPhone || null } : {}),
    candidateProfile: user.candidateProfile
      ? {
          id: user.candidateProfile.id,
          headline: user.candidateProfile.headline,
          location: user.candidateProfile.location,
          city: user.candidateProfile.city,
          state: user.candidateProfile.state,
          country: user.candidateProfile.country,
          currentJobTitle: user.candidateProfile.currentJobTitle,
          currentCompany: user.candidateProfile.currentCompany,
          yearsOfExperience:
            user.candidateProfile.yearsOfExperience != null
              ? Number(user.candidateProfile.yearsOfExperience)
              : null,
          skills: user.candidateProfile.skills || [],
          ...(canReadContact ? { phone: user.candidateProfile.phone } : {}),
        }
      : null,
    recruiterProfile: user.recruiterProfile
      ? {
          id: user.recruiterProfile.id,
          companyId: user.recruiterProfile.companyId,
          designation: user.recruiterProfile.designation,
          linkedinUrl: user.recruiterProfile.linkedinUrl,
          company: user.recruiterProfile.company || null,
          ...(canReadContact ? { phone: user.recruiterProfile.phone } : {}),
        }
      : null,
    _count: {
      jobApplications: counts.candidateApplications ?? counts.jobApplications ?? 0,
      createdJobs: counts.createdJobs ?? 0,
      ownedCompanies: counts.ownedCompanies ?? 0,
      companyMemberships: counts.companyMemberships ?? 0,
    },
  };
}

// ============================================================================
// 1. DASHBOARD OVERVIEW & PLATFORM STATS
// ============================================================================

exports.getDashboardStats = async (query = {}) => {
  const { fromDate, toDate, range } = resolveDateRange({
    range: query.range || '30d',
    from: query.from,
    to: query.to,
  });

  const periodFilter = fromDate ? { gte: fromDate, lte: toDate } : undefined;

  const [
    totalUsers,
    totalCandidates,
    totalRecruiters,
    totalAdmins,
    suspendedAccounts,
    inactiveAccounts,
    unverifiedAccounts,
    totalCompanies,
    pendingCompanyApprovals,
    approvedCompanies,
    rejectedCompanies,
    suspendedCompanies,
    totalJobs,
    pendingJobApprovals,
    publishedJobs,
    closedJobs,
    rejectedJobs,
    flaggedJobs,
    totalApplications,
    totalInterviews,
    totalHiredCandidates,
    openReports,
    periodUsers,
    periodCompanies,
    periodJobs,
    periodApplications,
    periodHires,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'candidate' } }),
    prisma.user.count({ where: { role: 'recruiter' } }),
    prisma.user.count({ where: { role: 'admin' } }),
    prisma.user.count({ where: { status: 'suspended' } }),
    prisma.user.count({ where: { status: 'inactive' } }),
    prisma.user.count({ where: { emailVerifiedAt: null } }),
    prisma.company.count(),
    prisma.company.count({ where: { status: 'PENDING_APPROVAL' } }),
    prisma.company.count({ where: { status: 'APPROVED' } }),
    prisma.company.count({ where: { status: 'REJECTED' } }),
    prisma.company.count({ where: { status: 'SUSPENDED' } }),
    prisma.job.count(),
    prisma.job.count({
      where: {
        OR: [
          { status: { in: ['PENDING_APPROVAL', 'UNDER_REVIEW'] } },
          { moderationStatus: { in: ['FLAGGED', 'UNDER_REVIEW'] } },
        ],
      },
    }),
    prisma.job.count({ where: { status: 'PUBLISHED' } }),
    prisma.job.count({ where: { status: 'CLOSED' } }),
    prisma.job.count({ where: { status: 'REJECTED' } }),
    prisma.job.count({ where: { moderationStatus: { in: ['FLAGGED', 'UNDER_REVIEW', 'ACTION_REQUIRED'] } } }),
    prisma.application.count(),
    prisma.interview.count(),
    prisma.application.count({ where: { status: 'HIRED' } }),
    prisma.report.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } } }),
    prisma.user.findMany({
      where: periodFilter ? { createdAt: periodFilter } : undefined,
      select: { createdAt: true, role: true },
    }),
    prisma.company.findMany({
      where: periodFilter ? { createdAt: periodFilter } : undefined,
      select: { createdAt: true, status: true },
    }),
    prisma.job.findMany({
      where: periodFilter ? { createdAt: periodFilter } : undefined,
      select: { createdAt: true, status: true },
    }),
    prisma.application.findMany({
      where: periodFilter ? { appliedAt: periodFilter } : undefined,
      select: { appliedAt: true, status: true },
    }),
    prisma.application.count({
      where: {
        status: 'HIRED',
        ...(periodFilter ? { lastStatusUpdatedAt: periodFilter } : {}),
      },
    }),
  ]);

  return {
    summary: {
      totalUsers,
      totalCandidates,
      totalRecruiters,
      totalAdmins,
      suspendedAccounts,
      inactiveAccounts,
      unverifiedAccounts,
      totalCompanies,
      pendingCompanyApprovals,
      approvedCompanies,
      rejectedCompanies,
      suspendedCompanies,
      totalJobs,
      pendingJobApprovals,
      publishedJobs,
      closedJobs,
      rejectedJobs,
      flaggedJobs,
      totalApplications,
      totalInterviews,
      totalHiredCandidates,
      openReports,
    },
    period: {
      range,
      from: fromDate ? fromDate.toISOString() : null,
      to: toDate ? toDate.toISOString() : null,
      newUsers: periodUsers.length,
      newCandidates: periodUsers.filter((u) => u.role === 'candidate').length,
      newRecruiters: periodUsers.filter((u) => u.role === 'recruiter').length,
      newCompanies: periodCompanies.length,
      newJobs: periodJobs.length,
      newApplications: periodApplications.length,
      newHires: periodHires,
    },
    charts: {
      userRegistrations: buildDailyTimeSeries(periodUsers, 'createdAt', fromDate, toDate),
      companyRegistrations: buildDailyTimeSeries(periodCompanies, 'createdAt', fromDate, toDate),
      jobPostings: buildDailyTimeSeries(periodJobs, 'createdAt', fromDate, toDate),
      applicationsSubmitted: buildDailyTimeSeries(periodApplications, 'appliedAt', fromDate, toDate),
    },
  };
};

// ============================================================================
// 2. USER MANAGEMENT (CANDIDATES, RECRUITERS & ADMINS)
// ============================================================================

exports.listUsers = async (actor, query = {}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const skip = (page - 1) * limit;

  const perms = Array.isArray(actor.permissions)
    ? actor.permissions
    : await resolveUserPermissions(actor.id, actor.adminRole || 'ADMIN');
  const canReadContact = perms.includes('users.read_contact');

  const where = {};

  if (query.role) {
    where.role = query.role.toLowerCase();
  }

  if (query.adminRole) {
    where.adminRole = query.adminRole;
  }

  if (query.status) {
    const s = query.status.toUpperCase();
    if (s === 'PENDING_VERIFICATION') {
      where.emailVerifiedAt = null;
      where.status = 'active';
    } else if (s === 'ACTIVE') {
      where.status = 'active';
    } else if (s === 'SUSPENDED') {
      where.status = 'suspended';
    } else if (s === 'INACTIVE') {
      where.status = 'inactive';
    }
  }

  const createdAtFilter = buildCreatedAtFilter(query);
  if (createdAtFilter) {
    where.createdAt = createdAtFilter;
  }

  if (query.q) {
    const q = query.q.trim();
    const orClauses = [
      { fullName: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ];
    if (canReadContact) {
      orClauses.push(
        { candidateProfile: { is: { phone: { contains: q, mode: 'insensitive' } } } },
        { recruiterProfile: { is: { phone: { contains: q, mode: 'insensitive' } } } }
      );
    }
    where.OR = orClauses;
  }

  const sortField = ['createdAt', 'fullName', 'email', 'lastLoginAt', 'status'].includes(query.sortBy)
    ? query.sortBy
    : 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortField]: sortOrder },
      include: {
        candidateProfile: true,
        recruiterProfile: {
          include: {
            company: { select: { id: true, name: true, status: true } },
          },
        },
        _count: {
          select: {
            candidateApplications: true,
            createdJobs: true,
            ownedCompanies: true,
          },
        },
      },
    }),
  ]);

  return {
    users: rows.map((u) => sanitizeUserRecord(u, { canReadContact })),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

exports.getUserDetails = async (actor, userId) => {
  const perms = Array.isArray(actor.permissions)
    ? actor.permissions
    : await resolveUserPermissions(actor.id, actor.adminRole || 'ADMIN');
  const canReadContact = perms.includes('users.read_contact');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      candidateProfile: true,
      recruiterProfile: {
        include: {
          company: { select: { id: true, name: true, status: true, industry: true, city: true, country: true } },
        },
      },
      companyMemberships: {
        include: {
          company: { select: { id: true, name: true, status: true, industry: true, logoUrl: true } },
        },
      },
      ownedCompanies: {
        select: { id: true, name: true, status: true, industry: true, createdAt: true },
      },
      createdJobs: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          moderationStatus: true,
          createdAt: true,
          publishedAt: true,
          company: { select: { id: true, name: true } },
        },
      },
      candidateApplications: {
        take: 10,
        orderBy: { appliedAt: 'desc' },
        select: {
          id: true,
          status: true,
          appliedAt: true,
          job: { select: { id: true, title: true } },
          company: { select: { id: true, name: true } },
        },
      },
      _count: {
        select: {
          candidateApplications: true,
          createdJobs: true,
          ownedCompanies: true,
          companyMemberships: true,
        },
      },
    },
  });

  if (!user) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  const [statusHistoryRows, roleHistoryRows, permissionOverrides, recentAuditRows] = await Promise.all([
    prisma.accountStatusHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
    prisma.adminRoleHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
    prisma.adminUserPermission.findMany({
      where: { userId },
    }),
    prisma.auditLog.findMany({
      where: {
        OR: [
          { entityType: 'USER', entityId: userId },
          { actorId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  const userLookup = await fetchUserLookupMap([
    ...statusHistoryRows.map((s) => s.actorId),
    ...roleHistoryRows.map((r) => r.changedBy),
    ...recentAuditRows.map((a) => a.actorId),
  ]);

  const base = sanitizeUserRecord(user, { canReadContact });

  return {
    ...base,
    ownedCompanies: user.ownedCompanies,
    companyMemberships: user.companyMemberships,
    recentJobs: user.createdJobs,
    recentApplications: user.candidateApplications,
    accountStatusHistory: statusHistoryRows.map((s) => ({
      ...s,
      changedBy: s.actorId ? userLookup.get(s.actorId) || null : null,
    })),
    adminRoleHistory: roleHistoryRows.map((r) => ({
      ...r,
      changedByUser: r.changedBy ? userLookup.get(r.changedBy) || null : null,
    })),
    permissionOverrides,
    recentAuditLogs: recentAuditRows.map((a) => ({
      ...a,
      actor: a.actorId ? userLookup.get(a.actorId) || null : null,
    })),
  };
};

exports.updateUser = async (actor, userId, body, req) => {
  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: { candidateProfile: true, recruiterProfile: true },
  });
  if (!target) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  if (target.adminRole === 'SUPER_ADMIN' && actor.adminRole !== 'SUPER_ADMIN') {
    throw new ApiError(403, 'Only a SUPER_ADMIN can modify a SUPER_ADMIN profile', 'FORBIDDEN');
  }

  const updated = await withTransaction(async (tx) => {
    const userUpdate = {};
    if (body.fullName !== undefined) userUpdate.fullName = body.fullName;
    if (body.emailVerified !== undefined) {
      userUpdate.emailVerifiedAt = body.emailVerified ? target.emailVerifiedAt || new Date() : null;
    }

    const u =
      Object.keys(userUpdate).length > 0
        ? await tx.user.update({ where: { id: userId }, data: userUpdate })
        : target;

    if (
      target.role === 'candidate' &&
      (body.phone !== undefined || body.headline !== undefined || body.location !== undefined)
    ) {
      await tx.candidateProfile.upsert({
        where: { userId },
        create: {
          userId,
          phone: body.phone ?? null,
          headline: body.headline ?? null,
          location: body.location ?? null,
        },
        update: {
          ...(body.phone !== undefined ? { phone: body.phone } : {}),
          ...(body.headline !== undefined ? { headline: body.headline } : {}),
          ...(body.location !== undefined ? { location: body.location } : {}),
        },
      });
    }

    if (target.role === 'recruiter' && (body.phone !== undefined || body.designation !== undefined)) {
      await tx.recruiterProfile.upsert({
        where: { userId },
        create: {
          userId,
          phone: body.phone ?? null,
          designation: body.designation ?? null,
        },
        update: {
          ...(body.phone !== undefined ? { phone: body.phone } : {}),
          ...(body.designation !== undefined ? { designation: body.designation } : {}),
        },
      });
    }

    await recordAudit(
      {
        actor,
        action: 'USER_UPDATED',
        entityType: 'USER',
        entityId: userId,
        previousValue: {
          fullName: target.fullName,
          emailVerified: Boolean(target.emailVerifiedAt),
        },
        newValue: {
          fullName: u.fullName,
          emailVerified: Boolean(u.emailVerifiedAt),
        },
        reason: body.reason || 'Administrative user profile update',
        req,
      },
      tx
    );

    return u;
  });

  return exports.getUserDetails(actor, updated.id);
};

exports.updateUserStatus = async (actor, userId, { status, reason }, req) => {
  const normalizedTargetStatus = status.toLowerCase();
  if (!['active', 'suspended', 'inactive'].includes(normalizedTargetStatus)) {
    throw new ApiError(400, 'Invalid user status', 'INVALID_USER_STATUS');
  }

  if (actor.id === userId && normalizedTargetStatus !== 'active') {
    throw new ApiError(400, 'Administrators cannot suspend or deactivate their own account', 'CANNOT_SELF_SUSPEND');
  }

  const perms = Array.isArray(actor.permissions)
    ? actor.permissions
    : await resolveUserPermissions(actor.id, actor.adminRole || 'ADMIN');

  const requiredPermMap = {
    suspended: 'users.suspend',
    active: 'users.activate',
    inactive: 'users.deactivate',
  };
  const neededPerm = requiredPermMap[normalizedTargetStatus];
  if (!perms.includes(neededPerm)) {
    throw new ApiError(
      403,
      `Missing required permission: ${neededPerm}`,
      'INSUFFICIENT_PERMISSIONS',
      { missingPermissions: [neededPerm] }
    );
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  if (target.status === normalizedTargetStatus) {
    throw new ApiError(400, `User account is already ${normalizedTargetStatus.toUpperCase()}`, 'SAME_USER_STATUS');
  }

  if (target.role === 'admin') {
    if (target.adminRole === 'SUPER_ADMIN' && actor.adminRole !== 'SUPER_ADMIN') {
      throw new ApiError(403, 'Only a SUPER_ADMIN can change the status of a SUPER_ADMIN account', 'FORBIDDEN');
    }

    if (target.adminRole === 'SUPER_ADMIN' && normalizedTargetStatus !== 'active') {
      const activeSuperCount = await prisma.user.count({
        where: { role: 'admin', adminRole: 'SUPER_ADMIN', status: 'active' },
      });
      if (activeSuperCount <= 1) {
        throw new ApiError(
          400,
          'Cannot suspend or deactivate the last active SUPER_ADMIN account',
          'LAST_SUPER_ADMIN_PROTECTED'
        );
      }
    }
  }

  const now = new Date();
  const actionMap = {
    suspended: 'USER_SUSPENDED',
    active: 'USER_ACTIVATED',
    inactive: 'USER_DEACTIVATED',
  };

  await withTransaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        status: normalizedTargetStatus,
        statusChangedAt: now,
        ...(normalizedTargetStatus === 'suspended'
          ? {
              suspendedAt: now,
              suspendedById: actor.id,
              suspensionReason: reason || null,
            }
          : {
              suspendedAt: null,
              suspendedById: null,
              suspensionReason: null,
            }),
      },
    });

    await tx.accountStatusHistory.create({
      data: {
        userId,
        previousStatus: target.status,
        newStatus: normalizedTargetStatus,
        reason: reason || null,
        actorId: actor.id,
      },
    });

    if (normalizedTargetStatus !== 'active') {
      await authRepo.revokeAllUserTokens(userId, tx);
    }

    await recordAudit(
      {
        actor,
        action: actionMap[normalizedTargetStatus],
        entityType: 'USER',
        entityId: userId,
        previousValue: { status: target.status },
        newValue: { status: normalizedTargetStatus },
        reason: reason || null,
        req,
      },
      tx
    );
  });

  return exports.getUserDetails(actor, userId);
};

exports.getUserActivities = async (userId, query = {}) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, fullName: true, role: true },
  });
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');

  const limit = Number(query.limit) || 30;

  const [statusHistory, auditLogs, applications, jobsCreated] = await Promise.all([
    prisma.accountStatusHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.auditLog.findMany({
      where: { OR: [{ actorId: userId }, { entityType: 'USER', entityId: userId }] },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.application.findMany({
      where: { candidateId: userId },
      orderBy: { appliedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        status: true,
        appliedAt: true,
        job: { select: { id: true, title: true } },
        company: { select: { id: true, name: true } },
      },
    }),
    prisma.job.findMany({
      where: { createdById: userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        company: { select: { id: true, name: true } },
      },
    }),
  ]);

  const timeline = [
    ...statusHistory.map((s) => ({
      id: `status-${s.id}`,
      type: 'ACCOUNT_STATUS_CHANGED',
      title: `Account status changed from ${s.previousStatus} to ${s.newStatus}`,
      reason: s.reason,
      timestamp: s.createdAt,
    })),
    ...auditLogs.map((a) => ({
      id: `audit-${a.id}`,
      type: a.action,
      title: `${a.action} on ${a.entityType}`,
      reason: a.reason,
      timestamp: a.createdAt,
    })),
    ...applications.map((app) => ({
      id: `app-${app.id}`,
      type: 'APPLICATION_SUBMITTED',
      title: `Applied for "${app.job?.title || 'Job'}" at ${app.company?.name || 'Company'}`,
      status: app.status,
      timestamp: app.appliedAt,
    })),
    ...jobsCreated.map((j) => ({
      id: `job-${j.id}`,
      type: 'JOB_CREATED',
      title: `Created job "${j.title}" at ${j.company?.name || 'Company'}`,
      status: j.status,
      timestamp: j.createdAt,
    })),
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return {
    user,
    activities: timeline.slice(0, limit),
  };
};

// ============================================================================
// 3. COMPANY MANAGEMENT & APPROVAL WORKFLOW
// ============================================================================

exports.listCompanies = async (actor, query = {}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const skip = (page - 1) * limit;

  const where = {};
  if (query.status) {
    where.status = query.status;
  }
  if (query.industry) {
    where.industry = { contains: query.industry.trim(), mode: 'insensitive' };
  }
  if (query.companySize) {
    where.companySize = query.companySize.trim();
  }
  const createdAtFilter = buildCreatedAtFilter(query);
  if (createdAtFilter) {
    where.createdAt = createdAtFilter;
  }
  if (query.q) {
    const q = query.q.trim();
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { industry: { contains: q, mode: 'insensitive' } },
      { city: { contains: q, mode: 'insensitive' } },
      { gstin: { contains: q, mode: 'insensitive' } },
      { registrationNumber: { contains: q, mode: 'insensitive' } },
    ];
  }

  const sortField = ['createdAt', 'name', 'status', 'approvedAt'].includes(query.sortBy)
    ? query.sortBy
    : 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

  const [total, items, statusCounts] = await Promise.all([
    prisma.company.count({ where }),
    prisma.company.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortField]: sortOrder },
      include: {
        owner: { select: { id: true, fullName: true, email: true, status: true } },
        approvedBy: { select: { id: true, fullName: true, email: true } },
        _count: {
          select: {
            memberships: { where: { membershipStatus: 'ACTIVE' } },
            recruiters: true,
            jobs: true,
          },
        },
      },
    }),
    prisma.company.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  ]);

  const counts = {
    ALL: 0,
    DRAFT: 0,
    PENDING_APPROVAL: 0,
    APPROVED: 0,
    REJECTED: 0,
    SUSPENDED: 0,
  };
  for (const row of statusCounts) {
    counts[row.status] = row._count._all;
    counts.ALL += row._count._all;
  }

  return {
    companies: items.map((c) => ({
      ...c,
      recruiterCount: Math.max(c._count?.memberships || 0, c._count?.recruiters || 0, c.ownerId ? 1 : 0),
      jobsCount: c._count?.jobs || 0,
    })),
    counts,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

exports.getCompanyDetails = async (actor, companyId) => {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      owner: { select: { id: true, fullName: true, email: true, role: true, status: true } },
      approvedBy: { select: { id: true, fullName: true, email: true, adminRole: true } },
      memberships: {
        where: { membershipStatus: 'ACTIVE' },
        include: {
          user: { select: { id: true, fullName: true, email: true, role: true, status: true } },
        },
        orderBy: { joinedAt: 'asc' },
      },
      jobs: {
        orderBy: { createdAt: 'desc' },
        take: 25,
        select: {
          id: true,
          title: true,
          department: true,
          employmentType: true,
          workMode: true,
          status: true,
          moderationStatus: true,
          reportCount: true,
          createdAt: true,
          publishedAt: true,
          _count: { select: { applications: true } },
        },
      },
      _count: {
        select: {
          memberships: { where: { membershipStatus: 'ACTIVE' } },
          recruiters: true,
          jobs: true,
          applications: true,
        },
      },
    },
  });

  if (!company) {
    throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');
  }

  const [statusHistoryRows, auditLogs] = await Promise.all([
    prisma.companyStatusHistory.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
    prisma.auditLog.findMany({
      where: { entityType: 'COMPANY', entityId: companyId },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
  ]);

  const userLookup = await fetchUserLookupMap([
    ...statusHistoryRows.map((h) => h.actorId),
    ...auditLogs.map((a) => a.actorId),
  ]);

  return {
    ...company,
    recruiterCount: Math.max(
      company._count?.memberships || 0,
      company._count?.recruiters || 0,
      company.ownerId ? 1 : 0
    ),
    jobsCount: company._count?.jobs || 0,
    applicationsCount: company._count?.applications || 0,
    statusHistory: statusHistoryRows.map((h) => ({
      ...h,
      changedBy: h.actorId ? userLookup.get(h.actorId) || null : null,
    })),
    auditLogs: auditLogs.map((a) => ({
      ...a,
      actor: a.actorId ? userLookup.get(a.actorId) || null : null,
    })),
  };
};

exports.approveCompany = async (actor, companyId, { reason } = {}, req) => {
  const existing = await prisma.company.findUnique({ where: { id: companyId } });
  if (!existing) throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');

  if (existing.ownerId === actor.id && actor.adminRole !== 'SUPER_ADMIN') {
    throw new ApiError(403, 'You cannot approve a company that you own', 'CANNOT_APPROVE_OWN_COMPANY');
  }

  const updated = await companiesService.approveCompany(actor, companyId);

  await withTransaction(async (tx) => {
    await tx.companyStatusHistory.create({
      data: {
        companyId,
        previousStatus: existing.status,
        newStatus: 'APPROVED',
        reason: reason || 'Approved by platform administrator',
        actorId: actor.id,
      },
    });

    await recordAudit(
      {
        actor,
        action: 'COMPANY_APPROVED',
        entityType: 'COMPANY',
        entityId: companyId,
        previousValue: { status: existing.status },
        newValue: { status: 'APPROVED', approvedById: actor.id },
        reason: reason || 'Approved by platform administrator',
        req,
      },
      tx
    );
  });

  return updated;
};

exports.rejectCompany = async (actor, companyId, { reason }, req) => {
  const existing = await prisma.company.findUnique({ where: { id: companyId } });
  if (!existing) throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');

  const updated = await companiesService.rejectCompany(actor, companyId, reason);

  await withTransaction(async (tx) => {
    await tx.companyStatusHistory.create({
      data: {
        companyId,
        previousStatus: existing.status,
        newStatus: 'REJECTED',
        reason,
        actorId: actor.id,
      },
    });

    await recordAudit(
      {
        actor,
        action: 'COMPANY_REJECTED',
        entityType: 'COMPANY',
        entityId: companyId,
        previousValue: { status: existing.status },
        newValue: { status: 'REJECTED', rejectionReason: reason },
        reason,
        req,
      },
      tx
    );
  });

  return updated;
};

exports.suspendCompany = async (actor, companyId, { reason }, req) => {
  const existing = await prisma.company.findUnique({ where: { id: companyId } });
  if (!existing) throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');

  const updated = await companiesService.suspendCompany(actor, companyId, reason);

  await withTransaction(async (tx) => {
    await tx.companyStatusHistory.create({
      data: {
        companyId,
        previousStatus: existing.status,
        newStatus: 'SUSPENDED',
        reason,
        actorId: actor.id,
      },
    });

    await recordAudit(
      {
        actor,
        action: 'COMPANY_SUSPENDED',
        entityType: 'COMPANY',
        entityId: companyId,
        previousValue: { status: existing.status },
        newValue: { status: 'SUSPENDED', suspensionReason: reason },
        reason,
        req,
      },
      tx
    );
  });

  return updated;
};

exports.activateCompany = async (actor, companyId, { reason } = {}, req) => {
  const existing = await prisma.company.findUnique({ where: { id: companyId } });
  if (!existing) throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');

  if (existing.status !== 'SUSPENDED') {
    throw new ApiError(
      400,
      'Only SUSPENDED companies can be reactivated via this action',
      'INVALID_STATUS_TRANSITION'
    );
  }

  const now = new Date();
  await withTransaction(async (tx) => {
    await tx.company.update({
      where: { id: companyId },
      data: {
        status: 'APPROVED',
        suspensionReason: null,
        approvedAt: existing.approvedAt || now,
        approvedById: actor.id,
      },
    });

    await tx.companyStatusHistory.create({
      data: {
        companyId,
        previousStatus: existing.status,
        newStatus: 'APPROVED',
        reason: reason || 'Company reactivated by administrator',
        actorId: actor.id,
      },
    });

    await recordAudit(
      {
        actor,
        action: 'COMPANY_REACTIVATED',
        entityType: 'COMPANY',
        entityId: companyId,
        previousValue: { status: existing.status, suspensionReason: existing.suspensionReason },
        newValue: { status: 'APPROVED' },
        reason: reason || 'Company reactivated by administrator',
        req,
      },
      tx
    );
  });

  return companiesService.getCompanyDetails(actor, companyId);
};

// ============================================================================
// 4. JOB MANAGEMENT, APPROVALS & MODERATION
// ============================================================================

exports.listJobs = async (actor, query = {}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const skip = (page - 1) * limit;

  const where = {};

  if (query.status) {
    where.status = query.status;
  }
  if (query.moderationStatus) {
    where.moderationStatus = query.moderationStatus;
  }
  if (query.flaggedOnly) {
    where.OR = [
      { moderationStatus: { in: ['FLAGGED', 'UNDER_REVIEW', 'ACTION_REQUIRED'] } },
      { reportCount: { gt: 0 } },
    ];
  }
  if (query.pendingOnly) {
    where.OR = [
      { status: { in: ['PENDING_APPROVAL', 'UNDER_REVIEW'] } },
      { moderationStatus: { in: ['FLAGGED', 'UNDER_REVIEW'] } },
    ];
  }
  if (query.companyId) {
    where.companyId = query.companyId;
  }
  if (query.employmentType) {
    where.employmentType = query.employmentType;
  }
  if (query.workMode) {
    where.workMode = query.workMode;
  }
  if (query.location) {
    where.OR = [
      ...(where.OR || []),
      { location: { contains: query.location, mode: 'insensitive' } },
      { city: { contains: query.location, mode: 'insensitive' } },
      { state: { contains: query.location, mode: 'insensitive' } },
      { country: { contains: query.location, mode: 'insensitive' } },
    ];
  }

  const createdAtFilter = buildCreatedAtFilter(query);
  if (createdAtFilter) {
    where.createdAt = createdAtFilter;
  }

  if (query.publishedFrom || query.publishedTo) {
    where.publishedAt = {};
    if (query.publishedFrom) where.publishedAt.gte = new Date(query.publishedFrom);
    if (query.publishedTo) where.publishedAt.lte = new Date(query.publishedTo);
  }

  if (query.q) {
    const q = query.q.trim();
    const searchOr = [
      { title: { contains: q, mode: 'insensitive' } },
      { department: { contains: q, mode: 'insensitive' } },
      { category: { contains: q, mode: 'insensitive' } },
      { company: { is: { name: { contains: q, mode: 'insensitive' } } } },
    ];
    if (where.OR) {
      where.AND = [{ OR: where.OR }, { OR: searchOr }];
      delete where.OR;
    } else {
      where.OR = searchOr;
    }
  }

  const sortField = ['createdAt', 'publishedAt', 'title', 'status', 'reportCount'].includes(query.sortBy)
    ? query.sortBy
    : 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

  const [total, items, statusBreakdown, moderationBreakdown] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortField]: sortOrder },
      include: {
        company: { select: { id: true, name: true, status: true, logoUrl: true, industry: true } },
        createdBy: { select: { id: true, fullName: true, email: true, role: true } },
        approvedBy: { select: { id: true, fullName: true, email: true } },
        _count: { select: { applications: true, reports: true } },
      },
    }),
    prisma.job.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.job.groupBy({ by: ['moderationStatus'], _count: { _all: true } }),
  ]);

  const counts = {
    ALL: 0,
    DRAFT: 0,
    PENDING_APPROVAL: 0,
    UNDER_REVIEW: 0,
    PUBLISHED: 0,
    PAUSED: 0,
    CLOSED: 0,
    REJECTED: 0,
    EXPIRED: 0,
    ARCHIVED: 0,
    FLAGGED: 0,
  };

  for (const s of statusBreakdown) {
    counts[s.status] = s._count._all;
    counts.ALL += s._count._all;
  }
  for (const m of moderationBreakdown) {
    if (m.moderationStatus === 'FLAGGED' || m.moderationStatus === 'UNDER_REVIEW') {
      counts.FLAGGED += m._count._all;
    }
  }

  return {
    jobs: items.map((j) => ({
      ...j,
      minSalary: j.minSalary != null ? Number(j.minSalary) : null,
      maxSalary: j.maxSalary != null ? Number(j.maxSalary) : null,
      minExperience: j.minExperience != null ? Number(j.minExperience) : null,
      maxExperience: j.maxExperience != null ? Number(j.maxExperience) : null,
      applicationsCount: j._count?.applications || 0,
    })),
    counts,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

exports.getJobDetails = async (actor, jobId) => {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          status: true,
          logoUrl: true,
          industry: true,
          companySize: true,
          website: true,
          city: true,
          state: true,
          country: true,
        },
      },
      createdBy: { select: { id: true, fullName: true, email: true, role: true, status: true } },
      approvedBy: { select: { id: true, fullName: true, email: true, adminRole: true } },
      moderatedBy: { select: { id: true, fullName: true, email: true, adminRole: true } },
      moderationLogs: {
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: {
          actor: { select: { id: true, fullName: true, email: true, role: true, adminRole: true } },
        },
      },
      reports: {
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: { select: { id: true, fullName: true, email: true, role: true } },
        },
      },
      _count: {
        select: {
          applications: true,
          reports: true,
        },
      },
    },
  });

  if (!job) {
    throw new ApiError(404, 'Job vacancy not found', 'JOB_NOT_FOUND');
  }

  const [unifiedReports, auditLogs] = await Promise.all([
    prisma.report.findMany({
      where: { entityType: 'JOB', entityId: jobId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.findMany({
      where: { entityType: 'JOB', entityId: jobId },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
  ]);

  const userLookup = await fetchUserLookupMap([
    ...unifiedReports.map((r) => r.reportedBy),
    ...unifiedReports.map((r) => r.assignedTo),
    ...auditLogs.map((a) => a.actorId),
  ]);

  return {
    ...job,
    minSalary: job.minSalary != null ? Number(job.minSalary) : null,
    maxSalary: job.maxSalary != null ? Number(job.maxSalary) : null,
    minExperience: job.minExperience != null ? Number(job.minExperience) : null,
    maxExperience: job.maxExperience != null ? Number(job.maxExperience) : null,
    applicationsCount: job._count?.applications || 0,
    unifiedReports: unifiedReports.map((r) => ({
      ...r,
      reporter: userLookup.get(r.reportedBy) || null,
      assignedAdmin: r.assignedTo ? userLookup.get(r.assignedTo) || null : null,
    })),
    auditLogs: auditLogs.map((a) => ({
      ...a,
      actor: a.actorId ? userLookup.get(a.actorId) || null : null,
    })),
  };
};

exports.approveJob = async (actor, jobId, { notes, reason } = {}, req) => {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { company: true },
  });
  if (!job) throw new ApiError(404, 'Job vacancy not found', 'JOB_NOT_FOUND');

  if (job.createdById === actor.id && actor.adminRole !== 'SUPER_ADMIN') {
    throw new ApiError(403, 'Job creators cannot self-approve their own job postings', 'CANNOT_SELF_APPROVE_JOB');
  }

  if (!job.company || job.company.status === 'SUSPENDED') {
    throw new ApiError(400, 'Cannot approve or publish a job for a SUSPENDED company', 'COMPANY_SUSPENDED');
  }
  if (job.company.status !== 'APPROVED') {
    throw new ApiError(
      400,
      `Company must be APPROVED before its jobs can be approved/published (current: ${job.company.status})`,
      'COMPANY_NOT_APPROVED'
    );
  }

  const approvalReason = notes || reason || 'Approved and published by platform administrator';
  const updated = await jobsService.approveJob(actor, jobId, approvalReason);

  await recordAudit({
    actor,
    action: 'JOB_APPROVED',
    entityType: 'JOB',
    entityId: jobId,
    previousValue: { status: job.status, moderationStatus: job.moderationStatus },
    newValue: { status: updated.status, moderationStatus: updated.moderationStatus, approvedById: actor.id },
    reason: approvalReason,
    req,
  });

  return updated;
};

exports.rejectJob = async (actor, jobId, { reason, category }, req) => {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new ApiError(404, 'Job vacancy not found', 'JOB_NOT_FOUND');

  const fullReason = category ? `[${category}] ${reason}` : reason;
  const updated = await jobsService.rejectJob(actor, jobId, fullReason);

  await recordAudit({
    actor,
    action: 'JOB_REJECTED',
    entityType: 'JOB',
    entityId: jobId,
    previousValue: { status: job.status, moderationStatus: job.moderationStatus },
    newValue: { status: 'REJECTED', moderationStatus: 'ACTION_REQUIRED', rejectionReason: fullReason },
    reason: fullReason,
    req,
  });

  return updated;
};

exports.closeJob = async (actor, jobId, { reason }, req) => {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new ApiError(404, 'Job vacancy not found', 'JOB_NOT_FOUND');

  if (job.status === 'CLOSED') {
    throw new ApiError(400, 'Job is already closed', 'ALREADY_CLOSED');
  }

  const now = new Date();
  const updated = await withTransaction(async (tx) => {
    const j = await tx.job.update({
      where: { id: jobId },
      data: {
        status: 'CLOSED',
        closedAt: now,
        moderationReason: reason,
        moderatedAt: now,
        moderatedById: actor.id,
        updatedById: actor.id,
      },
      include: {
        company: { select: { id: true, name: true, status: true } },
      },
    });

    await tx.jobModerationLog.create({
      data: {
        jobId,
        actorType: 'ADMIN',
        actorId: actor.id,
        action: 'ADMIN_CLOSE_JOB',
        previousStatus: job.status,
        newStatus: 'CLOSED',
        previousModerationStatus: job.moderationStatus,
        newModerationStatus: job.moderationStatus,
        reason,
      },
    });

    await recordAudit(
      {
        actor,
        action: 'JOB_CLOSED_BY_ADMIN',
        entityType: 'JOB',
        entityId: jobId,
        previousValue: { status: job.status },
        newValue: { status: 'CLOSED', closedAt: now },
        reason,
        req,
      },
      tx
    );

    return j;
  });

  return updated;
};

exports.suspendJob = async (actor, jobId, { reason, category }, req) => {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new ApiError(404, 'Job vacancy not found', 'JOB_NOT_FOUND');

  const fullReason = category ? `[${category}] ${reason}` : reason;
  const updated = await jobsService.moderateJob(actor, jobId, {
    action: 'RESTRICT_JOB',
    reason: fullReason,
  });

  await recordAudit({
    actor,
    action: 'JOB_SUSPENDED',
    entityType: 'JOB',
    entityId: jobId,
    previousValue: { status: job.status, moderationStatus: job.moderationStatus },
    newValue: { status: updated.status, moderationStatus: updated.moderationStatus },
    reason: fullReason,
    req,
  });

  return updated;
};

exports.flagJob = async (actor, jobId, { reason, category }, req) => {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new ApiError(404, 'Job vacancy not found', 'JOB_NOT_FOUND');

  const fullReason = category ? `[${category}] ${reason}` : reason;
  const flags = Array.from(new Set([...(job.moderationFlags || []), category || 'ADMIN_FLAGGED']));
  const now = new Date();

  const updated = await withTransaction(async (tx) => {
    const j = await tx.job.update({
      where: { id: jobId },
      data: {
        moderationStatus: 'FLAGGED',
        moderationFlags: flags,
        moderationReason: fullReason,
        moderatedAt: now,
        moderatedById: actor.id,
      },
      include: {
        company: { select: { id: true, name: true, status: true } },
      },
    });

    await tx.jobModerationLog.create({
      data: {
        jobId,
        actorType: 'ADMIN',
        actorId: actor.id,
        action: 'FLAG_JOB',
        previousStatus: job.status,
        newStatus: job.status,
        previousModerationStatus: job.moderationStatus,
        newModerationStatus: 'FLAGGED',
        reason: fullReason,
        flags,
      },
    });

    await recordAudit(
      {
        actor,
        action: 'JOB_FLAGGED',
        entityType: 'JOB',
        entityId: jobId,
        previousValue: { moderationStatus: job.moderationStatus, moderationFlags: job.moderationFlags },
        newValue: { moderationStatus: 'FLAGGED', moderationFlags: flags },
        reason: fullReason,
        req,
      },
      tx
    );

    return j;
  });

  return updated;
};

// ============================================================================
// 5. APPLICATION & HIRING MONITORING (WITH PRIVACY GUARDS)
// ============================================================================

exports.listApplications = async (actor, query = {}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const skip = (page - 1) * limit;

  const perms = Array.isArray(actor.permissions)
    ? actor.permissions
    : await resolveUserPermissions(actor.id, actor.adminRole || 'ADMIN');
  const canReadResume = perms.includes('applications.read_resume');
  const canReadNotes = perms.includes('applications.read_notes');

  const where = {};
  if (query.companyId) where.companyId = query.companyId;
  if (query.jobId) where.jobId = query.jobId;
  if (query.candidateId) where.candidateId = query.candidateId;
  if (query.status) where.status = query.status;

  const appliedAtFilter = buildCreatedAtFilter(query);
  if (appliedAtFilter) {
    where.appliedAt = appliedAtFilter;
  }

  if (query.q) {
    const q = query.q.trim();
    where.OR = [
      { candidate: { is: { fullName: { contains: q, mode: 'insensitive' } } } },
      { candidate: { is: { email: { contains: q, mode: 'insensitive' } } } },
      { job: { is: { title: { contains: q, mode: 'insensitive' } } } },
      { company: { is: { name: { contains: q, mode: 'insensitive' } } } },
    ];
  }

  const sortField = ['appliedAt', 'updatedAt', 'status'].includes(query.sortBy)
    ? query.sortBy
    : 'appliedAt';
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

  const [total, items, statusBreakdown] = await Promise.all([
    prisma.application.count({ where }),
    prisma.application.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortField]: sortOrder },
      include: {
        candidate: { select: { id: true, fullName: true, email: true, status: true } },
        job: { select: { id: true, title: true, department: true, employmentType: true, workMode: true, status: true } },
        company: { select: { id: true, name: true, logoUrl: true, status: true } },
        reviewedBy: { select: { id: true, fullName: true, email: true } },
        interviews: {
          orderBy: { startTime: 'desc' },
          take: 3,
          select: { id: true, title: true, interviewType: true, status: true, startTime: true },
        },
        hiringDecisions: {
          orderBy: { decidedAt: 'desc' },
          take: 1,
          select: { id: true, decision: true, decidedAt: true },
        },
      },
    }),
    prisma.application.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);

  const counts = {
    ALL: 0,
    SUBMITTED: 0,
    UNDER_REVIEW: 0,
    SHORTLISTED: 0,
    INTERVIEW_SCHEDULED: 0,
    INTERVIEW: 0,
    OFFERED: 0,
    HIRED: 0,
    REJECTED: 0,
    WITHDRAWN: 0,
  };
  for (const s of statusBreakdown) {
    counts[s.status] = (counts[s.status] || 0) + s._count._all;
    counts.ALL += s._count._all;
  }

  return {
    applications: items.map((app) => {
      const latestDecision = app.hiringDecisions?.[0] || null;
      return {
        id: app.id,
        status: app.status,
        appliedAt: app.appliedAt,
        lastStatusUpdatedAt: app.lastStatusUpdatedAt,
        withdrawnAt: app.withdrawnAt,
        rejectionReason: app.rejectionReason,
        candidate: app.candidate,
        job: app.job,
        company: app.company,
        reviewedBy: app.reviewedBy,
        interviews: (app.interviews || []).map((iv) => ({
          id: iv.id,
          title: iv.title,
          roundType: iv.interviewType,
          status: iv.status,
          scheduledAt: iv.startTime,
        })),
        hiringDecision: latestDecision
          ? {
              id: latestDecision.id,
              finalDecision: latestDecision.decision,
              decidedAt: latestDecision.decidedAt,
            }
          : null,
        hasResume: Boolean(app.resumeKey),
        ...(canReadResume
          ? {
              resumeId: app.resumeId,
              resumeFileName: app.resumeFileName,
              resumeMimeType: app.resumeMimeType,
              resumeFileSize: app.resumeFileSize,
            }
          : {}),
        ...(canReadNotes ? { recruiterNotes: app.recruiterNotes || [] } : {}),
      };
    }),
    counts,
    permissions: { canReadResume, canReadNotes },
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

exports.getApplicationDetails = async (actor, applicationId) => {
  const perms = Array.isArray(actor.permissions)
    ? actor.permissions
    : await resolveUserPermissions(actor.id, actor.adminRole || 'ADMIN');
  const canReadResume = perms.includes('applications.read_resume');
  const canReadNotes = perms.includes('applications.read_notes');

  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      candidate: {
        select: {
          id: true,
          fullName: true,
          email: true,
          status: true,
          candidateProfile: {
            select: {
              headline: true,
              location: true,
              city: true,
              state: true,
              country: true,
              yearsOfExperience: true,
              skills: true,
            },
          },
        },
      },
      job: {
        select: {
          id: true,
          title: true,
          department: true,
          category: true,
          employmentType: true,
          workMode: true,
          location: true,
          status: true,
        },
      },
      company: {
        select: { id: true, name: true, logoUrl: true, industry: true, status: true },
      },
      reviewedBy: { select: { id: true, fullName: true, email: true } },
      statusHistory: {
        orderBy: { changedAt: 'desc' },
        include: {
          changedBy: { select: { id: true, fullName: true, email: true, role: true } },
        },
      },
      interviews: {
        orderBy: { roundNumber: 'asc' },
        include: {
          feedbacks: true,
        },
      },
      hiringDecisions: {
        orderBy: { decidedAt: 'desc' },
        include: {
          decidedBy: { select: { id: true, fullName: true, email: true } },
        },
      },
    },
  });

  if (!app) {
    throw new ApiError(404, 'Application not found', 'APPLICATION_NOT_FOUND');
  }

  const latestDecision = app.hiringDecisions?.[0] || null;

  return {
    id: app.id,
    status: app.status,
    appliedAt: app.appliedAt,
    lastStatusUpdatedAt: app.lastStatusUpdatedAt,
    withdrawnAt: app.withdrawnAt,
    withdrawalReason: app.withdrawalReason,
    rejectionReason: app.rejectionReason,
    candidateSkills: app.candidateSkills || [],
    candidateExperience: app.candidateExperience != null ? Number(app.candidateExperience) : null,
    candidate: app.candidate
      ? {
          ...app.candidate,
          candidateProfile: app.candidate.candidateProfile
            ? {
                ...app.candidate.candidateProfile,
                yearsOfExperience:
                  app.candidate.candidateProfile.yearsOfExperience != null
                    ? Number(app.candidate.candidateProfile.yearsOfExperience)
                    : null,
              }
            : null,
        }
      : null,
    job: app.job,
    company: app.company,
    reviewedBy: app.reviewedBy,
    statusHistory: (app.statusHistory || []).map((h) => ({
      id: h.id,
      previousStatus: h.previousStatus,
      newStatus: h.newStatus,
      changedBy: h.changedBy,
      changedByRole: h.changedByRole,
      reason: h.reason,
      notes: canReadNotes ? h.notes : undefined,
      changedAt: h.changedAt,
    })),
    interviews: (app.interviews || []).map((iv) => ({
      id: iv.id,
      roundNumber: iv.roundNumber,
      roundType: iv.interviewType,
      title: iv.title,
      status: iv.status,
      mode: iv.interviewMode,
      scheduledAt: iv.startTime,
      feedbacks: canReadNotes
        ? iv.feedbacks
        : (iv.feedbacks || []).map((f) => ({
            id: f.id,
            overallRating: f.overallRating,
            recommendation: f.recommendation,
            submittedAt: f.submittedAt,
          })),
    })),
    hiringDecision: latestDecision
      ? {
          id: latestDecision.id,
          finalDecision: latestDecision.decision,
          decidedBy: latestDecision.decidedBy,
          decidedAt: latestDecision.decidedAt,
          reason: canReadNotes ? latestDecision.decisionReason : undefined,
          notes: canReadNotes ? latestDecision.internalNotes : undefined,
        }
      : null,
    hasResume: Boolean(app.resumeKey),
    ...(canReadResume
      ? {
          resumeId: app.resumeId,
          resumeFileName: app.resumeFileName,
          resumeMimeType: app.resumeMimeType,
          resumeFileSize: app.resumeFileSize,
          coverLetter: app.coverLetter,
          answers: app.answers,
        }
      : {
          resumeProtected: true,
        }),
    ...(canReadNotes
      ? {
          recruiterNotes: Array.isArray(app.recruiterNotes) ? app.recruiterNotes : [],
        }
      : {
          notesProtected: true,
        }),
    permissions: { canReadResume, canReadNotes },
  };
};

// ============================================================================
// 6. AUDIT LOGS & UNIFIED PLATFORM ACTIVITIES
// ============================================================================

exports.listAuditLogs = async (query = {}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 25;
  const skip = (page - 1) * limit;

  const where = {};
  if (query.actorId) where.actorId = query.actorId;
  if (query.action) where.action = { contains: query.action.trim(), mode: 'insensitive' };
  if (query.entityType) where.entityType = query.entityType.trim().toUpperCase();
  if (query.entityId) where.entityId = query.entityId.trim();

  const createdAtFilter = buildCreatedAtFilter(query);
  if (createdAtFilter) {
    where.createdAt = createdAtFilter;
  }

  if (query.q) {
    const q = query.q.trim();
    where.OR = [
      { action: { contains: q, mode: 'insensitive' } },
      { entityType: { contains: q, mode: 'insensitive' } },
      { entityId: { contains: q, mode: 'insensitive' } },
      { reason: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const userLookup = await fetchUserLookupMap(items.map((i) => i.actorId));

  return {
    logs: items.map((item) => ({
      ...item,
      actor: item.actorId ? userLookup.get(item.actorId) || null : null,
    })),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

exports.listPlatformActivities = async (query = {}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 25;
  const createdAtFilter = buildCreatedAtFilter(query);
  const fetchLimit = Math.min(limit * 3, 100);

  const [auditLogs, newUsers, companies, jobs, applications, interviews] = await Promise.all([
    prisma.auditLog.findMany({
      where: createdAtFilter ? { createdAt: createdAtFilter } : undefined,
      orderBy: { createdAt: 'desc' },
      take: fetchLimit,
    }),
    prisma.user.findMany({
      where: createdAtFilter ? { createdAt: createdAtFilter } : undefined,
      orderBy: { createdAt: 'desc' },
      take: fetchLimit,
      select: { id: true, fullName: true, email: true, role: true, createdAt: true },
    }),
    prisma.company.findMany({
      where: createdAtFilter ? { createdAt: createdAtFilter } : undefined,
      orderBy: { createdAt: 'desc' },
      take: fetchLimit,
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        owner: { select: { id: true, fullName: true, email: true } },
      },
    }),
    prisma.job.findMany({
      where: createdAtFilter ? { createdAt: createdAtFilter } : undefined,
      orderBy: { createdAt: 'desc' },
      take: fetchLimit,
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        publishedAt: true,
        company: { select: { id: true, name: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    }),
    prisma.application.findMany({
      where: createdAtFilter ? { appliedAt: createdAtFilter } : undefined,
      orderBy: { appliedAt: 'desc' },
      take: fetchLimit,
      select: {
        id: true,
        status: true,
        appliedAt: true,
        candidate: { select: { id: true, fullName: true, email: true } },
        job: { select: { id: true, title: true } },
        company: { select: { id: true, name: true } },
      },
    }),
    prisma.interview.findMany({
      where: createdAtFilter ? { createdAt: createdAtFilter } : undefined,
      orderBy: { createdAt: 'desc' },
      take: fetchLimit,
      select: {
        id: true,
        title: true,
        interviewType: true,
        status: true,
        startTime: true,
        createdAt: true,
        job: { select: { id: true, title: true } },
        company: { select: { id: true, name: true } },
      },
    }),
  ]);

  const actorLookup = await fetchUserLookupMap(auditLogs.map((a) => a.actorId));

  let combined = [
    ...auditLogs.map((a) => ({
      id: `audit-${a.id}`,
      category: 'ADMIN_AUDIT',
      type: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      title: `${a.action.replace(/_/g, ' ')} (${a.entityType})`,
      description: a.reason || `Administrative action performed on ${a.entityType}`,
      actor: a.actorId ? actorLookup.get(a.actorId) || null : null,
      timestamp: a.createdAt,
    })),
    ...newUsers.map((u) => ({
      id: `user-${u.id}`,
      category: 'USER_REGISTRATION',
      type: 'USER_REGISTERED',
      entityType: 'USER',
      entityId: u.id,
      title: `New ${u.role} registered: ${u.fullName}`,
      description: u.email,
      actor: { id: u.id, fullName: u.fullName, email: u.email, role: u.role },
      timestamp: u.createdAt,
    })),
    ...companies.map((c) => ({
      id: `company-${c.id}`,
      category: 'COMPANY',
      type: 'COMPANY_REGISTERED',
      entityType: 'COMPANY',
      entityId: c.id,
      title: `Company registered: ${c.name}`,
      description: `Status: ${c.status}`,
      actor: c.owner,
      timestamp: c.createdAt,
    })),
    ...jobs.map((j) => ({
      id: `job-${j.id}`,
      category: 'JOB',
      type: j.status === 'PUBLISHED' ? 'JOB_PUBLISHED' : 'JOB_CREATED',
      entityType: 'JOB',
      entityId: j.id,
      title: `Job "${j.title}" at ${j.company?.name || 'Company'}`,
      description: `Status: ${j.status}`,
      actor: j.createdBy,
      timestamp: j.publishedAt || j.createdAt,
    })),
    ...applications.map((app) => ({
      id: `app-${app.id}`,
      category: 'APPLICATION',
      type: 'APPLICATION_SUBMITTED',
      entityType: 'APPLICATION',
      entityId: app.id,
      title: `${app.candidate?.fullName || 'Candidate'} applied for "${app.job?.title || 'Job'}"`,
      description: `Company: ${app.company?.name || 'N/A'} • Stage: ${app.status}`,
      actor: app.candidate,
      timestamp: app.appliedAt,
    })),
    ...interviews.map((iv) => ({
      id: `interview-${iv.id}`,
      category: 'INTERVIEW',
      type: 'INTERVIEW_SCHEDULED',
      entityType: 'INTERVIEW',
      entityId: iv.id,
      title: `Interview "${iv.title}" (${iv.interviewType}) for "${iv.job?.title || 'Job'}"`,
      description: `Company: ${iv.company?.name || 'N/A'} • Status: ${iv.status}`,
      actor: null,
      timestamp: iv.createdAt,
    })),
  ];

  if (query.type) {
    const t = query.type.toUpperCase();
    combined = combined.filter(
      (item) => item.category === t || item.type === t || item.entityType === t
    );
  }

  if (query.q) {
    const q = query.q.trim().toLowerCase();
    combined = combined.filter(
      (item) =>
        item.title?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.actor?.fullName?.toLowerCase().includes(q) ||
        item.actor?.email?.toLowerCase().includes(q)
    );
  }

  combined.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const total = combined.length;
  const start = (page - 1) * limit;
  const paginated = combined.slice(start, start + limit);

  return {
    activities: paginated,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

// ============================================================================
// 7. REPORTS & MODERATION QUEUE (USER, COMPANY, JOB)
// ============================================================================

exports.createReport = async (reporter, { entityType, entityId, reason, description }) => {
  if (entityType === 'USER') {
    const u = await prisma.user.findUnique({ where: { id: entityId }, select: { id: true } });
    if (!u) throw new ApiError(404, 'Reported user not found', 'USER_NOT_FOUND');
    if (u.id === reporter.id) throw new ApiError(400, 'You cannot report your own account', 'CANNOT_REPORT_SELF');
  } else if (entityType === 'COMPANY') {
    const c = await prisma.company.findUnique({ where: { id: entityId }, select: { id: true } });
    if (!c) throw new ApiError(404, 'Reported company not found', 'COMPANY_NOT_FOUND');
  } else if (entityType === 'JOB') {
    const j = await prisma.job.findUnique({ where: { id: entityId }, select: { id: true, createdById: true } });
    if (!j) throw new ApiError(404, 'Reported job not found', 'JOB_NOT_FOUND');
    if (j.createdById === reporter.id) {
      throw new ApiError(400, 'You cannot report your own job posting', 'CANNOT_REPORT_OWN_JOB');
    }
  }

  const report = await prisma.report.create({
    data: {
      reportedBy: reporter.id,
      entityType,
      entityId,
      reason,
      description: description || null,
      status: 'OPEN',
    },
  });

  return {
    ...report,
    reporterId: report.reportedBy,
    assignedAdminId: report.assignedTo || null,
    resolutionNotes: report.resolution || null,
  };
};

exports.listReports = async (query = {}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const skip = (page - 1) * limit;

  const where = {};
  if (query.entityType) where.entityType = query.entityType;
  if (query.status) where.status = query.status;
  if (query.assignedAdminId) where.assignedTo = query.assignedAdminId;

  const createdAtFilter = buildCreatedAtFilter(query);
  if (createdAtFilter) where.createdAt = createdAtFilter;

  if (query.q) {
    const q = query.q.trim();
    where.OR = [
      { reason: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [total, items, statusCounts] = await Promise.all([
    prisma.report.count({ where }),
    prisma.report.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { notes: true } },
      },
    }),
    prisma.report.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);

  const userLookup = await fetchUserLookupMap([
    ...items.map((r) => r.reportedBy),
    ...items.map((r) => r.assignedTo),
    ...items.map((r) => r.resolvedBy),
  ]);

  const counts = {
    ALL: 0,
    OPEN: 0,
    UNDER_REVIEW: 0,
    RESOLVED: 0,
    DISMISSED: 0,
  };
  for (const s of statusCounts) {
    counts[s.status] = s._count._all;
    counts.ALL += s._count._all;
  }

  return {
    reports: items.map((r) => ({
      ...r,
      reporterId: r.reportedBy,
      assignedAdminId: r.assignedTo || null,
      resolutionNotes: r.resolution || null,
      reporter: userLookup.get(r.reportedBy) || null,
      assignedAdmin: r.assignedTo ? userLookup.get(r.assignedTo) || null : null,
      resolvedByUser: r.resolvedBy ? userLookup.get(r.resolvedBy) || null : null,
    })),
    counts,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

exports.getReportDetails = async (reportId) => {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      notes: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!report) throw new ApiError(404, 'Report not found', 'REPORT_NOT_FOUND');

  const userLookup = await fetchUserLookupMap([
    report.reportedBy,
    report.assignedTo,
    report.resolvedBy,
    ...(report.notes || []).map((n) => n.authorId),
  ]);

  let targetEntity = null;
  if (report.entityType === 'USER') {
    targetEntity = await prisma.user.findUnique({
      where: { id: report.entityId },
      select: { id: true, fullName: true, email: true, role: true, status: true, createdAt: true },
    });
  } else if (report.entityType === 'COMPANY') {
    targetEntity = await prisma.company.findUnique({
      where: { id: report.entityId },
      select: { id: true, name: true, status: true, industry: true, email: true, website: true, createdAt: true },
    });
  } else if (report.entityType === 'JOB') {
    targetEntity = await prisma.job.findUnique({
      where: { id: report.entityId },
      select: {
        id: true,
        title: true,
        status: true,
        moderationStatus: true,
        reportCount: true,
        createdAt: true,
        company: { select: { id: true, name: true, status: true } },
      },
    });
  }

  return {
    ...report,
    reporterId: report.reportedBy,
    assignedAdminId: report.assignedTo || null,
    resolutionNotes: report.resolution || null,
    reporter: userLookup.get(report.reportedBy) || null,
    assignedAdmin: report.assignedTo ? userLookup.get(report.assignedTo) || null : null,
    resolvedByUser: report.resolvedBy ? userLookup.get(report.resolvedBy) || null : null,
    notes: (report.notes || []).map((n) => ({
      ...n,
      author: n.authorId ? userLookup.get(n.authorId) || null : null,
    })),
    targetEntity,
  };
};

exports.updateReportStatus = async (actor, reportId, { status, resolutionNotes }, req) => {
  const existing = await prisma.report.findUnique({ where: { id: reportId } });
  if (!existing) throw new ApiError(404, 'Report not found', 'REPORT_NOT_FOUND');

  const isTerminal = status === 'RESOLVED' || status === 'DISMISSED';
  const now = new Date();

  const updated = await withTransaction(async (tx) => {
    const r = await tx.report.update({
      where: { id: reportId },
      data: {
        status,
        resolution: resolutionNotes !== undefined ? resolutionNotes : existing.resolution,
        resolvedBy: isTerminal ? actor.id : null,
        resolvedAt: isTerminal ? now : null,
        assignedTo: existing.assignedTo || actor.id,
      },
    });

    if (existing.legacyJobReportId) {
      await tx.jobReport.updateMany({
        where: { id: existing.legacyJobReportId },
        data: {
          status: status === 'OPEN' ? 'OPEN' : status === 'UNDER_REVIEW' ? 'UNDER_REVIEW' : status,
        },
      });
    }

    await recordAudit(
      {
        actor,
        action: `REPORT_STATUS_${status}`,
        entityType: 'REPORT',
        entityId: reportId,
        previousValue: { status: existing.status },
        newValue: { status, resolutionNotes: resolutionNotes || null },
        reason: resolutionNotes || `Report marked as ${status}`,
        req,
      },
      tx
    );

    return r;
  });

  return exports.getReportDetails(updated.id);
};

exports.assignReport = async (actor, reportId, { assignedAdminId }, req) => {
  const existing = await prisma.report.findUnique({ where: { id: reportId } });
  if (!existing) throw new ApiError(404, 'Report not found', 'REPORT_NOT_FOUND');

  if (assignedAdminId) {
    const assignee = await prisma.user.findUnique({
      where: { id: assignedAdminId },
      select: { id: true, role: true, status: true },
    });
    if (!assignee || assignee.role !== 'admin' || assignee.status !== 'active') {
      throw new ApiError(400, 'Assigned user must be an active administrator', 'INVALID_ASSIGNEE');
    }
  }

  await withTransaction(async (tx) => {
    await tx.report.update({
      where: { id: reportId },
      data: {
        assignedTo: assignedAdminId,
        status: existing.status === 'OPEN' && assignedAdminId ? 'UNDER_REVIEW' : existing.status,
      },
    });

    await recordAudit(
      {
        actor,
        action: 'REPORT_ASSIGNED',
        entityType: 'REPORT',
        entityId: reportId,
        previousValue: { assignedAdminId: existing.assignedTo },
        newValue: { assignedAdminId },
        reason: 'Report assignment updated',
        req,
      },
      tx
    );
  });

  return exports.getReportDetails(reportId);
};

exports.addReportNote = async (actor, reportId, { note }, req) => {
  const existing = await prisma.report.findUnique({ where: { id: reportId } });
  if (!existing) throw new ApiError(404, 'Report not found', 'REPORT_NOT_FOUND');

  await withTransaction(async (tx) => {
    await tx.reportNote.create({
      data: {
        reportId,
        authorId: actor.id,
        note,
      },
    });

    await recordAudit(
      {
        actor,
        action: 'REPORT_NOTE_ADDED',
        entityType: 'REPORT',
        entityId: reportId,
        newValue: { note },
        req,
      },
      tx
    );
  });

  return exports.getReportDetails(reportId);
};

// ============================================================================
// 8. PLATFORM ANALYTICS (USERS, COMPANIES, JOBS, RECRUITMENT FUNNEL)
// ============================================================================

exports.getUserAnalytics = async (query = {}) => {
  const { fromDate, toDate, range } = resolveDateRange({
    range: query.range || '30d',
    from: query.from,
    to: query.to,
  });
  const periodFilter = fromDate ? { gte: fromDate, lte: toDate } : undefined;

  const [byRole, byStatus, unverifiedCount, periodUsers] = await Promise.all([
    prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    prisma.user.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.user.count({ where: { emailVerifiedAt: null } }),
    prisma.user.findMany({
      where: periodFilter ? { createdAt: periodFilter } : undefined,
      select: { createdAt: true, role: true, status: true },
    }),
  ]);

  const roles = { candidate: 0, recruiter: 0, admin: 0 };
  for (const r of byRole) roles[r.role] = r._count._all;

  const statuses = { active: 0, suspended: 0, inactive: 0, pendingVerification: unverifiedCount };
  for (const s of byStatus) statuses[s.status] = s._count._all;

  return {
    range,
    from: fromDate ? fromDate.toISOString() : null,
    to: toDate ? toDate.toISOString() : null,
    totals: {
      total: roles.candidate + roles.recruiter + roles.admin,
      candidates: roles.candidate,
      recruiters: roles.recruiter,
      admins: roles.admin,
      ...statuses,
      newInPeriod: periodUsers.length,
    },
    roleDistribution: [
      { role: 'CANDIDATE', count: roles.candidate },
      { role: 'RECRUITER', count: roles.recruiter },
      { role: 'ADMIN', count: roles.admin },
    ],
    statusDistribution: [
      { status: 'ACTIVE', count: statuses.active },
      { status: 'SUSPENDED', count: statuses.suspended },
      { status: 'INACTIVE', count: statuses.inactive },
      { status: 'PENDING_VERIFICATION', count: unverifiedCount },
    ],
    registrationTrend: buildDailyTimeSeries(periodUsers, 'createdAt', fromDate, toDate),
  };
};

exports.getCompanyAnalytics = async (query = {}) => {
  const { fromDate, toDate, range } = resolveDateRange({
    range: query.range || '30d',
    from: query.from,
    to: query.to,
  });
  const periodFilter = fromDate ? { gte: fromDate, lte: toDate } : undefined;

  const [byStatus, byIndustry, bySize, periodCompanies] = await Promise.all([
    prisma.company.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.company.groupBy({
      by: ['industry'],
      _count: { _all: true },
      orderBy: { _count: { industry: 'desc' } },
      take: 10,
    }),
    prisma.company.groupBy({
      by: ['companySize'],
      _count: { _all: true },
    }),
    prisma.company.findMany({
      where: periodFilter ? { createdAt: periodFilter } : undefined,
      select: { createdAt: true, status: true },
    }),
  ]);

  const statusMap = {
    DRAFT: 0,
    PENDING_APPROVAL: 0,
    APPROVED: 0,
    REJECTED: 0,
    SUSPENDED: 0,
  };
  let total = 0;
  for (const s of byStatus) {
    statusMap[s.status] = s._count._all;
    total += s._count._all;
  }

  return {
    range,
    from: fromDate ? fromDate.toISOString() : null,
    to: toDate ? toDate.toISOString() : null,
    totals: {
      total,
      ...statusMap,
      newInPeriod: periodCompanies.length,
    },
    statusDistribution: Object.entries(statusMap).map(([status, count]) => ({ status, count })),
    industryDistribution: byIndustry
      .filter((i) => i.industry)
      .map((i) => ({ industry: i.industry, count: i._count._all })),
    sizeDistribution: bySize
      .filter((s) => s.companySize)
      .map((s) => ({ companySize: s.companySize, count: s._count._all })),
    registrationTrend: buildDailyTimeSeries(periodCompanies, 'createdAt', fromDate, toDate),
  };
};

exports.getJobAnalytics = async (query = {}) => {
  const { fromDate, toDate, range } = resolveDateRange({
    range: query.range || '30d',
    from: query.from,
    to: query.to,
  });
  const periodFilter = fromDate ? { gte: fromDate, lte: toDate } : undefined;

  const [byStatus, byEmploymentType, byWorkMode, byModerationStatus, periodJobs] = await Promise.all([
    prisma.job.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.job.groupBy({ by: ['employmentType'], _count: { _all: true } }),
    prisma.job.groupBy({ by: ['workMode'], _count: { _all: true } }),
    prisma.job.groupBy({ by: ['moderationStatus'], _count: { _all: true } }),
    prisma.job.findMany({
      where: periodFilter ? { createdAt: periodFilter } : undefined,
      select: { createdAt: true, publishedAt: true, status: true },
    }),
  ]);

  let total = 0;
  const statusMap = {};
  for (const s of byStatus) {
    statusMap[s.status] = s._count._all;
    total += s._count._all;
  }

  return {
    range,
    from: fromDate ? fromDate.toISOString() : null,
    to: toDate ? toDate.toISOString() : null,
    totals: {
      total,
      published: statusMap.PUBLISHED || 0,
      pendingApproval: (statusMap.PENDING_APPROVAL || 0) + (statusMap.UNDER_REVIEW || 0),
      closed: statusMap.CLOSED || 0,
      rejected: statusMap.REJECTED || 0,
      paused: statusMap.PAUSED || 0,
      newInPeriod: periodJobs.length,
    },
    statusDistribution: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
    employmentTypeDistribution: byEmploymentType.map((e) => ({
      employmentType: e.employmentType,
      count: e._count._all,
    })),
    workModeDistribution: byWorkMode.map((w) => ({
      workMode: w.workMode,
      count: w._count._all,
    })),
    moderationDistribution: byModerationStatus.map((m) => ({
      moderationStatus: m.moderationStatus,
      count: m._count._all,
    })),
    postingTrend: buildDailyTimeSeries(periodJobs, 'createdAt', fromDate, toDate),
  };
};

exports.getRecruitmentAnalytics = async (query = {}) => {
  const { fromDate, toDate, range } = resolveDateRange({
    range: query.range || '30d',
    from: query.from,
    to: query.to,
  });
  const periodFilter = fromDate ? { gte: fromDate, lte: toDate } : undefined;

  const [byStage, totalInterviews, completedInterviews, selectedDecisions, periodApplications] =
    await Promise.all([
      prisma.application.groupBy({
        by: ['status'],
        where: periodFilter ? { appliedAt: periodFilter } : undefined,
        _count: { _all: true },
      }),
      prisma.interview.count({
        where: periodFilter ? { createdAt: periodFilter } : undefined,
      }),
      prisma.interview.count({
        where: {
          status: 'COMPLETED',
          ...(periodFilter ? { createdAt: periodFilter } : {}),
        },
      }),
      prisma.hiringDecision.count({
        where: {
          decision: 'SELECTED',
          ...(periodFilter ? { decidedAt: periodFilter } : {}),
        },
      }),
      prisma.application.findMany({
        where: periodFilter ? { appliedAt: periodFilter } : undefined,
        select: { appliedAt: true, status: true },
      }),
    ]);

  const stageCounts = {
    SUBMITTED: 0,
    UNDER_REVIEW: 0,
    SHORTLISTED: 0,
    INTERVIEW_SCHEDULED: 0,
    INTERVIEW: 0,
    OFFERED: 0,
    HIRED: 0,
    REJECTED: 0,
    WITHDRAWN: 0,
  };
  let totalApplications = 0;
  for (const s of byStage) {
    stageCounts[s.status] = (stageCounts[s.status] || 0) + s._count._all;
    totalApplications += s._count._all;
  }

  const interviewStageCount = (stageCounts.INTERVIEW_SCHEDULED || 0) + (stageCounts.INTERVIEW || 0);
  const progressedToShortlist =
    stageCounts.SHORTLISTED + interviewStageCount + stageCounts.OFFERED + stageCounts.HIRED;
  const progressedToInterview =
    interviewStageCount + stageCounts.OFFERED + stageCounts.HIRED;
  const progressedToOffer = stageCounts.OFFERED + stageCounts.HIRED;
  const hiredCount = Math.max(stageCounts.HIRED, selectedDecisions);

  const pct = (num, den) => (den > 0 ? Number(((num / den) * 100).toFixed(1)) : 0);

  return {
    range,
    from: fromDate ? fromDate.toISOString() : null,
    to: toDate ? toDate.toISOString() : null,
    totals: {
      totalApplications,
      shortlisted: progressedToShortlist,
      interviewsScheduled: totalInterviews,
      interviewsCompleted: completedInterviews,
      offersExtended: progressedToOffer,
      offersAccepted: hiredCount,
      hired: hiredCount,
      rejected: stageCounts.REJECTED,
      withdrawn: stageCounts.WITHDRAWN,
    },
    conversionRates: {
      applicationToShortlistPct: pct(progressedToShortlist, totalApplications),
      shortlistToInterviewPct: pct(progressedToInterview, progressedToShortlist || totalApplications),
      interviewToOfferPct: pct(progressedToOffer, progressedToInterview || totalApplications),
      offerToHirePct: pct(hiredCount, progressedToOffer || totalApplications),
      overallHireRatePct: pct(hiredCount, totalApplications),
    },
    funnel: [
      { stage: 'SUBMITTED', label: 'Applications Submitted', count: totalApplications },
      { stage: 'SHORTLISTED', label: 'Shortlisted', count: progressedToShortlist },
      { stage: 'INTERVIEW', label: 'Interview Stage', count: progressedToInterview },
      { stage: 'OFFERED', label: 'Offer Extended', count: progressedToOffer },
      { stage: 'HIRED', label: 'Hired', count: hiredCount },
    ],
    stageBreakdown: Object.entries(stageCounts).map(([status, count]) => ({ status, count })),
    applicationTrend: buildDailyTimeSeries(periodApplications, 'appliedAt', fromDate, toDate),
  };
};

// ============================================================================
// 9. ADMINISTRATOR ROLE & PERMISSION GOVERNANCE
// ============================================================================

exports.getCurrentAdminProfile = async (actor) => {
  const user = await prisma.user.findUnique({
    where: { id: actor.id },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      adminRole: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
  if (!user) throw new ApiError(404, 'Administrator not found', 'ADMIN_NOT_FOUND');

  const [adminUserPermissions, permissions] = await Promise.all([
    prisma.adminUserPermission.findMany({ where: { userId: user.id } }),
    resolveUserPermissions(user.id, user.adminRole || 'ADMIN'),
  ]);

  return {
    ...user,
    adminUserPermissions,
    permissions,
  };
};

exports.listAdministrators = async () => {
  const admins = await prisma.user.findMany({
    where: { role: 'admin' },
    orderBy: [{ adminRole: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      adminRole: true,
      status: true,
      emailVerifiedAt: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  const allOverrides = await prisma.adminUserPermission.findMany({
    where: { userId: { in: admins.map((a) => a.id) } },
  });
  const overrideByUser = new Map();
  for (const ov of allOverrides) {
    if (!overrideByUser.has(ov.userId)) overrideByUser.set(ov.userId, []);
    overrideByUser.get(ov.userId).push(ov);
  }

  const enriched = await Promise.all(
    admins.map(async (a) => ({
      ...a,
      adminUserPermissions: overrideByUser.get(a.id) || [],
      effectivePermissions: await resolveUserPermissions(a.id, a.adminRole || 'ADMIN'),
    }))
  );

  return {
    administrators: enriched,
    roles: ADMIN_ROLE_LIST,
  };
};

exports.createAdministrator = async (actor, { email, fullName, password, adminRole, reason }, req) => {
  if (adminRole === ADMIN_ROLES.SUPER_ADMIN && actor.adminRole !== ADMIN_ROLES.SUPER_ADMIN) {
    throw new ApiError(403, 'Only a SUPER_ADMIN can assign the SUPER_ADMIN role', 'SUPER_ADMIN_ONLY');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  const now = new Date();

  const createdOrPromoted = await withTransaction(async (tx) => {
    let user;
    const previousRole = existing?.adminRole || null;

    if (existing) {
      if (existing.role === 'admin' && existing.adminRole === adminRole && existing.status === 'active') {
        throw new ApiError(409, 'User is already an active administrator with this role', 'ALREADY_ADMIN');
      }
      user = await tx.user.update({
        where: { id: existing.id },
        data: {
          role: 'admin',
          adminRole,
          status: 'active',
          fullName: fullName || existing.fullName,
          emailVerifiedAt: existing.emailVerifiedAt || now,
          statusChangedAt: now,
          ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
        },
      });
    } else {
      if (!password) {
        throw new ApiError(400, 'Password is required when creating a new administrator account', 'PASSWORD_REQUIRED');
      }
      const passwordHash = await bcrypt.hash(password, 12);
      user = await tx.user.create({
        data: {
          email,
          fullName: fullName || email.split('@')[0],
          passwordHash,
          role: 'admin',
          adminRole,
          status: 'active',
          emailVerifiedAt: now,
          statusChangedAt: now,
        },
      });
    }

    await tx.adminRoleHistory.create({
      data: {
        userId: user.id,
        changeType: existing ? 'ROLE' : 'CREATED',
        previousRole,
        newRole: adminRole,
        changedBy: actor.id,
        reason: reason || 'Assigned administrative role',
      },
    });

    await recordAudit(
      {
        actor,
        action: existing ? 'ADMIN_ROLE_ASSIGNED' : 'ADMIN_ACCOUNT_CREATED',
        entityType: 'USER',
        entityId: user.id,
        previousValue: existing ? { role: existing.role, adminRole: previousRole } : null,
        newValue: { email: user.email, role: 'admin', adminRole },
        reason: reason || 'Assigned administrative role',
        req,
      },
      tx
    );

    return user;
  });

  const effectivePermissions = await resolveUserPermissions(
    createdOrPromoted.id,
    createdOrPromoted.adminRole
  );

  return {
    id: createdOrPromoted.id,
    email: createdOrPromoted.email,
    fullName: createdOrPromoted.fullName,
    role: createdOrPromoted.role,
    adminRole: createdOrPromoted.adminRole,
    status: createdOrPromoted.status,
    effectivePermissions,
  };
};

exports.updateAdministratorRole = async (actor, targetUserId, { adminRole, demoteToRole, reason }, req) => {
  if (actor.id === targetUserId) {
    throw new ApiError(400, 'Administrators cannot modify their own administrative role', 'CANNOT_CHANGE_OWN_ROLE');
  }

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');

  if (
    (target.adminRole === ADMIN_ROLES.SUPER_ADMIN || adminRole === ADMIN_ROLES.SUPER_ADMIN) &&
    actor.adminRole !== ADMIN_ROLES.SUPER_ADMIN
  ) {
    throw new ApiError(
      403,
      'Only a SUPER_ADMIN can assign or revoke the SUPER_ADMIN role',
      'SUPER_ADMIN_ONLY'
    );
  }

  if (target.adminRole === ADMIN_ROLES.SUPER_ADMIN && adminRole !== ADMIN_ROLES.SUPER_ADMIN) {
    const activeSuperCount = await prisma.user.count({
      where: { role: 'admin', adminRole: 'SUPER_ADMIN', status: 'active' },
    });
    if (activeSuperCount <= 1) {
      throw new ApiError(
        400,
        'Cannot demote the last active SUPER_ADMIN account',
        'LAST_SUPER_ADMIN_PROTECTED'
      );
    }
  }

  const previousAdminRole = target.adminRole || null;

  const updated = await withTransaction(async (tx) => {
    let u;
    if (adminRole === null) {
      const nextBaseRole = demoteToRole || 'candidate';
      u = await tx.user.update({
        where: { id: targetUserId },
        data: {
          role: nextBaseRole,
          adminRole: null,
        },
      });
      await tx.adminUserPermission.deleteMany({ where: { userId: targetUserId } });
      await authRepo.revokeAllUserTokens(targetUserId, tx);
    } else {
      u = await tx.user.update({
        where: { id: targetUserId },
        data: {
          role: 'admin',
          adminRole,
        },
      });
    }

    await tx.adminRoleHistory.create({
      data: {
        userId: targetUserId,
        changeType: 'ROLE',
        previousRole: previousAdminRole,
        newRole: adminRole,
        changedBy: actor.id,
        reason,
      },
    });

    await recordAudit(
      {
        actor,
        action: adminRole ? 'ADMIN_ROLE_CHANGED' : 'ADMIN_ROLE_REVOKED',
        entityType: 'USER',
        entityId: targetUserId,
        previousValue: { role: target.role, adminRole: previousAdminRole },
        newValue: { role: u.role, adminRole: u.adminRole },
        reason,
        req,
      },
      tx
    );

    return u;
  });

  const effectivePermissions = updated.adminRole
    ? await resolveUserPermissions(updated.id, updated.adminRole)
    : [];

  return {
    id: updated.id,
    email: updated.email,
    fullName: updated.fullName,
    role: updated.role,
    adminRole: updated.adminRole,
    status: updated.status,
    effectivePermissions,
  };
};

exports.updateAdministratorPermissions = async (actor, targetUserId, { overrides, reason }, req) => {
  if (actor.id === targetUserId) {
    throw new ApiError(400, 'Administrators cannot modify their own permission overrides', 'CANNOT_MODIFY_SELF_PERMISSIONS');
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
  });
  if (!target || target.role !== 'admin') {
    throw new ApiError(404, 'Administrator account not found', 'ADMIN_NOT_FOUND');
  }

  if (target.adminRole === ADMIN_ROLES.SUPER_ADMIN) {
    throw new ApiError(400, 'SUPER_ADMIN holds all permissions unconditionally and cannot be overridden', 'SUPER_ADMIN_IMMUTABLE_PERMISSIONS');
  }

  const existingOverrides = await prisma.adminUserPermission.findMany({
    where: { userId: targetUserId },
  });

  const actorPerms = Array.isArray(actor.permissions)
    ? actor.permissions
    : await resolveUserPermissions(actor.id, actor.adminRole || 'ADMIN');

  for (const ov of overrides) {
    if (ov.effect === 'GRANT' && !actorPerms.includes(ov.permission)) {
      throw new ApiError(
        403,
        `Cannot grant permission "${ov.permission}" that you do not possess`,
        'PRIVILEGE_ESCALATION_DENIED'
      );
    }
  }

  await withTransaction(async (tx) => {
    await tx.adminUserPermission.deleteMany({ where: { userId: targetUserId } });

    if (overrides.length > 0) {
      await tx.adminUserPermission.createMany({
        data: overrides.map((ov) => ({
          userId: targetUserId,
          permission: ov.permission,
          effect: ov.effect,
          grantedBy: actor.id,
        })),
      });
    }

    await tx.adminRoleHistory.create({
      data: {
        userId: targetUserId,
        changeType: 'PERMISSIONS',
        previousRole: target.adminRole,
        newRole: target.adminRole,
        previousPermissions: existingOverrides,
        newPermissions: overrides,
        changedBy: actor.id,
        reason: reason || 'Updated administrator permission overrides',
      },
    });

    await recordAudit(
      {
        actor,
        action: 'ADMIN_USER_PERMISSIONS_UPDATED',
        entityType: 'USER',
        entityId: targetUserId,
        previousValue: {
          overrides: existingOverrides.map((p) => ({ permission: p.permission, effect: p.effect })),
        },
        newValue: { overrides },
        reason: reason || 'Updated administrator permission overrides',
        req,
      },
      tx
    );
  });

  const effectivePermissions = await resolveUserPermissions(target.id, target.adminRole);
  return {
    userId: target.id,
    adminRole: target.adminRole,
    overrides,
    effectivePermissions,
  };
};

exports.getPermissionsCatalogAndMatrix = async () => {
  const rows = await prisma.adminRolePermission.findMany({
    orderBy: [{ role: 'asc' }, { permission: 'asc' }],
  });

  const roleMatrix = {};
  for (const r of ADMIN_ROLE_LIST) {
    roleMatrix[r] = [];
  }
  for (const row of rows) {
    if (!roleMatrix[row.role]) roleMatrix[row.role] = [];
    roleMatrix[row.role].push(row.permission);
  }
  roleMatrix[ADMIN_ROLES.SUPER_ADMIN] = [...ALL_PERMISSION_KEYS];

  for (const r of ADMIN_ROLE_LIST) {
    if (r !== ADMIN_ROLES.SUPER_ADMIN && (!roleMatrix[r] || roleMatrix[r].length === 0)) {
      roleMatrix[r] = [...(DEFAULT_ROLE_PERMISSIONS[r] || [])];
    }
  }

  return {
    roles: ADMIN_ROLE_LIST,
    catalog: PERMISSIONS_CATALOG,
    roleMatrix,
  };
};

exports.updateRolePermissions = async (actor, role, { permissions, reason }, req) => {
  if (role === ADMIN_ROLES.SUPER_ADMIN) {
    throw new ApiError(400, 'SUPER_ADMIN permissions cannot be restricted', 'SUPER_ADMIN_IMMUTABLE');
  }

  const uniquePerms = Array.from(new Set(permissions));
  const previousRows = await prisma.adminRolePermission.findMany({
    where: { role },
    select: { permission: true },
  });

  await withTransaction(async (tx) => {
    await tx.adminRolePermission.deleteMany({ where: { role } });
    if (uniquePerms.length > 0) {
      await tx.adminRolePermission.createMany({
        data: uniquePerms.map((permission) => ({
          role,
          permission,
        })),
      });
    }

    await recordAudit(
      {
        actor,
        action: 'ADMIN_ROLE_PERMISSIONS_UPDATED',
        entityType: 'ADMIN_ROLE',
        entityId: role,
        previousValue: { permissions: previousRows.map((r) => r.permission) },
        newValue: { permissions: uniquePerms },
        reason: reason || `Updated permissions for role ${role}`,
        req,
      },
      tx
    );
  });

  return exports.getPermissionsCatalogAndMatrix();
};
