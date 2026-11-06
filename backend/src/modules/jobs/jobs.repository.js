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
      pausedJobs: 0,
      closedJobs: 0,
      rejectedJobs: 0,
      expiredJobs: 0,
      archivedJobs: 0,
      activeVacancies: 0,
    };
  }

  const [grouped, vacanciesAgg] = await Promise.all([
    db.job.groupBy({
      by: ['status'],
      where: whereScope,
      _count: { _all: true },
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
  };

  let totalJobs = 0;
  for (const row of grouped) {
    counts[row.status] = row._count._all;
    totalJobs += row._count._all;
  }

  return {
    totalJobs,
    publishedJobs: counts.PUBLISHED,
    draftJobs: counts.DRAFT,
    pendingApprovalJobs: counts.PENDING_APPROVAL,
    pausedJobs: counts.PAUSED,
    closedJobs: counts.CLOSED,
    rejectedJobs: counts.REJECTED,
    expiredJobs: counts.EXPIRED,
    archivedJobs: counts.ARCHIVED,
    activeVacancies: vacanciesAgg._sum.numberOfOpenings || 0,
  };
};

exports.findJobsForManagement = async (
  {
    companyIds,
    q = '',
    companyId,
    status,
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
