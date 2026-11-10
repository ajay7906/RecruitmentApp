const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const aiServiceClient = require('../../services/aiServiceClient');

/**
 * Verifies that `currentUser` has active recruiter/admin/owner access to the company
 * that owns `jobId`, and returns the job + companyId.
 */
async function verifyRecruiterJobAccess(jobId, currentUser) {
  if (!currentUser) {
    throw new ApiError(401, 'Authentication required', 'UNAUTHORIZED');
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      company: {
        include: {
          memberships: {
            where: {
              userId: currentUser.id,
              membershipStatus: 'ACTIVE',
            },
          },
        },
      },
    },
  });

  if (!job || job.isDeleted) {
    throw new ApiError(404, 'Job not found', 'JOB_NOT_FOUND');
  }

  if (currentUser.role === 'admin') {
    return job;
  }

  const isOwner = job.company?.ownerId === currentUser.id;
  const hasActiveMembership = (job.company?.memberships || []).length > 0;

  if (!isOwner && !hasActiveMembership) {
    throw new ApiError(
      403,
      'You do not have permission to access AI features for this company job',
      'CROSS_COMPANY_FORBIDDEN'
    );
  }

  return job;
}

async function verifyRecruiterCompanyAccess(companyId, currentUser) {
  if (!currentUser) {
    throw new ApiError(401, 'Authentication required', 'UNAUTHORIZED');
  }
  if (currentUser.role === 'admin') {
    return true;
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      memberships: {
        where: {
          userId: currentUser.id,
          membershipStatus: 'ACTIVE',
        },
      },
    },
  });

  if (!company || company.isDeleted) {
    throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');
  }

  const isOwner = company.ownerId === currentUser.id;
  const hasActiveMembership = (company.memberships || []).length > 0;
  if (!isOwner && !hasActiveMembership) {
    throw new ApiError(
      403,
      'Cross-company AI access denied',
      'CROSS_COMPANY_FORBIDDEN'
    );
  }
  return true;
}

exports.startJobMatching = async (jobId, payload, currentUser) => {
  const job = await verifyRecruiterJobAccess(jobId, currentUser);

  const requestBody = {
    job_id: job.id,
    company_id: job.companyId,
    requested_by: currentUser.id,
    top_k: payload.top_k ?? 5,
    shortlist_size: payload.shortlist_size,
    force_refresh: payload.force_refresh ?? false,
    async_execution: payload.async_execution ?? true,
    filters: payload.filters || {},
    weights: payload.weights || {},
  };

  return aiServiceClient.startJobMatching(requestBody, {
    companyId: job.companyId,
    actorId: currentUser.id,
    actorRole: currentUser.role,
  });
};

exports.getMatchingStatus = async (matchingId, currentUser) => {
  // Fetch matching log company_id from ai.ai_job_logs to verify tenant ownership in Node.js
  const rows = await prisma.$queryRawUnsafe(
    `SELECT id, company_id, job_id FROM ai.ai_job_logs WHERE id = $1::uuid LIMIT 1`,
    String(matchingId)
  );
  if (!rows || rows.length === 0) {
    throw new ApiError(404, 'Matching run not found', 'MATCHING_NOT_FOUND');
  }
  const companyId = rows[0].company_id;
  await verifyRecruiterCompanyAccess(companyId, currentUser);

  return aiServiceClient.getMatchingStatus(matchingId, {
    companyId,
    actorId: currentUser.id,
    actorRole: currentUser.role,
  });
};

exports.retryMatching = async (matchingId, currentUser) => {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT id, company_id, job_id FROM ai.ai_job_logs WHERE id = $1::uuid LIMIT 1`,
    String(matchingId)
  );
  if (!rows || rows.length === 0) {
    throw new ApiError(404, 'Matching run not found', 'MATCHING_NOT_FOUND');
  }
  const companyId = rows[0].company_id;
  await verifyRecruiterCompanyAccess(companyId, currentUser);

  return aiServiceClient.retryMatching(matchingId, {
    companyId,
    actorId: currentUser.id,
    actorRole: currentUser.role,
  });
};

exports.rankCandidatesForJob = async (jobId, payload, currentUser) => {
  const job = await verifyRecruiterJobAccess(jobId, currentUser);

  const requestBody = {
    job_id: job.id,
    company_id: job.companyId,
    top_k: payload.top_k ?? 10,
    weights: payload.weights || {},
  };

  return aiServiceClient.rankCandidatesForJob(requestBody, {
    companyId: job.companyId,
    actorId: currentUser.id,
    actorRole: currentUser.role,
  });
};

exports.getJobRanking = async (jobId, query, currentUser) => {
  const job = await verifyRecruiterJobAccess(jobId, currentUser);
  const topK = Number(query.top_k || query.topK || 10);

  return aiServiceClient.getJobRanking(
    job.id,
    { companyId: job.companyId, topK },
    {
      companyId: job.companyId,
      actorId: currentUser.id,
      actorRole: currentUser.role,
    }
  );
};

exports.recommendJobs = async (payload, currentUser) => {
  let candidateId = payload.candidate_id;
  let companyId = payload.company_id || null;

  if (currentUser.role === 'candidate') {
    // Candidates can only request recommendations for themselves
    if (candidateId && candidateId !== currentUser.id) {
      throw new ApiError(
        403,
        'Candidates can only view their own job recommendations',
        'FORBIDDEN'
      );
    }
    candidateId = currentUser.id;
  } else {
    if (!candidateId) {
      throw new ApiError(400, 'candidate_id is required', 'VALIDATION_ERROR');
    }
    if (companyId) {
      await verifyRecruiterCompanyAccess(companyId, currentUser);
    }
  }

  return aiServiceClient.recommendJobsForCandidate(
    {
      candidate_id: candidateId,
      company_id: companyId,
      limit: payload.limit ?? 5,
      min_skill_overlap: payload.min_skill_overlap ?? 0,
      experience_tolerance_years: payload.experience_tolerance_years ?? 2,
      force_refresh: payload.force_refresh ?? false,
    },
    {
      companyId,
      actorId: currentUser.id,
      actorRole: currentUser.role,
    }
  );
};

exports.getResumeProcessingStatus = async (resumeId, currentUser) => {
  const resume = await prisma.candidateResume.findUnique({
    where: { id: resumeId },
  });
  if (!resume || resume.isDeleted) {
    throw new ApiError(404, 'Resume not found', 'RESUME_NOT_FOUND');
  }

  if (currentUser.role === 'candidate' && resume.userId !== currentUser.id) {
    throw new ApiError(403, 'Access denied to this resume', 'FORBIDDEN');
  }

  return aiServiceClient.getResumeProcessingStatus(resumeId, {
    actorId: currentUser.id,
    actorRole: currentUser.role,
  });
};
