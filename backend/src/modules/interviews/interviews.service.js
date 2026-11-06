const ApiError = require('../../utils/ApiError');
const repo = require('./interviews.repository');
const emailService = require('../../services/email.service');

const ALLOWED_INTERVIEW_TRANSITIONS = {
  DRAFT: ['SCHEDULED', 'CANCELLED'],
  SCHEDULED: ['CONFIRMED', 'RESCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
  RESCHEDULED: ['CONFIRMED', 'RESCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
  CONFIRMED: ['RESCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
  IN_PROGRESS: ['COMPLETED', 'NO_SHOW', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: ['RESCHEDULED', 'CANCELLED'],
};

const ELIGIBLE_APPLICATION_STATUSES_FOR_INTERVIEW = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'INTERVIEW',
];

const ELIGIBLE_APPLICATION_STATUSES_FOR_DECISION = [
  'SHORTLISTED',
  'INTERVIEW',
  'OFFERED',
];

function getCompanyRoleForUser(company, currentUser) {
  if (!currentUser || !company) return null;
  if (currentUser.role === 'admin') return 'ADMIN';
  if (company.ownerId === currentUser.id) return 'OWNER';
  const membership = (company.memberships || []).find(
    (m) => m.userId === currentUser.id && m.membershipStatus === 'ACTIVE'
  );
  return membership ? membership.role : null;
}

function isUserAssignedInterviewer(interview, userId) {
  if (!interview || !userId) return false;
  return (interview.interviewers || []).some(
    (a) => a.interviewerId === userId && a.assignmentStatus !== 'REMOVED'
  );
}

function assertRecruiterOrInterviewerCanAccess(interview, currentUser, requireManagePermission = false) {
  if (!currentUser) {
    throw new ApiError(401, 'Authentication required', 'UNAUTHORIZED');
  }
  const companyRole = getCompanyRoleForUser(interview.company, currentUser);
  const isAssigned = isUserAssignedInterviewer(interview, currentUser.id);

  if (requireManagePermission) {
    if (!companyRole) {
      throw new ApiError(
        403,
        'You do not have permission to manage interviews for this company',
        'FORBIDDEN_INTERVIEW_MANAGEMENT'
      );
    }
    return { companyRole, isAssigned };
  }

  if (!companyRole && !isAssigned) {
    throw new ApiError(
      403,
      'You are not authorized to access this interview',
      'FORBIDDEN_INTERVIEW_ACCESS'
    );
  }
  return { companyRole, isAssigned };
}

function verifyEligibleCompanyInterviewers(company, requestedInterviewers = []) {
  if (!requestedInterviewers || requestedInterviewers.length === 0) return [];

  const eligibleUserIds = new Set();
  if (company.ownerId) eligibleUserIds.add(company.ownerId);
  for (const m of company.memberships || []) {
    if (m.membershipStatus === 'ACTIVE') {
      eligibleUserIds.add(m.userId);
    }
  }

  const deduped = [];
  const seen = new Set();
  for (const item of requestedInterviewers) {
    if (!eligibleUserIds.has(item.interviewerId)) {
      throw new ApiError(
        400,
        'Assigned interviewer must be an active member or owner of the company',
        'INVALID_COMPANY_INTERVIEWER'
      );
    }
    if (!seen.has(item.interviewerId)) {
      seen.add(item.interviewerId);
      deduped.push({
        interviewerId: item.interviewerId,
        interviewerRole: item.interviewerRole || 'TECHNICAL_INTERVIEWER',
      });
    }
  }
  return deduped;
}

function calculateFeedbackSummary(feedbacks = []) {
  if (!Array.isArray(feedbacks) || feedbacks.length === 0) {
    return {
      totalSubmitted: 0,
      averageOverallRating: null,
      averageTechnicalRating: null,
      averageCommunicationRating: null,
      averageProblemSolvingRating: null,
      averageExperienceRating: null,
      recommendations: {
        STRONG_HIRE: 0,
        HIRE: 0,
        HOLD: 0,
        REJECT: 0,
      },
    };
  }

  const avg = (key) => {
    const vals = feedbacks
      .map((f) => Number(f[key]))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= 5);
    if (vals.length === 0) return null;
    return Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2));
  };

  const recommendations = {
    STRONG_HIRE: 0,
    HIRE: 0,
    HOLD: 0,
    REJECT: 0,
  };
  for (const f of feedbacks) {
    if (recommendations[f.recommendation] !== undefined) {
      recommendations[f.recommendation] += 1;
    }
  }

  return {
    totalSubmitted: feedbacks.length,
    averageOverallRating: avg('overallRating'),
    averageTechnicalRating: avg('technicalRating'),
    averageCommunicationRating: avg('communicationRating'),
    averageProblemSolvingRating: avg('problemSolvingRating'),
    averageExperienceRating: avg('experienceRating'),
    recommendations,
  };
}

function formatRecruiterInterview(interview, currentUser) {
  if (!interview) return null;
  const companyRole = getCompanyRoleForUser(interview.company, currentUser);
  const isAssigned = isUserAssignedInterviewer(interview, currentUser?.id);
  const allowedNextStatuses = ALLOWED_INTERVIEW_TRANSITIONS[interview.status] || [];
  const feedbackSummary = calculateFeedbackSummary(interview.feedbacks || []);

  const eligibleCompanyMembers = [];
  if (interview.company) {
    const seen = new Set();
    for (const m of interview.company.memberships || []) {
      if (m.user && !seen.has(m.user.id)) {
        seen.add(m.user.id);
        eligibleCompanyMembers.push({
          userId: m.user.id,
          fullName: m.user.fullName,
          email: m.user.email,
          companyRole: m.role,
        });
      }
    }
  }

  return {
    id: interview.id,
    interviewId: interview.id,
    applicationId: interview.applicationId,
    jobId: interview.jobId,
    candidateId: interview.candidateId,
    companyId: interview.companyId,
    title: interview.title,
    roundNumber: interview.roundNumber,
    interviewType: interview.interviewType,
    interviewMode: interview.interviewMode,
    interviewDate: interview.interviewDate,
    startTime: interview.startTime,
    endTime: interview.endTime,
    timeZone: interview.timeZone,
    location: interview.location,
    meetingLink: interview.meetingLink,
    description: interview.description,
    instructions: interview.instructions,
    allowCandidateReschedule: interview.allowCandidateReschedule,
    status: interview.status,
    candidateConfirmedAt: interview.candidateConfirmedAt,
    noShowParty: interview.noShowParty,
    cancellationReason: interview.cancellationReason,
    cancellationType: interview.cancellationType,
    cancelledBy: interview.cancelledBy || null,
    cancelledAt: interview.cancelledAt,
    completedAt: interview.completedAt,
    createdBy: interview.createdBy || null,
    updatedBy: interview.updatedBy || null,
    createdAt: interview.createdAt,
    updatedAt: interview.updatedAt,
    myCompanyRole: companyRole,
    isAssignedInterviewer: isAssigned,
    allowedNextStatuses,
    application: interview.application || null,
    job: interview.job || null,
    company: interview.company
      ? {
          id: interview.company.id,
          name: interview.company.name,
          logoUrl: interview.company.logoUrl,
          industry: interview.company.industry,
          city: interview.company.city,
          state: interview.company.state,
          country: interview.company.country,
          eligibleMembers: eligibleCompanyMembers,
        }
      : null,
    candidate: interview.candidate || null,
    interviewers: interview.interviewers || [],
    feedbacks: interview.feedbacks || [],
    feedbackSummary,
    history: interview.history || [],
    rescheduleRequests: interview.rescheduleRequests || [],
  };
}

// Sanitize interview for candidate view (NEVER expose feedbacks, private notes, or internal hiring discussions)
function formatCandidateInterview(interview) {
  if (!interview) return null;

  const safeHistory = (interview.history || [])
    .filter((h) =>
      [
        'INTERVIEW_CREATED',
        'INTERVIEW_SCHEDULED',
        'INTERVIEW_RESCHEDULED',
        'INTERVIEW_CONFIRMED',
        'INTERVIEW_CANCELLED',
        'INTERVIEW_COMPLETED',
        'CANDIDATE_RESCHEDULE_REQUESTED',
        'RESCHEDULE_REQUEST_REVIEWED',
      ].includes(h.action)
    )
    .map((h) => ({
      id: h.id,
      action: h.action,
      previousStatus: h.previousStatus,
      newStatus: h.newStatus,
      previousSchedule: h.previousSchedule,
      newSchedule: h.newSchedule,
      reason: h.reason || null,
      changedByRole: h.changedByRole,
      changedAt: h.changedAt,
    }));

  const safeInterviewers = (interview.interviewers || []).map((a) => ({
    id: a.id,
    interviewerRole: a.interviewerRole,
    interviewerName: a.interviewer?.fullName || 'Interviewer',
    designation: a.interviewer?.recruiterProfile?.designation || null,
  }));

  return {
    id: interview.id,
    interviewId: interview.id,
    applicationId: interview.applicationId,
    jobId: interview.jobId,
    candidateId: interview.candidateId,
    companyId: interview.companyId,
    title: interview.title,
    roundNumber: interview.roundNumber,
    interviewType: interview.interviewType,
    interviewMode: interview.interviewMode,
    interviewDate: interview.interviewDate,
    startTime: interview.startTime,
    endTime: interview.endTime,
    timeZone: interview.timeZone,
    location: interview.location,
    meetingLink: interview.meetingLink,
    description: interview.description,
    instructions: interview.instructions,
    allowCandidateReschedule: interview.allowCandidateReschedule,
    status: interview.status,
    candidateConfirmedAt: interview.candidateConfirmedAt,
    cancellationReason: interview.cancellationReason,
    cancelledAt: interview.cancelledAt,
    completedAt: interview.completedAt,
    createdAt: interview.createdAt,
    updatedAt: interview.updatedAt,
    canConfirmAttendance: ['SCHEDULED', 'RESCHEDULED'].includes(interview.status),
    canRequestReschedule:
      interview.allowCandidateReschedule &&
      ['SCHEDULED', 'RESCHEDULED', 'CONFIRMED'].includes(interview.status),
    job: interview.job || null,
    company: interview.company
      ? {
          id: interview.company.id,
          name: interview.company.name,
          logoUrl: interview.company.logoUrl,
          industry: interview.company.industry,
          city: interview.company.city,
          state: interview.company.state,
          country: interview.company.country,
        }
      : null,
    interviewers: safeInterviewers,
    rescheduleRequests: (interview.rescheduleRequests || []).map((r) => ({
      id: r.id,
      requestedDate: r.requestedDate,
      requestedStartTime: r.requestedStartTime,
      requestedEndTime: r.requestedEndTime,
      timeZone: r.timeZone,
      reason: r.reason,
      status: r.status,
      reviewNotes: r.reviewNotes,
      reviewedAt: r.reviewedAt,
      createdAt: r.createdAt,
    })),
    history: safeHistory,
  };
}

// ── 1. Create / Schedule Interview ─────────────────────────────────────────
exports.createInterview = async (currentUser, payload) => {
  const application = await repo.findApplicationForInterview(payload.applicationId);
  if (!application) {
    throw new ApiError(404, 'Application not found', 'APPLICATION_NOT_FOUND');
  }

  const companyRole = getCompanyRoleForUser(application.company, currentUser);
  if (!companyRole) {
    throw new ApiError(
      403,
      'You are not authorized to schedule interviews for this company',
      'FORBIDDEN_COMPANY_INTERVIEW_CREATE'
    );
  }

  if (!ELIGIBLE_APPLICATION_STATUSES_FOR_INTERVIEW.includes(application.status)) {
    throw new ApiError(
      400,
      `Cannot schedule an interview when application status is ${application.status}`,
      'INELIGIBLE_APPLICATION_STATUS'
    );
  }

  // Determine round number (auto-increment if not specified, prevent duplicate active round)
  const existingInterviews = application.interviews || [];
  const maxRound = existingInterviews.reduce(
    (max, item) => Math.max(max, item.roundNumber || 0),
    0
  );
  const roundNumber = payload.roundNumber || maxRound + 1;

  const duplicateActiveRound = existingInterviews.find(
    (item) =>
      item.roundNumber === roundNumber &&
      !['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(item.status)
  );
  if (duplicateActiveRound) {
    throw new ApiError(
      409,
      `Round ${roundNumber} already has an active interview (${duplicateActiveRound.title}). Please reschedule or complete it before creating another interview for the same round.`,
      'DUPLICATE_ACTIVE_ROUND'
    );
  }

  // Verify interviewer eligibility
  const defaultInterviewers =
    payload.interviewers && payload.interviewers.length > 0
      ? payload.interviewers
      : [{ interviewerId: currentUser.id, interviewerRole: 'PRIMARY_INTERVIEWER' }];

  const validatedInterviewers = verifyEligibleCompanyInterviewers(
    application.company,
    defaultInterviewers
  );

  const startTime = new Date(payload.startTime);
  const endTime = new Date(payload.endTime);
  const interviewDate = new Date(payload.interviewDate || payload.startTime);

  // Check interviewer & candidate scheduling conflicts
  const overlaps = await repo.findOverlappingInterviewsForUsers({
    interviewerIds: validatedInterviewers.map((i) => i.interviewerId),
    candidateId: application.candidateId,
    startTime,
    endTime,
  });

  if (overlaps.length > 0) {
    const conflict = overlaps[0];
    throw new ApiError(
      409,
      `Scheduling conflict detected with "${conflict.title}" (${new Date(conflict.startTime).toISOString()} - ${new Date(conflict.endTime).toISOString()})`,
      'INTERVIEW_SCHEDULE_CONFLICT'
    );
  }

  const initialStatus = payload.status || 'SCHEDULED';
  const shouldMoveAppToInterview =
    initialStatus === 'SCHEDULED' &&
    ['SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED'].includes(application.status);

  const scheduleSnapshot = {
    interviewDate: interviewDate.toISOString(),
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    timeZone: payload.timeZone || 'Asia/Kolkata',
    interviewMode: payload.interviewMode,
    location: payload.location || null,
    meetingLink: payload.meetingLink || null,
  };

  const created = await repo.createInterviewTransaction({
    interviewData: {
      applicationId: application.id,
      jobId: application.jobId,
      candidateId: application.candidateId,
      companyId: application.companyId,
      title: payload.title,
      roundNumber,
      interviewType: payload.interviewType,
      interviewMode: payload.interviewMode,
      interviewDate,
      startTime,
      endTime,
      timeZone: payload.timeZone || 'Asia/Kolkata',
      location: payload.location || null,
      meetingLink: payload.meetingLink || null,
      description: payload.description || null,
      instructions: payload.instructions || null,
      allowCandidateReschedule: payload.allowCandidateReschedule ?? true,
      status: initialStatus,
      createdById: currentUser.id,
      updatedById: currentUser.id,
    },
    interviewers: validatedInterviewers,
    historyEntry: {
      action: initialStatus === 'DRAFT' ? 'INTERVIEW_CREATED' : 'INTERVIEW_SCHEDULED',
      previousStatus: null,
      newStatus: initialStatus,
      previousSchedule: null,
      newSchedule: scheduleSnapshot,
      reason: `Round ${roundNumber} (${payload.interviewType}) created`,
      changedById: currentUser.id,
      changedByRole: currentUser.role,
    },
    shouldMoveApplicationToInterview: shouldMoveAppToInterview,
    applicationStatusHistoryEntry: shouldMoveAppToInterview
      ? {
          applicationId: application.id,
          previousStatus: application.status,
          newStatus: 'INTERVIEW',
          changedById: currentUser.id,
          changedByRole: currentUser.role,
          reason: `Scheduled Round ${roundNumber}: ${payload.title}`,
          notes: `Interview Type: ${payload.interviewType}`,
        }
      : null,
  });

  // Trigger non-blocking notifications
  if (initialStatus === 'SCHEDULED') {
    emailService.notifyCandidateInterviewScheduled({
      to: created.candidate?.email,
      candidateName: created.candidate?.fullName,
      jobTitle: created.job?.title,
      companyName: created.company?.name,
      roundNumber: created.roundNumber,
      interviewType: created.interviewType,
      startTime: created.startTime,
      endTime: created.endTime,
      timeZone: created.timeZone,
      interviewMode: created.interviewMode,
      meetingLink: created.meetingLink,
      location: created.location,
    });

    for (const assignment of created.interviewers || []) {
      emailService.notifyInterviewerAssigned({
        to: assignment.interviewer?.email,
        interviewerName: assignment.interviewer?.fullName,
        candidateName: created.candidate?.fullName,
        jobTitle: created.job?.title,
        companyName: created.company?.name,
        roundNumber: created.roundNumber,
        interviewType: created.interviewType,
        role: assignment.interviewerRole,
        startTime: created.startTime,
        timeZone: created.timeZone,
      });
    }
  }

  return formatRecruiterInterview(created, currentUser);
};

// ── 2. List & Get Recruiter Interviews ─────────────────────────────────────
exports.listRecruiterInterviews = async (currentUser, query) => {
  const isAdmin = currentUser.role === 'admin';
  const { companyIds } = await repo.getAuthorizedCompanyIdsForUser(currentUser.id);

  const result = await repo.listRecruiterInterviews({
    companyIds,
    currentUserId: currentUser.id,
    isAdmin,
    filters: query,
  });

  return {
    interviews: result.items.map((item) => formatRecruiterInterview(item, currentUser)),
    pagination: result.pagination,
  };
};

exports.getRecruiterInterviewById = async (currentUser, interviewId) => {
  const interview = await repo.findInterviewById(interviewId);
  if (!interview) {
    throw new ApiError(404, 'Interview not found', 'INTERVIEW_NOT_FOUND');
  }
  assertRecruiterOrInterviewerCanAccess(interview, currentUser, false);
  return formatRecruiterInterview(interview, currentUser);
};

// ── 3. Update Interview Details ────────────────────────────────────────────
exports.updateInterview = async (currentUser, interviewId, payload) => {
  const interview = await repo.findInterviewById(interviewId);
  if (!interview) {
    throw new ApiError(404, 'Interview not found', 'INTERVIEW_NOT_FOUND');
  }

  assertRecruiterOrInterviewerCanAccess(interview, currentUser, true);

  if (['COMPLETED', 'CANCELLED'].includes(interview.status)) {
    throw new ApiError(
      400,
      `Cannot modify an interview that is already ${interview.status}`,
      'INTERVIEW_LOCKED'
    );
  }

  let nextStatus = interview.status;
  if (payload.status && payload.status !== interview.status) {
    const allowed = ALLOWED_INTERVIEW_TRANSITIONS[interview.status] || [];
    if (!allowed.includes(payload.status)) {
      throw new ApiError(
        400,
        `Invalid interview status transition from ${interview.status} to ${payload.status}`,
        'INVALID_INTERVIEW_STATUS_TRANSITION'
      );
    }
    nextStatus = payload.status;
  }

  const nextMode = payload.interviewMode || interview.interviewMode;
  const nextMeetingLink =
    payload.meetingLink !== undefined ? payload.meetingLink || null : interview.meetingLink;
  const nextLocation =
    payload.location !== undefined ? payload.location || null : interview.location;

  if (nextStatus !== 'DRAFT' && nextMode === 'ONLINE' && !nextMeetingLink) {
    throw new ApiError(
      400,
      'Online interviews require a valid meeting link',
      'MEETING_LINK_REQUIRED'
    );
  }
  if (nextStatus !== 'DRAFT' && nextMode === 'IN_PERSON' && !nextLocation) {
    throw new ApiError(
      400,
      'In-person interviews require a location',
      'LOCATION_REQUIRED'
    );
  }

  const nextStart = payload.startTime ? new Date(payload.startTime) : interview.startTime;
  const nextEnd = payload.endTime ? new Date(payload.endTime) : interview.endTime;
  const nextDate = payload.interviewDate ? new Date(payload.interviewDate) : interview.interviewDate;

  const updated = await repo.updateInterviewWithHistory(
    interviewId,
    {
      title: payload.title ?? interview.title,
      roundNumber: payload.roundNumber ?? interview.roundNumber,
      interviewType: payload.interviewType ?? interview.interviewType,
      interviewMode: nextMode,
      interviewDate: nextDate,
      startTime: nextStart,
      endTime: nextEnd,
      timeZone: payload.timeZone ?? interview.timeZone,
      location: nextLocation,
      meetingLink: nextMeetingLink,
      description: payload.description !== undefined ? payload.description : interview.description,
      instructions: payload.instructions !== undefined ? payload.instructions : interview.instructions,
      allowCandidateReschedule:
        payload.allowCandidateReschedule ?? interview.allowCandidateReschedule,
      status: nextStatus,
      updatedById: currentUser.id,
    },
    {
      action:
        interview.status === 'DRAFT' && nextStatus === 'SCHEDULED'
          ? 'INTERVIEW_SCHEDULED'
          : 'INTERVIEW_UPDATED',
      previousStatus: interview.status,
      newStatus: nextStatus,
      previousSchedule: {
        interviewDate: interview.interviewDate,
        startTime: interview.startTime,
        endTime: interview.endTime,
        timeZone: interview.timeZone,
      },
      newSchedule: {
        interviewDate: nextDate,
        startTime: nextStart,
        endTime: nextEnd,
        timeZone: payload.timeZone ?? interview.timeZone,
      },
      reason: 'Interview details updated',
      changedById: currentUser.id,
      changedByRole: currentUser.role,
    }
  );

  return formatRecruiterInterview(updated, currentUser);
};

// ── 4. Reschedule Interview ────────────────────────────────────────────────
exports.rescheduleInterview = async (currentUser, interviewId, payload) => {
  const interview = await repo.findInterviewById(interviewId);
  if (!interview) {
    throw new ApiError(404, 'Interview not found', 'INTERVIEW_NOT_FOUND');
  }

  assertRecruiterOrInterviewerCanAccess(interview, currentUser, true);

  const allowed = ALLOWED_INTERVIEW_TRANSITIONS[interview.status] || [];
  if (!allowed.includes('RESCHEDULED')) {
    throw new ApiError(
      400,
      `Cannot reschedule an interview with status ${interview.status}`,
      'CANNOT_RESCHEDULE_INTERVIEW'
    );
  }

  const newStart = new Date(payload.startTime);
  const newEnd = new Date(payload.endTime);
  const newDate = new Date(payload.interviewDate || payload.startTime);
  const newTimeZone = payload.timeZone || interview.timeZone;

  const activeInterviewerIds = (interview.interviewers || []).map((a) => a.interviewerId);
  const overlaps = await repo.findOverlappingInterviewsForUsers({
    interviewerIds: activeInterviewerIds,
    candidateId: interview.candidateId,
    startTime: newStart,
    endTime: newEnd,
    excludeInterviewId: interview.id,
  });

  if (overlaps.length > 0) {
    throw new ApiError(
      409,
      `Schedule conflict detected with "${overlaps[0].title}" during the requested slot`,
      'INTERVIEW_SCHEDULE_CONFLICT'
    );
  }

  const previousSchedule = {
    interviewDate: interview.interviewDate,
    startTime: interview.startTime,
    endTime: interview.endTime,
    timeZone: interview.timeZone,
    location: interview.location,
    meetingLink: interview.meetingLink,
  };

  const newSchedule = {
    interviewDate: newDate,
    startTime: newStart,
    endTime: newEnd,
    timeZone: newTimeZone,
    location: payload.location !== undefined ? payload.location || null : interview.location,
    meetingLink:
      payload.meetingLink !== undefined ? payload.meetingLink || null : interview.meetingLink,
  };

  const updated = await repo.updateInterviewWithHistory(
    interviewId,
    {
      interviewDate: newDate,
      startTime: newStart,
      endTime: newEnd,
      timeZone: newTimeZone,
      location: newSchedule.location,
      meetingLink: newSchedule.meetingLink,
      status: 'RESCHEDULED',
      candidateConfirmedAt: null,
      noShowParty: null,
      updatedById: currentUser.id,
    },
    {
      action: 'INTERVIEW_RESCHEDULED',
      previousStatus: interview.status,
      newStatus: 'RESCHEDULED',
      previousSchedule,
      newSchedule,
      reason: payload.reason,
      changedById: currentUser.id,
      changedByRole: currentUser.role,
    }
  );

  // If this reschedule fulfilled a candidate reschedule request, mark it APPROVED
  if (payload.rescheduleRequestId) {
    await repo.updateRescheduleRequestStatus(payload.rescheduleRequestId, {
      status: 'APPROVED',
      reviewedById: currentUser.id,
      reviewNotes: payload.reason,
      reviewedAt: new Date(),
    });
  }

  emailService.notifyCandidateInterviewRescheduled({
    to: updated.candidate?.email,
    candidateName: updated.candidate?.fullName,
    jobTitle: updated.job?.title,
    companyName: updated.company?.name,
    roundNumber: updated.roundNumber,
    startTime: updated.startTime,
    endTime: updated.endTime,
    timeZone: updated.timeZone,
    reason: payload.reason,
  });

  return formatRecruiterInterview(updated, currentUser);
};

// ── 5. Cancel Interview ────────────────────────────────────────────────────
exports.cancelInterview = async (currentUser, interviewId, payload) => {
  const interview = await repo.findInterviewById(interviewId);
  if (!interview) {
    throw new ApiError(404, 'Interview not found', 'INTERVIEW_NOT_FOUND');
  }

  assertRecruiterOrInterviewerCanAccess(interview, currentUser, true);

  const allowed = ALLOWED_INTERVIEW_TRANSITIONS[interview.status] || [];
  if (!allowed.includes('CANCELLED')) {
    throw new ApiError(
      400,
      `Cannot cancel an interview with status ${interview.status}`,
      'CANNOT_CANCEL_INTERVIEW'
    );
  }

  const updated = await repo.updateInterviewWithHistory(
    interviewId,
    {
      status: 'CANCELLED',
      cancellationReason: payload.reason,
      cancellationType: payload.cancellationType || 'RECRUITER_CANCELLED',
      cancelledById: currentUser.id,
      cancelledAt: new Date(),
      updatedById: currentUser.id,
    },
    {
      action: 'INTERVIEW_CANCELLED',
      previousStatus: interview.status,
      newStatus: 'CANCELLED',
      previousSchedule: {
        interviewDate: interview.interviewDate,
        startTime: interview.startTime,
        endTime: interview.endTime,
        timeZone: interview.timeZone,
      },
      newSchedule: null,
      metadata: { cancellationType: payload.cancellationType || 'RECRUITER_CANCELLED' },
      reason: payload.reason,
      changedById: currentUser.id,
      changedByRole: currentUser.role,
    }
  );

  emailService.notifyCandidateInterviewCancelled({
    to: updated.candidate?.email,
    candidateName: updated.candidate?.fullName,
    jobTitle: updated.job?.title,
    companyName: updated.company?.name,
    roundNumber: updated.roundNumber,
    reason: payload.reason,
  });

  return formatRecruiterInterview(updated, currentUser);
};

// ── 6. Complete Interview / Update Status (IN_PROGRESS / COMPLETED / NO_SHOW) ──
exports.completeOrUpdateStatus = async (currentUser, interviewId, payload) => {
  const interview = await repo.findInterviewById(interviewId);
  if (!interview) {
    throw new ApiError(404, 'Interview not found', 'INTERVIEW_NOT_FOUND');
  }

  assertRecruiterOrInterviewerCanAccess(interview, currentUser, false);

  const targetStatus = payload.status || 'COMPLETED';
  const allowed = ALLOWED_INTERVIEW_TRANSITIONS[interview.status] || [];
  if (!allowed.includes(targetStatus)) {
    throw new ApiError(
      400,
      `Invalid interview status transition from ${interview.status} to ${targetStatus}`,
      'INVALID_INTERVIEW_STATUS_TRANSITION'
    );
  }

  let applicationUpdate = null;
  if (payload.nextAction === 'REJECT_CANDIDATE' && interview.application) {
    const companyRole = getCompanyRoleForUser(interview.company, currentUser);
    if (!companyRole) {
      throw new ApiError(
        403,
        'Only authorized company recruiters can reject a candidate',
        'FORBIDDEN_CANDIDATE_REJECTION'
      );
    }
    applicationUpdate = {
      data: {
        status: 'REJECTED',
        rejectionReason:
          payload.reason || `Rejected after Round ${interview.roundNumber} (${interview.title})`,
        reviewedById: currentUser.id,
        lastStatusUpdatedAt: new Date(),
      },
      history: {
        applicationId: interview.applicationId,
        previousStatus: interview.application.status,
        newStatus: 'REJECTED',
        changedById: currentUser.id,
        changedByRole: currentUser.role,
        reason:
          payload.reason || `Rejected after Round ${interview.roundNumber} (${interview.title})`,
      },
    };
  }

  const updated = await repo.updateInterviewWithHistory(
    interviewId,
    {
      status: targetStatus,
      noShowParty: targetStatus === 'NO_SHOW' ? payload.noShowParty || 'CANDIDATE' : null,
      completedAt: targetStatus === 'COMPLETED' ? new Date() : interview.completedAt,
      updatedById: currentUser.id,
    },
    {
      action:
        targetStatus === 'COMPLETED'
          ? 'INTERVIEW_COMPLETED'
          : targetStatus === 'NO_SHOW'
          ? 'INTERVIEW_NO_SHOW'
          : `INTERVIEW_${targetStatus}`,
      previousStatus: interview.status,
      newStatus: targetStatus,
      metadata:
        targetStatus === 'NO_SHOW' ? { noShowParty: payload.noShowParty || 'CANDIDATE' } : null,
      reason: payload.reason || `Interview marked as ${targetStatus}`,
      changedById: currentUser.id,
      changedByRole: currentUser.role,
    },
    applicationUpdate
  );

  return formatRecruiterInterview(updated, currentUser);
};

// ── 7. Interviewer Management ──────────────────────────────────────────────
exports.assignInterviewers = async (currentUser, interviewId, payload) => {
  const interview = await repo.findInterviewById(interviewId);
  if (!interview) {
    throw new ApiError(404, 'Interview not found', 'INTERVIEW_NOT_FOUND');
  }

  assertRecruiterOrInterviewerCanAccess(interview, currentUser, true);

  if (['COMPLETED', 'CANCELLED'].includes(interview.status)) {
    throw new ApiError(
      400,
      `Cannot assign interviewers to a ${interview.status} interview`,
      'INTERVIEW_LOCKED'
    );
  }

  const validated = verifyEligibleCompanyInterviewers(interview.company, payload.interviewers);

  const overlaps = await repo.findOverlappingInterviewsForUsers({
    interviewerIds: validated.map((v) => v.interviewerId),
    startTime: interview.startTime,
    endTime: interview.endTime,
    excludeInterviewId: interview.id,
  });

  if (overlaps.length > 0) {
    throw new ApiError(
      409,
      `Selected interviewer has a conflicting interview ("${overlaps[0].title}") during this time slot`,
      'INTERVIEWER_CONFLICT'
    );
  }

  const updated = await repo.upsertInterviewerAssignments({
    interviewId,
    interviewers: validated,
    assignedById: currentUser.id,
    historyEntry: {
      action: 'INTERVIEWER_ASSIGNED',
      previousStatus: interview.status,
      newStatus: interview.status,
      metadata: { assignedInterviewers: validated },
      reason: 'Interviewers assigned to round',
      changedById: currentUser.id,
      changedByRole: currentUser.role,
    },
  });

  for (const assignment of updated.interviewers || []) {
    if (validated.some((v) => v.interviewerId === assignment.interviewerId)) {
      emailService.notifyInterviewerAssigned({
        to: assignment.interviewer?.email,
        interviewerName: assignment.interviewer?.fullName,
        candidateName: updated.candidate?.fullName,
        jobTitle: updated.job?.title,
        companyName: updated.company?.name,
        roundNumber: updated.roundNumber,
        interviewType: updated.interviewType,
        role: assignment.interviewerRole,
        startTime: updated.startTime,
        timeZone: updated.timeZone,
      });
    }
  }

  return formatRecruiterInterview(updated, currentUser);
};

exports.removeInterviewer = async (currentUser, interviewId, assignmentId) => {
  const interview = await repo.findInterviewById(interviewId);
  if (!interview) {
    throw new ApiError(404, 'Interview not found', 'INTERVIEW_NOT_FOUND');
  }

  assertRecruiterOrInterviewerCanAccess(interview, currentUser, true);

  if (['COMPLETED', 'CANCELLED'].includes(interview.status)) {
    throw new ApiError(
      400,
      `Cannot remove interviewers from a ${interview.status} interview`,
      'INTERVIEW_LOCKED'
    );
  }

  const target = (interview.interviewers || []).find((a) => a.id === assignmentId);
  if (!target) {
    throw new ApiError(404, 'Interviewer assignment not found', 'ASSIGNMENT_NOT_FOUND');
  }

  const updated = await repo.removeInterviewerAssignment({
    interviewId,
    assignmentId,
    historyEntry: {
      action: 'INTERVIEWER_REMOVED',
      previousStatus: interview.status,
      newStatus: interview.status,
      metadata: {
        removedInterviewerId: target.interviewerId,
        removedInterviewerName: target.interviewer?.fullName,
      },
      reason: `Removed interviewer ${target.interviewer?.fullName || ''}`,
      changedById: currentUser.id,
      changedByRole: currentUser.role,
    },
  });

  return formatRecruiterInterview(updated, currentUser);
};

exports.listInterviewers = async (currentUser, interviewId) => {
  const interview = await repo.findInterviewById(interviewId);
  if (!interview) {
    throw new ApiError(404, 'Interview not found', 'INTERVIEW_NOT_FOUND');
  }
  assertRecruiterOrInterviewerCanAccess(interview, currentUser, false);
  return {
    interviewers: interview.interviewers || [],
  };
};

// ── 8. Interview Feedback & Evaluation ─────────────────────────────────────
exports.submitFeedback = async (currentUser, interviewId, payload) => {
  const interview = await repo.findInterviewById(interviewId);
  if (!interview) {
    throw new ApiError(404, 'Interview not found', 'INTERVIEW_NOT_FOUND');
  }

  const { companyRole, isAssigned } = assertRecruiterOrInterviewerCanAccess(
    interview,
    currentUser,
    false
  );

  if (!isAssigned && !['OWNER', 'ADMIN', 'RECRUITER'].includes(companyRole)) {
    throw new ApiError(
      403,
      'Only assigned interviewers or authorized company recruiters can submit interview feedback',
      'FORBIDDEN_FEEDBACK_SUBMISSION'
    );
  }

  if (interview.status === 'CANCELLED' || interview.status === 'DRAFT') {
    throw new ApiError(
      400,
      `Cannot submit feedback for a ${interview.status} interview`,
      'INVALID_INTERVIEW_STATUS_FOR_FEEDBACK'
    );
  }

  const feedback = await repo.upsertFeedbackTransaction({
    interviewId: interview.id,
    applicationId: interview.applicationId,
    interviewerId: currentUser.id,
    feedbackData: {
      overallRating: payload.overallRating,
      technicalRating: payload.technicalRating ?? null,
      communicationRating: payload.communicationRating ?? null,
      problemSolvingRating: payload.problemSolvingRating ?? null,
      experienceRating: payload.experienceRating ?? null,
      strengths: payload.strengths || null,
      weaknesses: payload.weaknesses || null,
      detailedFeedback: payload.detailedFeedback,
      recommendation: payload.recommendation,
      isFinalSubmitted: payload.isFinalSubmitted ?? true,
    },
    historyEntry: {
      action: 'FEEDBACK_SUBMITTED',
      previousStatus: interview.status,
      newStatus: interview.status,
      metadata: {
        interviewerId: currentUser.id,
        recommendation: payload.recommendation,
        overallRating: payload.overallRating,
      },
      reason: `Feedback submitted by ${currentUser.fullName || currentUser.email}`,
      changedById: currentUser.id,
      changedByRole: currentUser.role,
    },
  });

  emailService.notifyRecruiterFeedbackSubmitted({
    to: interview.createdBy?.email,
    interviewerName: currentUser.fullName || currentUser.email,
    candidateName: interview.candidate?.fullName,
    jobTitle: interview.job?.title,
    roundNumber: interview.roundNumber,
    recommendation: payload.recommendation,
  });

  return feedback;
};

exports.getInterviewFeedback = async (currentUser, interviewId) => {
  const interview = await repo.findInterviewById(interviewId);
  if (!interview) {
    throw new ApiError(404, 'Interview not found', 'INTERVIEW_NOT_FOUND');
  }

  if (currentUser.role === 'candidate') {
    throw new ApiError(
      403,
      'Candidates are not permitted to access confidential interview feedback',
      'FORBIDDEN_CANDIDATE_FEEDBACK_ACCESS'
    );
  }

  assertRecruiterOrInterviewerCanAccess(interview, currentUser, false);
  const feedbacks = interview.feedbacks || [];
  return {
    feedbacks,
    summary: calculateFeedbackSummary(feedbacks),
  };
};

exports.updateFeedback = async (currentUser, interviewId, feedbackId, payload) => {
  const interview = await repo.findInterviewById(interviewId);
  if (!interview) {
    throw new ApiError(404, 'Interview not found', 'INTERVIEW_NOT_FOUND');
  }

  const existing = await repo.findFeedbackById(feedbackId);
  if (!existing || existing.interviewId !== interviewId) {
    throw new ApiError(404, 'Feedback record not found', 'FEEDBACK_NOT_FOUND');
  }

  if (existing.interviewerId !== currentUser.id && currentUser.role !== 'admin') {
    throw new ApiError(
      403,
      'You can only edit your own interview feedback',
      'FORBIDDEN_FEEDBACK_EDIT'
    );
  }

  return repo.updateFeedbackById(
    feedbackId,
    interviewId,
    {
      overallRating: payload.overallRating ?? existing.overallRating,
      technicalRating:
        payload.technicalRating !== undefined ? payload.technicalRating : existing.technicalRating,
      communicationRating:
        payload.communicationRating !== undefined
          ? payload.communicationRating
          : existing.communicationRating,
      problemSolvingRating:
        payload.problemSolvingRating !== undefined
          ? payload.problemSolvingRating
          : existing.problemSolvingRating,
      experienceRating:
        payload.experienceRating !== undefined
          ? payload.experienceRating
          : existing.experienceRating,
      strengths: payload.strengths !== undefined ? payload.strengths : existing.strengths,
      weaknesses: payload.weaknesses !== undefined ? payload.weaknesses : existing.weaknesses,
      detailedFeedback: payload.detailedFeedback ?? existing.detailedFeedback,
      recommendation: payload.recommendation ?? existing.recommendation,
      isFinalSubmitted: payload.isFinalSubmitted ?? existing.isFinalSubmitted,
    },
    {
      action: 'FEEDBACK_UPDATED',
      previousStatus: interview.status,
      newStatus: interview.status,
      metadata: { feedbackId },
      reason: 'Interviewer updated evaluation feedback',
      changedById: currentUser.id,
      changedByRole: currentUser.role,
    }
  );
};

// ── 9. Hiring Decision Management ──────────────────────────────────────────
exports.makeHiringDecision = async (currentUser, applicationId, payload) => {
  const application = await repo.findApplicationForInterview(applicationId);
  if (!application) {
    throw new ApiError(404, 'Application not found', 'APPLICATION_NOT_FOUND');
  }

  const companyRole = getCompanyRoleForUser(application.company, currentUser);
  if (!companyRole) {
    throw new ApiError(
      403,
      'Only authorized company recruiters or hiring managers can make final hiring decisions',
      'FORBIDDEN_HIRING_DECISION'
    );
  }

  if (['WITHDRAWN', 'HIRED'].includes(application.status)) {
    throw new ApiError(
      400,
      `Cannot record a new hiring decision for an application in ${application.status} status`,
      'INVALID_APPLICATION_STATUS_FOR_DECISION'
    );
  }

  if (
    !ELIGIBLE_APPLICATION_STATUSES_FOR_DECISION.includes(application.status) &&
    payload.decision === 'SELECTED'
  ) {
    throw new ApiError(
      400,
      `Application must be in SHORTLISTED, INTERVIEW, or OFFERED stage before selecting a candidate (current: ${application.status})`,
      'APPLICATION_NOT_IN_INTERVIEW_STAGE'
    );
  }

  // Map HiringDecision to existing ApplicationStatus lifecycle:
  // - SELECTED -> OFFERED (default integration point) or HIRED if explicitly requested
  // - REJECTED -> REJECTED
  // - ON_HOLD  -> keeps current application status unless targetApplicationStatus is explicitly provided
  let nextApplicationStatus = null;
  if (payload.decision === 'SELECTED') {
    nextApplicationStatus =
      payload.targetApplicationStatus === 'HIRED' ? 'HIRED' : 'OFFERED';
  } else if (payload.decision === 'REJECTED') {
    nextApplicationStatus = 'REJECTED';
  } else if (payload.decision === 'ON_HOLD') {
    nextApplicationStatus = payload.targetApplicationStatus || null;
  }

  const shouldUpdateAppStatus =
    nextApplicationStatus && nextApplicationStatus !== application.status;

  const decisionRecord = await repo.createHiringDecisionTransaction({
    decisionData: {
      applicationId: application.id,
      jobId: application.jobId,
      candidateId: application.candidateId,
      companyId: application.companyId,
      decision: payload.decision,
      targetApplicationStatus: nextApplicationStatus || application.status,
      decisionReason: payload.decisionReason,
      internalNotes: payload.internalNotes || null,
      decidedById: currentUser.id,
    },
    applicationStatusUpdate: shouldUpdateAppStatus
      ? {
          status: nextApplicationStatus,
          reviewedById: currentUser.id,
          lastStatusUpdatedAt: new Date(),
          rejectionReason:
            nextApplicationStatus === 'REJECTED' ? payload.decisionReason : application.rejectionReason,
        }
      : null,
    applicationStatusHistoryEntry: {
      applicationId: application.id,
      previousStatus: application.status,
      newStatus: nextApplicationStatus || application.status,
      changedById: currentUser.id,
      changedByRole: currentUser.role,
      reason: `Hiring Decision (${payload.decision}): ${payload.decisionReason}`,
      notes: payload.internalNotes || null,
    },
  });

  if (payload.decision === 'SELECTED' || payload.decision === 'REJECTED') {
    emailService.notifyCandidateHiringDecision({
      to: application.candidate?.email,
      candidateName: application.candidate?.fullName,
      jobTitle: application.job?.title,
      companyName: application.company?.name,
      decision: payload.decision,
      newApplicationStatus: nextApplicationStatus,
    });
  }

  return decisionRecord;
};

exports.getApplicationHiringDecisions = async (currentUser, applicationId) => {
  const application = await repo.findApplicationForInterview(applicationId);
  if (!application) {
    throw new ApiError(404, 'Application not found', 'APPLICATION_NOT_FOUND');
  }

  const companyRole = getCompanyRoleForUser(application.company, currentUser);
  if (!companyRole) {
    throw new ApiError(
      403,
      'You are not authorized to view hiring decisions for this application',
      'FORBIDDEN_HIRING_DECISION_ACCESS'
    );
  }

  const decisions = await repo.findHiringDecisionsByApplication(applicationId);
  const allFeedbacks = (application.interviews || []).flatMap((i) => i.feedbacks || []);

  return {
    applicationId: application.id,
    currentApplicationStatus: application.status,
    latestDecision: decisions[0] || null,
    decisions,
    interviewRounds: (application.interviews || []).map((i) =>
      formatRecruiterInterview(i, currentUser)
    ),
    overallFeedbackSummary: calculateFeedbackSummary(allFeedbacks),
  };
};

// ── 10. Dashboard Statistics ───────────────────────────────────────────────
exports.getInterviewDashboardStats = async (currentUser, query = {}) => {
  const isAdmin = currentUser.role === 'admin';
  const { companyIds } = await repo.getAuthorizedCompanyIdsForUser(currentUser.id);
  return repo.getRecruiterInterviewStats({
    companyIds,
    currentUserId: currentUser.id,
    isAdmin,
    companyId: query.companyId || null,
  });
};

exports.getHiringDashboardStats = async (currentUser, query = {}) => {
  const isAdmin = currentUser.role === 'admin';
  const { companyIds } = await repo.getAuthorizedCompanyIdsForUser(currentUser.id);
  return repo.getRecruiterHiringStats({
    companyIds,
    isAdmin,
    companyId: query.companyId || null,
  });
};

// ── 11. Candidate Interview Experience ─────────────────────────────────────
exports.listCandidateInterviews = async (currentUser, query) => {
  if (!currentUser || currentUser.role !== 'candidate') {
    throw new ApiError(403, 'Candidate access required', 'CANDIDATE_ONLY');
  }
  const result = await repo.listCandidateInterviews(currentUser.id, query);
  return {
    interviews: result.items.map(formatCandidateInterview),
    pagination: result.pagination,
  };
};

exports.getCandidateInterviewById = async (currentUser, interviewId) => {
  const interview = await repo.findInterviewById(interviewId);
  if (!interview || interview.status === 'DRAFT') {
    throw new ApiError(404, 'Interview not found', 'INTERVIEW_NOT_FOUND');
  }
  if (interview.candidateId !== currentUser.id) {
    throw new ApiError(
      403,
      'You can only access your own scheduled interviews',
      'FORBIDDEN_CANDIDATE_INTERVIEW'
    );
  }
  return formatCandidateInterview(interview);
};

exports.confirmCandidateAttendance = async (currentUser, interviewId) => {
  const interview = await repo.findInterviewById(interviewId);
  if (!interview || interview.status === 'DRAFT') {
    throw new ApiError(404, 'Interview not found', 'INTERVIEW_NOT_FOUND');
  }
  if (interview.candidateId !== currentUser.id) {
    throw new ApiError(403, 'You can only confirm your own interviews', 'FORBIDDEN');
  }
  if (!['SCHEDULED', 'RESCHEDULED'].includes(interview.status)) {
    throw new ApiError(
      400,
      `Attendance cannot be confirmed when interview status is ${interview.status}`,
      'CANNOT_CONFIRM_INTERVIEW'
    );
  }

  const updated = await repo.updateInterviewWithHistory(
    interviewId,
    {
      status: 'CONFIRMED',
      candidateConfirmedAt: new Date(),
    },
    {
      action: 'INTERVIEW_CONFIRMED',
      previousStatus: interview.status,
      newStatus: 'CONFIRMED',
      reason: 'Candidate confirmed interview attendance',
      changedById: currentUser.id,
      changedByRole: 'candidate',
    }
  );

  return formatCandidateInterview(updated);
};

exports.requestCandidateReschedule = async (currentUser, interviewId, payload) => {
  const interview = await repo.findInterviewById(interviewId);
  if (!interview || interview.status === 'DRAFT') {
    throw new ApiError(404, 'Interview not found', 'INTERVIEW_NOT_FOUND');
  }
  if (interview.candidateId !== currentUser.id) {
    throw new ApiError(
      403,
      'You can only request rescheduling for your own interviews',
      'FORBIDDEN'
    );
  }
  if (!interview.allowCandidateReschedule) {
    throw new ApiError(
      400,
      'Rescheduling requests are not enabled for this interview',
      'RESCHEDULE_NOT_ALLOWED'
    );
  }
  if (!['SCHEDULED', 'RESCHEDULED', 'CONFIRMED'].includes(interview.status)) {
    throw new ApiError(
      400,
      `Cannot request a reschedule when interview status is ${interview.status}`,
      'INVALID_STATUS_FOR_RESCHEDULE_REQUEST'
    );
  }

  const hasPending = (interview.rescheduleRequests || []).some((r) => r.status === 'PENDING');
  if (hasPending) {
    throw new ApiError(
      409,
      'You already have a pending reschedule request for this interview',
      'DUPLICATE_RESCHEDULE_REQUEST'
    );
  }

  const reqRecord = await repo.createRescheduleRequestTransaction({
    requestData: {
      interviewId: interview.id,
      candidateId: currentUser.id,
      requestedDate: new Date(payload.requestedDate || payload.requestedStartTime),
      requestedStartTime: new Date(payload.requestedStartTime),
      requestedEndTime: new Date(payload.requestedEndTime),
      timeZone: payload.timeZone || interview.timeZone,
      reason: payload.reason,
      status: 'PENDING',
    },
    historyEntry: {
      interviewId: interview.id,
      action: 'CANDIDATE_RESCHEDULE_REQUESTED',
      previousStatus: interview.status,
      newStatus: interview.status,
      newSchedule: {
        requestedDate: payload.requestedDate,
        requestedStartTime: payload.requestedStartTime,
        requestedEndTime: payload.requestedEndTime,
        timeZone: payload.timeZone || interview.timeZone,
      },
      reason: payload.reason,
      changedById: currentUser.id,
      changedByRole: 'candidate',
    },
  });

  emailService.notifyRecruiterRescheduleRequest({
    to: interview.createdBy?.email,
    candidateName: currentUser.fullName || interview.candidate?.fullName,
    jobTitle: interview.job?.title,
    roundNumber: interview.roundNumber,
    requestedStartTime: payload.requestedStartTime,
    timeZone: payload.timeZone || interview.timeZone,
    reason: payload.reason,
  });

  return reqRecord;
};

exports.getCandidateInterviewHistory = async (currentUser, interviewId) => {
  const formatted = await exports.getCandidateInterviewById(currentUser, interviewId);
  return {
    interviewId: formatted.id,
    history: formatted.history || [],
    rescheduleRequests: formatted.rescheduleRequests || [],
  };
};
