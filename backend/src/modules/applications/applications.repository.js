const prisma = require('../../config/prisma');

const safeUserSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
};

const publicCompanySelect = {
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
  status: true,
};

const jobSummarySelect = {
  id: true,
  title: true,
  companyId: true,
  department: true,
  category: true,
  employmentType: true,
  workMode: true,
  experienceLevel: true,
  minExperience: true,
  maxExperience: true,
  minSalary: true,
  maxSalary: true,
  salaryCurrency: true,
  salaryPeriod: true,
  discloseSalary: true,
  country: true,
  state: true,
  city: true,
  officeLocation: true,
  location: true,
  requiredSkills: true,
  preferredSkills: true,
  applicationDeadline: true,
  allowAfterDeadline: true,
  requireResume: true,
  requireCoverLetter: true,
  applicationQuestions: true,
  status: true,
  publishedAt: true,
};

const candidateApplicationInclude = {
  job: {
    select: jobSummarySelect,
  },
  company: {
    select: publicCompanySelect,
  },
  resume: {
    select: {
      id: true,
      title: true,
      originalFileName: true,
      fileType: true,
      fileSize: true,
      version: true,
      isPrimary: true,
      uploadedAt: true,
    },
  },
  statusHistory: {
    orderBy: { changedAt: 'asc' },
    select: {
      id: true,
      applicationId: true,
      previousStatus: true,
      newStatus: true,
      changedByRole: true,
      reason: true,
      changedAt: true,
    },
  },
};

const recruiterApplicationInclude = {
  job: {
    select: {
      ...jobSummarySelect,
      createdById: true,
    },
  },
  company: {
    select: {
      ...publicCompanySelect,
      ownerId: true,
      memberships: {
        where: { membershipStatus: 'ACTIVE' },
        select: { userId: true, role: true, membershipStatus: true },
      },
    },
  },
  resume: {
    select: {
      id: true,
      title: true,
      originalFileName: true,
      fileType: true,
      fileSize: true,
      version: true,
      isPrimary: true,
      uploadedAt: true,
    },
  },
  candidate: {
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      createdAt: true,
      // Explicitly select non-private CandidateProfile fields (excludes currentSalary and storage keys)
      candidateProfile: {
        select: {
          id: true,
          profileImageUrl: true,
          phone: true,
          headline: true,
          bio: true,
          careerSummary: true,
          location: true,
          city: true,
          state: true,
          country: true,
          yearsOfExperience: true,
          relevantExperience: true,
          currentJobTitle: true,
          currentCompany: true,
          employmentStatus: true,
          expectedSalary: true,
          salaryCurrency: true,
          noticePeriod: true,
          preferredLocations: true,
          preferredEmploymentType: true,
          preferredWorkMode: true,
          skills: true,
          linkedinUrl: true,
          githubUrl: true,
          portfolioUrl: true,
          resumeFileName: true,
          resumeUpdatedAt: true,
        },
      },
      candidateSkills: {
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      },
      candidateEducations: {
        orderBy: [{ currentlyStudying: 'desc' }, { startDate: 'desc' }],
      },
      candidateExperiences: {
        orderBy: [{ currentlyWorking: 'desc' }, { startDate: 'desc' }],
      },
      candidateProjects: {
        orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
      },
      candidateCertifications: {
        orderBy: [{ issueDate: 'desc' }],
      },
      candidateAchievements: {
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      },
      candidateLanguages: {
        orderBy: [{ name: 'asc' }],
      },
    },
  },
  reviewedBy: {
    select: safeUserSelect,
  },
  statusHistory: {
    orderBy: { changedAt: 'desc' },
    include: {
      changedBy: {
        select: safeUserSelect,
      },
    },
  },
};

exports.findJobForApplication = (jobId, db = prisma) =>
  db.job.findUnique({
    where: { id: jobId },
    include: {
      company: {
        select: {
          ...publicCompanySelect,
          ownerId: true,
        },
      },
      _count: {
        select: {
          applications: true,
        },
      },
    },
  });

exports.findCandidateWithProfile = (userId, db = prisma) =>
  db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      status: true,
      candidateProfile: true,
      candidateResumes: {
        where: { isDeleted: false },
        orderBy: [{ isPrimary: 'desc' }, { uploadedAt: 'desc' }],
      },
      candidateSkills: true,
    },
  });

exports.findExistingApplication = (jobId, candidateId, db = prisma) =>
  db.application.findUnique({
    where: {
      jobId_candidateId: {
        jobId,
        candidateId,
      },
    },
    select: {
      id: true,
      jobId: true,
      candidateId: true,
      status: true,
      appliedAt: true,
      withdrawnAt: true,
    },
  });

exports.createApplicationWithInitialHistory = async (
  { applicationData, historyData, profileUpdate, newCandidateResumeData },
  db = prisma
) =>
  db.$transaction(async (tx) => {
    let createdResumeId = applicationData.resumeId || null;

    if (newCandidateResumeData && applicationData.candidateId) {
      if (newCandidateResumeData.isPrimary) {
        await tx.candidateResume.updateMany({
          where: { userId: applicationData.candidateId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      const createdResume = await tx.candidateResume.create({
        data: {
          ...newCandidateResumeData,
          userId: applicationData.candidateId,
        },
      });

      await tx.candidateResume.update({
        where: { id: createdResume.id },
        data: { rootResumeId: createdResume.id },
      });

      createdResumeId = createdResume.id;
    }

    if (profileUpdate && applicationData.candidateId) {
      await tx.candidateProfile.upsert({
        where: { userId: applicationData.candidateId },
        create: {
          userId: applicationData.candidateId,
          ...profileUpdate,
        },
        update: profileUpdate,
      });
    }

    const created = await tx.application.create({
      data: {
        ...applicationData,
        resumeId: createdResumeId,
      },
    });

    await tx.applicationStatusHistory.create({
      data: {
        ...historyData,
        applicationId: created.id,
      },
    });

    return tx.application.findUnique({
      where: { id: created.id },
      include: candidateApplicationInclude,
    });
  });

exports.findApplicationByIdForCandidate = (id, db = prisma) =>
  db.application.findUnique({
    where: { id },
    include: candidateApplicationInclude,
  });

exports.findApplicationByIdForRecruiter = (id, db = prisma) =>
  db.application.findUnique({
    where: { id },
    include: recruiterApplicationInclude,
  });

exports.findStatusHistoryForCandidate = (applicationId, db = prisma) =>
  db.applicationStatusHistory.findMany({
    where: { applicationId },
    orderBy: { changedAt: 'asc' },
    select: {
      id: true,
      applicationId: true,
      previousStatus: true,
      newStatus: true,
      changedByRole: true,
      reason: true,
      changedAt: true,
    },
  });

exports.findStatusHistoryForRecruiter = (applicationId, db = prisma) =>
  db.applicationStatusHistory.findMany({
    where: { applicationId },
    orderBy: { changedAt: 'desc' },
    include: {
      changedBy: {
        select: safeUserSelect,
      },
    },
  });

exports.transitionApplicationStatus = async (
  { applicationId, updateData, historyData, forCandidate = false },
  db = prisma
) =>
  db.$transaction(async (tx) => {
    await tx.application.update({
      where: { id: applicationId },
      data: updateData,
    });

    await tx.applicationStatusHistory.create({
      data: {
        ...historyData,
        applicationId,
      },
    });

    return tx.application.findUnique({
      where: { id: applicationId },
      include: forCandidate ? candidateApplicationInclude : recruiterApplicationInclude,
    });
  });

exports.updateRecruiterNotes = (applicationId, notesArray, reviewedById, db = prisma) =>
  db.application.update({
    where: { id: applicationId },
    data: {
      recruiterNotes: notesArray,
      reviewedById,
    },
    include: recruiterApplicationInclude,
  });

function buildEmptyStats() {
  return {
    total: 0,
    SUBMITTED: 0,
    UNDER_REVIEW: 0,
    SHORTLISTED: 0,
    INTERVIEW: 0,
    OFFERED: 0,
    HIRED: 0,
    REJECTED: 0,
    WITHDRAWN: 0,
  };
}

exports.getCandidateApplicationStats = async (candidateId, db = prisma) => {
  const grouped = await db.application.groupBy({
    by: ['status'],
    where: { candidateId },
    _count: { _all: true },
  });

  const stats = buildEmptyStats();
  for (const row of grouped) {
    stats[row.status] = row._count._all;
    stats.total += row._count._all;
  }
  return stats;
};

exports.findCandidateApplications = async (
  {
    candidateId,
    q = '',
    companyId,
    company = '',
    status,
    appliedFrom,
    appliedTo,
    sortBy = 'appliedAt',
    sortOrder = 'desc',
    page = 1,
    limit = 10,
  },
  db = prisma
) => {
  const andFilters = [{ candidateId }];

  if (companyId) {
    andFilters.push({ companyId });
  }
  if (company) {
    andFilters.push({
      company: {
        name: { contains: company, mode: 'insensitive' },
      },
    });
  }
  if (status) {
    andFilters.push({ status });
  }
  if (appliedFrom || appliedTo) {
    const dateRange = {};
    if (appliedFrom) dateRange.gte = new Date(appliedFrom);
    if (appliedTo) {
      const end = new Date(appliedTo);
      end.setHours(23, 59, 59, 999);
      dateRange.lte = end;
    }
    andFilters.push({ appliedAt: dateRange });
  }
  if (q) {
    andFilters.push({
      OR: [
        { job: { title: { contains: q, mode: 'insensitive' } } },
        { company: { name: { contains: q, mode: 'insensitive' } } },
        { job: { department: { contains: q, mode: 'insensitive' } } },
      ],
    });
  }

  const where = { AND: andFilters };
  const skip = (page - 1) * limit;
  const orderBy = { [sortBy]: sortOrder };

  const [items, total] = await Promise.all([
    db.application.findMany({
      where,
      include: candidateApplicationInclude,
      orderBy,
      skip,
      take: limit,
    }),
    db.application.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
};

exports.getRecruiterApplicationStats = async (
  { companyIds, companyId, jobId, status, appliedFrom, appliedTo } = {},
  db = prisma
) => {
  if (Array.isArray(companyIds) && companyIds.length === 0) {
    return buildEmptyStats();
  }

  const andFilters = [];
  if (Array.isArray(companyIds)) {
    andFilters.push({ companyId: { in: companyIds } });
  }
  if (companyId) {
    andFilters.push({ companyId });
  }
  if (jobId) {
    andFilters.push({ jobId });
  }
  if (status) {
    andFilters.push({ status });
  }
  if (appliedFrom || appliedTo) {
    const dateRange = {};
    if (appliedFrom) dateRange.gte = new Date(appliedFrom);
    if (appliedTo) {
      const end = new Date(appliedTo);
      end.setHours(23, 59, 59, 999);
      dateRange.lte = end;
    }
    andFilters.push({ appliedAt: dateRange });
  }

  const where = andFilters.length > 0 ? { AND: andFilters } : {};
  const grouped = await db.application.groupBy({
    by: ['status'],
    where,
    _count: { _all: true },
  });

  const stats = buildEmptyStats();
  for (const row of grouped) {
    stats[row.status] = row._count._all;
    stats.total += row._count._all;
  }
  return stats;
};

exports.findRecruiterApplications = async (
  {
    companyIds,
    q = '',
    candidateName = '',
    jobTitle = '',
    companyId,
    jobId,
    status,
    minExperience,
    maxExperience,
    skill = '',
    appliedFrom,
    appliedTo,
    sortBy = 'appliedAt',
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
  if (jobId) {
    andFilters.push({ jobId });
  }
  if (status) {
    andFilters.push({ status });
  }
  if (candidateName) {
    andFilters.push({
      OR: [
        { candidate: { fullName: { contains: candidateName, mode: 'insensitive' } } },
        { candidate: { email: { contains: candidateName, mode: 'insensitive' } } },
      ],
    });
  }
  if (jobTitle) {
    andFilters.push({
      job: { title: { contains: jobTitle, mode: 'insensitive' } },
    });
  }
  if (minExperience != null) {
    andFilters.push({
      OR: [
        { candidateExperience: { gte: minExperience } },
        {
          candidate: {
            candidateProfile: {
              yearsOfExperience: { gte: minExperience },
            },
          },
        },
      ],
    });
  }
  if (maxExperience != null) {
    andFilters.push({
      OR: [
        { candidateExperience: { lte: maxExperience } },
        {
          candidate: {
            candidateProfile: {
              yearsOfExperience: { lte: maxExperience },
            },
          },
        },
      ],
    });
  }
  if (skill) {
    const tokens = skill
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (tokens.length > 0) {
      andFilters.push({
        OR: [
          { candidateSkills: { hasSome: tokens } },
          {
            candidate: {
              candidateProfile: {
                skills: { hasSome: tokens },
              },
            },
          },
        ],
      });
    }
  }
  if (appliedFrom || appliedTo) {
    const dateRange = {};
    if (appliedFrom) dateRange.gte = new Date(appliedFrom);
    if (appliedTo) {
      const end = new Date(appliedTo);
      end.setHours(23, 59, 59, 999);
      dateRange.lte = end;
    }
    andFilters.push({ appliedAt: dateRange });
  }
  if (q) {
    andFilters.push({
      OR: [
        { candidate: { fullName: { contains: q, mode: 'insensitive' } } },
        { candidate: { email: { contains: q, mode: 'insensitive' } } },
        { job: { title: { contains: q, mode: 'insensitive' } } },
        { company: { name: { contains: q, mode: 'insensitive' } } },
      ],
    });
  }

  const where = andFilters.length > 0 ? { AND: andFilters } : {};
  const skip = (page - 1) * limit;
  const orderBy = { [sortBy]: sortOrder };

  const [items, total] = await Promise.all([
    db.application.findMany({
      where,
      include: recruiterApplicationInclude,
      orderBy,
      skip,
      take: limit,
    }),
    db.application.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
};
