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

exports.generateJobDescription = async (payload, currentUser) => {
  if (!payload?.title || typeof payload.title !== 'string') {
    throw new ApiError(400, 'Job title is required', 'VALIDATION_ERROR');
  }

  if (payload.companyId) {
    await verifyRecruiterCompanyAccess(payload.companyId, currentUser);
  }

  return aiServiceClient.generateJobDescription(
    {
      title: payload.title.trim(),
      department: payload.department || null,
      experience_level: payload.experience_level || 'MID',
      employment_type: payload.employment_type || 'FULL_TIME',
      work_mode: payload.work_mode || 'HYBRID',
      company_name: payload.company_name || null,
      key_requirements_or_notes: payload.key_requirements_or_notes || null,
    },
    {
      companyId: payload.companyId,
      actorId: currentUser.id,
      actorRole: currentUser.role,
    }
  );
};

exports.generateTailoredInterviewQuestions = async (payload, currentUser) => {
  const { applicationId, jobId, roundType, focusAreas } = payload || {};
  if (!applicationId && !jobId) {
    throw new ApiError(400, 'applicationId or jobId is required', 'VALIDATION_ERROR');
  }

  let job = null;
  let candidateUser = null;
  let candidateName = 'Candidate';
  let candidateSkills = [];
  let candidateWorkHistory = [];
  let candidateExpYears = 0;

  if (applicationId) {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: true,
        candidate: {
          include: {
            candidateProfile: true,
            candidateSkills: true,
            candidateExperiences: true,
          },
        },
      },
    });

    if (!application || application.isDeleted) {
      throw new ApiError(404, 'Application not found', 'APPLICATION_NOT_FOUND');
    }

    await verifyRecruiterJobAccess(application.jobId, currentUser);
    job = application.job;
    candidateUser = application.candidate;
    candidateName = candidateUser?.fullName || 'Candidate';
    candidateSkills = (candidateUser?.candidateSkills || [])
      .map((s) => s.skillName || s.name)
      .filter(Boolean);
    candidateWorkHistory = (candidateUser?.candidateExperiences || []).map((exp) => ({
      job_title: exp.title || exp.jobTitle,
      company_name: exp.company || exp.companyName,
      description: exp.description,
    }));
    candidateExpYears = Number(candidateUser?.candidateProfile?.yearsOfExperience || 0);

    // Also check if ai.candidate_profiles has extracted resume data
    if (application.resumeId) {
      try {
        const rows = await prisma.$queryRawUnsafe(
          `SELECT technical_skills, normalized_skills, work_experience, total_experience_years
           FROM ai.candidate_profiles
           WHERE resume_id = $1::uuid
           ORDER BY resume_version DESC LIMIT 1`,
          application.resumeId
        );
        if (rows && rows[0]) {
          const aiProfile = rows[0];
          const aiSkills =
            Array.isArray(aiProfile.normalized_skills) && aiProfile.normalized_skills.length
              ? aiProfile.normalized_skills
              : aiProfile.technical_skills || [];
          if (aiSkills.length) {
            candidateSkills = Array.from(new Set([...candidateSkills, ...aiSkills]));
          }
          if (Array.isArray(aiProfile.work_experience) && aiProfile.work_experience.length) {
            candidateWorkHistory = aiProfile.work_experience;
          }
          if (aiProfile.total_experience_years != null) {
            candidateExpYears = Number(aiProfile.total_experience_years);
          }
        }
      } catch (_e) {
        // Fallback to relational data if ai schema query unavailable
      }
    }
  } else if (jobId) {
    job = await verifyRecruiterJobAccess(jobId, currentUser);
  }

  // Parse job requirements
  let requiredSkills = [];
  if (Array.isArray(job?.skills)) {
    requiredSkills = job.skills
      .map((s) => (typeof s === 'string' ? s : s?.name || s?.skillName))
      .filter(Boolean);
  } else if (typeof job?.skills === 'string') {
    requiredSkills = job.skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  let responsibilities = [];
  if (Array.isArray(job?.responsibilities)) {
    responsibilities = job.responsibilities;
  } else if (typeof job?.responsibilities === 'string') {
    responsibilities = job.responsibilities
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const reqBody = {
    job_title: job?.title || 'Target Role',
    job_description: job?.description || '',
    required_skills: requiredSkills,
    responsibilities: responsibilities,
    candidate_name: candidateName,
    candidate_experience_years: candidateExpYears,
    candidate_skills: candidateSkills,
    candidate_work_history: candidateWorkHistory,
    interview_round: roundType || 'TECHNICAL',
    focus_areas: Array.isArray(focusAreas) ? focusAreas : [],
  };

  return aiServiceClient.generateTailoredInterviewQuestions(reqBody, {
    companyId: job?.companyId,
    actorId: currentUser.id,
    actorRole: currentUser.role,
  });
};
