const prisma = require('../../config/prisma');

const safeUserSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
};

const companyDetailInclude = {
  owner: { select: safeUserSelect },
  approvedBy: { select: safeUserSelect },
  memberships: {
    where: { membershipStatus: 'ACTIVE' },
    include: {
      user: {
        select: {
          ...safeUserSelect,
          recruiterProfile: {
            select: {
              id: true,
              designation: true,
              phone: true,
              linkedinUrl: true,
            },
          },
        },
      },
    },
    orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
  },
  _count: {
    select: {
      memberships: { where: { membershipStatus: 'ACTIVE' } },
      recruiters: true,
    },
  },
};

const companyListInclude = {
  owner: { select: safeUserSelect },
  memberships: {
    where: { membershipStatus: 'ACTIVE' },
    select: {
      id: true,
      userId: true,
      role: true,
      membershipStatus: true,
      joinedAt: true,
    },
  },
  _count: {
    select: {
      memberships: { where: { membershipStatus: 'ACTIVE' } },
      recruiters: true,
    },
  },
};

exports.findCompanyById = (id, db = prisma) =>
  db.company.findUnique({
    where: { id },
    include: companyDetailInclude,
  });

exports.findDuplicateCompany = async ({ name, gstin, registrationNumber, excludeId }, db = prisma) => {
  const orConditions = [];
  if (name) {
    orConditions.push({ name: { equals: name, mode: 'insensitive' } });
  }
  if (gstin) {
    orConditions.push({ gstin: { equals: gstin, mode: 'insensitive' } });
  }
  if (registrationNumber) {
    orConditions.push({ registrationNumber: { equals: registrationNumber, mode: 'insensitive' } });
  }
  if (orConditions.length === 0) return null;

  return db.company.findFirst({
    where: {
      ...(excludeId ? { id: { not: excludeId } } : {}),
      OR: orConditions,
    },
    select: { id: true, name: true, gstin: true, registrationNumber: true },
  });
};

exports.createCompany = (data, db = prisma) =>
  db.company.create({
    data,
    include: companyDetailInclude,
  });

exports.updateCompany = (id, data, db = prisma) =>
  db.company.update({
    where: { id },
    data,
    include: companyDetailInclude,
  });

exports.upsertMembership = ({ companyId, userId, role = 'RECRUITER', membershipStatus = 'ACTIVE' }, db = prisma) =>
  db.companyMembership.upsert({
    where: {
      companyId_userId: { companyId, userId },
    },
    create: {
      companyId,
      userId,
      role,
      membershipStatus,
    },
    update: {
      role,
      membershipStatus,
    },
    include: {
      user: { select: safeUserSelect },
    },
  });

exports.findMembership = (companyId, userId, db = prisma) =>
  db.companyMembership.findUnique({
    where: {
      companyId_userId: { companyId, userId },
    },
  });

exports.findMembershipById = (id, db = prisma) =>
  db.companyMembership.findUnique({
    where: { id },
    include: { user: { select: safeUserSelect } },
  });

exports.updateMembership = (id, data, db = prisma) =>
  db.companyMembership.update({
    where: { id },
    data,
    include: { user: { select: safeUserSelect } },
  });

exports.findUserByEmail = (email, db = prisma) =>
  db.user.findUnique({
    where: { email },
    select: safeUserSelect,
  });

exports.linkRecruiterProfileCompany = async (userId, companyId, db = prisma) => {
  const existing = await db.recruiterProfile.findUnique({ where: { userId } });
  if (!existing) {
    return db.recruiterProfile.create({
      data: { userId, companyId },
    });
  }
  if (!existing.companyId) {
    return db.recruiterProfile.update({
      where: { userId },
      data: { companyId },
    });
  }
  return existing;
};

exports.findCompaniesForUser = async (userId, { q = '', status, page = 1, limit = 10 } = {}, db = prisma) => {
  const recruiterProfile = await db.recruiterProfile.findUnique({
    where: { userId },
    select: { companyId: true },
  });

  const associationOr = [
    { ownerId: userId },
    { memberships: { some: { userId, membershipStatus: 'ACTIVE' } } },
  ];
  if (recruiterProfile?.companyId) {
    associationOr.push({ id: recruiterProfile.companyId });
  }

  const where = {
    AND: [
      { OR: associationOr },
      ...(status ? [{ status }] : []),
      ...(q
        ? [
            {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { industry: { contains: q, mode: 'insensitive' } },
                { city: { contains: q, mode: 'insensitive' } },
              ],
            },
          ]
        : []),
    ],
  };

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    db.company.findMany({
      where,
      include: companyListInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    db.company.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
};

exports.findAllCompanies = async ({ q = '', status, industry, companySize, page = 1, limit = 10 } = {}, db = prisma) => {
  const andFilters = [];

  if (status) {
    andFilters.push({ status });
  }
  if (industry) {
    andFilters.push({ industry: { contains: industry, mode: 'insensitive' } });
  }
  if (companySize) {
    andFilters.push({ companySize });
  }
  if (q) {
    andFilters.push({
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { industry: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { registrationNumber: { contains: q, mode: 'insensitive' } },
        { gstin: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  const where = andFilters.length > 0 ? { AND: andFilters } : {};
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    db.company.findMany({
      where,
      include: companyListInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    db.company.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
};
