'use strict';

const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const { recordAudit } = require('../../services/audit.service');
const { resolveUserPermissions } = require('../admin/admin.permissions');
const { resolveDateRange, getUserCompanyAccess } = require('../analytics/analytics.service');

const MAX_EXPORT_ROWS = 2000;

const REPORT_DEFINITIONS = Object.freeze({
  users: {
    type: 'users',
    title: 'Users Report',
    description: 'Platform user accounts, roles, account statuses, registration dates, and login activity.',
    allowedRoles: ['admin'],
    requiredAdminPermissions: ['users.read', 'reports.read'],
    availableFilters: ['range', 'q', 'role', 'status'],
    columns: [
      { key: 'id', label: 'User ID' },
      { key: 'fullName', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role' },
      { key: 'adminRole', label: 'Admin Role' },
      { key: 'accountStatus', label: 'Account Status' },
      { key: 'registrationDate', label: 'Registration Date' },
      { key: 'lastLoginAt', label: 'Last Login' },
    ],
  },
  candidates: {
    type: 'candidates',
    title: 'Candidates Report',
    description: 'Candidate profiles, application activity, interview counts, and hiring progression.',
    allowedRoles: ['admin'],
    requiredAdminPermissions: ['users.read', 'reports.read'],
    availableFilters: ['range', 'q', 'status'],
    columns: [
      { key: 'id', label: 'Candidate ID' },
      { key: 'candidateName', label: 'Candidate Name' },
      { key: 'email', label: 'Email' },
      { key: 'location', label: 'Location' },
      { key: 'experienceYears', label: 'Experience (Yrs)' },
      { key: 'skillsCount', label: 'Skills Count' },
      { key: 'totalApplications', label: 'Total Applications' },
      { key: 'interviewCount', label: 'Interview Count' },
      { key: 'hiringStatus', label: 'Hiring Status' },
      { key: 'registrationDate', label: 'Registration Date' },
    ],
  },
  recruiters: {
    type: 'recruiters',
    title: 'Recruiters Report',
    description: 'Recruiter accounts, associated companies, job creation, applications received, and hiring outcomes.',
    allowedRoles: ['admin', 'recruiter'],
    requiredAdminPermissions: ['users.read', 'reports.read'],
    availableFilters: ['range', 'q', 'companyId'],
    columns: [
      { key: 'id', label: 'Recruiter ID' },
      { key: 'recruiterName', label: 'Recruiter Name' },
      { key: 'email', label: 'Email' },
      { key: 'associatedCompanies', label: 'Associated Companies' },
      { key: 'jobsCreated', label: 'Jobs Created' },
      { key: 'publishedJobs', label: 'Published Jobs' },
      { key: 'applicationsReceived', label: 'Applications Received' },
      { key: 'interviewsScheduled', label: 'Interviews Scheduled' },
      { key: 'candidatesHired', label: 'Candidates Hired' },
    ],
  },
  companies: {
    type: 'companies',
    title: 'Companies Report',
    description: 'Registered companies, verification status, recruiters count, jobs inventory, and hires.',
    allowedRoles: ['admin', 'recruiter'],
    requiredAdminPermissions: ['companies.read', 'reports.read'],
    availableFilters: ['range', 'q', 'status', 'companyId'],
    columns: [
      { key: 'id', label: 'Company ID' },
      { key: 'companyName', label: 'Company Name' },
      { key: 'industry', label: 'Industry' },
      { key: 'companyStatus', label: 'Company Status' },
      { key: 'registrationDate', label: 'Registration Date' },
      { key: 'recruitersCount', label: 'Number of Recruiters' },
      { key: 'totalJobs', label: 'Total Jobs' },
      { key: 'publishedJobs', label: 'Published Jobs' },
      { key: 'applicationsReceived', label: 'Applications Received' },
      { key: 'candidatesHired', label: 'Candidates Hired' },
    ],
  },
  jobs: {
    type: 'jobs',
    title: 'Jobs Report',
    description: 'Job listings, employment types, work modes, moderation statuses, and application counts.',
    allowedRoles: ['admin', 'recruiter'],
    requiredAdminPermissions: ['jobs.read', 'reports.read'],
    availableFilters: ['range', 'q', 'companyId', 'status', 'employmentType', 'workMode'],
    columns: [
      { key: 'id', label: 'Job ID' },
      { key: 'jobTitle', label: 'Job Title' },
      { key: 'companyName', label: 'Company' },
      { key: 'employmentType', label: 'Employment Type' },
      { key: 'workMode', label: 'Work Mode' },
      { key: 'jobStatus', label: 'Job Status' },
      { key: 'moderationStatus', label: 'Moderation Status' },
      { key: 'creationDate', label: 'Creation Date' },
      { key: 'publishingDate', label: 'Publishing Date' },
      { key: 'applicationCount', label: 'Application Count' },
      { key: 'closingDate', label: 'Closing Date' },
    ],
  },
  applications: {
    type: 'applications',
    title: 'Applications Report',
    description: 'Candidate job applications, pipeline stages, submission dates, and status updates.',
    allowedRoles: ['admin', 'recruiter', 'candidate'],
    requiredAdminPermissions: ['applications.read', 'reports.read'],
    availableFilters: ['range', 'q', 'companyId', 'jobId', 'status'],
    columns: [
      { key: 'id', label: 'Application ID' },
      { key: 'candidateName', label: 'Candidate' },
      { key: 'jobTitle', label: 'Job' },
      { key: 'companyName', label: 'Company' },
      { key: 'appliedDate', label: 'Applied Date' },
      { key: 'currentStatus', label: 'Current Status' },
      { key: 'lastUpdatedDate', label: 'Last Updated Date' },
    ],
  },
  interviews: {
    type: 'interviews',
    title: 'Interviews Report',
    description: 'Scheduled, completed, and cancelled interview rounds across jobs and companies.',
    allowedRoles: ['admin', 'recruiter'],
    requiredAdminPermissions: ['applications.read', 'reports.read'],
    availableFilters: ['range', 'q', 'companyId', 'jobId', 'status'],
    columns: [
      { key: 'id', label: 'Interview ID' },
      { key: 'applicationId', label: 'Application ID' },
      { key: 'jobTitle', label: 'Job Title' },
      { key: 'candidateName', label: 'Candidate' },
      { key: 'companyName', label: 'Company' },
      { key: 'interviewDate', label: 'Interview Date' },
      { key: 'interviewType', label: 'Interview Type' },
      { key: 'interviewMode', label: 'Mode' },
      { key: 'interviewStatus', label: 'Interview Status' },
      { key: 'hiringOutcome', label: 'Hiring Outcome' },
    ],
  },
  hiring: {
    type: 'hiring',
    title: 'Hiring Decisions Report',
    description: 'Formal hiring selections, holds, rejections, and final application stage transitions.',
    allowedRoles: ['admin', 'recruiter'],
    requiredAdminPermissions: ['applications.read', 'reports.read'],
    availableFilters: ['range', 'q', 'companyId', 'jobId', 'decision'],
    columns: [
      { key: 'id', label: 'Decision ID' },
      { key: 'applicationId', label: 'Application ID' },
      { key: 'jobTitle', label: 'Job Title' },
      { key: 'candidateName', label: 'Candidate' },
      { key: 'companyName', label: 'Company' },
      { key: 'decision', label: 'Hiring Outcome' },
      { key: 'applicationStatus', label: 'Application Status' },
      { key: 'decidedBy', label: 'Decided By' },
      { key: 'decidedAt', label: 'Decision Date' },
    ],
  },
  'platform-activity': {
    type: 'platform-activity',
    title: 'Platform Activity Report',
    description: 'Audit and platform governance activity log across users, companies, jobs, and moderation.',
    allowedRoles: ['admin'],
    requiredAdminPermissions: ['activities.read', 'audit_logs.read', 'reports.read'],
    availableFilters: ['range', 'q', 'status'],
    columns: [
      { key: 'id', label: 'Activity ID' },
      { key: 'action', label: 'Action' },
      { key: 'entityType', label: 'Entity Type' },
      { key: 'entityId', label: 'Entity ID' },
      { key: 'actorRole', label: 'Actor Role' },
      { key: 'reason', label: 'Reason / Details' },
      { key: 'createdAt', label: 'Timestamp' },
    ],
  },
});

async function assertUserCanAccessReport(currentUser, reportType, query = {}, isExport = false) {
  const def = REPORT_DEFINITIONS[reportType];
  if (!def) {
    throw new ApiError(404, `Unknown report type: ${reportType}`, 'INVALID_REPORT_TYPE');
  }

  if (!def.allowedRoles.includes(currentUser.role)) {
    throw new ApiError(
      403,
      `Your role (${currentUser.role}) is not authorized to access the ${def.title}`,
      'FORBIDDEN_REPORT_ACCESS'
    );
  }

  if (currentUser.role === 'admin') {
    const perms = await resolveUserPermissions(
      currentUser.id,
      currentUser.adminRole || 'ADMIN'
    );
    const hasReadPerm = def.requiredAdminPermissions.some((p) => perms.includes(p));
    if (!hasReadPerm) {
      throw new ApiError(
        403,
        'Insufficient administrative permissions for this report',
        'INSUFFICIENT_PERMISSIONS'
      );
    }
    if (isExport && !perms.includes('reports.export') && !perms.includes('reports.read')) {
      throw new ApiError(
        403,
        'You do not have permission to export platform reports',
        'INSUFFICIENT_EXPORT_PERMISSIONS'
      );
    }
    return { def, scope: 'ADMIN', companyIds: undefined, perms };
  }

  if (currentUser.role === 'recruiter') {
    const access = await getUserCompanyAccess(currentUser.id);
    if (query.companyId && !access.companyMap.has(query.companyId)) {
      throw new ApiError(
        403,
        'You do not have permission to access reports for this company',
        'FORBIDDEN_COMPANY_ACCESS'
      );
    }
    // For company-wide recruiter/company reports when a specific companyId is requested,
    // verify the user is OWNER or ADMIN of that company if accessing `recruiters` report
    if (reportType === 'recruiters' && query.companyId) {
      const roleInCompany = access.companyMap.get(query.companyId)?.myRole;
      if (!['OWNER', 'ADMIN'].includes(roleInCompany)) {
        throw new ApiError(
          403,
          'Only company owners and company administrators can access team recruiter reports',
          'FORBIDDEN_COMPANY_REPORT'
        );
      }
    }

    const scopedCompanyIds = query.companyId ? [query.companyId] : access.companyIds;
    return { def, scope: 'RECRUITER', companyIds: scopedCompanyIds, access };
  }

  // Candidate scope (only `applications`)
  return { def, scope: 'CANDIDATE', candidateId: currentUser.id };
}

async function listAvailableReports(currentUser) {
  let adminPerms = [];
  if (currentUser.role === 'admin') {
    adminPerms = await resolveUserPermissions(
      currentUser.id,
      currentUser.adminRole || 'ADMIN'
    );
  }

  const available = Object.values(REPORT_DEFINITIONS).filter((def) => {
    if (!def.allowedRoles.includes(currentUser.role)) return false;
    if (currentUser.role === 'admin') {
      return def.requiredAdminPermissions.some((p) => adminPerms.includes(p));
    }
    return true;
  });

  return {
    reports: available.map((d) => ({
      type: d.type,
      title: d.title,
      description: d.description,
      availableFilters: d.availableFilters,
      columns: d.columns,
    })),
  };
}

function deriveUserStatusBadge(user) {
  if (user.status === 'suspended') return 'SUSPENDED';
  if (user.status === 'inactive') return 'INACTIVE';
  if (!user.emailVerifiedAt) return 'PENDING_VERIFICATION';
  return 'ACTIVE';
}

async function generateReport(currentUser, reportType, query = {}, options = { isExport: false }) {
  const authContext = await assertUserCanAccessReport(
    currentUser,
    reportType,
    query,
    options.isExport
  );
  const { def, companyIds, candidateId } = authContext;

  const page = options.isExport ? 1 : Math.max(1, Number(query.page) || 1);
  const limit = options.isExport
    ? MAX_EXPORT_ROWS
    : Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const hasDateFilter = Boolean(query.range && query.range !== 'all') || Boolean(query.from || query.to);
  const { range, start, end } = resolveDateRange(
    hasDateFilter ? query : { range: 'all' }
  );
  const q = query.q ? String(query.q).trim() : '';

  // If recruiter has 0 companies, return empty report immediately
  if (authContext.scope === 'RECRUITER' && Array.isArray(companyIds) && companyIds.length === 0) {
    return {
      reportType: def.type,
      title: def.title,
      description: def.description,
      columns: def.columns,
      availableFilters: def.availableFilters,
      rows: [],
      pagination: { page, limit, total: 0, totalPages: 1 },
    };
  }

  let rows = [];
  let total = 0;

  // ── 1. USERS REPORT ──────────────────────────────────────────────────────
  if (reportType === 'users') {
    const where = {};
    if (hasDateFilter) where.createdAt = { gte: start, lte: end };
    if (query.role && query.role !== 'ALL') {
      where.role = String(query.role).toLowerCase();
    }
    if (query.status && query.status !== 'ALL') {
      const st = String(query.status).toUpperCase();
      if (st === 'SUSPENDED') where.status = 'suspended';
      else if (st === 'INACTIVE') where.status = 'inactive';
      else if (st === 'ACTIVE') {
        where.status = 'active';
        where.emailVerifiedAt = { not: null };
      } else if (st === 'PENDING_VERIFICATION') {
        where.status = 'active';
        where.emailVerifiedAt = null;
      }
    }
    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, count] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    total = count;
    rows = items.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      role: u.role.toUpperCase(),
      adminRole: u.adminRole || '—',
      accountStatus: deriveUserStatusBadge(u),
      registrationDate: u.createdAt,
      lastLoginAt: u.lastLoginAt || null,
    }));
  }

  // ── 2. CANDIDATES REPORT ─────────────────────────────────────────────────
  else if (reportType === 'candidates') {
    const where = { role: 'candidate' };
    if (hasDateFilter) where.createdAt = { gte: start, lte: end };
    if (query.status && query.status !== 'ALL') {
      const st = String(query.status).toUpperCase();
      if (st === 'SUSPENDED') where.status = 'suspended';
      else if (st === 'INACTIVE') where.status = 'inactive';
      else if (st === 'ACTIVE') where.status = 'active';
    }
    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, count] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          candidateProfile: {
            select: { city: true, state: true, country: true, yearsOfExperience: true, skills: true },
          },
          candidateApplications: {
            select: { status: true },
          },
          _count: {
            select: { candidateInterviews: true, candidateSkills: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    total = count;
    rows = items.map((u) => {
      const apps = u.candidateApplications || [];
      let hiringStatus = 'NO_APPLICATIONS';
      if (apps.some((a) => a.status === 'HIRED')) hiringStatus = 'HIRED';
      else if (apps.some((a) => a.status === 'OFFERED')) hiringStatus = 'OFFERED';
      else if (apps.some((a) => ['INTERVIEW', 'SHORTLISTED'].includes(a.status))) {
        hiringStatus = 'IN_INTERVIEW_PIPELINE';
      } else if (apps.length > 0) {
        hiringStatus = 'APPLIED';
      }

      const loc = [
        u.candidateProfile?.city,
        u.candidateProfile?.state,
        u.candidateProfile?.country,
      ]
        .filter(Boolean)
        .join(', ');

      return {
        id: u.id,
        candidateName: u.fullName,
        email: u.email,
        location: loc || '—',
        experienceYears:
          u.candidateProfile?.yearsOfExperience !== null &&
          u.candidateProfile?.yearsOfExperience !== undefined
            ? Number(u.candidateProfile.yearsOfExperience)
            : 0,
        skillsCount: Math.max(
          u._count?.candidateSkills || 0,
          u.candidateProfile?.skills?.length || 0
        ),
        totalApplications: apps.length,
        interviewCount: u._count?.candidateInterviews || 0,
        hiringStatus,
        registrationDate: u.createdAt,
      };
    });
  }

  // ── 3. RECRUITERS REPORT ─────────────────────────────────────────────────
  else if (reportType === 'recruiters') {
    const where = { role: 'recruiter' };
    if (hasDateFilter) where.createdAt = { gte: start, lte: end };
    if (companyIds) {
      where.OR = [
        { ownedCompanies: { some: { id: { in: companyIds } } } },
        {
          companyMemberships: {
            some: { companyId: { in: companyIds }, membershipStatus: 'ACTIVE' },
          },
        },
      ];
    }
    if (q) {
      where.AND = [
        {
          OR: [
            { fullName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [items, count] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          ownedCompanies: { select: { id: true, name: true } },
          companyMemberships: {
            where: { membershipStatus: 'ACTIVE' },
            include: { company: { select: { id: true, name: true } } },
          },
          createdJobs: {
            where: companyIds ? { companyId: { in: companyIds } } : undefined,
            select: {
              id: true,
              status: true,
              applications: { select: { status: true } },
              _count: { select: { interviews: true } },
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    total = count;
    rows = items.map((u) => {
      const compNames = new Set();
      for (const c of u.ownedCompanies || []) compNames.add(c.name);
      for (const m of u.companyMemberships || []) {
        if (m.company?.name) compNames.add(m.company.name);
      }

      const jobs = u.createdJobs || [];
      const publishedJobs = jobs.filter((j) => j.status === 'PUBLISHED').length;
      let applicationsReceived = 0;
      let interviewsScheduled = 0;
      let candidatesHired = 0;

      for (const j of jobs) {
        const apps = j.applications || [];
        applicationsReceived += apps.length;
        interviewsScheduled += j._count?.interviews || 0;
        candidatesHired += apps.filter((a) => a.status === 'HIRED').length;
      }

      return {
        id: u.id,
        recruiterName: u.fullName,
        email: u.email,
        associatedCompanies: Array.from(compNames).join(', ') || '—',
        jobsCreated: jobs.length,
        publishedJobs,
        applicationsReceived,
        interviewsScheduled,
        candidatesHired,
      };
    });
  }

  // ── 4. COMPANIES REPORT ──────────────────────────────────────────────────
  else if (reportType === 'companies') {
    const where = {};
    if (companyIds) where.id = { in: companyIds };
    if (hasDateFilter) where.createdAt = { gte: start, lte: end };
    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { industry: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, count] = await Promise.all([
      prisma.company.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          memberships: { where: { membershipStatus: 'ACTIVE' }, select: { userId: true } },
          jobs: { select: { status: true } },
          applications: { select: { status: true } },
        },
      }),
      prisma.company.count({ where }),
    ]);

    total = count;
    rows = items.map((c) => {
      const memberSet = new Set((c.memberships || []).map((m) => m.userId));
      if (c.ownerId) memberSet.add(c.ownerId);

      const jobs = c.jobs || [];
      const apps = c.applications || [];
      return {
        id: c.id,
        companyName: c.name,
        industry: c.industry || 'Unspecified',
        companyStatus: c.status,
        registrationDate: c.createdAt,
        recruitersCount: memberSet.size,
        totalJobs: jobs.length,
        publishedJobs: jobs.filter((j) => j.status === 'PUBLISHED').length,
        applicationsReceived: apps.length,
        candidatesHired: apps.filter((a) => a.status === 'HIRED').length,
      };
    });
  }

  // ── 5. JOBS REPORT ───────────────────────────────────────────────────────
  else if (reportType === 'jobs') {
    const where = {};
    if (companyIds) where.companyId = { in: companyIds };
    if (hasDateFilter) where.createdAt = { gte: start, lte: end };
    if (query.status && query.status !== 'ALL') where.status = query.status;
    if (query.employmentType && query.employmentType !== 'ALL') {
      where.employmentType = query.employmentType;
    }
    if (query.workMode && query.workMode !== 'ALL') {
      where.workMode = query.workMode;
    }
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { department: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, count] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          company: { select: { id: true, name: true } },
          _count: { select: { applications: true } },
        },
      }),
      prisma.job.count({ where }),
    ]);

    total = count;
    rows = items.map((j) => ({
      id: j.id,
      jobTitle: j.title,
      companyName: j.company?.name || '—',
      employmentType: j.employmentType,
      workMode: j.workMode,
      jobStatus: j.status,
      moderationStatus: j.moderationStatus,
      creationDate: j.createdAt,
      publishingDate: j.publishedAt || null,
      applicationCount: j._count?.applications || 0,
      closingDate: j.closedAt || j.applicationDeadline || null,
    }));
  }

  // ── 6. APPLICATIONS REPORT ───────────────────────────────────────────────
  else if (reportType === 'applications') {
    const where = {};
    if (candidateId) where.candidateId = candidateId;
    if (companyIds) where.companyId = { in: companyIds };
    if (query.jobId) where.jobId = query.jobId;
    if (hasDateFilter) where.appliedAt = { gte: start, lte: end };
    if (query.status && query.status !== 'ALL') where.status = query.status;
    if (q) {
      where.OR = [
        { candidate: { fullName: { contains: q, mode: 'insensitive' } } },
        { job: { title: { contains: q, mode: 'insensitive' } } },
        { company: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [items, count] = await Promise.all([
      prisma.application.findMany({
        where,
        orderBy: { appliedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          status: true,
          appliedAt: true,
          lastStatusUpdatedAt: true,
          candidate: { select: { id: true, fullName: true } },
          job: { select: { id: true, title: true } },
          company: { select: { id: true, name: true } },
        },
      }),
      prisma.application.count({ where }),
    ]);

    total = count;
    rows = items.map((a) => ({
      id: a.id,
      candidateName: a.candidate?.fullName || 'Candidate',
      jobTitle: a.job?.title || 'Job',
      companyName: a.company?.name || 'Company',
      appliedDate: a.appliedAt,
      currentStatus: a.status,
      lastUpdatedDate: a.lastStatusUpdatedAt,
    }));
  }

  // ── 7. INTERVIEWS REPORT ─────────────────────────────────────────────────
  else if (reportType === 'interviews') {
    const where = {};
    if (companyIds) where.companyId = { in: companyIds };
    if (query.jobId) where.jobId = query.jobId;
    if (hasDateFilter) where.startTime = { gte: start, lte: end };
    if (query.status && query.status !== 'ALL') where.status = query.status;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { candidate: { fullName: { contains: q, mode: 'insensitive' } } },
        { job: { title: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [items, count] = await Promise.all([
      prisma.interview.findMany({
        where,
        orderBy: { startTime: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          applicationId: true,
          roundNumber: true,
          interviewType: true,
          interviewMode: true,
          status: true,
          startTime: true,
          candidate: { select: { id: true, fullName: true } },
          job: { select: { id: true, title: true } },
          company: { select: { id: true, name: true } },
          application: { select: { status: true } },
        },
      }),
      prisma.interview.count({ where }),
    ]);

    total = count;
    rows = items.map((i) => ({
      id: i.id,
      applicationId: i.applicationId,
      jobTitle: i.job?.title || 'Job',
      candidateName: i.candidate?.fullName || 'Candidate',
      companyName: i.company?.name || 'Company',
      interviewDate: i.startTime,
      interviewType: `Round ${i.roundNumber}: ${i.interviewType}`,
      interviewMode: i.interviewMode,
      interviewStatus: i.status,
      hiringOutcome: i.application?.status || 'IN_PROGRESS',
    }));
  }

  // ── 8. HIRING DECISIONS REPORT ───────────────────────────────────────────
  else if (reportType === 'hiring') {
    const where = {};
    if (companyIds) where.companyId = { in: companyIds };
    if (query.jobId) where.jobId = query.jobId;
    if (hasDateFilter) where.decidedAt = { gte: start, lte: end };
    if (query.decision && query.decision !== 'ALL') where.decision = query.decision;
    if (q) {
      where.OR = [
        { candidate: { fullName: { contains: q, mode: 'insensitive' } } },
        { job: { title: { contains: q, mode: 'insensitive' } } },
        { company: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [items, count] = await Promise.all([
      prisma.hiringDecision.findMany({
        where,
        orderBy: { decidedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          applicationId: true,
          decision: true,
          targetApplicationStatus: true,
          decidedAt: true,
          candidate: { select: { id: true, fullName: true } },
          job: { select: { id: true, title: true } },
          company: { select: { id: true, name: true } },
          decidedBy: { select: { id: true, fullName: true } },
        },
      }),
      prisma.hiringDecision.count({ where }),
    ]);

    total = count;
    rows = items.map((h) => ({
      id: h.id,
      applicationId: h.applicationId,
      jobTitle: h.job?.title || 'Job',
      candidateName: h.candidate?.fullName || 'Candidate',
      companyName: h.company?.name || 'Company',
      decision: h.decision,
      applicationStatus: h.targetApplicationStatus || h.decision,
      decidedBy: h.decidedBy?.fullName || 'Recruiter',
      decidedAt: h.decidedAt,
    }));
  }

  // ── 9. PLATFORM ACTIVITY REPORT ──────────────────────────────────────────
  else if (reportType === 'platform-activity') {
    const where = {};
    if (hasDateFilter) where.createdAt = { gte: start, lte: end };
    if (query.status && query.status !== 'ALL') where.entityType = query.status;
    if (q) {
      where.OR = [
        { action: { contains: q, mode: 'insensitive' } },
        { entityType: { contains: q, mode: 'insensitive' } },
        { reason: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, count] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    total = count;
    rows = items.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId || '—',
      actorRole: log.actorRole,
      reason: log.reason || '—',
      createdAt: log.createdAt,
    }));
  }

  return {
    reportType: def.type,
    title: def.title,
    description: def.description,
    columns: def.columns,
    availableFilters: def.availableFilters,
    period: { range, start, end },
    rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

// ============================================================================
// Report Export Formatting (CSV & Excel SpreadsheetML XML) + Audit Logging
// ============================================================================

function formatCellValue(val) {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

/**
 * Prevents CSV/Excel formula injection (`=`, `+`, `-`, `@`, `\t`, `\r`).
 */
function sanitizeFormulaCell(str) {
  if (!str) return '';
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

function serializeToCsv(columns, rows) {
  const escapeCsv = (raw) => {
    const safe = sanitizeFormulaCell(formatCellValue(raw));
    if (/[",\r\n]/.test(safe)) {
      return `"${safe.replace(/"/g, '""')}"`;
    }
    return safe;
  };

  const headerLine = columns.map((c) => escapeCsv(c.label)).join(',');
  const dataLines = rows.map((row) =>
    columns.map((c) => escapeCsv(row[c.key])).join(',')
  );

  // Prefix UTF-8 BOM so Excel opens UTF-8 characters properly
  return `\uFEFF${[headerLine, ...dataLines].join('\r\n')}\r\n`;
}

function serializeToExcelXml(title, columns, rows) {
  const escXml = (s) =>
    String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const headerCells = columns
    .map((c) => `<Cell><Data ss:Type="String">${escXml(c.label)}</Data></Cell>`)
    .join('');

  const bodyRows = rows
    .map((row) => {
      const cells = columns
        .map((c) => {
          const val = row[c.key];
          if (typeof val === 'number' && Number.isFinite(val)) {
            return `<Cell><Data ss:Type="Number">${val}</Data></Cell>`;
          }
          const safe = sanitizeFormulaCell(formatCellValue(val));
          return `<Cell><Data ss:Type="String">${escXml(safe)}</Data></Cell>`;
        })
        .join('');
      return `<Row>${cells}</Row>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="${escXml(title.slice(0, 28))}">
  <Table>
   <Row>${headerCells}</Row>
   ${bodyRows}
  </Table>
 </Worksheet>
</Workbook>`;
}

async function exportReport(currentUser, reportType, query = {}, reqMeta = {}) {
  const format = String(query.format || 'csv').toLowerCase();
  if (!['csv', 'xlsx', 'json'].includes(format)) {
    throw new ApiError(400, 'Supported export formats are csv, xlsx, and json', 'INVALID_EXPORT_FORMAT');
  }

  const report = await generateReport(currentUser, reportType, query, { isExport: true });

  // Audit log sensitive exports
  await recordAudit({
    actor: currentUser,
    action: 'REPORT_EXPORTED',
    entityType: 'REPORT_EXPORT',
    entityId: reportType,
    newValue: {
      reportType,
      format,
      rowCount: report.rows.length,
      filters: {
        range: query.range || 'all',
        companyId: query.companyId || null,
        jobId: query.jobId || null,
        status: query.status || null,
      },
    },
    reason: `Exported ${report.rows.length} rows of ${report.title} as ${format.toUpperCase()}`,
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  const dateStamp = new Date().toISOString().slice(0, 10);

  if (format === 'json') {
    return {
      fileName: `${reportType}-report-${dateStamp}.json`,
      mimeType: 'application/json; charset=utf-8',
      buffer: Buffer.from(JSON.stringify(report, null, 2), 'utf8'),
    };
  }

  if (format === 'xlsx') {
    const xml = serializeToExcelXml(report.title, report.columns, report.rows);
    return {
      fileName: `${reportType}-report-${dateStamp}.xls`,
      mimeType: 'application/vnd.ms-excel; charset=utf-8',
      buffer: Buffer.from(xml, 'utf8'),
    };
  }

  const csv = serializeToCsv(report.columns, report.rows);
  return {
    fileName: `${reportType}-report-${dateStamp}.csv`,
    mimeType: 'text/csv; charset=utf-8',
    buffer: Buffer.from(csv, 'utf8'),
  };
}

module.exports = {
  REPORT_DEFINITIONS,
  listAvailableReports,
  generateReport,
  exportReport,
};
