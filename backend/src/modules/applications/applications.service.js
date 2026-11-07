const crypto = require('crypto');
const ApiError = require('../../utils/ApiError');
const repo = require('./applications.repository');
const jobsRepo = require('../jobs/jobs.repository');
const resumeStorage = require('../../services/resumeStorage.service');
const { resolveUserPermissions } = require('../admin/admin.permissions');

const ALLOWED_RECRUITER_TRANSITIONS = {
  SUBMITTED: ['UNDER_REVIEW', 'SHORTLISTED', 'REJECTED'],
  UNDER_REVIEW: ['SHORTLISTED', 'INTERVIEW', 'REJECTED'],
  SHORTLISTED: ['INTERVIEW', 'OFFERED', 'REJECTED'],
  INTERVIEW: ['OFFERED', 'HIRED', 'REJECTED'],
  OFFERED: ['HIRED', 'REJECTED'],
  HIRED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

const CANDIDATE_WITHDRAWABLE_STATUSES = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'INTERVIEW',
  'OFFERED',
];

function toNumberOrNull(val) {
  if (val === null || val === undefined) return null;
  const n = Number(val);
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

function assertRecruiterCanAccessApplication(application, currentUser, roleMap = null) {
  if (!currentUser) {
    throw new ApiError(401, 'Authentication required', 'UNAUTHORIZED');
  }
  if (currentUser.role === 'admin') return 'ADMIN';

  const myCompanyRole =
    roleMap?.get(application.companyId) ||
    getCompanyRoleForUser(application.company, currentUser);

  if (!myCompanyRole) {
    throw new ApiError(
      403,
      'You are not authorized to access applications for this company',
      'FORBIDDEN_COMPANY_APPLICATION_ACCESS'
    );
  }
  return myCompanyRole;
}

function isAnswerProvided(answerVal) {
  if (answerVal === null || answerVal === undefined) return false;
  if (typeof answerVal === 'boolean') return true;
  if (typeof answerVal === 'string') return answerVal.trim().length > 0;
  if (Array.isArray(answerVal)) return answerVal.length > 0;
  return false;
}

function validateAndNormalizeScreeningAnswers(jobQuestions, submittedAnswers = []) {
  const questions = Array.isArray(jobQuestions) ? jobQuestions : [];
  if (questions.length === 0) {
    return Array.isArray(submittedAnswers) ? submittedAnswers : [];
  }

  const submittedMap = new Map();
  for (const item of submittedAnswers || []) {
    if (item.questionId) {
      submittedMap.set(String(item.questionId), item);
    }
    if (item.question) {
      submittedMap.set(String(item.question).trim().toLowerCase(), item);
    }
  }

  const normalized = [];
  const missingQuestions = [];

  for (const q of questions) {
    const qId = q.id ? String(q.id) : undefined;
    const qText = String(q.question || '').trim();
    const match =
      (qId && submittedMap.get(qId)) ||
      submittedMap.get(qText.toLowerCase());

    const rawAnswer = match ? match.answer : null;
    if (q.required && !isAnswerProvided(rawAnswer)) {
      missingQuestions.push(qText || 'Mandatory question');
    }

    normalized.push({
      questionId: qId || crypto.randomUUID(),
      question: qText,
      type: q.type || 'Short Text',
      required: Boolean(q.required),
      answer: rawAnswer ?? '',
    });
  }

  if (missingQuestions.length > 0) {
    throw new ApiError(
      400,
      `Please answer all mandatory application questions: ${missingQuestions.join('; ')}`,
      'MISSING_REQUIRED_ANSWERS'
    );
  }

  return normalized;
}

// Sanitize application for candidate view (never expose internal recruiter notes or storage paths)
function formatCandidateApplication(app) {
  if (!app) return null;

  const canWithdraw = CANDIDATE_WITHDRAWABLE_STATUSES.includes(app.status);
  const candidateExperience = toNumberOrNull(app.candidateExperience);

  const safeJob = app.job
    ? {
        ...app.job,
        minExperience: toNumberOrNull(app.job.minExperience),
        maxExperience: toNumberOrNull(app.job.maxExperience),
        minSalary: app.job.discloseSalary ? toNumberOrNull(app.job.minSalary) : null,
        maxSalary: app.job.discloseSalary ? toNumberOrNull(app.job.maxSalary) : null,
      }
    : null;

  const safeHistory = (app.statusHistory || []).map((h) => ({
    id: h.id,
    applicationId: h.applicationId,
    previousStatus: h.previousStatus,
    newStatus: h.newStatus,
    changedByRole: h.changedByRole,
    reason: h.reason || null,
    changedAt: h.changedAt,
  }));

  return {
    id: app.id,
    applicationId: app.id,
    jobId: app.jobId,
    candidateId: app.candidateId,
    companyId: app.companyId,
    resumeId: app.resumeId || null,
    resume: app.resume || null,
    hasResume: Boolean(app.resumeKey),
    resumeFileName: app.resumeFileName,
    resumeMimeType: app.resumeMimeType,
    resumeFileSize: app.resumeFileSize,
    coverLetter: app.coverLetter,
    answers: Array.isArray(app.answers) ? app.answers : [],
    additionalInformation: app.additionalInformation,
    candidateSkills: app.candidateSkills || [],
    candidateExperience,
    candidateSnapshot: app.candidateSnapshot || {},
    jobSnapshot: app.jobSnapshot || {},
    status: app.status,
    appliedAt: app.appliedAt,
    lastStatusUpdatedAt: app.lastStatusUpdatedAt,
    withdrawnAt: app.withdrawnAt,
    withdrawalReason: app.withdrawalReason,
    rejectionReason: app.rejectionReason,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
    canWithdraw,
    job: safeJob,
    company: app.company,
    statusHistory: safeHistory,
  };
}

// Format application for recruiter/admin view (includes structured candidate data, internal notes, allowed transitions)
function formatRecruiterApplication(app, currentUser, roleMap = null) {
  if (!app) return null;
  const myCompanyRole = assertRecruiterCanAccessApplication(app, currentUser, roleMap);
  const allowedNextStatuses = ALLOWED_RECRUITER_TRANSITIONS[app.status] || [];

  const profileExp = toNumberOrNull(app.candidate?.candidateProfile?.yearsOfExperience);
  const appExp = toNumberOrNull(app.candidateExperience);
  const candidateExperience = appExp !== null ? appExp : profileExp;

  const structuredSkills = (app.candidate?.candidateSkills || []).map((s) => ({
    ...s,
    experienceYears: toNumberOrNull(s.experienceYears),
  }));

  const candidateSkills =
    app.candidateSkills?.length > 0
      ? app.candidateSkills
      : structuredSkills.length > 0
      ? structuredSkills.map((s) => s.name)
      : app.candidate?.candidateProfile?.skills || [];

  return {
    id: app.id,
    applicationId: app.id,
    jobId: app.jobId,
    candidateId: app.candidateId,
    companyId: app.companyId,
    reviewedById: app.reviewedById,
    reviewedBy: app.reviewedBy || null,
    resumeId: app.resumeId || null,
    resume: app.resume || null,
    hasResume: Boolean(app.resumeKey),
    resumeFileName: app.resumeFileName,
    resumeMimeType: app.resumeMimeType,
    resumeFileSize: app.resumeFileSize,
    coverLetter: app.coverLetter,
    answers: Array.isArray(app.answers) ? app.answers : [],
    additionalInformation: app.additionalInformation,
    candidateSkills,
    candidateExperience,
    candidateSnapshot: app.candidateSnapshot || {},
    jobSnapshot: app.jobSnapshot || {},
    status: app.status,
    appliedAt: app.appliedAt,
    lastStatusUpdatedAt: app.lastStatusUpdatedAt,
    withdrawnAt: app.withdrawnAt,
    withdrawalReason: app.withdrawalReason,
    rejectionReason: app.rejectionReason,
    recruiterNotes: Array.isArray(app.recruiterNotes) ? app.recruiterNotes : [],
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
    myCompanyRole,
    allowedNextStatuses,
    job: app.job
      ? {
          ...app.job,
          minExperience: toNumberOrNull(app.job.minExperience),
          maxExperience: toNumberOrNull(app.job.maxExperience),
          minSalary: toNumberOrNull(app.job.minSalary),
          maxSalary: toNumberOrNull(app.job.maxSalary),
        }
      : null,
    company: app.company
      ? {
          id: app.company.id,
          name: app.company.name,
          logoUrl: app.company.logoUrl,
          industry: app.company.industry,
          location: app.company.location,
          city: app.company.city,
          state: app.company.state,
          country: app.company.country,
          status: app.company.status,
        }
      : null,
    candidate: app.candidate
      ? {
          id: app.candidate.id,
          email: app.candidate.email,
          fullName: app.candidate.fullName,
          createdAt: app.candidate.createdAt,
          candidateProfile: app.candidate.candidateProfile
            ? {
                ...app.candidate.candidateProfile,
                yearsOfExperience: profileExp,
                relevantExperience: toNumberOrNull(
                  app.candidate.candidateProfile.relevantExperience
                ),
                expectedSalary: toNumberOrNull(
                  app.candidate.candidateProfile.expectedSalary
                ),
              }
            : null,
          skills: structuredSkills,
          education: app.candidate.candidateEducations || [],
          experience: app.candidate.candidateExperiences || [],
          projects: app.candidate.candidateProjects || [],
          certifications: app.candidate.candidateCertifications || [],
          achievements: app.candidate.candidateAchievements || [],
          languages: app.candidate.candidateLanguages || [],
        }
      : null,
    statusHistory: app.statusHistory || [],
  };
}

// ── 1. Submit Candidate Job Application ──────────────────────────────────
exports.submitApplication = async (currentUser, payload) => {
  if (!currentUser || currentUser.role !== 'candidate') {
    throw new ApiError(
      403,
      'Only authenticated candidate accounts can submit job applications',
      'CANDIDATE_ONLY'
    );
  }

  await jobsRepo.expireOverdueJobs();

  const [job, candidateUser, existingApp] = await Promise.all([
    repo.findJobForApplication(payload.jobId),
    repo.findCandidateWithProfile(currentUser.id),
    repo.findExistingApplication(payload.jobId, currentUser.id),
  ]);

  if (!candidateUser || candidateUser.status !== 'active') {
    throw new ApiError(403, 'Candidate account is not active', 'INACTIVE_ACCOUNT');
  }

  if (!job) {
    throw new ApiError(404, 'Job vacancy not found', 'JOB_NOT_FOUND');
  }

  if (job.status !== 'PUBLISHED') {
    throw new ApiError(
      400,
      `This job is not accepting applications (current status: ${job.status})`,
      'JOB_NOT_PUBLISHED'
    );
  }

  if (!job.company || job.company.status !== 'APPROVED') {
    throw new ApiError(
      400,
      'The company associated with this job is not currently eligible to receive applications',
      'COMPANY_NOT_ELIGIBLE'
    );
  }

  const now = new Date();
  if (
    job.applicationDeadline &&
    !job.allowAfterDeadline &&
    new Date(job.applicationDeadline) < now
  ) {
    throw new ApiError(
      400,
      'The application deadline for this job has passed',
      'APPLICATION_DEADLINE_PASSED'
    );
  }

  if (existingApp) {
    throw new ApiError(
      409,
      'You have already applied for this job vacancy',
      'DUPLICATE_APPLICATION'
    );
  }

  if (
    job.maxApplications &&
    job._count?.applications >= job.maxApplications
  ) {
    throw new ApiError(
      400,
      'This job has reached its maximum number of applications',
      'MAX_APPLICATIONS_REACHED'
    );
  }

  // Validate Cover Letter requirement
  const coverLetter = payload.coverLetter ? payload.coverLetter.trim() : null;
  if (job.requireCoverLetter && (!coverLetter || coverLetter.length < 10)) {
    throw new ApiError(
      400,
      'A cover letter (at least 10 characters) is required for this job',
      'COVER_LETTER_REQUIRED'
    );
  }

  // Validate Application Screening Questions
  const normalizedAnswers = validateAndNormalizeScreeningAnswers(
    job.applicationQuestions,
    payload.answers
  );

  // Resolve Resume:
  // 1) Newly uploaded resume file (`payload.resumeUpload`)
  // 2) Specific selected `CandidateResume` (`payload.resumeId`)
  // 3) Candidate's primary `CandidateResume` or saved `CandidateProfile.resumeKey`
  const profile = candidateUser.candidateProfile;
  const candidateResumes = candidateUser.candidateResumes || [];
  let resumeMeta = {
    resumeId: null,
    resumeKey: null,
    resumeFileName: null,
    resumeMimeType: null,
    resumeFileSize: null,
  };
  let newCandidateResumeData = null;

  if (payload.resumeUpload) {
    const stored = await resumeStorage.saveResumeFile({
      userId: currentUser.id,
      fileName: payload.resumeUpload.fileName,
      mimeType: payload.resumeUpload.mimeType,
      contentBase64: payload.resumeUpload.contentBase64,
    });
    resumeMeta = {
      resumeId: null,
      resumeKey: stored.resumeKey,
      resumeFileName: stored.resumeFileName,
      resumeMimeType: stored.resumeMimeType,
      resumeFileSize: stored.resumeFileSize,
    };

    if (payload.saveResumeToProfile !== false) {
      const shouldBePrimary = candidateResumes.length === 0;
      newCandidateResumeData = {
        title: payload.resumeUpload.title || stored.originalFileName,
        originalFileName: stored.originalFileName,
        storedFileName: stored.storedFileName,
        storageKey: stored.storageKey,
        fileType: stored.fileType,
        mimeType: stored.mimeType,
        fileSize: stored.fileSize,
        version: 1,
        isLatestVersion: true,
        isPrimary: shouldBePrimary,
        resumeStatus: stored.resumeStatus,
        extractedTextReference: stored.extractedTextReference,
        extractedCharCount: stored.extractedCharCount,
      };
    }
  } else if (payload.resumeId) {
    const matchedResume = candidateResumes.find((r) => r.id === payload.resumeId);
    if (!matchedResume) {
      throw new ApiError(
        404,
        'Selected resume was not found in your account',
        'RESUME_NOT_FOUND'
      );
    }
    resumeMeta = {
      resumeId: matchedResume.id,
      resumeKey: matchedResume.storageKey,
      resumeFileName: matchedResume.originalFileName,
      resumeMimeType: matchedResume.mimeType,
      resumeFileSize: matchedResume.fileSize,
    };
  } else if (payload.useProfileResume || candidateResumes.length > 0 || profile?.resumeKey) {
    const primaryOrFirst =
      candidateResumes.find((r) => r.isPrimary) || candidateResumes[0];
    if (primaryOrFirst) {
      resumeMeta = {
        resumeId: primaryOrFirst.id,
        resumeKey: primaryOrFirst.storageKey,
        resumeFileName: primaryOrFirst.originalFileName,
        resumeMimeType: primaryOrFirst.mimeType,
        resumeFileSize: primaryOrFirst.fileSize,
      };
    } else if (profile?.resumeKey) {
      resumeMeta = {
        resumeId: null,
        resumeKey: profile.resumeKey,
        resumeFileName: profile.resumeFileName || 'resume.pdf',
        resumeMimeType: profile.resumeMimeType || 'application/pdf',
        resumeFileSize: profile.resumeFileSize || null,
      };
    }
  }

  if (job.requireResume && !resumeMeta.resumeKey) {
    throw new ApiError(
      400,
      'A resume is required to apply for this job. Please select an uploaded resume or upload a PDF, DOC, or DOCX file.',
      'RESUME_REQUIRED'
    );
  }

  // Merge skills from payload, structured CandidateSkill records, and CandidateProfile
  const structuredSkillNames = (candidateUser.candidateSkills || []).map(
    (s) => s.name
  );
  const mergedSkills = Array.from(
    new Set(
      [
        ...(payload.candidateSkills || []),
        ...structuredSkillNames,
        ...(profile?.skills || []),
      ]
        .map((s) => String(s).trim())
        .filter(Boolean)
    )
  );

  const candidateExperience =
    profile?.yearsOfExperience != null ? Number(profile.yearsOfExperience) : null;

  const candidateSnapshot = {
    fullName: candidateUser.fullName,
    email: candidateUser.email,
    phone: profile?.phone || null,
    headline: profile?.headline || null,
    careerSummary: profile?.careerSummary || profile?.bio || null,
    currentJobTitle: profile?.currentJobTitle || null,
    currentCompany: profile?.currentCompany || null,
    yearsOfExperience: candidateExperience,
    location:
      [profile?.city, profile?.state, profile?.country].filter(Boolean).join(', ') ||
      profile?.location ||
      null,
    linkedinUrl: profile?.linkedinUrl || null,
    githubUrl: profile?.githubUrl || null,
    portfolioUrl: profile?.portfolioUrl || null,
    skills: mergedSkills,
  };

  const jobSnapshot = {
    title: job.title,
    department: job.department,
    category: job.category,
    employmentType: job.employmentType,
    workMode: job.workMode,
    location:
      [job.city, job.state, job.country].filter(Boolean).join(', ') ||
      job.location ||
      job.workMode,
    companyName: job.company.name,
    companyLogoUrl: job.company.logoUrl,
  };

  const profileUpdate = {};
  if (
    payload.resumeUpload &&
    payload.saveResumeToProfile !== false &&
    (!profile?.resumeKey || candidateResumes.length === 0)
  ) {
    profileUpdate.resumeKey = resumeMeta.resumeKey;
    profileUpdate.resumeFileName = resumeMeta.resumeFileName;
    profileUpdate.resumeMimeType = resumeMeta.resumeMimeType;
    profileUpdate.resumeFileSize = resumeMeta.resumeFileSize;
    profileUpdate.resumeUpdatedAt = now;
  }
  if (mergedSkills.length > 0) {
    profileUpdate.skills = mergedSkills;
  }

  try {
    const created = await repo.createApplicationWithInitialHistory({
      applicationData: {
        jobId: job.id,
        candidateId: currentUser.id,
        companyId: job.companyId,
        resumeId: resumeMeta.resumeId,
        resumeKey: resumeMeta.resumeKey,
        resumeFileName: resumeMeta.resumeFileName,
        resumeMimeType: resumeMeta.resumeMimeType,
        resumeFileSize: resumeMeta.resumeFileSize,
        coverLetter,
        answers: normalizedAnswers,
        additionalInformation: payload.additionalInformation || null,
        candidateSkills: mergedSkills,
        candidateExperience,
        candidateSnapshot,
        jobSnapshot,
        status: 'SUBMITTED',
        appliedAt: now,
        lastStatusUpdatedAt: now,
      },
      historyData: {
        previousStatus: null,
        newStatus: 'SUBMITTED',
        changedById: currentUser.id,
        changedByRole: 'candidate',
        reason: 'Application submitted by candidate',
      },
      profileUpdate: Object.keys(profileUpdate).length > 0 ? profileUpdate : null,
      newCandidateResumeData,
    });

    return formatCandidateApplication(created);
  } catch (err) {
    if (err.code === 'P2002') {
      throw new ApiError(
        409,
        'You have already applied for this job vacancy',
        'DUPLICATE_APPLICATION'
      );
    }
    throw err;
  }
};

// ── 2. Check if Candidate Has Already Applied for a Job ──────────────────
exports.checkApplicationStatusForJob = async (currentUser, jobId) => {
  if (!currentUser || currentUser.role !== 'candidate') {
    return { hasApplied: false, application: null };
  }
  const existing = await repo.findExistingApplication(jobId, currentUser.id);
  return {
    hasApplied: Boolean(existing),
    application: existing || null,
  };
};

// ── 3. List Authenticated Candidate's Applications + Statistics ──────────
exports.getMyApplications = async (currentUser, queryParams) => {
  const q = queryParams.q || queryParams.search || '';
  const [listResult, stats] = await Promise.all([
    repo.findCandidateApplications({
      ...queryParams,
      q,
      candidateId: currentUser.id,
    }),
    repo.getCandidateApplicationStats(currentUser.id),
  ]);

  return {
    applications: listResult.items.map(formatCandidateApplication),
    stats,
    pagination: {
      total: listResult.total,
      page: listResult.page,
      limit: listResult.limit,
      totalPages: listResult.totalPages,
    },
  };
};

// ── 4. Get Single Candidate Application Details ──────────────────────────
exports.getCandidateApplicationDetails = async (currentUser, applicationId) => {
  const app = await repo.findApplicationByIdForCandidate(applicationId);
  if (!app) {
    throw new ApiError(404, 'Application not found', 'APPLICATION_NOT_FOUND');
  }

  if (app.candidateId !== currentUser.id) {
    throw new ApiError(
      403,
      'You are only authorized to view your own job applications',
      'FORBIDDEN_APPLICATION_ACCESS'
    );
  }

  return formatCandidateApplication(app);
};

// ── 5. Get Candidate Application Status History ──────────────────────────
exports.getCandidateApplicationHistory = async (currentUser, applicationId) => {
  const app = await repo.findApplicationByIdForCandidate(applicationId);
  if (!app) {
    throw new ApiError(404, 'Application not found', 'APPLICATION_NOT_FOUND');
  }

  if (app.candidateId !== currentUser.id) {
    throw new ApiError(
      403,
      'You are only authorized to view your own application history',
      'FORBIDDEN_APPLICATION_ACCESS'
    );
  }

  const history = await repo.findStatusHistoryForCandidate(applicationId);
  return history;
};

// ── 6. Withdraw Candidate Application ────────────────────────────────────
exports.withdrawApplication = async (currentUser, applicationId, { reason } = {}) => {
  const app = await repo.findApplicationByIdForCandidate(applicationId);
  if (!app) {
    throw new ApiError(404, 'Application not found', 'APPLICATION_NOT_FOUND');
  }

  if (app.candidateId !== currentUser.id) {
    throw new ApiError(
      403,
      'You can only withdraw your own job applications',
      'FORBIDDEN_APPLICATION_WITHDRAWAL'
    );
  }

  if (app.status === 'WITHDRAWN') {
    throw new ApiError(
      400,
      'This application has already been withdrawn',
      'ALREADY_WITHDRAWN'
    );
  }

  if (app.status === 'HIRED') {
    throw new ApiError(
      400,
      'Hired applications cannot be withdrawn. Please contact the company recruiter directly.',
      'CANNOT_WITHDRAW_HIRED'
    );
  }

  if (!CANDIDATE_WITHDRAWABLE_STATUSES.includes(app.status)) {
    throw new ApiError(
      400,
      `Applications in ${app.status} status cannot be withdrawn`,
      'INVALID_WITHDRAWAL_STATUS'
    );
  }

  const now = new Date();
  const updated = await repo.transitionApplicationStatus({
    applicationId,
    forCandidate: true,
    updateData: {
      status: 'WITHDRAWN',
      withdrawnAt: now,
      withdrawalReason: reason || null,
      lastStatusUpdatedAt: now,
    },
    historyData: {
      previousStatus: app.status,
      newStatus: 'WITHDRAWN',
      changedById: currentUser.id,
      changedByRole: 'candidate',
      reason: reason || 'Application withdrawn by candidate',
    },
  });

  return formatCandidateApplication(updated);
};

// ── 7. Recruiter: List Applications for Authorized Companies + Stats ─────
exports.listRecruiterApplications = async (currentUser, queryParams) => {
  const { companyIds, roleMap } =
    currentUser.role === 'admin'
      ? { companyIds: undefined, roleMap: new Map() }
      : await jobsRepo.findAccessibleCompanyIdsForUser(currentUser.id);

  if (
    queryParams.companyId &&
    Array.isArray(companyIds) &&
    !companyIds.includes(queryParams.companyId)
  ) {
    throw new ApiError(
      403,
      'You do not have permission to view applications for this company',
      'FORBIDDEN_COMPANY_ACCESS'
    );
  }

  if (queryParams.jobId) {
    const job = await jobsRepo.findJobById(queryParams.jobId);
    if (!job) {
      throw new ApiError(404, 'Specified job not found', 'JOB_NOT_FOUND');
    }
    if (
      Array.isArray(companyIds) &&
      !companyIds.includes(job.companyId)
    ) {
      throw new ApiError(
        403,
        'You do not have permission to view applications for this job',
        'FORBIDDEN_JOB_ACCESS'
      );
    }
  }

  const q = queryParams.q || queryParams.search || '';
  const skill = queryParams.skill || queryParams.skills || '';

  const [listResult, stats] = await Promise.all([
    repo.findRecruiterApplications({
      ...queryParams,
      q,
      skill,
      companyIds,
    }),
    repo.getRecruiterApplicationStats({
      companyIds,
      companyId: queryParams.companyId,
      jobId: queryParams.jobId,
      status: queryParams.status,
      appliedFrom: queryParams.appliedFrom,
      appliedTo: queryParams.appliedTo,
    }),
  ]);

  return {
    applications: listResult.items.map((a) =>
      formatRecruiterApplication(a, currentUser, roleMap)
    ),
    stats,
    pagination: {
      total: listResult.total,
      page: listResult.page,
      limit: listResult.limit,
      totalPages: listResult.totalPages,
    },
  };
};

// ── 8. Recruiter: Get Dashboard Statistics ───────────────────────────────
exports.getRecruiterDashboardStats = async (currentUser, queryParams) => {
  const { companyIds } =
    currentUser.role === 'admin'
      ? { companyIds: undefined }
      : await jobsRepo.findAccessibleCompanyIdsForUser(currentUser.id);

  if (
    queryParams.companyId &&
    Array.isArray(companyIds) &&
    !companyIds.includes(queryParams.companyId)
  ) {
    throw new ApiError(
      403,
      'You do not have permission to view statistics for this company',
      'FORBIDDEN_COMPANY_ACCESS'
    );
  }

  return repo.getRecruiterApplicationStats({
    companyIds,
    companyId: queryParams.companyId,
    jobId: queryParams.jobId,
    status: queryParams.status,
    appliedFrom: queryParams.appliedFrom,
    appliedTo: queryParams.appliedTo,
  });
};

// ── 9. Recruiter: Get Single Application Details ─────────────────────────
exports.getRecruiterApplicationDetails = async (currentUser, applicationId) => {
  const app = await repo.findApplicationByIdForRecruiter(applicationId);
  if (!app) {
    throw new ApiError(404, 'Application not found', 'APPLICATION_NOT_FOUND');
  }

  assertRecruiterCanAccessApplication(app, currentUser);
  return formatRecruiterApplication(app, currentUser);
};

// ── 10. Recruiter: Update Application Status ─────────────────────────────
exports.updateApplicationStatus = async (
  currentUser,
  applicationId,
  { status: targetStatus, reason, notes }
) => {
  const app = await repo.findApplicationByIdForRecruiter(applicationId);
  if (!app) {
    throw new ApiError(404, 'Application not found', 'APPLICATION_NOT_FOUND');
  }

  assertRecruiterCanAccessApplication(app, currentUser);

  if (app.status === targetStatus) {
    throw new ApiError(
      400,
      `Application is already in ${targetStatus} status`,
      'SAME_APPLICATION_STATUS'
    );
  }

  if (app.status === 'WITHDRAWN') {
    throw new ApiError(
      400,
      'Withdrawn applications cannot be modified or reopened',
      'APPLICATION_WITHDRAWN'
    );
  }

  const allowedTargets = ALLOWED_RECRUITER_TRANSITIONS[app.status] || [];
  if (!allowedTargets.includes(targetStatus)) {
    throw new ApiError(
      400,
      `Invalid status transition from ${app.status} to ${targetStatus}. Allowed next stages: ${
        allowedTargets.length > 0 ? allowedTargets.join(', ') : 'None (terminal state)'
      }`,
      'INVALID_APPLICATION_STATUS_TRANSITION'
    );
  }

  const now = new Date();
  const updateData = {
    status: targetStatus,
    lastStatusUpdatedAt: now,
    reviewedById: currentUser.id,
  };

  if (targetStatus === 'REJECTED') {
    updateData.rejectionReason = reason || null;
  }

  if (notes) {
    const existingNotes = Array.isArray(app.recruiterNotes) ? app.recruiterNotes : [];
    updateData.recruiterNotes = [
      {
        id: crypto.randomUUID(),
        note: notes,
        stage: targetStatus,
        authorId: currentUser.id,
        authorRole: currentUser.role,
        createdAt: now.toISOString(),
      },
      ...existingNotes,
    ];
  }

  const updated = await repo.transitionApplicationStatus({
    applicationId,
    forCandidate: false,
    updateData,
    historyData: {
      previousStatus: app.status,
      newStatus: targetStatus,
      changedById: currentUser.id,
      changedByRole: currentUser.role,
      reason: reason || null,
      notes: notes || null,
    },
  });

  return formatRecruiterApplication(updated, currentUser);
};

// ── 11. Recruiter: Add Confidential Internal Note ────────────────────────
exports.addRecruiterNote = async (currentUser, applicationId, { note }) => {
  const app = await repo.findApplicationByIdForRecruiter(applicationId);
  if (!app) {
    throw new ApiError(404, 'Application not found', 'APPLICATION_NOT_FOUND');
  }

  assertRecruiterCanAccessApplication(app, currentUser);

  const existingNotes = Array.isArray(app.recruiterNotes) ? app.recruiterNotes : [];
  const newNoteItem = {
    id: crypto.randomUUID(),
    note,
    stage: app.status,
    authorId: currentUser.id,
    authorRole: currentUser.role,
    createdAt: new Date().toISOString(),
  };

  const updated = await repo.updateRecruiterNotes(
    applicationId,
    [newNoteItem, ...existingNotes],
    currentUser.id
  );

  return formatRecruiterApplication(updated, currentUser);
};

// ── 12. Authorized Resume Access (Candidate Owner OR Authorized Recruiter) ─
exports.getApplicationResumeStream = async (currentUser, applicationId) => {
  const app = await repo.findApplicationByIdForRecruiter(applicationId);
  if (!app) {
    throw new ApiError(404, 'Application not found', 'APPLICATION_NOT_FOUND');
  }

  if (currentUser.role === 'candidate') {
    if (app.candidateId !== currentUser.id) {
      throw new ApiError(
        403,
        'You are not authorized to access this resume',
        'FORBIDDEN_RESUME_ACCESS'
      );
    }
  } else if (currentUser.role === 'admin') {
    const perms = Array.isArray(currentUser.permissions)
      ? currentUser.permissions
      : await resolveUserPermissions(currentUser.id, currentUser.adminRole || 'ADMIN');
    if (!perms.includes('applications.read_resume')) {
      throw new ApiError(
        403,
        'Missing required permission: applications.read_resume',
        'INSUFFICIENT_PERMISSIONS'
      );
    }
  } else {
    assertRecruiterCanAccessApplication(app, currentUser);
  }

  if (!app.resumeKey) {
    throw new ApiError(404, 'No resume file was submitted with this application', 'RESUME_NOT_FOUND');
  }

  const fileData = await resumeStorage.readResumeFile(app.resumeKey);
  return {
    buffer: fileData.buffer,
    mimeType: app.resumeMimeType || fileData.mimeType,
    fileName: app.resumeFileName || 'submitted-resume.pdf',
  };
};

exports.ALLOWED_RECRUITER_TRANSITIONS = ALLOWED_RECRUITER_TRANSITIONS;
exports.CANDIDATE_WITHDRAWABLE_STATUSES = CANDIDATE_WITHDRAWABLE_STATUSES;
