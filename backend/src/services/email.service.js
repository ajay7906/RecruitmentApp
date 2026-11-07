'use strict';

const crypto = require('crypto');
const nodemailer = require('nodemailer');
const env = require('../config/env');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const smtpTransporter =
  env.SMTP_HOST && env.NODE_ENV !== 'test'
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
      })
    : null;

// Allows tests to inject a mock transport to verify provider failures & retry logic
let customTransportFn = null;

function setCustomTransport(fn) {
  customTransportFn = typeof fn === 'function' ? fn : null;
}

function isValidEmailAddress(email) {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Low-level mail dispatch returning provider delivery metadata.
 */
async function dispatchRawEmail({ to, subject, html, text }) {
  if (!isValidEmailAddress(to)) {
    const err = new Error('Invalid recipient email address');
    err.code = 'INVALID_RECIPIENT_EMAIL';
    throw err;
  }

  const normalizedTo = to.trim().toLowerCase();

  if (customTransportFn) {
    const result = await customTransportFn({
      from: env.MAIL_FROM,
      to: normalizedTo,
      subject,
      html,
      text,
    });
    return {
      provider: result?.provider || 'CUSTOM_TRANSPORT',
      messageId: result?.messageId || `custom-${crypto.randomUUID()}`,
      response: result?.response || { accepted: [normalizedTo] },
    };
  }

  if (!smtpTransporter) {
    if (env.NODE_ENV !== 'test') {
      console.log(`\n[DEV EMAIL] to=${normalizedTo}\nsubject=${subject}\n`);
    }
    return {
      provider: 'DEV_CONSOLE',
      messageId: `dev-${crypto.randomUUID()}`,
      response: { accepted: [normalizedTo], mode: 'DEV_CONSOLE' },
    };
  }

  const info = await smtpTransporter.sendMail({
    from: env.MAIL_FROM,
    to: normalizedTo,
    subject,
    html,
    text,
  });

  return {
    provider: 'SMTP',
    messageId: info?.messageId || `smtp-${crypto.randomUUID()}`,
    response: {
      accepted: info?.accepted || [normalizedTo],
      rejected: info?.rejected || [],
      envelope: info?.envelope || null,
      response: info?.response || 'OK',
    },
  };
}

// ── Backward-compatible wrappers routed through centralized Notifications Service ──

function getNotificationsService() {
  return require('../modules/notifications/notifications.service');
}

exports.setCustomTransport = setCustomTransport;
exports.isValidEmailAddress = isValidEmailAddress;
exports.dispatchRawEmail = dispatchRawEmail;

exports.sendVerificationEmail = async (to, token, user = null) => {
  const link = `${env.CLIENT_URL}/verify-email?token=${token}`;
  return getNotificationsService().sendDirectTemplateEmail({
    recipientEmail: to,
    recipientId: user?.id || null,
    templateKey: 'EMAIL_VERIFICATION',
    eventType: 'EMAIL_VERIFICATION',
    category: 'SECURITY',
    actionUrl: `/verify-email?token=${token}`,
    variables: {
      userName: user?.fullName || to.split('@')[0],
      verificationUrl: link,
    },
    awaitDelivery: true,
  });
};

exports.sendPasswordResetEmail = async (to, token, user = null) => {
  const link = `${env.CLIENT_URL}/reset-password?token=${token}`;
  return getNotificationsService().sendDirectTemplateEmail({
    recipientEmail: to,
    recipientId: user?.id || null,
    templateKey: 'PASSWORD_RESET_REQUESTED',
    eventType: 'PASSWORD_RESET_REQUESTED',
    category: 'SECURITY',
    actionUrl: `/reset-password?token=${token}`,
    variables: {
      userName: user?.fullName || to.split('@')[0],
      resetUrl: link,
    },
    awaitDelivery: true,
  });
};

exports.notifyCandidateInterviewScheduled = (payload) => {
  getNotificationsService()
    .notifyUser({
      recipientEmail: payload.to,
      recipientId: payload.candidateId || null,
      templateKey: 'INTERVIEW_SCHEDULED_CANDIDATE',
      eventType: 'INTERVIEW_SCHEDULED',
      category: 'INTERVIEW',
      actionUrl: payload.interviewId ? `/app/interviews/${payload.interviewId}` : '/app/interviews',
      variables: {
        candidateName: payload.candidateName || 'Candidate',
        jobTitle: payload.jobTitle || 'Role',
        companyName: payload.companyName || 'Company',
        roundNumber: payload.roundNumber || 1,
        interviewType: payload.interviewType || 'Interview',
        interviewDate: payload.startTime ? new Date(payload.startTime).toUTCString() : '',
        interviewTime: payload.startTime ? new Date(payload.startTime).toLocaleTimeString('en-US') : '',
        timeZone: payload.timeZone || 'UTC',
        interviewMode: payload.interviewMode || 'ONLINE',
        interviewLocation: payload.meetingLink || payload.location || 'Online',
      },
    })
    .catch(() => {});
};

exports.notifyCandidateInterviewRescheduled = (payload) => {
  getNotificationsService()
    .notifyUser({
      recipientEmail: payload.to,
      recipientId: payload.candidateId || null,
      templateKey: 'INTERVIEW_RESCHEDULED',
      eventType: 'INTERVIEW_RESCHEDULED',
      category: 'INTERVIEW',
      actionUrl: payload.interviewId ? `/app/interviews/${payload.interviewId}` : '/app/interviews',
      variables: {
        recipientName: payload.candidateName || 'Candidate',
        jobTitle: payload.jobTitle || 'Role',
        companyName: payload.companyName || 'Company',
        roundNumber: payload.roundNumber || 1,
        interviewDate: payload.startTime ? new Date(payload.startTime).toUTCString() : '',
        interviewTime: payload.startTime ? new Date(payload.startTime).toLocaleTimeString('en-US') : '',
        timeZone: payload.timeZone || 'UTC',
        reason: payload.reason || 'Schedule updated',
      },
    })
    .catch(() => {});
};

exports.notifyCandidateInterviewCancelled = (payload) => {
  getNotificationsService()
    .notifyUser({
      recipientEmail: payload.to,
      recipientId: payload.candidateId || null,
      templateKey: 'INTERVIEW_CANCELLED',
      eventType: 'INTERVIEW_CANCELLED',
      category: 'INTERVIEW',
      actionUrl: '/app/interviews',
      variables: {
        recipientName: payload.candidateName || 'Candidate',
        jobTitle: payload.jobTitle || 'Role',
        companyName: payload.companyName || 'Company',
        roundNumber: payload.roundNumber || 1,
        reason: payload.reason || 'Cancelled by recruiter',
      },
    })
    .catch(() => {});
};

exports.notifyInterviewerAssigned = (payload) => {
  getNotificationsService()
    .notifyUser({
      recipientEmail: payload.to,
      recipientId: payload.interviewerId || null,
      templateKey: 'INTERVIEW_ASSIGNED_INTERVIEWER',
      eventType: 'INTERVIEW_ASSIGNED',
      category: 'INTERVIEW',
      actionUrl: payload.interviewId ? `/app/recruiter/interviews/${payload.interviewId}` : '/app/recruiter/interviews',
      variables: {
        interviewerName: payload.interviewerName || 'Interviewer',
        interviewerRole: payload.role || 'Interviewer',
        candidateName: payload.candidateName || 'Candidate',
        jobTitle: payload.jobTitle || 'Role',
        companyName: payload.companyName || 'Company',
        roundNumber: payload.roundNumber || 1,
        interviewType: payload.interviewType || 'Interview',
        interviewDate: payload.startTime ? new Date(payload.startTime).toUTCString() : '',
        interviewTime: payload.startTime ? new Date(payload.startTime).toLocaleTimeString('en-US') : '',
        timeZone: payload.timeZone || 'UTC',
        interviewLocation: payload.meetingLink || payload.location || 'Online',
      },
    })
    .catch(() => {});
};

exports.notifyRecruiterRescheduleRequest = (payload) => {
  getNotificationsService()
    .notifyUser({
      recipientEmail: payload.to,
      recipientId: payload.recruiterId || null,
      templateKey: 'INTERVIEW_RESCHEDULE_REQUESTED',
      eventType: 'INTERVIEW_RESCHEDULE_REQUESTED',
      category: 'INTERVIEW',
      actionUrl: payload.interviewId ? `/app/recruiter/interviews/${payload.interviewId}` : '/app/recruiter/interviews',
      variables: {
        recruiterName: payload.recruiterName || 'Recruiter',
        candidateName: payload.candidateName || 'Candidate',
        jobTitle: payload.jobTitle || 'Role',
        roundNumber: payload.roundNumber || 1,
        interviewDate: payload.requestedStartTime ? new Date(payload.requestedStartTime).toUTCString() : '',
        interviewTime: payload.requestedStartTime ? new Date(payload.requestedStartTime).toLocaleTimeString('en-US') : '',
        timeZone: payload.timeZone || 'UTC',
        reason: payload.reason || '',
      },
    })
    .catch(() => {});
};

exports.notifyRecruiterFeedbackSubmitted = (payload) => {
  getNotificationsService()
    .notifyUser({
      recipientEmail: payload.to,
      recipientId: payload.recruiterId || null,
      templateKey: 'INTERVIEW_FEEDBACK_SUBMITTED',
      eventType: 'INTERVIEW_FEEDBACK_SUBMITTED',
      category: 'INTERVIEW',
      actionUrl: payload.interviewId ? `/app/recruiter/interviews/${payload.interviewId}` : '/app/recruiter/interviews',
      variables: {
        recruiterName: payload.recruiterName || 'Recruiter',
        interviewerName: payload.interviewerName || 'Interviewer',
        candidateName: payload.candidateName || 'Candidate',
        jobTitle: payload.jobTitle || 'Role',
        roundNumber: payload.roundNumber || 1,
        recommendation: payload.recommendation || '',
      },
    })
    .catch(() => {});
};

exports.notifyCandidateHiringDecision = (payload) => {
  getNotificationsService()
    .notifyUser({
      recipientEmail: payload.to,
      recipientId: payload.candidateId || null,
      templateKey: 'HIRING_DECISION_CANDIDATE',
      eventType: 'HIRING_DECISION_MADE',
      category: 'HIRING',
      actionUrl: payload.applicationId ? `/app/applications/${payload.applicationId}` : '/app/applications',
      variables: {
        candidateName: payload.candidateName || 'Candidate',
        jobTitle: payload.jobTitle || 'Role',
        companyName: payload.companyName || 'Company',
        applicationStatus: payload.newApplicationStatus || payload.decision || 'UPDATED',
      },
    })
    .catch(() => {});
};
