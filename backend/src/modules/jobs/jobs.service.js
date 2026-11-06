const ApiError = require('../../utils/ApiError');
const repo = require('./jobs.repository');
const moderationService = require('./jobModeration.service');

function toNumberOrNull(decimalVal) {
  if (decimalVal === null || decimalVal === undefined) return null;
  const n = Number(decimalVal);
  return Number.isFinite(n) ? n : null;
}

function getCompanyRoleForUser(company, currentUser) {
  if (!currentUser || !company) return null;
  if (company.ownerId === currentUser.id) return 'OWNER';
  const membership = (company.memberships || []).find(
    (m) => m.userId === currentUser.id && m.membershipStatus === 'ACTIVE'
  );
  return membership ? membership.role : null;
}

function computeJobPermissions(job, currentUser, roleMap = null) {
  if (!currentUser) {
    return { myCompanyRole: null, canEdit: false, canManageLifecycle: false, canDelete: false };
  }
  const isSystemAdmin = currentUser.role === 'admin';
  const myCompanyRole =
    roleMap?.get(job.companyId) || getCompanyRoleForUser(job.company, currentUser);

  const isCompanyManager = myCompanyRole === 'OWNER' || myCompanyRole === 'ADMIN';
  const isJobCreator = myCompanyRole === 'RECRUITER' && job.createdById === currentUser.id;
  const hasWriteAccess = isSystemAdmin || isCompanyManager || isJobCreator;

  const canEdit =
    hasWriteAccess && !['CLOSED', 'ARCHIVED'].includes(job.status);
  const canManageLifecycle = hasWriteAccess;
  const canDelete =
    hasWriteAccess && ['DRAFT', 'REJECTED', 'ARCHIVED'].includes(job.status);

  return {
    myCompanyRole,
    canEdit,
    canManageLifecycle,
    canDelete,
  };
}

function formatRecruiterJob(job, currentUser, roleMap = null) {
  if (!job) return null;
  const perms = computeJobPermissions(job, currentUser, roleMap);
  const minExperience = toNumberOrNull(job.minExperience);
  const maxExperience = toNumberOrNull(job.maxExperience);
  const minSalary = toNumberOrNull(job.minSalary);
  const maxSalary = toNumberOrNull(job.maxSalary);

  return {
    ...job,
    jobTitle: job.title,
    jobCategory: job.category,
    jobDescription: job.description,
    jobSummary: job.summary,
    minExperience,
    maxExperience,
    minSalary,
    maxSalary,
    moderationStatus: job.moderationStatus || 'NOT_REVIEWED',
    moderationFlags: job.moderationFlags || [],
    moderationScore: job.moderationScore || 0,
    moderationReason: job.moderationReason || null,
    reportCount: job.reportCount || 0,
    ...perms,
  };
}

function formatPublicJob(job) {
  if (!job) return null;
  const minExperience = toNumberOrNull(job.minExperience);
  const maxExperience = toNumberOrNull(job.maxExperience);
  const minSalary = job.discloseSalary ? toNumberOrNull(job.minSalary) : null;
  const maxSalary = job.discloseSalary ? toNumberOrNull(job.maxSalary) : null;

  const now = new Date();
  const isDeadlinePassed =
    job.applicationDeadline ? new Date(job.applicationDeadline) < now : false;
  const canApply =
    job.status === 'PUBLISHED' && (!isDeadlinePassed || job.allowAfterDeadline);

  return {
    id: job.id,
    title: job.title,
    jobTitle: job.title,
    companyId: job.companyId,
    company: job.company,
    department: job.department,
    category: job.category,
    description: job.description,
    summary: job.summary,
    numberOfOpenings: job.numberOfOpenings,
    employmentType: job.employmentType,
    workMode: job.workMode,
    experienceLevel: job.experienceLevel,
    minExperience,
    maxExperience,
    minSalary,
    maxSalary,
    salaryCurrency: job.salaryCurrency,
    salaryPeriod: job.salaryPeriod,
    discloseSalary: job.discloseSalary,
    country: job.country,
    state: job.state,
    city: job.city,
    officeLocation: job.officeLocation,
    pincode: job.pincode,
    location:
      job.location ||
      [job.city, job.state, job.country].filter(Boolean).join(', ') ||
      job.workMode,
    requiredSkills: job.requiredSkills || [],
    preferredSkills: job.preferredSkills || [],
    educationalQualification: job.educationalQualification,
    minEducationLevel: job.minEducationLevel,
    preferredQualifications: job.preferredQualifications,
    requiredCertifications: job.requiredCertifications || [],
    experienceDescription: job.experienceDescription,
    additionalRequirements: job.additionalRequirements,
    responsibilities: job.responsibilities || [],
    benefits: job.benefits || [],
    perks: job.perks || [],
    additionalInfo: job.additionalInfo,
    applicationInstructions: job.applicationInstructions,
    contactEmail: job.contactEmail,
    applicationDeadline: job.applicationDeadline,
    allowAfterDeadline: job.allowAfterDeadline,
    requireResume: job.requireResume,
    requireCoverLetter: job.requireCoverLetter,
    applicationQuestions: Array.isArray(job.applicationQuestions)
      ? job.applicationQuestions
      : [],
    status: job.status,
    publishedAt: job.publishedAt,
    createdAt: job.createdAt,
    canApply,
  };
}

async function getJobOrThrow(jobId) {
  await repo.expireOverdueJobs();
  const job = await repo.findJobById(jobId);
  if (!job) {
    throw new ApiError(404, 'Job vacancy not found', 'JOB_NOT_FOUND');
  }
  return job;
}

function assertCanAccessCompanyJob(job, currentUser) {
  if (currentUser?.role === 'admin') return 'ADMIN';
  const myCompanyRole = getCompanyRoleForUser(job.company, currentUser);
  if (!myCompanyRole) {
    throw new ApiError(
      403,
      'You do not have permission to access jobs for this company',
      'FORBIDDEN_JOB_ACCESS'
    );
  }
  return myCompanyRole;
}

function assertCanModifyJob(job, currentUser) {
  if (currentUser?.role === 'admin') return 'ADMIN';
  const myCompanyRole = assertCanAccessCompanyJob(job, currentUser);
  const isCompanyManager = myCompanyRole === 'OWNER' || myCompanyRole === 'ADMIN';
  const isCreator = job.createdById === currentUser.id;

  if (!isCompanyManager && !isCreator) {
    throw new ApiError(
      403,
      'Only the job creator, company admin, or company owner can modify this job',
      'FORBIDDEN_JOB_MODIFICATION'
    );
  }
  return myCompanyRole;
}

function validateJobReadinessForPublish(job) {
  const missing = [];
  if (!job.title || job.title.trim().length < 3) missing.push('Job Title');
  if (!job.description || job.description.trim().length < 20) missing.push('Job Description');
  if (!job.employmentType) missing.push('Employment Type');
  if (!job.workMode) missing.push('Work Mode');
  if (!job.numberOfOpenings || job.numberOfOpenings < 1) missing.push('Number of Openings');
  if (!Array.isArray(job.requiredSkills) || job.requiredSkills.length === 0) {
    missing.push('At least one Required Skill');
  }
  if (job.workMode !== 'Remote') {
    if (!job.country) missing.push('Country');
    if (!job.city) missing.push('City');
  }

  if (missing.length > 0) {
    throw new ApiError(
      400,
      `Cannot publish job until required fields are completed: ${missing.join(', ')}`,
      'INCOMPLETE_JOB_DETAILS'
    );
  }

  if (job.applicationDeadline && !job.allowAfterDeadline) {
    const now = new Date();
    if (new Date(job.applicationDeadline) < now) {
      throw new ApiError(
        400,
        'Application deadline is in the past. Please update the deadline before publishing.',
        'DEADLINE_IN_PAST'
      );
    }
  }
}

function assertCompanyEligibleToPublish(company) {
  if (!company) {
    throw new ApiError(404, 'Associated company not found', 'COMPANY_NOT_FOUND');
  }
  if (company.status === 'SUSPENDED') {
    throw new ApiError(
      403,
      `Cannot publish jobs because "${company.name}" is currently SUSPENDED.`,
      'COMPANY_SUSPENDED'
    );
  }
  if (company.status !== 'APPROVED') {
    throw new ApiError(
      403,
      `Company "${company.name}" must be APPROVED before publishing jobs (current status: ${company.status}).`,
      'COMPANY_NOT_APPROVED'
    );
  }
}

// ── Create Job (Automatic Publishing for Approved Companies unless saveAsDraft=true) ──
exports.createJob = async (currentUser, data) => {
  const { saveAsDraft = false, ...jobFields } = data;
  const company = await repo.findCompanyWithMemberships(jobFields.companyId);
  if (!company) {
    throw new ApiError(404, 'Selected company not found', 'COMPANY_NOT_FOUND');
  }

  const myCompanyRole = getCompanyRoleForUser(company, currentUser);
  if (currentUser.role !== 'admin' && !myCompanyRole) {
    throw new ApiError(
      403,
      'You must be an active member of the selected company to create a job',
      'NOT_COMPANY_MEMBER'
    );
  }

  if (company.status === 'SUSPENDED') {
    throw new ApiError(
      403,
      `Cannot create or publish jobs because "${company.name}" is currently SUSPENDED.`,
      'COMPANY_SUSPENDED'
    );
  }

  const contentHash = moderationService.computeJobContentHash(jobFields);

  // If recruiter explicitly requested saving as a draft, save in DRAFT status
  if (saveAsDraft) {
    const draftJob = await repo.createJob({
      ...jobFields,
      contentHash,
      createdById: currentUser.id,
      updatedById: currentUser.id,
      status: 'DRAFT',
      moderationStatus: 'NOT_REVIEWED',
    });

    return formatRecruiterJob(draftJob, currentUser);
  }

  // Otherwise, perform automatic publishing validation & checks:
  // 1. Verify company is APPROVED and ACTIVE
  assertCompanyEligibleToPublish(company);

  // 2. Validate mandatory job information, salary, experience, location & deadline
  validateJobReadinessForPublish(jobFields);

  // 3. Perform synchronous duplicate and prohibited content checks
  const preCheck = await moderationService.runPrePublishChecks({
    companyId: company.id,
    payload: jobFields,
  });
  if (!preCheck.allowed) {
    throw new ApiError(400, preCheck.message, preCheck.code);
  }

  const now = new Date();
  const created = await repo.createJob({
    ...jobFields,
    contentHash: preCheck.contentHash || contentHash,
    createdById: currentUser.id,
    updatedById: currentUser.id,
    status: 'PUBLISHED',
    moderationStatus: 'NOT_REVIEWED',
    submittedAt: now,
    publishedAt: now,
  });

  // 4. Trigger non-blocking asynchronous background moderation
  moderationService.scheduleAsyncModeration(created.id, 'JOB_CREATED_AND_PUBLISHED');

  return formatRecruiterJob(created, currentUser);
};

// ── List Accessible Jobs for Recruiter + Dashboard Stats ─────────────────
exports.getMyJobs = async (currentUser, queryParams) => {
  await repo.expireOverdueJobs();

  const { companyIds, roleMap } =
    currentUser.role === 'admin'
      ? { companyIds: undefined, roleMap: new Map() }
      : await repo.findAccessibleCompanyIdsForUser(currentUser.id);

  if (
    queryParams.companyId &&
    Array.isArray(companyIds) &&
    !companyIds.includes(queryParams.companyId)
  ) {
    throw new ApiError(403, 'You do not have access to this company', 'FORBIDDEN_COMPANY_ACCESS');
  }

  const q = queryParams.q || queryParams.search || '';
  const [listResult, stats] = await Promise.all([
    repo.findJobsForManagement({
      ...queryParams,
      q,
      companyIds,
    }),
    repo.getDashboardStats(queryParams.companyId ? [queryParams.companyId] : companyIds),
  ]);

  return {
    jobs: listResult.items.map((j) => formatRecruiterJob(j, currentUser, roleMap)),
    stats,
    pagination: {
      total: listResult.total,
      page: listResult.page,
      limit: listResult.limit,
      totalPages: listResult.totalPages,
    },
  };
};

// ── Admin: List All Jobs ─────────────────────────────────────────────────
exports.listAdminJobs = async (adminUser, queryParams) => {
  await repo.expireOverdueJobs();
  const q = queryParams.q || queryParams.search || '';
  const [listResult, stats] = await Promise.all([
    repo.findJobsForManagement({
      ...queryParams,
      q,
      companyIds: undefined,
    }),
    repo.getDashboardStats(queryParams.companyId ? [queryParams.companyId] : undefined),
  ]);

  return {
    jobs: listResult.items.map((j) => formatRecruiterJob(j, adminUser)),
    stats,
    pagination: {
      total: listResult.total,
      page: listResult.page,
      limit: listResult.limit,
      totalPages: listResult.totalPages,
    },
  };
};

// ── Get Single Job Details (Recruiter / Admin / Candidate) ───────────────
exports.getJobDetails = async (currentUser, jobId) => {
  const job = await getJobOrThrow(jobId);

  if (!currentUser || currentUser.role === 'candidate') {
    if (job.status !== 'PUBLISHED' || job.company?.status !== 'APPROVED') {
      throw new ApiError(404, 'Job vacancy not found or no longer available', 'JOB_NOT_AVAILABLE');
    }
    return formatPublicJob(job);
  }

  assertCanAccessCompanyJob(job, currentUser);
  return formatRecruiterJob(job, currentUser);
};

// ── Update Job Details ───────────────────────────────────────────────────
exports.updateJob = async (currentUser, jobId, data) => {
  const job = await getJobOrThrow(jobId);
  assertCanModifyJob(job, currentUser);

  if (['CLOSED', 'ARCHIVED'].includes(job.status) && currentUser.role !== 'admin') {
    throw new ApiError(
      400,
      `Cannot edit a job in ${job.status} status`,
      'JOB_NOT_EDITABLE'
    );
  }

  const { saveAsDraft: _ignoreDraft, ...updateFields } = data;
  const merged = { ...job, ...updateFields };
  const contentHash = moderationService.computeJobContentHash(merged);

  if (job.status === 'PUBLISHED') {
    // Ensure published job remains valid and passes pre-publish safety checks after edit
    assertCompanyEligibleToPublish(job.company);
    validateJobReadinessForPublish(merged);
    const preCheck = await moderationService.runPrePublishChecks({
      companyId: job.companyId,
      payload: merged,
      excludeJobId: job.id,
    });
    if (!preCheck.allowed) {
      throw new ApiError(400, preCheck.message, preCheck.code);
    }
  }

  const updated = await repo.updateJob(jobId, {
    ...updateFields,
    contentHash,
    ...(job.status === 'PUBLISHED' && job.moderationStatus !== 'ACTION_REQUIRED'
      ? { moderationStatus: 'NOT_REVIEWED' }
      : {}),
    updatedById: currentUser.id,
  });

  if (updated.status === 'PUBLISHED') {
    moderationService.scheduleAsyncModeration(updated.id, 'JOB_UPDATED');
  }

  return formatRecruiterJob(updated, currentUser);
};

// ── Delete Job (Only DRAFT, REJECTED, or ARCHIVED) ───────────────────────
exports.deleteJob = async (currentUser, jobId) => {
  const job = await getJobOrThrow(jobId);
  assertCanModifyJob(job, currentUser);

  if (!['DRAFT', 'REJECTED', 'ARCHIVED'].includes(job.status) && currentUser.role !== 'admin') {
    throw new ApiError(
      400,
      `Cannot delete a job in ${job.status} status. Close or archive the job instead.`,
      'DELETE_NOT_ALLOWED'
    );
  }

  await repo.deleteJob(jobId);
};

// ── Automatic Job Publishing (No Manual Approval Queue Required) ─────────
exports.publishJob = async (currentUser, jobId) => {
  const job = await getJobOrThrow(jobId);
  assertCanModifyJob(job, currentUser);

  if (job.status === 'PUBLISHED') {
    throw new ApiError(400, 'Job is already published', 'ALREADY_PUBLISHED');
  }
  if (
    job.moderationStatus === 'ACTION_REQUIRED' &&
    currentUser.role !== 'admin'
  ) {
    throw new ApiError(
      403,
      'This job has been restricted by platform moderation. Please update the listing or contact an administrator.',
      'MODERATION_ACTION_REQUIRED'
    );
  }
  if (!['DRAFT', 'REJECTED', 'PENDING_APPROVAL'].includes(job.status)) {
    throw new ApiError(
      400,
      `Cannot publish a job from ${job.status} status`,
      'INVALID_STATUS_TRANSITION'
    );
  }

  // 1. Verify company is APPROVED and ACTIVE
  assertCompanyEligibleToPublish(job.company);

  // 2. Validate mandatory job fields, salary, experience, location & deadline
  validateJobReadinessForPublish(job);

  // 3. Perform synchronous duplicate and prohibited content checks
  const preCheck = await moderationService.runPrePublishChecks({
    companyId: job.companyId,
    payload: job,
    excludeJobId: job.id,
  });
  if (!preCheck.allowed) {
    throw new ApiError(400, preCheck.message, preCheck.code);
  }

  const now = new Date();
  const published = await repo.updateJob(jobId, {
    status: 'PUBLISHED',
    moderationStatus: 'NOT_REVIEWED',
    contentHash: preCheck.contentHash || moderationService.computeJobContentHash(job),
    publishedAt: job.publishedAt || now,
    submittedAt: job.submittedAt || now,
    rejectionReason: null,
    updatedById: currentUser.id,
  });

  // 4. Trigger non-blocking asynchronous background moderation
  moderationService.scheduleAsyncModeration(published.id, 'JOB_PUBLISHED');

  return formatRecruiterJob(published, currentUser);
};

// ── Pause Published Job ──────────────────────────────────────────────────
exports.pauseJob = async (currentUser, jobId) => {
  const job = await getJobOrThrow(jobId);
  assertCanModifyJob(job, currentUser);

  if (job.status !== 'PUBLISHED') {
    throw new ApiError(400, 'Only PUBLISHED jobs can be paused', 'INVALID_STATUS_TRANSITION');
  }

  const updated = await repo.updateJob(jobId, {
    status: 'PAUSED',
    pausedAt: new Date(),
    updatedById: currentUser.id,
  });

  return formatRecruiterJob(updated, currentUser);
};

// ── Resume Paused Job ────────────────────────────────────────────────────
exports.resumeJob = async (currentUser, jobId) => {
  const job = await getJobOrThrow(jobId);
  assertCanModifyJob(job, currentUser);

  if (
    job.moderationStatus === 'ACTION_REQUIRED' &&
    currentUser.role !== 'admin'
  ) {
    throw new ApiError(
      403,
      'This job was paused/restricted by platform moderation and can only be restored after administrator review.',
      'MODERATION_ACTION_REQUIRED'
    );
  }

  if (job.status !== 'PAUSED' && job.status !== 'EXPIRED') {
    throw new ApiError(
      400,
      'Only PAUSED (or EXPIRED with updated deadline) jobs can be resumed',
      'INVALID_STATUS_TRANSITION'
    );
  }

  assertCompanyEligibleToPublish(job.company);
  validateJobReadinessForPublish(job);

  const updated = await repo.updateJob(jobId, {
    status: 'PUBLISHED',
    pausedAt: null,
    publishedAt: job.publishedAt || new Date(),
    updatedById: currentUser.id,
  });

  moderationService.scheduleAsyncModeration(updated.id, 'JOB_RESUMED');

  return formatRecruiterJob(updated, currentUser);
};

// ── Close Job ────────────────────────────────────────────────────────────
exports.closeJob = async (currentUser, jobId) => {
  const job = await getJobOrThrow(jobId);
  assertCanModifyJob(job, currentUser);

  if (!['PUBLISHED', 'PAUSED', 'EXPIRED'].includes(job.status)) {
    throw new ApiError(
      400,
      `Cannot close a job in ${job.status} status`,
      'INVALID_STATUS_TRANSITION'
    );
  }

  const updated = await repo.updateJob(jobId, {
    status: 'CLOSED',
    closedAt: new Date(),
    updatedById: currentUser.id,
  });

  return formatRecruiterJob(updated, currentUser);
};

// ── Archive Job ──────────────────────────────────────────────────────────
exports.archiveJob = async (currentUser, jobId) => {
  const job = await getJobOrThrow(jobId);
  assertCanModifyJob(job, currentUser);

  if (job.status === 'ARCHIVED') {
    throw new ApiError(400, 'Job is already archived', 'ALREADY_ARCHIVED');
  }
  if (job.status === 'PUBLISHED') {
    throw new ApiError(
      400,
      'Please close or pause a published job before archiving it',
      'INVALID_STATUS_TRANSITION'
    );
  }

  const updated = await repo.updateJob(jobId, {
    status: 'ARCHIVED',
    archivedAt: new Date(),
    updatedById: currentUser.id,
  });

  return formatRecruiterJob(updated, currentUser);
};

// ── Candidate / User: Report Suspicious Job Posting ──────────────────────
exports.reportJob = async (currentUser, jobId, { category, details }) => {
  const job = await getJobOrThrow(jobId);

  if (job.createdById === currentUser.id) {
    throw new ApiError(400, 'You cannot report your own job posting', 'CANNOT_REPORT_OWN_JOB');
  }

  const result = await repo.createJobReport({
    jobId,
    reporterId: currentUser.id,
    category,
    details,
  });

  if (result.alreadyReported) {
    throw new ApiError(
      409,
      'You have already submitted a report for this job vacancy',
      'ALREADY_REPORTED'
    );
  }

  // Trigger non-blocking background moderation evaluation upon receiving a user report
  moderationService.scheduleAsyncModeration(jobId, 'USER_REPORT');

  return {
    report: result.report,
    reportCount: result.job.reportCount,
  };
};

// ── Admin: Get Moderation Audit Logs & Reports for a Job ─────────────────
exports.getJobModerationDetails = async (currentUser, jobId) => {
  const job = await getJobOrThrow(jobId);
  assertCanAccessCompanyJob(job, currentUser);
  const details = await repo.findJobModerationDetails(jobId);
  return {
    job: formatRecruiterJob(job, currentUser),
    logs: details.logs,
    reports: currentUser.role === 'admin' ? details.reports : [],
  };
};

// ── Admin: Moderate Job (Clear, Place Under Review, Restrict, Reject, Restore) ──
exports.moderateJob = async (adminUser, jobId, { action, reason }) => {
  const job = await getJobOrThrow(jobId);
  const now = new Date();

  let newStatus = job.status;
  let newModerationStatus = job.moderationStatus;
  let updateData = {
    moderatedAt: now,
    moderatedById: adminUser.id,
    moderationReason: reason,
    updatedById: adminUser.id,
  };

  if (action === 'CLEAR_FLAGS') {
    newModerationStatus = 'CLEARED';
    if (job.status === 'UNDER_REVIEW') {
      assertCompanyEligibleToPublish(job.company);
      validateJobReadinessForPublish(job);
      newStatus = 'PUBLISHED';
    }
    updateData = {
      ...updateData,
      status: newStatus,
      moderationStatus: newModerationStatus,
      moderationFlags: [],
      moderationScore: 0,
      rejectionReason: null,
    };
  } else if (action === 'PLACE_UNDER_REVIEW') {
    newStatus = 'UNDER_REVIEW';
    newModerationStatus = 'UNDER_REVIEW';
    updateData = {
      ...updateData,
      status: newStatus,
      moderationStatus: newModerationStatus,
    };
  } else if (action === 'RESTRICT_JOB') {
    // Restrict/pause job without deleting candidate applications
    newStatus = 'PAUSED';
    newModerationStatus = 'ACTION_REQUIRED';
    updateData = {
      ...updateData,
      status: newStatus,
      moderationStatus: newModerationStatus,
      pausedAt: now,
    };
  } else if (action === 'REJECT_JOB') {
    // Reject/suspend fraudulent job without deleting candidate applications
    newStatus = 'REJECTED';
    newModerationStatus = 'ACTION_REQUIRED';
    updateData = {
      ...updateData,
      status: newStatus,
      moderationStatus: newModerationStatus,
      rejectionReason: reason,
    };
  } else if (action === 'RESTORE_JOB') {
    assertCompanyEligibleToPublish(job.company);
    validateJobReadinessForPublish(job);
    newStatus = 'PUBLISHED';
    newModerationStatus = 'CLEARED';
    updateData = {
      ...updateData,
      status: newStatus,
      moderationStatus: newModerationStatus,
      moderationFlags: [],
      moderationScore: 0,
      publishedAt: job.publishedAt || now,
      pausedAt: null,
      rejectionReason: null,
      approvedById: adminUser.id,
    };
  } else {
    throw new ApiError(400, `Unsupported moderation action: ${action}`, 'INVALID_MODERATION_ACTION');
  }

  const updated = await repo.moderateJobWithLog({
    jobId,
    actorId: adminUser.id,
    action,
    previousStatus: job.status,
    newStatus,
    previousModerationStatus: job.moderationStatus,
    newModerationStatus,
    reason,
    flags: updateData.moderationFlags ?? job.moderationFlags ?? [],
    updateData,
  });

  return formatRecruiterJob(updated, adminUser);
};

// ── Admin: Approve / Restore Job (Backward-compatible wrapper) ───────────
exports.approveJob = async (adminUser, jobId, reason = 'Cleared and restored by administrator') => {
  return exports.moderateJob(adminUser, jobId, {
    action: 'RESTORE_JOB',
    reason,
  });
};

// ── Admin: Reject Job (Backward-compatible wrapper) ──────────────────────
exports.rejectJob = async (adminUser, jobId, reason) => {
  return exports.moderateJob(adminUser, jobId, {
    action: 'REJECT_JOB',
    reason,
  });
};

// ── Public Candidate Job Listing & Details ───────────────────────────────
exports.listPublicJobs = async (queryParams) => {
  await repo.expireOverdueJobs();

  const q = queryParams.q || queryParams.search || '';
  const skill = queryParams.skill || queryParams.skills || '';

  const result = await repo.findPublicJobs({
    ...queryParams,
    q,
    skill,
  });

  return {
    jobs: result.items.map(formatPublicJob),
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    },
  };
};

exports.getPublicJobDetails = async (jobId) => {
  await repo.expireOverdueJobs();
  const job = await repo.findPublicJobById(jobId);

  if (!job || job.status !== 'PUBLISHED' || job.company?.status !== 'APPROVED') {
    throw new ApiError(404, 'Job vacancy not found or no longer accepting applications', 'JOB_NOT_AVAILABLE');
  }

  const now = new Date();
  if (
    job.applicationDeadline &&
    !job.allowAfterDeadline &&
    new Date(job.applicationDeadline) < now
  ) {
    throw new ApiError(404, 'This job vacancy has expired', 'JOB_EXPIRED');
  }

  return formatPublicJob(job);
};
