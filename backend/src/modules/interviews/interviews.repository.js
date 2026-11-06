const prisma = require('../../config/prisma');

const INTERVIEW_INCLUDE = {
  application: {
    select: {
      id: true,
      jobId: true,
      candidateId: true,
      companyId: true,
      status: true,
      appliedAt: true,
      candidateSkills: true,
      candidateExperience: true,
      candidateSnapshot: true,
      jobSnapshot: true,
      resumeId: true,
      resumeKey: true,
      resumeFileName: true,
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
      city: true,
      state: true,
      country: true,
      status: true,
    },
  },
  company: {
    select: {
      id: true,
      name: true,
      logoUrl: true,
      industry: true,
      city: true,
      state: true,
      country: true,
      ownerId: true,
      memberships: {
        where: { membershipStatus: 'ACTIVE' },
        select: {
          userId: true,
          role: true,
          membershipStatus: true,
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
        },
      },
    },
  },
  candidate: {
    select: {
      id: true,
      fullName: true,
      email: true,
      candidateProfile: {
        select: {
          phone: true,
          headline: true,
          currentJobTitle: true,
          currentCompany: true,
          yearsOfExperience: true,
          city: true,
          state: true,
          country: true,
        },
      },
    },
  },
  createdBy: {
    select: { id: true, fullName: true, email: true },
  },
  updatedBy: {
    select: { id: true, fullName: true, email: true },
  },
  cancelledBy: {
    select: { id: true, fullName: true, email: true },
  },
  interviewers: {
    where: { assignmentStatus: { not: 'REMOVED' } },
    orderBy: { assignedAt: 'asc' },
    include: {
      interviewer: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          recruiterProfile: {
            select: {
              designation: true,
              phone: true,
            },
          },
        },
      },
      assignedBy: {
        select: { id: true, fullName: true, email: true },
      },
    },
  },
  feedbacks: {
    orderBy: { submittedAt: 'desc' },
    include: {
      interviewer: {
        select: {
          id: true,
          fullName: true,
          email: true,
          recruiterProfile: {
            select: { designation: true },
          },
        },
      },
    },
  },
  history: {
    orderBy: { changedAt: 'desc' },
    include: {
      changedBy: {
        select: { id: true, fullName: true, email: true, role: true },
      },
    },
  },
  rescheduleRequests: {
    orderBy: { createdAt: 'desc' },
    include: {
      candidate: {
        select: { id: true, fullName: true, email: true },
      },
      reviewedBy: {
        select: { id: true, fullName: true, email: true },
      },
    },
  },
};

exports.getAuthorizedCompanyIdsForUser = async (userId) => {
  const [owned, memberships] = await Promise.all([
    prisma.company.findMany({
      where: { ownerId: userId },
      select: { id: true },
    }),
    prisma.companyMembership.findMany({
      where: { userId, membershipStatus: 'ACTIVE' },
      select: { companyId: true, role: true },
    }),
  ]);

  const roleMap = new Map();
  for (const m of memberships) {
    roleMap.set(m.companyId, m.role);
  }
  for (const c of owned) {
    roleMap.set(c.id, 'OWNER');
  }
  return {
    companyIds: Array.from(roleMap.keys()),
    roleMap,
  };
};

exports.findApplicationForInterview = async (applicationId) => {
  return prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      job: true,
      candidate: {
        select: {
          id: true,
          fullName: true,
          email: true,
          status: true,
          candidateProfile: true,
        },
      },
      company: {
        include: {
          memberships: {
            where: { membershipStatus: 'ACTIVE' },
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  role: true,
                  status: true,
                },
              },
            },
          },
          owner: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
              status: true,
            },
          },
        },
      },
      interviews: {
        orderBy: { roundNumber: 'asc' },
        include: {
          interviewers: {
            where: { assignmentStatus: { not: 'REMOVED' } },
          },
          feedbacks: true,
        },
      },
      hiringDecisions: {
        orderBy: { decidedAt: 'desc' },
        include: {
          decidedBy: {
            select: { id: true, fullName: true, email: true, role: true },
          },
        },
      },
    },
  });
};

exports.findInterviewById = async (interviewId) => {
  return prisma.interview.findUnique({
    where: { id: interviewId },
    include: INTERVIEW_INCLUDE,
  });
};

exports.findOverlappingInterviewsForUsers = async ({
  interviewerIds = [],
  candidateId = null,
  startTime,
  endTime,
  excludeInterviewId = null,
}) => {
  const activeStatuses = ['SCHEDULED', 'RESCHEDULED', 'CONFIRMED', 'IN_PROGRESS'];
  const where = {
    status: { in: activeStatuses },
    startTime: { lt: new Date(endTime) },
    endTime: { gt: new Date(startTime) },
  };
  if (excludeInterviewId) {
    where.id = { not: excludeInterviewId };
  }

  const orConditions = [];
  if (candidateId) {
    orConditions.push({ candidateId });
  }
  if (interviewerIds.length > 0) {
    orConditions.push({
      interviewers: {
        some: {
          interviewerId: { in: interviewerIds },
          assignmentStatus: { not: 'REMOVED' },
        },
      },
    });
  }

  if (orConditions.length === 0) return [];
  where.OR = orConditions;

  return prisma.interview.findMany({
    where,
    select: {
      id: true,
      title: true,
      roundNumber: true,
      candidateId: true,
      startTime: true,
      endTime: true,
      interviewers: {
        where: { assignmentStatus: { not: 'REMOVED' } },
        select: {
          interviewerId: true,
          interviewer: { select: { fullName: true, email: true } },
        },
      },
    },
  });
};

exports.createInterviewTransaction = async ({
  interviewData,
  interviewers = [],
  historyEntry,
  shouldMoveApplicationToInterview = false,
  applicationStatusHistoryEntry = null,
}) => {
  return prisma.$transaction(async (tx) => {
    const created = await tx.interview.create({
      data: {
        ...interviewData,
        interviewers:
          interviewers.length > 0
            ? {
                create: interviewers.map((item) => ({
                  interviewerId: item.interviewerId,
                  interviewerRole: item.interviewerRole || 'TECHNICAL_INTERVIEWER',
                  assignmentStatus: 'ASSIGNED',
                  assignedById: interviewData.createdById,
                })),
              }
            : undefined,
        history: {
          create: historyEntry,
        },
      },
      include: INTERVIEW_INCLUDE,
    });

    if (shouldMoveApplicationToInterview && applicationStatusHistoryEntry) {
      await tx.application.update({
        where: { id: interviewData.applicationId },
        data: {
          status: 'INTERVIEW',
          reviewedById: interviewData.createdById,
          lastStatusUpdatedAt: new Date(),
        },
      });
      await tx.applicationStatusHistory.create({
        data: applicationStatusHistoryEntry,
      });
    }

    return created;
  });
};

exports.updateInterviewWithHistory = async (interviewId, updateData, historyEntry, applicationUpdate = null) => {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.interview.update({
      where: { id: interviewId },
      data: {
        ...updateData,
        history: historyEntry ? { create: historyEntry } : undefined,
      },
      include: INTERVIEW_INCLUDE,
    });

    if (applicationUpdate) {
      await tx.application.update({
        where: { id: updated.applicationId },
        data: applicationUpdate.data,
      });
      if (applicationUpdate.history) {
        await tx.applicationStatusHistory.create({
          data: applicationUpdate.history,
        });
      }
    }

    return updated;
  });
};

exports.upsertInterviewerAssignments = async ({ interviewId, interviewers, assignedById, historyEntry }) => {
  return prisma.$transaction(async (tx) => {
    for (const item of interviewers) {
      await tx.interviewerAssignment.upsert({
        where: {
          interviewId_interviewerId: {
            interviewId,
            interviewerId: item.interviewerId,
          },
        },
        update: {
          interviewerRole: item.interviewerRole || 'TECHNICAL_INTERVIEWER',
          assignmentStatus: 'ASSIGNED',
          assignedById,
          removedAt: null,
        },
        create: {
          interviewId,
          interviewerId: item.interviewerId,
          interviewerRole: item.interviewerRole || 'TECHNICAL_INTERVIEWER',
          assignmentStatus: 'ASSIGNED',
          assignedById,
        },
      });
    }

    if (historyEntry) {
      await tx.interviewHistory.create({
        data: {
          interviewId,
          ...historyEntry,
        },
      });
    }

    return tx.interview.findUnique({
      where: { id: interviewId },
      include: INTERVIEW_INCLUDE,
    });
  });
};

exports.removeInterviewerAssignment = async ({ interviewId, assignmentId, historyEntry }) => {
  return prisma.$transaction(async (tx) => {
    await tx.interviewerAssignment.update({
      where: { id: assignmentId },
      data: {
        assignmentStatus: 'REMOVED',
        removedAt: new Date(),
      },
    });

    if (historyEntry) {
      await tx.interviewHistory.create({
        data: {
          interviewId,
          ...historyEntry,
        },
      });
    }

    return tx.interview.findUnique({
      where: { id: interviewId },
      include: INTERVIEW_INCLUDE,
    });
  });
};

exports.upsertFeedbackTransaction = async ({
  interviewId,
  applicationId,
  interviewerId,
  feedbackData,
  historyEntry,
}) => {
  return prisma.$transaction(async (tx) => {
    const feedback = await tx.interviewFeedback.upsert({
      where: {
        interviewId_interviewerId: {
          interviewId,
          interviewerId,
        },
      },
      update: {
        ...feedbackData,
        updatedAt: new Date(),
      },
      create: {
        interviewId,
        applicationId,
        interviewerId,
        ...feedbackData,
      },
      include: {
        interviewer: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    await tx.interviewerAssignment.updateMany({
      where: {
        interviewId,
        interviewerId,
        assignmentStatus: { not: 'REMOVED' },
      },
      data: {
        assignmentStatus: 'COMPLETED',
      },
    });

    if (historyEntry) {
      await tx.interviewHistory.create({
        data: {
          interviewId,
          ...historyEntry,
        },
      });
    }

    return feedback;
  });
};

exports.findFeedbackById = async (feedbackId) => {
  return prisma.interviewFeedback.findUnique({
    where: { id: feedbackId },
    include: {
      interviewer: {
        select: { id: true, fullName: true, email: true },
      },
    },
  });
};

exports.updateFeedbackById = async (feedbackId, interviewId, feedbackData, historyEntry) => {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.interviewFeedback.update({
      where: { id: feedbackId },
      data: {
        ...feedbackData,
        updatedAt: new Date(),
      },
      include: {
        interviewer: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    if (historyEntry) {
      await tx.interviewHistory.create({
        data: {
          interviewId,
          ...historyEntry,
        },
      });
    }

    return updated;
  });
};

exports.createHiringDecisionTransaction = async ({
  decisionData,
  applicationStatusUpdate,
  applicationStatusHistoryEntry,
}) => {
  return prisma.$transaction(async (tx) => {
    const decision = await tx.hiringDecision.create({
      data: decisionData,
      include: {
        decidedBy: {
          select: { id: true, fullName: true, email: true, role: true },
        },
        application: true,
        job: {
          select: { id: true, title: true, department: true },
        },
        company: {
          select: { id: true, name: true, logoUrl: true },
        },
        candidate: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    if (applicationStatusUpdate) {
      await tx.application.update({
        where: { id: decisionData.applicationId },
        data: applicationStatusUpdate,
      });
    }

    if (applicationStatusHistoryEntry) {
      await tx.applicationStatusHistory.create({
        data: applicationStatusHistoryEntry,
      });
    }

    return decision;
  });
};

exports.findHiringDecisionsByApplication = async (applicationId) => {
  return prisma.hiringDecision.findMany({
    where: { applicationId },
    orderBy: { decidedAt: 'desc' },
    include: {
      decidedBy: {
        select: { id: true, fullName: true, email: true, role: true },
      },
    },
  });
};

exports.createRescheduleRequestTransaction = async ({ requestData, historyEntry }) => {
  return prisma.$transaction(async (tx) => {
    const reqRecord = await tx.interviewRescheduleRequest.create({
      data: requestData,
      include: {
        candidate: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    if (historyEntry) {
      await tx.interviewHistory.create({
        data: historyEntry,
      });
    }

    return reqRecord;
  });
};

exports.updateRescheduleRequestStatus = async (requestId, data) => {
  return prisma.interviewRescheduleRequest.update({
    where: { id: requestId },
    data,
  });
};

exports.listRecruiterInterviews = async ({
  companyIds,
  currentUserId,
  isAdmin = false,
  filters = {},
}) => {
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 20;
  const skip = (page - 1) * limit;

  const where = {};

  if (!isAdmin) {
    where.OR = [
      { companyId: { in: companyIds } },
      {
        interviewers: {
          some: {
            interviewerId: currentUserId,
            assignmentStatus: { not: 'REMOVED' },
          },
        },
      },
    ];
  }

  if (filters.companyId) {
    where.companyId = filters.companyId;
  }
  if (filters.jobId) {
    where.jobId = filters.jobId;
  }
  if (filters.applicationId) {
    where.applicationId = filters.applicationId;
  }
  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.interviewType) {
    where.interviewType = filters.interviewType;
  }
  if (filters.interviewerId) {
    where.interviewers = {
      some: {
        interviewerId: filters.interviewerId,
        assignmentStatus: { not: 'REMOVED' },
      },
    };
  }

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  if (filters.timeframe === 'UPCOMING') {
    where.startTime = { gte: now };
    where.status = where.status || { in: ['SCHEDULED', 'RESCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] };
  } else if (filters.timeframe === 'TODAY') {
    where.startTime = { gte: startOfToday, lte: endOfToday };
  } else if (filters.timeframe === 'COMPLETED') {
    where.status = 'COMPLETED';
  } else if (filters.timeframe === 'PENDING_FEEDBACK') {
    where.status = { in: ['COMPLETED', 'IN_PROGRESS', 'CONFIRMED', 'SCHEDULED'] };
    where.feedbacks = { none: {} };
  }

  if (filters.dateFrom || filters.dateTo) {
    where.startTime = where.startTime || {};
    if (filters.dateFrom) {
      where.startTime.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      const endDate = new Date(filters.dateTo);
      endDate.setHours(23, 59, 59, 999);
      where.startTime.lte = endDate;
    }
  }

  if (filters.search) {
    const q = filters.search.trim();
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { candidate: { fullName: { contains: q, mode: 'insensitive' } } },
          { candidate: { email: { contains: q, mode: 'insensitive' } } },
          { job: { title: { contains: q, mode: 'insensitive' } } },
          { company: { name: { contains: q, mode: 'insensitive' } } },
        ],
      },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.interview.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ startTime: 'asc' }, { roundNumber: 'asc' }],
      include: INTERVIEW_INCLUDE,
    }),
    prisma.interview.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

exports.getRecruiterInterviewStats = async ({ companyIds, currentUserId, isAdmin = false, companyId = null }) => {
  const baseWhere = {};
  if (companyId) {
    baseWhere.companyId = companyId;
  } else if (!isAdmin) {
    baseWhere.OR = [
      { companyId: { in: companyIds } },
      {
        interviewers: {
          some: {
            interviewerId: currentUserId,
            assignmentStatus: { not: 'REMOVED' },
          },
        },
      },
    ];
  }

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const [
    totalInterviews,
    upcomingInterviews,
    interviewsToday,
    completedInterviews,
    pendingFeedback,
    cancelledInterviews,
    noShowInterviews,
  ] = await Promise.all([
    prisma.interview.count({ where: baseWhere }),
    prisma.interview.count({
      where: {
        ...baseWhere,
        startTime: { gte: now },
        status: { in: ['SCHEDULED', 'RESCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
      },
    }),
    prisma.interview.count({
      where: {
        ...baseWhere,
        startTime: { gte: startOfToday, lte: endOfToday },
        status: { not: 'CANCELLED' },
      },
    }),
    prisma.interview.count({
      where: { ...baseWhere, status: 'COMPLETED' },
    }),
    prisma.interview.count({
      where: {
        ...baseWhere,
        status: 'COMPLETED',
        feedbacks: { none: {} },
      },
    }),
    prisma.interview.count({
      where: { ...baseWhere, status: 'CANCELLED' },
    }),
    prisma.interview.count({
      where: { ...baseWhere, status: 'NO_SHOW' },
    }),
  ]);

  return {
    totalInterviews,
    upcomingInterviews,
    interviewsToday,
    completedInterviews,
    pendingFeedback,
    cancelledInterviews,
    noShowInterviews,
  };
};

exports.getRecruiterHiringStats = async ({ companyIds, isAdmin = false, companyId = null }) => {
  const appWhere = {};
  const decisionWhere = {};

  if (companyId) {
    appWhere.companyId = companyId;
    decisionWhere.companyId = companyId;
  } else if (!isAdmin) {
    appWhere.companyId = { in: companyIds };
    decisionWhere.companyId = { in: companyIds };
  }

  const [
    inInterviewStage,
    shortlistedStage,
    offeredCount,
    hiredCount,
    rejectedCount,
    selectedDecisions,
    onHoldDecisions,
    recentDecisions,
  ] = await Promise.all([
    prisma.application.count({ where: { ...appWhere, status: 'INTERVIEW' } }),
    prisma.application.count({ where: { ...appWhere, status: 'SHORTLISTED' } }),
    prisma.application.count({ where: { ...appWhere, status: 'OFFERED' } }),
    prisma.application.count({ where: { ...appWhere, status: 'HIRED' } }),
    prisma.application.count({ where: { ...appWhere, status: 'REJECTED' } }),
    prisma.hiringDecision.count({ where: { ...decisionWhere, decision: 'SELECTED' } }),
    prisma.hiringDecision.count({ where: { ...decisionWhere, decision: 'ON_HOLD' } }),
    prisma.hiringDecision.findMany({
      where: decisionWhere,
      orderBy: { decidedAt: 'desc' },
      take: 15,
      include: {
        decidedBy: {
          select: { id: true, fullName: true, email: true, role: true },
        },
        candidate: {
          select: { id: true, fullName: true, email: true },
        },
        job: {
          select: { id: true, title: true, department: true },
        },
        company: {
          select: { id: true, name: true, logoUrl: true },
        },
        application: {
          select: { id: true, status: true, appliedAt: true },
        },
      },
    }),
  ]);

  return {
    inInterviewStage,
    shortlistedStage,
    offeredCount,
    hiredCount,
    rejectedCount,
    selectedDecisions,
    onHoldDecisions,
    recentDecisions,
  };
};

exports.listCandidateInterviews = async (candidateId, filters = {}) => {
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 20;
  const skip = (page - 1) * limit;

  const where = {
    candidateId,
    status: { not: 'DRAFT' },
  };

  if (filters.status && filters.status !== 'DRAFT') {
    where.status = filters.status;
  }

  const now = new Date();
  if (filters.timeframe === 'UPCOMING') {
    where.startTime = { gte: now };
    where.status = { in: ['SCHEDULED', 'RESCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] };
  } else if (filters.timeframe === 'PAST') {
    where.OR = [
      { startTime: { lt: now } },
      { status: { in: ['COMPLETED', 'CANCELLED', 'NO_SHOW'] } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.interview.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ startTime: 'asc' }, { roundNumber: 'asc' }],
      include: INTERVIEW_INCLUDE,
    }),
    prisma.interview.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};
