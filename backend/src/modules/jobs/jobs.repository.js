const prisma = require('../../config/prisma');

const safeUserSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
};

const companySummarySelect = {
  id: true,
  name: true,
  logoUrl: true,
  industry: true,
  companySize: true,
  companyType: true,
  website: true,
  city: true,
  state: true,
  country: true,
  location: true,
  description: true,
  status: true,
  ownerId: true,
};

const jobDetailInclude = {
  company: {
    select: {
      ...companySummarySelect,
      memberships: {
        where: { membershipStatus: 'ACTIVE' },
        select: { userId: true, role: true, membershipStatus: true },
      },
    },
  },
  createdBy: { select: safeUserSelect },
  updatedBy: { select: safeUserSelect },
  approvedBy: { select: safeUserSelect },
  moderatedBy: { select: safeUserSelect },
};

const jobListInclude = {
  company: {
    select: companySummarySelect,
  },
  createdBy: { select: safeUserSelect },
};

const publicJobInclude = {
  company: {
    select: {
      id: true,
      name: true,
      logoUrl: true,
      industry: true,
      companySize: true,
      companyType: true,
      foundedYear: true,
      website: true,
      linkedinUrl: true,
      city: true,
      state: true,
      country: true,
      location: true,
      description: true,
      status: true,
    },
  },
};

// Automatically transition PUBLISHED jobs whose deadline has passed (when allowAfterDeadline is false) to EXPIRED
exports.expireOverdueJobs = async (db = prisma) => {
  const now = new Date();
  await db.job.updateMany({
    where: {
      status: 'PUBLISHED',
      allowAfterDeadline: false,
      applicationDeadline: { lt: now },
    },
    data: {
      status: 'EXPIRED',
    },
  });
};

exports.findCompanyWithMemberships = (companyId, db = prisma) =>
  db.company.findUnique({
    where: { id: companyId },
    include: {
      memberships: {
        where: { membershipStatus: 'ACTIVE' },
        select: { userId: true, role: true, membershipStatus: true },
      },
    },
  });

exports.findAccessibleCompanyIdsForUser = async (userId, db = prisma) => {
  const [recruiterProfile, memberships, ownedCompanies] = await Promise.all([
    db.recruiterProfile.findUnique({
      where: { userId },
      select: { companyId: true },
    }),
    db.companyMembership.findMany({
      where: { userId, membershipStatus: 'ACTIVE' },
      select: { companyId: true, role: true },
    }),
    db.company.findMany({
      where: { ownerId: userId },
      select: { id: true },
    }),
  ]);

  const idSet = new Set();
  const roleMap = new Map();

  for (const m of memberships) {
    idSet.add(m.companyId);
    roleMap.set(m.companyId, m.role);
  }
  for (const c of ownedCompanies) {
    idSet.add(c.id);
    roleMap.set(c.id, 'OWNER');
  }
  if (recruiterProfile?.companyId) {
    idSet.add(recruiterProfile.companyId);
    if (!roleMap.has(recruiterProfile.companyId)) {
      roleMap.set(recruiterProfile.companyId, 'RECRUITER');
    }
  }

  return { companyIds: Array.from(idSet), roleMap };
};

exports.createJob = (data, db = prisma) =>
  db.job.create({
    data,
    include: jobDetailInclude,
  });

exports.findJobById = (id, db = prisma) =>
  db.job.findUnique({
    where: { id },
    include: jobDetailInclude,
  });

exports.findPublicJobById = (id, db = prisma) =>
  db.job.findUnique({
    where: { id },
    include: publicJobInclude,
  });

exports.updateJob = (id, data, db = prisma) =>
  db.job.update({
    where: { id },
    data,
    include: jobDetailInclude,
  });

exports.deleteJob = (id, db = prisma) =>
  db.job.delete({
    where: { id },
  });

exports.getDashboardStats = async (companyIds, db = prisma) => {
  const whereScope = Array.isArray(companyIds) ? { companyId: { in: companyIds } } : {};

  if (Array.isArray(companyIds) && companyIds.length === 0) {
    return {
      totalJobs: 0,
      publishedJobs: 0,
      draftJobs: 0,
      pendingApprovalJobs: 0,
      underReviewJobs: 0,
      pausedJobs: 0,
      closedJobs: 0,
      rejectedJobs: 0,
      expiredJobs: 0,
      archivedJobs: 0,
      flaggedJobs: 0,
      reportedJobs: 0,
      clearedJobs: 0,
      activeVacancies: 0,
    };
  }

  const [grouped, moderationGrouped, reportedCount, vacanciesAgg] = await Promise.all([
    db.job.groupBy({
      by: ['status'],
      where: whereScope,
      _count: { _all: true },
    }),
    db.job.groupBy({
      by: ['moderationStatus'],
      where: whereScope,
      _count: { _all: true },
    }),
    db.job.count({
      where: {
        ...whereScope,
        reportCount: { gt: 0 },
      },
    }),
    db.job.aggregate({
      where: {
        ...whereScope,
        status: 'PUBLISHED',
      },
      _sum: { numberOfOpenings: true },
    }),
  ]);

  const counts = {
    DRAFT: 0,
    PENDING_APPROVAL: 0,
    PUBLISHED: 0,
    PAUSED: 0,
    CLOSED: 0,
    REJECTED: 0,
    EXPIRED: 0,
    ARCHIVED: 0,
    UNDER_REVIEW: 0,
  };

  let totalJobs = 0;
  for (const row of grouped) {
    counts[row.status] = row._count._all;
    totalJobs += row._count._all;
  }

  const modCounts = {
    NOT_REVIEWED: 0,
    FLAGGED: 0,
    UNDER_REVIEW: 0,
    ACTION_REQUIRED: 0,
    CLEARED: 0,
  };
  for (const row of moderationGrouped) {
    modCounts[row.moderationStatus] = row._count._all;
  }

  return {
    totalJobs,
    publishedJobs: counts.PUBLISHED,
    draftJobs: counts.DRAFT,
    pendingApprovalJobs: counts.PENDING_APPROVAL,
    underReviewJobs: counts.UNDER_REVIEW + modCounts.UNDER_REVIEW,
    pausedJobs: counts.PAUSED,
    closedJobs: counts.CLOSED,
    rejectedJobs: counts.REJECTED,
    expiredJobs: counts.EXPIRED,
    archivedJobs: counts.ARCHIVED,
    flaggedJobs: modCounts.FLAGGED + modCounts.ACTION_REQUIRED,
    reportedJobs: reportedCount,
    clearedJobs: modCounts.CLEARED,
    activeVacancies: vacanciesAgg._sum.numberOfOpenings || 0,
  };
};

exports.findJobsForManagement = async (
  {
    companyIds,
    q = '',
    companyId,
    status,
    moderationStatus,
    flaggedOnly = false,
    employmentType,
    workMode,
    location,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    limit = 10,
  } = {},
  db = prisma
) => {
  if (Array.isArray(companyIds) && companyIds.length === 0) {
    return { items: [], total: 0, page, limit, totalPages: 1 };
  }

  const andFilters = [];

  if (Array.isArray(companyIds)) {
    andFilters.push({ companyId: { in: companyIds } });
  }
  if (companyId) {
    andFilters.push({ companyId });
  }
  if (status) {
    andFilters.push({ status });
  }
  if (moderationStatus) {
    andFilters.push({ moderationStatus });
  }
  if (flaggedOnly) {
    andFilters.push({
      OR: [
        { moderationStatus: { in: ['FLAGGED', 'UNDER_REVIEW', 'ACTION_REQUIRED'] } },
        { status: 'UNDER_REVIEW' },
        { reportCount: { gt: 0 } },
      ],
    });
  }
  if (employmentType) {
    andFilters.push({ employmentType });
  }
  if (workMode) {
    andFilters.push({ workMode });
  }
  if (location) {
    andFilters.push({
      OR: [
        { city: { contains: location, mode: 'insensitive' } },
        { state: { contains: location, mode: 'insensitive' } },
        { country: { contains: location, mode: 'insensitive' } },
        { location: { contains: location, mode: 'insensitive' } },
      ],
    });
  }
  if (q) {
    andFilters.push({
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { department: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
        { company: { name: { contains: q, mode: 'insensitive' } } },
      ],
    });
  }

  const where = andFilters.length > 0 ? { AND: andFilters } : {};
  const skip = (page - 1) * limit;
  const orderBy = { [sortBy]: sortOrder };

  const [items, total] = await Promise.all([
    db.job.findMany({
      where,
      include: jobListInclude,
      orderBy,
      skip,
      take: limit,
    }),
    db.job.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
};

exports.findPublicJobs = async (
  {
    q = '',
    skill = '',
    location = '',
    employmentType,
    workMode,
    minExperience,
    maxExperience,
    minSalary,
    maxSalary,
    industry = '',
    companyId,
    category = '',
    sortBy = 'publishedAt',
    sortOrder = 'desc',
    page = 1,
    limit = 10,
  } = {},
  db = prisma
) => {
  const now = new Date();

  const andFilters = [
    { status: 'PUBLISHED' },
    { company: { status: 'APPROVED' } },
    {
      OR: [
        { applicationDeadline: null },
        { applicationDeadline: { gte: now } },
        { allowAfterDeadline: true },
      ],
    },
  ];

  if (companyId) {
    andFilters.push({ companyId });
  }
  if (employmentType) {
    andFilters.push({ employmentType });
  }
  if (workMode) {
    andFilters.push({ workMode });
  }
  if (category) {
    andFilters.push({ category: { contains: category, mode: 'insensitive' } });
  }
  if (industry) {
    andFilters.push({ company: { industry: { contains: industry, mode: 'insensitive' } } });
  }
  if (location) {
    andFilters.push({
      OR: [
        { city: { contains: location, mode: 'insensitive' } },
        { state: { contains: location, mode: 'insensitive' } },
        { country: { contains: location, mode: 'insensitive' } },
        { location: { contains: location, mode: 'insensitive' } },
      ],
    });
  }
  if (minExperience != null) {
    andFilters.push({
      OR: [
        { maxExperience: null },
        { maxExperience: { gte: minExperience } },
      ],
    });
  }
  if (maxExperience != null) {
    andFilters.push({
      OR: [
        { minExperience: null },
        { minExperience: { lte: maxExperience } },
      ],
    });
  }
  if (minSalary != null) {
    andFilters.push({
      discloseSalary: true,
      OR: [
        { maxSalary: { gte: minSalary } },
        { minSalary: { gte: minSalary } },
      ],
    });
  }
  if (maxSalary != null) {
    andFilters.push({
      discloseSalary: true,
      minSalary: { lte: maxSalary },
    });
  }
  if (skill) {
    const skillTokens = skill
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (skillTokens.length > 0) {
      andFilters.push({
        OR: [
          { requiredSkills: { hasSome: skillTokens } },
          { preferredSkills: { hasSome: skillTokens } },
          ...skillTokens.map((tok) => ({
            description: { contains: tok, mode: 'insensitive' },
          })),
        ],
      });
    }
  }
  if (q) {
    andFilters.push({
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { summary: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { department: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
        { company: { name: { contains: q, mode: 'insensitive' } } },
      ],
    });
  }

  const where = { AND: andFilters };
  const skip = (page - 1) * limit;
  const orderBy = { [sortBy]: sortOrder };

  const [items, total] = await Promise.all([
    db.job.findMany({
      where,
      include: publicJobInclude,
      orderBy,
      skip,
      take: limit,
    }),
    db.job.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
};

exports.createJobReport = async ({ jobId, reporterId, category, details }, db = prisma) => {
  return db.$transaction(async (tx) => {
    const existing = await tx.jobReport.findUnique({
      where: {
        jobId_reporterId: { jobId, reporterId },
      },
    });

    if (existing) {
      return { alreadyReported: true, report: existing };
    }

    const report = await tx.jobReport.create({
      data: {
        jobId,
        reporterId,
        category,
        details: details || null,
        status: 'OPEN',
      },
    });

    const updatedJob = await tx.job.update({
      where: { id: jobId },
      data: {
        reportCount: { increment: 1 },
      },
    });

    await tx.jobModerationLog.create({
      data: {
        jobId,
        actorId: reporterId,
        actorType: 'USER',
        action: 'USER_REPORT',
        previousStatus: updatedJob.status,
        newStatus: updatedJob.status,
        previousModerationStatus: updatedJob.moderationStatus,
        newModerationStatus: updatedJob.moderationStatus,
        reason: `Reported for ${category}${details ? `: ${details}` : ''}`,
        flags: ['USER_REPORTED'],
        metadata: { category, reportId: report.id },
      },
    });

    return { alreadyReported: false, report, job: updatedJob };
  });
};

exports.findJobModerationDetails = async (jobId, db = prisma) => {
  const [logs, reports] = await Promise.all([
    db.jobModerationLog.findMany({
      where: { jobId },
      include: { actor: { select: safeUserSelect } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    db.jobReport.findMany({
      where: { jobId },
      include: { reporter: { select: safeUserSelect } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);
  return { logs, reports };
};

exports.moderateJobWithLog = async (
  {
    jobId,
    actorId,
    action,
    previousStatus,
    newStatus,
    previousModerationStatus,
    newModerationStatus,
    reason,
    flags,
    updateData,
  },
  db = prisma
) => {
  return db.$transaction(async (tx) => {
    const updatedJob = await tx.job.update({
      where: { id: jobId },
      data: updateData,
      include: jobDetailInclude,
    });

    if (action === 'CLEAR_FLAGS' || action === 'RESTORE_JOB') {
      await tx.jobReport.updateMany({
        where: { jobId, status: 'OPEN' },
        data: { status: 'REVIEWED' },
      });
    }

    await tx.jobModerationLog.create({
      data: {
        jobId,
        actorId,
        actorType: 'ADMIN',
        action,
        previousStatus,
        newStatus,
        previousModerationStatus,
        newModerationStatus,
        reason,
        flags: flags || [],
      },
    });

    return updatedJob;
  });
};
