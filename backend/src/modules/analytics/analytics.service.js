'use strict';

const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');

const DAY_MS = 24 * 60 * 60 * 1000;

function resolveDateRange(query = {}) {
  const now = new Date();
  const range = String(query.range || '30d').toLowerCase();

  if (range === 'custom' && (query.from || query.to)) {
    const start = query.from ? new Date(query.from) : new Date(now.getTime() - 30 * DAY_MS);
    const end = query.to ? new Date(query.to) : now;
    return {
      range: 'custom',
      start: Number.isNaN(start.getTime()) ? new Date(now.getTime() - 30 * DAY_MS) : start,
      end: Number.isNaN(end.getTime()) ? now : end,
    };
  }

  if (range === 'today') {
    const start = new Date(now);
    start.setUTCHours(0, 0, 0, 0);
    return { range: 'today', start, end: now };
  }

  if (range === '7d') {
    return { range: '7d', start: new Date(now.getTime() - 7 * DAY_MS), end: now };
  }

  if (range === '90d') {
    return { range: '90d', start: new Date(now.getTime() - 90 * DAY_MS), end: now };
  }

  if (range === 'this_month') {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
    return { range: 'this_month', start, end: now };
  }

  if (range === 'last_month') {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));
    return { range: 'last_month', start, end };
  }

  if (range === 'all') {
    return { range: 'all', start: new Date('2020-01-01T00:00:00.000Z'), end: now };
  }

  return { range: '30d', start: new Date(now.getTime() - 30 * DAY_MS), end: now };
}

function buildDailySeries(records, dateField, start, end) {
  const maxDays = 90;
  const effectiveStart = new Date(
    Math.max(start.getTime(), end.getTime() - maxDays * DAY_MS)
  );
  const buckets = new Map();
  const cursor = new Date(effectiveStart);
  cursor.setUTCHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setUTCHours(0, 0, 0, 0);

  while (cursor <= endDay) {
    buckets.set(cursor.toISOString().slice(0, 10), 0);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  for (const item of records) {
    const raw = item[dateField];
    if (!raw) continue;
    const key = new Date(raw).toISOString().slice(0, 10);
    if (buckets.has(key)) {
      buckets.set(key, buckets.get(key) + 1);
    }
  }

  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
}

function buildMonthlySeries(records, dateField) {
  const buckets = new Map();
  for (const item of records) {
    const raw = item[dateField];
    if (!raw) continue;
    const d = new Date(raw);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));
}

function pct(numerator, denominator) {
  if (!denominator || denominator <= 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(1));
}

/**
 * Helper to resolve all companies a recruiter is affiliated with and their role in each.
 */
async function getUserCompanyAccess(userId) {
  const [owned, memberships] = await Promise.all([
    prisma.company.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, status: true, industry: true },
    }),
    prisma.companyMembership.findMany({
      where: { userId, membershipStatus: 'ACTIVE' },
      include: {
        company: {
          select: { id: true, name: true, status: true, industry: true, ownerId: true },
        },
      },
    }),
  ]);

  const companyMap = new Map();
  for (const c of owned) {
    companyMap.set(c.id, {
      id: c.id,
      name: c.name,
      status: c.status,
      industry: c.industry,
      myRole: 'OWNER',
    });
  }
  for (const m of memberships) {
    if (!m.company) continue;
    const existing = companyMap.get(m.company.id);
    if (!existing) {
      companyMap.set(m.company.id, {
        id: m.company.id,
        name: m.company.name,
        status: m.company.status,
        industry: m.company.industry,
        myRole: m.company.ownerId === userId ? 'OWNER' : m.role,
      });
    }
  }

  return {
    companies: Array.from(companyMap.values()),
    companyIds: Array.from(companyMap.keys()),
    companyMap,
  };
}

// ============================================================================
// 1. Candidate Analytics (Phase 8)
// ============================================================================

async function getCandidateAnalytics(currentUser, query = {}) {
  if (!currentUser || currentUser.role !== 'candidate') {
    throw new ApiError(
      403,
      'Candidate analytics are only available to candidate accounts',
      'CANDIDATE_ONLY'
    );
  }

  const { range, start, end } = resolveDateRange(query);
  const candidateId = currentUser.id;

  const [
    statusGroups,
    interviewGroups,
    upcomingInterviewsCount,
    periodApplications,
    recentApplications,
    recentInterviews,
  ] = await Promise.all([
    prisma.application.groupBy({
      by: ['status'],
      where: { candidateId },
      _count: { _all: true },
    }),
    prisma.interview.groupBy({
      by: ['status'],
      where: { candidateId },
      _count: { _all: true },
    }),
    prisma.interview.count({
      where: {
        candidateId,
        status: { in: ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED'] },
        startTime: { gte: new Date() },
      },
    }),
    prisma.application.findMany({
      where: {
        candidateId,
        appliedAt: { gte: start, lte: end },
      },
      select: { appliedAt: true, status: true },
    }),
    prisma.application.findMany({
      where: { candidateId },
      orderBy: { updatedAt: 'desc' },
      take: 8,
      select: {
        id: true,
        status: true,
        appliedAt: true,
        lastStatusUpdatedAt: true,
        job: {
          select: { id: true, title: true, employmentType: true, workMode: true },
        },
        company: {
          select: { id: true, name: true, logoUrl: true },
        },
      },
    }),
    prisma.interview.findMany({
      where: { candidateId },
      orderBy: { startTime: 'desc' },
      take: 6,
      select: {
        id: true,
        title: true,
        roundNumber: true,
        interviewType: true,
        interviewMode: true,
        status: true,
        startTime: true,
        endTime: true,
        timeZone: true,
        job: { select: { id: true, title: true } },
        company: { select: { id: true, name: true } },
      },
    }),
  ]);

  const statusCounts = {
    SUBMITTED: 0,
    UNDER_REVIEW: 0,
    SHORTLISTED: 0,
    INTERVIEW: 0,
    OFFERED: 0,
    HIRED: 0,
    REJECTED: 0,
    WITHDRAWN: 0,
  };
  let totalApplications = 0;
  for (const g of statusGroups) {
    statusCounts[g.status] = g._count._all;
    totalApplications += g._count._all;
  }

  let totalInterviews = 0;
  let completedInterviews = 0;
  for (const g of interviewGroups) {
    totalInterviews += g._count._all;
    if (g.status === 'COMPLETED') completedInterviews += g._count._all;
  }

  const progressedToShortlist =
    statusCounts.SHORTLISTED +
    statusCounts.INTERVIEW +
    statusCounts.OFFERED +
    statusCounts.HIRED;
  const progressedToInterview =
    statusCounts.INTERVIEW + statusCounts.OFFERED + statusCounts.HIRED;
  const offersReceived = statusCounts.OFFERED + statusCounts.HIRED;

  return {
    period: { range, start, end },
    summary: {
      totalApplications,
      applicationsInPeriod: periodApplications.length,
      submitted: statusCounts.SUBMITTED,
      underReview: statusCounts.UNDER_REVIEW,
      shortlisted: statusCounts.SHORTLISTED,
      interviewInvitations: Math.max(statusCounts.INTERVIEW, totalInterviews),
      totalInterviews,
      upcomingInterviews: upcomingInterviewsCount,
      completedInterviews,
      offersReceived,
      hiredApplications: statusCounts.HIRED,
      rejectedApplications: statusCounts.REJECTED,
      withdrawnApplications: statusCounts.WITHDRAWN,
    },
    applicationsByStatus: Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    })),
    conversionRates: {
      shortlistRate: pct(progressedToShortlist, totalApplications),
      interviewRate: pct(progressedToInterview, totalApplications),
      offerRate: pct(offersReceived, totalApplications),
      hireRate: pct(statusCounts.HIRED, totalApplications),
    },
    applicationTrend: buildDailySeries(periodApplications, 'appliedAt', start, end),
    recentApplications,
    recentInterviews,
  };
}

// ============================================================================
// 2. Recruiter Analytics (Phase 9)
// ============================================================================

async function getRecruiterAnalytics(currentUser, query = {}) {
  if (!currentUser || !['recruiter', 'admin'].includes(currentUser.role)) {
    throw new ApiError(
      403,
      'Recruiter analytics are only available to recruiters',
      'RECRUITER_ONLY'
    );
  }

  const { range, start, end } = resolveDateRange(query);
  const access = await getUserCompanyAccess(currentUser.id);

  if (query.companyId && !access.companyMap.has(query.companyId) && currentUser.role !== 'admin') {
    throw new ApiError(
      403,
      'You are not authorized to access analytics for this company',
      'FORBIDDEN_COMPANY_ACCESS'
    );
  }

  if (query.jobId) {
    const job = await prisma.job.findUnique({
      where: { id: query.jobId },
      select: { id: true, companyId: true },
    });
    if (!job) {
      throw new ApiError(404, 'Job not found', 'JOB_NOT_FOUND');
    }
    if (!access.companyMap.has(job.companyId) && currentUser.role !== 'admin') {
      throw new ApiError(
        403,
        'You are not authorized to access analytics for this job',
        'FORBIDDEN_JOB_ACCESS'
      );
    }
  }

  const scopedCompanyIds = query.companyId
    ? [query.companyId]
    : currentUser.role === 'admin' && !query.companyId
      ? undefined
      : access.companyIds;

  // If recruiter has no companies yet, return clean zeroed analytics
  if (Array.isArray(scopedCompanyIds) && scopedCompanyIds.length === 0) {
    return {
      period: { range, start, end },
      authorizedCompanies: [],
      jobsSummary: {
        totalJobs: 0,
        publishedJobs: 0,
        pausedJobs: 0,
        closedJobs: 0,
        draftJobs: 0,
        expiredJobs: 0,
      },
      applicationsSummary: {
        totalApplications: 0,
        submitted: 0,
        underReview: 0,
        shortlisted: 0,
        interviewStage: 0,
        offersMade: 0,
        candidatesHired: 0,
        rejected: 0,
        withdrawn: 0,
      },
      interviewsSummary: {
        totalInterviews: 0,
        scheduledInterviews: 0,
        completedInterviews: 0,
        cancelledInterviews: 0,
      },
      applicationsByStatus: [],
      jobPerformance: [],
      trends: { applications: [], jobs: [], hires: [] },
      conversionRates: { shortlistRate: 0, interviewRate: 0, offerRate: 0, hireRate: 0 },
    };
  }

  const jobWhere = {};
  const appWhere = {};
  const interviewWhere = {};

  if (scopedCompanyIds) {
    jobWhere.companyId = { in: scopedCompanyIds };
    appWhere.companyId = { in: scopedCompanyIds };
    interviewWhere.companyId = { in: scopedCompanyIds };
  }
  if (query.jobId) {
    jobWhere.id = query.jobId;
    appWhere.jobId = query.jobId;
    interviewWhere.jobId = query.jobId;
  }
  if (query.jobStatus && query.jobStatus !== 'ALL') {
    jobWhere.status = query.jobStatus;
  }
  if (query.applicationStatus && query.applicationStatus !== 'ALL') {
    appWhere.status = query.applicationStatus;
  }

  const [
    jobGroups,
    appGroups,
    interviewGroups,
    periodJobs,
    periodApps,
    periodHires,
    jobsWithMetrics,
  ] = await Promise.all([
    prisma.job.groupBy({
      by: ['status'],
      where: jobWhere,
      _count: { _all: true },
    }),
    prisma.application.groupBy({
      by: ['status'],
      where: appWhere,
      _count: { _all: true },
    }),
    prisma.interview.groupBy({
      by: ['status'],
      where: interviewWhere,
      _count: { _all: true },
    }),
    prisma.job.findMany({
      where: { ...jobWhere, createdAt: { gte: start, lte: end } },
      select: { createdAt: true },
    }),
    prisma.application.findMany({
      where: { ...appWhere, appliedAt: { gte: start, lte: end } },
      select: { appliedAt: true },
    }),
    prisma.application.findMany({
      where: { ...appWhere, status: 'HIRED', lastStatusUpdatedAt: { gte: start, lte: end } },
      select: { lastStatusUpdatedAt: true },
    }),
    prisma.job.findMany({
      where: jobWhere,
      orderBy: { createdAt: 'desc' },
      take: 15,
      select: {
        id: true,
        title: true,
        status: true,
        employmentType: true,
        workMode: true,
        publishedAt: true,
        createdAt: true,
        company: { select: { id: true, name: true } },
        applications: {
          select: { status: true },
        },
        _count: {
          select: { interviews: true },
        },
      },
    }),
  ]);

  const jobCounts = {
    DRAFT: 0,
    PUBLISHED: 0,
    PAUSED: 0,
    CLOSED: 0,
    EXPIRED: 0,
    REJECTED: 0,
    UNDER_REVIEW: 0,
  };
  let totalJobs = 0;
  for (const g of jobGroups) {
    jobCounts[g.status] = (jobCounts[g.status] || 0) + g._count._all;
    totalJobs += g._count._all;
  }

  const appCounts = {
    SUBMITTED: 0,
    UNDER_REVIEW: 0,
    SHORTLISTED: 0,
    INTERVIEW: 0,
    OFFERED: 0,
    HIRED: 0,
    REJECTED: 0,
    WITHDRAWN: 0,
  };
  let totalApplications = 0;
  for (const g of appGroups) {
    appCounts[g.status] = g._count._all;
    totalApplications += g._count._all;
  }

  let totalInterviews = 0;
  let scheduledInterviews = 0;
  let completedInterviews = 0;
  let cancelledInterviews = 0;
  for (const g of interviewGroups) {
    totalInterviews += g._count._all;
    if (['SCHEDULED', 'CONFIRMED', 'RESCHEDULED'].includes(g.status)) {
      scheduledInterviews += g._count._all;
    } else if (g.status === 'COMPLETED') {
      completedInterviews += g._count._all;
    } else if (g.status === 'CANCELLED') {
      cancelledInterviews += g._count._all;
    }
  }

  const jobPerformance = jobsWithMetrics.map((j) => {
    const apps = j.applications || [];
    const shortlistedCount = apps.filter((a) =>
      ['SHORTLISTED', 'INTERVIEW', 'OFFERED', 'HIRED'].includes(a.status)
    ).length;
    const hiredCount = apps.filter((a) => a.status === 'HIRED').length;
    const offeredCount = apps.filter((a) => ['OFFERED', 'HIRED'].includes(a.status)).length;
    return {
      id: j.id,
      title: j.title,
      companyId: j.company?.id,
      companyName: j.company?.name,
      status: j.status,
      employmentType: j.employmentType,
      workMode: j.workMode,
      publishedAt: j.publishedAt,
      createdAt: j.createdAt,
      applicationsCount: apps.length,
      shortlistedCount,
      interviewsCount: j._count?.interviews || 0,
      offeredCount,
      hiredCount,
    };
  });

  const shortlistedTotal =
    appCounts.SHORTLISTED + appCounts.INTERVIEW + appCounts.OFFERED + appCounts.HIRED;
  const offersTotal = appCounts.OFFERED + appCounts.HIRED;

  return {
    period: { range, start, end },
    authorizedCompanies: access.companies,
    jobsSummary: {
      totalJobs,
      publishedJobs: jobCounts.PUBLISHED,
      pausedJobs: jobCounts.PAUSED,
      closedJobs: jobCounts.CLOSED,
      draftJobs: jobCounts.DRAFT,
      expiredJobs: jobCounts.EXPIRED,
    },
    applicationsSummary: {
      totalApplications,
      submitted: appCounts.SUBMITTED,
      underReview: appCounts.UNDER_REVIEW,
      shortlisted: shortlistedTotal,
      interviewStage: appCounts.INTERVIEW,
      offersMade: offersTotal,
      candidatesHired: appCounts.HIRED,
      rejected: appCounts.REJECTED,
      withdrawn: appCounts.WITHDRAWN,
    },
    interviewsSummary: {
      totalInterviews,
      scheduledInterviews,
      completedInterviews,
      cancelledInterviews,
    },
    applicationsByStatus: Object.entries(appCounts).map(([status, count]) => ({
      status,
      count,
    })),
    jobPerformance,
    trends: {
      applications: buildDailySeries(periodApps, 'appliedAt', start, end),
      jobs: buildDailySeries(periodJobs, 'createdAt', start, end),
      hires: buildDailySeries(periodHires, 'lastStatusUpdatedAt', start, end),
    },
    conversionRates: {
      shortlistRate: pct(shortlistedTotal, totalApplications),
      interviewRate: pct(totalInterviews, totalApplications),
      offerRate: pct(offersTotal, totalApplications),
      hireRate: pct(appCounts.HIRED, totalApplications),
    },
  };
}

// ============================================================================
// 3. Company Analytics (Phase 10)
// ============================================================================

async function getCompanyAnalytics(currentUser, companyId, query = {}) {
  if (!companyId) {
    throw new ApiError(400, 'companyId is required for company analytics', 'COMPANY_ID_REQUIRED');
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      memberships: {
        where: { membershipStatus: 'ACTIVE' },
        select: { userId: true, role: true },
      },
    },
  });

  if (!company) {
    throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');
  }

  // Enforce Company Ownership / Admin Membership permission rules:
  // A regular RECRUITER member does NOT automatically receive access to company-wide analytics.
  const isPlatformAdmin = currentUser.role === 'admin';
  const isOwner = company.ownerId === currentUser.id;
  const activeMembership = company.memberships.find((m) => m.userId === currentUser.id);
  const myCompanyRole = isOwner ? 'OWNER' : activeMembership?.role || null;

  if (!isPlatformAdmin && !myCompanyRole) {
    throw new ApiError(
      403,
      'You are not a member of this company',
      'FORBIDDEN_COMPANY_ACCESS'
    );
  }

  if (!isPlatformAdmin && !['OWNER', 'ADMIN'].includes(myCompanyRole)) {
    throw new ApiError(
      403,
      'Only company owners and company administrators can view company-level analytics',
      'FORBIDDEN_COMPANY_ANALYTICS'
    );
  }

  const { range, start, end } = resolveDateRange(query);

  const [
    recruiterProfilesCount,
    jobGroups,
    employmentGroups,
    workModeGroups,
    appGroups,
    interviewGroups,
    periodJobs,
    periodApps,
    periodHires,
  ] = await Promise.all([
    prisma.recruiterProfile.count({ where: { companyId } }),
    prisma.job.groupBy({
      by: ['status'],
      where: { companyId },
      _count: { _all: true },
    }),
    prisma.job.groupBy({
      by: ['employmentType'],
      where: { companyId },
      _count: { _all: true },
    }),
    prisma.job.groupBy({
      by: ['workMode'],
      where: { companyId },
      _count: { _all: true },
    }),
    prisma.application.groupBy({
      by: ['status'],
      where: { companyId },
      _count: { _all: true },
    }),
    prisma.interview.groupBy({
      by: ['status'],
      where: { companyId },
      _count: { _all: true },
    }),
    prisma.job.findMany({
      where: { companyId, createdAt: { gte: start, lte: end } },
      select: { createdAt: true },
    }),
    prisma.application.findMany({
      where: { companyId, appliedAt: { gte: start, lte: end } },
      select: { appliedAt: true },
    }),
    prisma.application.findMany({
      where: { companyId, status: 'HIRED', lastStatusUpdatedAt: { gte: start, lte: end } },
      select: { lastStatusUpdatedAt: true },
    }),
  ]);

  const uniqueMemberIds = new Set(company.memberships.map((m) => m.userId));
  if (company.ownerId) uniqueMemberIds.add(company.ownerId);
  const totalRecruiters = Math.max(uniqueMemberIds.size, recruiterProfilesCount);

  const jobCounts = { DRAFT: 0, PUBLISHED: 0, PAUSED: 0, CLOSED: 0, EXPIRED: 0 };
  let totalJobs = 0;
  for (const g of jobGroups) {
    jobCounts[g.status] = (jobCounts[g.status] || 0) + g._count._all;
    totalJobs += g._count._all;
  }

  const appCounts = {
    SUBMITTED: 0,
    UNDER_REVIEW: 0,
    SHORTLISTED: 0,
    INTERVIEW: 0,
    OFFERED: 0,
    HIRED: 0,
    REJECTED: 0,
    WITHDRAWN: 0,
  };
  let totalApplications = 0;
  for (const g of appGroups) {
    appCounts[g.status] = g._count._all;
    totalApplications += g._count._all;
  }

  let totalInterviews = 0;
  let interviewsConducted = 0;
  let interviewsScheduled = 0;
  for (const g of interviewGroups) {
    totalInterviews += g._count._all;
    if (g.status === 'COMPLETED') interviewsConducted += g._count._all;
    if (['SCHEDULED', 'CONFIRMED', 'RESCHEDULED'].includes(g.status)) {
      interviewsScheduled += g._count._all;
    }
  }

  const shortlistedTotal =
    appCounts.SHORTLISTED + appCounts.INTERVIEW + appCounts.OFFERED + appCounts.HIRED;
  const offersTotal = appCounts.OFFERED + appCounts.HIRED;

  return {
    period: { range, start, end },
    company: {
      id: company.id,
      name: company.name,
      industry: company.industry,
      status: company.status,
      myRole: myCompanyRole || 'ADMIN',
      createdAt: company.createdAt,
    },
    summary: {
      totalRecruiters,
      totalJobs,
      publishedJobs: jobCounts.PUBLISHED,
      pausedJobs: jobCounts.PAUSED,
      closedJobs: jobCounts.CLOSED,
      totalApplications,
      shortlistedCandidates: shortlistedTotal,
      interviewsScheduled,
      interviewsConducted,
      offersMade: offersTotal,
      candidatesHired: appCounts.HIRED,
    },
    applicationsByStatus: Object.entries(appCounts).map(([status, count]) => ({
      status,
      count,
    })),
    jobsByEmploymentType: employmentGroups.map((g) => ({
      employmentType: g.employmentType,
      count: g._count._all,
    })),
    jobsByWorkMode: workModeGroups.map((g) => ({
      workMode: g.workMode,
      count: g._count._all,
    })),
    conversionRates: {
      shortlistRate: pct(shortlistedTotal, totalApplications),
      interviewRate: pct(totalInterviews, totalApplications),
      offerRate: pct(offersTotal, totalApplications),
      hireRate: pct(appCounts.HIRED, totalApplications),
    },
    trends: {
      jobPostings: buildDailySeries(periodJobs, 'createdAt', start, end),
      applications: buildDailySeries(periodApps, 'appliedAt', start, end),
      hires: buildDailySeries(periodHires, 'lastStatusUpdatedAt', start, end),
    },
  };
}

// ============================================================================
// 4. Admin Platform Analytics (Phase 11 — Integrated with Admin Service)
// ============================================================================

async function getAdminOverviewAnalytics(query = {}) {
  const adminService = require('../admin/admin.service');
  const { range, start, end } = resolveDateRange(query);

  const [users, companies, jobs, recruitment, allUsersDates] = await Promise.all([
    adminService.getUserAnalytics(query),
    adminService.getCompanyAnalytics(query),
    adminService.getJobAnalytics(query),
    adminService.getRecruitmentAnalytics(query),
    prisma.user.findMany({
      select: { createdAt: true },
    }),
  ]);

  return {
    period: { range, start, end },
    users,
    companies,
    jobs,
    recruitment,
    monthlyUserRegistrations: buildMonthlySeries(allUsersDates, 'createdAt'),
  };
}

async function getAdminApplicationAnalytics(query = {}) {
  const { range, start, end } = resolveDateRange(query);

  const [statusGroups, periodApps, topCompanies, topJobs] = await Promise.all([
    prisma.application.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.application.findMany({
      where: { appliedAt: { gte: start, lte: end } },
      select: { appliedAt: true, status: true },
    }),
    prisma.application.groupBy({
      by: ['companyId'],
      _count: { _all: true },
      orderBy: { _count: { companyId: 'desc' } },
      take: 10,
    }),
    prisma.application.groupBy({
      by: ['jobId'],
      _count: { _all: true },
      orderBy: { _count: { jobId: 'desc' } },
      take: 10,
    }),
  ]);

  const companyIds = topCompanies.map((c) => c.companyId);
  const jobIds = topJobs.map((j) => j.jobId);

  const [companyNames, jobTitles] = await Promise.all([
    companyIds.length
      ? prisma.company.findMany({
          where: { id: { in: companyIds } },
          select: { id: true, name: true },
        })
      : [],
    jobIds.length
      ? prisma.job.findMany({
          where: { id: { in: jobIds } },
          select: { id: true, title: true, company: { select: { name: true } } },
        })
      : [],
  ]);

  const companyMap = new Map(companyNames.map((c) => [c.id, c.name]));
  const jobMap = new Map(jobTitles.map((j) => [j.id, j]));

  let totalApplications = 0;
  const byStatus = {};
  for (const g of statusGroups) {
    byStatus[g.status] = g._count._all;
    totalApplications += g._count._all;
  }

  const shortlisted =
    (byStatus.SHORTLISTED || 0) +
    (byStatus.INTERVIEW || 0) +
    (byStatus.OFFERED || 0) +
    (byStatus.HIRED || 0);
  const offered = (byStatus.OFFERED || 0) + (byStatus.HIRED || 0);
  const hired = byStatus.HIRED || 0;

  return {
    period: { range, start, end },
    totals: {
      totalApplications,
      newInPeriod: periodApps.length,
      shortlisted,
      offered,
      hired,
    },
    byStatus: statusGroups.map((g) => ({ status: g.status, count: g._count._all })),
    byCompany: topCompanies.map((c) => ({
      companyId: c.companyId,
      companyName: companyMap.get(c.companyId) || 'Company',
      count: c._count._all,
    })),
    byJob: topJobs.map((j) => ({
      jobId: j.jobId,
      jobTitle: jobMap.get(j.jobId)?.title || 'Job',
      companyName: jobMap.get(j.jobId)?.company?.name || 'Company',
      count: j._count._all,
    })),
    conversionRates: {
      shortlistRate: pct(shortlisted, totalApplications),
      offerRate: pct(offered, totalApplications),
      hireRate: pct(hired, totalApplications),
    },
    dailySubmissions: buildDailySeries(periodApps, 'appliedAt', start, end),
  };
}

async function getAdminInterviewAnalytics(query = {}) {
  const { range, start, end } = resolveDateRange(query);

  const [statusGroups, modeGroups, periodInterviews] = await Promise.all([
    prisma.interview.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.interview.groupBy({
      by: ['interviewMode'],
      _count: { _all: true },
    }),
    prisma.interview.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { createdAt: true, status: true },
    }),
  ]);

  let totalInterviews = 0;
  let scheduled = 0;
  let completed = 0;
  let cancelled = 0;
  for (const g of statusGroups) {
    totalInterviews += g._count._all;
    if (['SCHEDULED', 'CONFIRMED', 'RESCHEDULED'].includes(g.status)) scheduled += g._count._all;
    if (g.status === 'COMPLETED') completed += g._count._all;
    if (g.status === 'CANCELLED') cancelled += g._count._all;
  }

  return {
    period: { range, start, end },
    totals: {
      totalInterviews,
      newInPeriod: periodInterviews.length,
      scheduledInterviews: scheduled,
      completedInterviews: completed,
      cancelledInterviews: cancelled,
      completionRate: pct(completed, totalInterviews),
    },
    byStatus: statusGroups.map((g) => ({ status: g.status, count: g._count._all })),
    byMode: modeGroups.map((g) => ({ mode: g.interviewMode, count: g._count._all })),
    dailyScheduled: buildDailySeries(periodInterviews, 'createdAt', start, end),
  };
}

async function getAdminHiringAnalytics(query = {}) {
  const { range, start, end } = resolveDateRange(query);

  const [decisionGroups, appStatusGroups, periodHires] = await Promise.all([
    prisma.hiringDecision.groupBy({
      by: ['decision'],
      _count: { _all: true },
    }),
    prisma.application.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.application.findMany({
      where: { status: 'HIRED', lastStatusUpdatedAt: { gte: start, lte: end } },
      select: { lastStatusUpdatedAt: true },
    }),
  ]);

  let totalApplications = 0;
  let offersMade = 0;
  let candidatesHired = 0;
  for (const g of appStatusGroups) {
    totalApplications += g._count._all;
    if (['OFFERED', 'HIRED'].includes(g.status)) offersMade += g._count._all;
    if (g.status === 'HIRED') candidatesHired += g._count._all;
  }

  return {
    period: { range, start, end },
    totals: {
      totalApplications,
      offersMade,
      candidatesHired,
      hiredInPeriod: periodHires.length,
      offerAcceptanceRate: pct(candidatesHired, offersMade),
      overallHireRate: pct(candidatesHired, totalApplications),
    },
    byDecision: decisionGroups.map((g) => ({ decision: g.decision, count: g._count._all })),
    dailyHires: buildDailySeries(periodHires, 'lastStatusUpdatedAt', start, end),
  };
}

module.exports = {
  resolveDateRange,
  getUserCompanyAccess,
  getCandidateAnalytics,
  getRecruiterAnalytics,
  getCompanyAnalytics,
  getAdminOverviewAnalytics,
  getAdminApplicationAnalytics,
  getAdminInterviewAnalytics,
  getAdminHiringAnalytics,
};
