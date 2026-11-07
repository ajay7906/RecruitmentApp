'use strict';

const env = require('../../config/env');

const NOTIFICATION_CHANNELS = Object.freeze({
  EMAIL: 'EMAIL',
  IN_APP: 'IN_APP',
});

const NOTIFICATION_CATEGORIES = Object.freeze({
  ACCOUNT: 'ACCOUNT',
  COMPANY: 'COMPANY',
  JOB: 'JOB',
  APPLICATION: 'APPLICATION',
  INTERVIEW: 'INTERVIEW',
  HIRING: 'HIRING',
  SYSTEM: 'SYSTEM',
  SECURITY: 'SECURITY',
  ADMIN: 'ADMIN',
});

const DELIVERY_STATUSES = Object.freeze({
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SENT: 'SENT',
  FAILED: 'FAILED',
});

/**
 * Categories that represent essential security or mandatory operational notices
 * and cannot be disabled by users.
 */
const ESSENTIAL_CATEGORIES = new Set([NOTIFICATION_CATEGORIES.SECURITY]);

/**
 * Event types that are operationally or security-critical even if their category is ACCOUNT.
 */
const ESSENTIAL_EVENT_TYPES = new Set([
  'EMAIL_VERIFICATION',
  'PASSWORD_RESET_REQUESTED',
  'PASSWORD_CHANGED',
  'ACCOUNT_STATUS_CHANGED',
  'ADMIN_SUSPICIOUS_ACTIVITY_ALERT',
]);

/**
 * Preference category catalog exposed to frontend settings UI, filtered by user role.
 */
const PREFERENCE_CATEGORY_METADATA = Object.freeze([
  {
    category: 'APPLICATION',
    label: 'Application Updates',
    description: 'Submissions, stage transitions, shortlist updates, and withdrawals.',
    roles: ['candidate', 'recruiter', 'admin'],
    isEssential: false,
  },
  {
    category: 'INTERVIEW',
    label: 'Interview Updates',
    description: 'Interview invitations, reschedules, confirmations, reminders, and assignments.',
    roles: ['candidate', 'recruiter', 'admin'],
    isEssential: false,
  },
  {
    category: 'HIRING',
    label: 'Hiring & Offers',
    description: 'Offer updates, final selection decisions, and onboarding status.',
    roles: ['candidate', 'recruiter', 'admin'],
    isEssential: false,
  },
  {
    category: 'JOB',
    label: 'Job Updates',
    description: 'Job publication, pause, closure, expiration, and moderation alerts.',
    roles: ['candidate', 'recruiter', 'admin'],
    isEssential: false,
  },
  {
    category: 'COMPANY',
    label: 'Company Updates',
    description: 'Company registration, approval status, team membership, and compliance.',
    roles: ['recruiter', 'admin'],
    isEssential: false,
  },
  {
    category: 'SYSTEM',
    label: 'Platform Announcements',
    description: 'Product updates, feature releases, and general platform communications.',
    roles: ['candidate', 'recruiter', 'admin'],
    isEssential: false,
  },
  {
    category: 'ACCOUNT',
    label: 'Account Notifications',
    description: 'Profile updates, welcome messages, and account status alerts.',
    roles: ['candidate', 'recruiter', 'admin'],
    isEssential: false,
  },
  {
    category: 'ADMIN',
    label: 'Administrative & Moderation Alerts',
    description: 'New company review requests, moderation reports, and governance alerts.',
    roles: ['admin'],
    isEssential: false,
  },
  {
    category: 'SECURITY',
    label: 'Security & Authentication Alerts',
    description: 'Verification links, password resets, password changes, and critical security alerts (Required).',
    roles: ['candidate', 'recruiter', 'admin'],
    isEssential: true,
  },
]);

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function interpolateText(template, variables = {}) {
  if (!template) return '';
  const merged = {
    platformUrl: env.CLIENT_URL || 'http://localhost:5173',
    platformName: 'Recruitro',
    ...variables,
  };
  return String(template).replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
    const val = merged[key];
    return val !== undefined && val !== null ? String(val) : '';
  });
}

function interpolateHtml(template, variables = {}, rawHtmlKeys = new Set(['actionLinkHtml'])) {
  if (!template) return '';
  const merged = {
    platformUrl: env.CLIENT_URL || 'http://localhost:5173',
    platformName: 'Recruitro',
    ...variables,
  };
  return String(template).replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
    const val = merged[key];
    if (val === undefined || val === null) return '';
    return rawHtmlKeys.has(key) ? String(val) : escapeHtml(val);
  });
}

function htmlToPlainText(html) {
  if (!html) return '';
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function sanitizeActionUrl(actionUrl) {
  if (!actionUrl || typeof actionUrl !== 'string') return null;
  const trimmed = actionUrl.trim();
  if (!trimmed) return null;
  // Allow internal relative paths starting with `/` (but not protocol-relative `//`)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }
  // Allow absolute URLs matching CLIENT_URL origin or safe https links
  try {
    const parsed = new URL(trimmed);
    if (['http:', 'https:'].includes(parsed.protocol)) {
      return trimmed;
    }
  } catch {
    return null;
  }
  return null;
}

function buildAbsoluteUrl(actionUrl) {
  const safe = sanitizeActionUrl(actionUrl);
  if (!safe) return env.CLIENT_URL;
  if (safe.startsWith('http://') || safe.startsWith('https://')) return safe;
  return `${env.CLIENT_URL.replace(/\/$/, '')}${safe}`;
}

function wrapEmailLayout({ subject, heading, bodyHtml, actionUrl, actionLabel }) {
  const fullActionUrl = actionUrl ? buildAbsoluteUrl(actionUrl) : null;
  const buttonHtml = fullActionUrl
    ? `<div style="margin: 24px 0;">
         <a href="${escapeHtml(fullActionUrl)}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 22px; border-radius: 8px;">
           ${escapeHtml(actionLabel || 'View in Recruitro')}
         </a>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject || 'Recruitro Notification')}</title>
</head>
<body style="margin:0; padding:0; background-color:#f8fafc; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px; background-color:#ffffff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden;">
          <tr>
            <td style="background-color:#0f172a; padding:20px 28px;">
              <span style="color:#ffffff; font-size:18px; font-weight:700; letter-spacing:-0.02em;">Recruitro</span>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              ${heading ? `<h1 style="margin:0 0 16px 0; font-size:20px; font-weight:700; color:#0f172a;">${escapeHtml(heading)}</h1>` : ''}
              <div style="font-size:15px; line-height:1.6; color:#334155;">
                ${bodyHtml}
              </div>
              ${buttonHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px; background-color:#f1f5f9; border-top:1px solid #e2e8f0; font-size:12px; color:#64748b;">
              <p style="margin:0;">This message was sent by Recruitro (<a href="${escapeHtml(env.CLIENT_URL)}" style="color:#2563eb; text-decoration:none;">${escapeHtml(env.CLIENT_URL)}</a>).</p>
              <p style="margin:6px 0 0 0;">Manage your notification preferences anytime from your account settings.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Built-in template catalog keyed by templateKey.
 * Each entry supports both EMAIL and IN_APP representations.
 */
const BUILTIN_TEMPLATES = Object.freeze({
  // ── Authentication & Security ──────────────────────────────────────────────
  WELCOME_REGISTERED: {
    category: 'ACCOUNT',
    subject: 'Welcome to Recruitro, {{userName}}!',
    title: 'Welcome to Recruitro!',
    inAppMessage:
      'Hi {{userName}}, your {{userRole}} account has been created. Verify your email and complete your profile to get started.',
    emailBody: `<p>Hello <strong>{{userName}}</strong>,</p>
      <p>Welcome to <strong>Recruitro</strong>! Your <strong>{{userRole}}</strong> workspace is ready.</p>
      <p>Complete your profile and explore opportunities right from your dashboard.</p>`,
    actionLabel: 'Open Dashboard',
  },
  EMAIL_VERIFICATION: {
    category: 'SECURITY',
    subject: 'Verify your Recruitro email address',
    title: 'Verify Your Email Address',
    inAppMessage: 'Please verify your email address to activate full access to your account.',
    emailBody: `<p>Hello <strong>{{userName}}</strong>,</p>
      <p>Please verify your email address by clicking the button below. This verification link is valid for 24 hours.</p>
      <p style="font-size:13px; color:#64748b;"> Verification URL: {{verificationUrl}}</p>`,
    actionLabel: 'Verify Email Address',
  },
  EMAIL_VERIFIED: {
    category: 'ACCOUNT',
    subject: 'Your email address has been verified',
    title: 'Email Verified Successfully',
    inAppMessage: 'Your email address is verified and your account is active.',
    emailBody: `<p>Hello <strong>{{userName}}</strong>,</p>
      <p>Your email address has been verified. You now have full access to Recruitro.</p>`,
    actionLabel: 'Go to Dashboard',
  },
  PASSWORD_RESET_REQUESTED: {
    category: 'SECURITY',
    subject: 'Reset your Recruitro password',
    title: 'Password Reset Requested',
    inAppMessage: 'A password reset link was requested for your account.',
    emailBody: `<p>Hello <strong>{{userName}}</strong>,</p>
      <p>We received a request to reset your Recruitro password. Click the button below within 1 hour to set a new password.</p>
      <p style="font-size:13px; color:#64748b;">Reset URL: {{resetUrl}}</p>
      <p>If you did not request this change, you can safely ignore this email.</p>`,
    actionLabel: 'Reset Password',
  },
  PASSWORD_CHANGED: {
    category: 'SECURITY',
    subject: 'Security Alert: Your Recruitro password was changed',
    title: 'Password Changed',
    inAppMessage: 'Your account password was recently updated. All prior sessions have been signed out.',
    emailBody: `<p>Hello <strong>{{userName}}</strong>,</p>
      <p>Your Recruitro account password was successfully changed on <strong>{{timestamp}}</strong>.</p>
      <p>If you did not authorize this change, please reset your password immediately and contact platform support.</p>`,
    actionLabel: 'Review Account Security',
  },
  ACCOUNT_STATUS_CHANGED: {
    category: 'SECURITY',
    subject: 'Important update regarding your Recruitro account ({{status}})',
    title: 'Account Status Updated: {{status}}',
    inAppMessage: 'Your account status has been updated to {{status}}. {{reason}}',
    emailBody: `<p>Hello <strong>{{userName}}</strong>,</p>
      <p>Your Recruitro account status has been changed to <strong>{{status}}</strong>.</p>
      <p><strong>Details:</strong> {{reason}}</p>`,
    actionLabel: 'View Account',
  },

  // ── Company Management ─────────────────────────────────────────────────────
  COMPANY_REGISTERED: {
    category: 'COMPANY',
    subject: 'Company Registered: {{companyName}}',
    title: 'Company Profile Created',
    inAppMessage: '{{companyName}} has been created in DRAFT status. Complete all required details and submit for approval.',
    emailBody: `<p>Hello <strong>{{recruiterName}}</strong>,</p>
      <p>Your company <strong>{{companyName}}</strong> has been registered on Recruitro.</p>
      <p>Once your profile details are complete, submit the company for verification to begin publishing job openings.</p>`,
    actionLabel: 'Manage Company',
  },
  COMPANY_SUBMITTED_FOR_APPROVAL: {
    category: 'COMPANY',
    subject: 'Company Submitted for Verification: {{companyName}}',
    title: 'Company Submitted for Approval',
    inAppMessage: '{{companyName}} has been submitted for platform verification.',
    emailBody: `<p>Hello <strong>{{recruiterName}}</strong>,</p>
      <p>Your company <strong>{{companyName}}</strong> has been submitted for verification. We will notify you as soon as the review is complete.</p>`,
    actionLabel: 'View Approval Status',
  },
  COMPANY_APPROVED: {
    category: 'COMPANY',
    subject: 'Company Approved: {{companyName}} is now verified!',
    title: 'Company Approved: {{companyName}}',
    inAppMessage: 'Congratulations! {{companyName}} has been approved. You can now publish job openings.',
    emailBody: `<p>Hello <strong>{{recruiterName}}</strong>,</p>
      <p>Great news! Your company <strong>{{companyName}}</strong> has been verified and <strong>APPROVED</strong>.</p>
      <p>You and your authorized team members can now publish job vacancies on Recruitro.</p>`,
    actionLabel: 'Open Company Dashboard',
  },
  COMPANY_REJECTED: {
    category: 'COMPANY',
    subject: 'Action Required: {{companyName}} registration update',
    title: 'Company Registration Rejected: {{companyName}}',
    inAppMessage: '{{companyName}} verification was not approved. Reason: {{reason}}',
    emailBody: `<p>Hello <strong>{{recruiterName}}</strong>,</p>
      <p>Your verification request for <strong>{{companyName}}</strong> requires updates before it can be approved.</p>
      <p><strong>Reason provided:</strong> {{reason}}</p>
      <p>Please update your company profile and resubmit for approval.</p>`,
    actionLabel: 'Update Company Profile',
  },
  COMPANY_SUSPENDED: {
    category: 'COMPANY',
    subject: 'Compliance Notice: {{companyName}} has been suspended',
    title: 'Company Suspended: {{companyName}}',
    inAppMessage: '{{companyName}} has been suspended by platform administration. Reason: {{reason}}',
    emailBody: `<p>Hello <strong>{{recruiterName}}</strong>,</p>
      <p>Your company <strong>{{companyName}}</strong> has been placed under administrative suspension.</p>
      <p><strong>Reason:</strong> {{reason}}</p>
      <p>New job publications are paused while the company is suspended.</p>`,
    actionLabel: 'View Company Status',
  },
  COMPANY_REACTIVATED: {
    category: 'COMPANY',
    subject: 'Company Reactivated: {{companyName}}',
    title: 'Company Reactivated: {{companyName}}',
    inAppMessage: '{{companyName}} has been restored to APPROVED status.',
    emailBody: `<p>Hello <strong>{{recruiterName}}</strong>,</p>
      <p>Your company <strong>{{companyName}}</strong> has been reactivated and restored to <strong>APPROVED</strong> status.</p>`,
    actionLabel: 'Open Company Dashboard',
  },

  // ── Job Management ─────────────────────────────────────────────────────────
  JOB_PUBLISHED: {
    category: 'JOB',
    subject: 'Job Published: {{jobTitle}} at {{companyName}}',
    title: 'Job Vacancy Published',
    inAppMessage: '"{{jobTitle}}" at {{companyName}} is now live and accepting candidate applications.',
    emailBody: `<p>Hello <strong>{{recruiterName}}</strong>,</p>
      <p>Your job listing <strong>{{jobTitle}}</strong> for <strong>{{companyName}}</strong> has passed validation and is now <strong>PUBLISHED</strong>.</p>
      <p>Candidates can immediately discover and apply for this opening.</p>`,
    actionLabel: 'View Job Listing',
  },
  JOB_PAUSED: {
    category: 'JOB',
    subject: 'Job Paused: {{jobTitle}} at {{companyName}}',
    title: 'Job Listing Paused',
    inAppMessage: '"{{jobTitle}}" at {{companyName}} has been paused.',
    emailBody: `<p>Hello <strong>{{recruiterName}}</strong>,</p>
      <p>The job vacancy <strong>{{jobTitle}}</strong> at <strong>{{companyName}}</strong> has been paused and is temporarily hidden from new applicants.</p>`,
    actionLabel: 'Manage Job',
  },
  JOB_CLOSED: {
    category: 'JOB',
    subject: 'Job Closed: {{jobTitle}} at {{companyName}}',
    title: 'Job Vacancy Closed',
    inAppMessage: '"{{jobTitle}}" at {{companyName}} has been closed. {{reason}}',
    emailBody: `<p>Hello <strong>{{recruiterName}}</strong>,</p>
      <p>The job vacancy <strong>{{jobTitle}}</strong> at <strong>{{companyName}}</strong> is now <strong>CLOSED</strong>.</p>
      <p>Existing candidate applications remain accessible in your hiring pipeline. {{reason}}</p>`,
    actionLabel: 'View Job Details',
  },
  JOB_EXPIRED: {
    category: 'JOB',
    subject: 'Job Expired: {{jobTitle}} at {{companyName}}',
    title: 'Job Listing Expired',
    inAppMessage: '"{{jobTitle}}" at {{companyName}} has reached its application deadline.',
    emailBody: `<p>Hello <strong>{{recruiterName}}</strong>,</p>
      <p>Your job listing <strong>{{jobTitle}}</strong> at <strong>{{companyName}}</strong> has reached its application deadline and expired.</p>`,
    actionLabel: 'Manage Job',
  },
  JOB_RESTRICTED: {
    category: 'JOB',
    subject: 'Moderation Notice: {{jobTitle}} at {{companyName}}',
    title: 'Job Moderation Alert: {{jobTitle}}',
    inAppMessage: '"{{jobTitle}}" ({{companyName}}) was updated by moderation ({{moderationStatus}}). Reason: {{reason}}',
    emailBody: `<p>Hello <strong>{{recruiterName}}</strong>,</p>
      <p>Your job listing <strong>{{jobTitle}}</strong> at <strong>{{companyName}}</strong> was reviewed by platform moderation.</p>
      <p><strong>Status:</strong> {{moderationStatus}}</p>
      <p><strong>Reason:</strong> {{reason}}</p>`,
    actionLabel: 'Review Job Moderation',
  },
  JOB_MODERATION_RESOLVED: {
    category: 'JOB',
    subject: 'Moderation Cleared: {{jobTitle}} at {{companyName}}',
    title: 'Job Cleared & Published: {{jobTitle}}',
    inAppMessage: '"{{jobTitle}}" at {{companyName}} has been cleared by moderation and is PUBLISHED.',
    emailBody: `<p>Hello <strong>{{recruiterName}}</strong>,</p>
      <p>Your job listing <strong>{{jobTitle}}</strong> at <strong>{{companyName}}</strong> has been cleared by moderation and restored to <strong>PUBLISHED</strong> status.</p>`,
    actionLabel: 'View Job',
  },

  // ── Job Application Management ─────────────────────────────────────────────
  APPLICATION_SUBMITTED_CANDIDATE: {
    category: 'APPLICATION',
    subject: 'Application Submitted: {{jobTitle}} at {{companyName}}',
    title: 'Application Submitted',
    inAppMessage: 'Your application for "{{jobTitle}}" at {{companyName}} has been submitted successfully.',
    emailBody: `<p>Hello <strong>{{candidateName}}</strong>,</p>
      <p>Your application for <strong>{{jobTitle}}</strong> at <strong>{{companyName}}</strong> has been received.</p>
      <ul>
        <li><strong>Application ID:</strong> {{applicationId}}</li>
        <li><strong>Status:</strong> SUBMITTED</li>
      </ul>
      <p>You can track your application progress anytime from your dashboard.</p>`,
    actionLabel: 'Track Application',
  },
  APPLICATION_RECEIVED_RECRUITER: {
    category: 'APPLICATION',
    subject: 'New Application Received: {{candidateName}} for {{jobTitle}}',
    title: 'New Application: {{jobTitle}}',
    inAppMessage: '{{candidateName}} applied for "{{jobTitle}}" at {{companyName}}.',
    emailBody: `<p>Hello <strong>{{recruiterName}}</strong>,</p>
      <p>A new candidate has applied for <strong>{{jobTitle}}</strong> at <strong>{{companyName}}</strong>.</p>
      <ul>
        <li><strong>Candidate:</strong> {{candidateName}}</li>
        <li><strong>Application ID:</strong> {{applicationId}}</li>
      </ul>`,
    actionLabel: 'Review Application',
  },
  APPLICATION_STATUS_UPDATED: {
    category: 'APPLICATION',
    subject: 'Application Update: {{jobTitle}} at {{companyName}} ({{applicationStatus}})',
    title: 'Application Status Updated: {{applicationStatus}}',
    inAppMessage: 'Your application for "{{jobTitle}}" at {{companyName}} moved to {{applicationStatus}}.',
    emailBody: `<p>Hello <strong>{{candidateName}}</strong>,</p>
      <p>There is an update on your application for <strong>{{jobTitle}}</strong> at <strong>{{companyName}}</strong>.</p>
      <ul>
        <li><strong>Current Stage:</strong> {{applicationStatus}}</li>
        <li><strong>Application ID:</strong> {{applicationId}}</li>
      </ul>`,
    actionLabel: 'View Application Status',
  },
  APPLICATION_WITHDRAWN_CANDIDATE: {
    category: 'APPLICATION',
    subject: 'Application Withdrawn: {{jobTitle}} at {{companyName}}',
    title: 'Application Withdrawn',
    inAppMessage: 'You have withdrawn your application for "{{jobTitle}}" at {{companyName}}.',
    emailBody: `<p>Hello <strong>{{candidateName}}</strong>,</p>
      <p>This confirms that your application for <strong>{{jobTitle}}</strong> at <strong>{{companyName}}</strong> has been withdrawn.</p>`,
    actionLabel: 'View My Applications',
  },
  APPLICATION_WITHDRAWN_RECRUITER: {
    category: 'APPLICATION',
    subject: 'Candidate Withdrew Application: {{candidateName}} ({{jobTitle}})',
    title: 'Application Withdrawn: {{jobTitle}}',
    inAppMessage: '{{candidateName}} withdrew their application for "{{jobTitle}}".',
    emailBody: `<p>Hello <strong>{{recruiterName}}</strong>,</p>
      <p>Candidate <strong>{{candidateName}}</strong> has withdrawn their application for <strong>{{jobTitle}}</strong> at <strong>{{companyName}}</strong>.</p>`,
    actionLabel: 'View Pipeline',
  },

  // ── Interview & Hiring Management ──────────────────────────────────────────
  INTERVIEW_SCHEDULED_CANDIDATE: {
    category: 'INTERVIEW',
    subject: 'Interview Scheduled: {{jobTitle}} at {{companyName}}',
    title: 'Interview Scheduled: {{jobTitle}}',
    inAppMessage: 'Your Round {{roundNumber}} ({{interviewType}}) interview for "{{jobTitle}}" at {{companyName}} is scheduled for {{interviewDate}} at {{interviewTime}}.',
    emailBody: `<p>Hello <strong>{{candidateName}}</strong>,</p>
      <p>Your <strong>Round {{roundNumber}} ({{interviewType}})</strong> interview for <strong>{{jobTitle}}</strong> at <strong>{{companyName}}</strong> has been scheduled.</p>
      <ul>
        <li><strong>Date:</strong> {{interviewDate}}</li>
        <li><strong>Time:</strong> {{interviewTime}} ({{timeZone}})</li>
        <li><strong>Mode:</strong> {{interviewMode}}</li>
        <li><strong>Location / Link:</strong> {{interviewLocation}}</li>
      </ul>`,
    actionLabel: 'View Interview Details',
  },
  INTERVIEW_ASSIGNED_INTERVIEWER: {
    category: 'INTERVIEW',
    subject: 'Interview Assignment: {{candidateName}} — {{jobTitle}}',
    title: 'Assigned as Interviewer: {{jobTitle}}',
    inAppMessage: 'You have been assigned to interview {{candidateName}} for "{{jobTitle}}" (Round {{roundNumber}}) on {{interviewDate}}.',
    emailBody: `<p>Hello <strong>{{interviewerName}}</strong>,</p>
      <p>You have been assigned as <strong>{{interviewerRole}}</strong> for <strong>Round {{roundNumber}} ({{interviewType}})</strong> with candidate <strong>{{candidateName}}</strong> for <strong>{{jobTitle}}</strong> at <strong>{{companyName}}</strong>.</p>
      <ul>
        <li><strong>Date:</strong> {{interviewDate}}</li>
        <li><strong>Time:</strong> {{interviewTime}} ({{timeZone}})</li>
        <li><strong>Location / Link:</strong> {{interviewLocation}}</li>
      </ul>`,
    actionLabel: 'Open Interview Workspace',
  },
  INTERVIEW_RESCHEDULED: {
    category: 'INTERVIEW',
    subject: 'Interview Rescheduled: {{jobTitle}} at {{companyName}}',
    title: 'Interview Rescheduled: {{jobTitle}}',
    inAppMessage: 'Your Round {{roundNumber}} interview for "{{jobTitle}}" at {{companyName}} has been rescheduled to {{interviewDate}} at {{interviewTime}}.',
    emailBody: `<p>Hello <strong>{{recipientName}}</strong>,</p>
      <p>The Round {{roundNumber}} interview for <strong>{{jobTitle}}</strong> at <strong>{{companyName}}</strong> has been rescheduled.</p>
      <ul>
        <li><strong>New Date:</strong> {{interviewDate}}</li>
        <li><strong>New Time:</strong> {{interviewTime}} ({{timeZone}})</li>
        <li><strong>Reason:</strong> {{reason}}</li>
      </ul>`,
    actionLabel: 'View Updated Schedule',
  },
  INTERVIEW_CANCELLED: {
    category: 'INTERVIEW',
    subject: 'Interview Cancelled: {{jobTitle}} at {{companyName}}',
    title: 'Interview Cancelled: {{jobTitle}}',
    inAppMessage: 'Round {{roundNumber}} interview for "{{jobTitle}}" at {{companyName}} has been cancelled. {{reason}}',
    emailBody: `<p>Hello <strong>{{recipientName}}</strong>,</p>
      <p>The Round {{roundNumber}} interview for <strong>{{jobTitle}}</strong> at <strong>{{companyName}}</strong> has been cancelled.</p>
      <p><strong>Reason:</strong> {{reason}}</p>`,
    actionLabel: 'View Interviews',
  },
  INTERVIEW_CONFIRMED: {
    category: 'INTERVIEW',
    subject: 'Interview Confirmed by {{candidateName}} ({{jobTitle}})',
    title: 'Candidate Confirmed Interview',
    inAppMessage: '{{candidateName}} confirmed attendance for Round {{roundNumber}} of "{{jobTitle}}".',
    emailBody: `<p>Hello <strong>{{recruiterName}}</strong>,</p>
      <p>Candidate <strong>{{candidateName}}</strong> has confirmed attendance for Round {{roundNumber}} of <strong>{{jobTitle}}</strong> at <strong>{{companyName}}</strong>.</p>`,
    actionLabel: 'View Interview',
  },
  INTERVIEW_RESCHEDULE_REQUESTED: {
    category: 'INTERVIEW',
    subject: 'Reschedule Requested by {{candidateName}} ({{jobTitle}})',
    title: 'Interview Reschedule Request',
    inAppMessage: '{{candidateName}} requested to reschedule Round {{roundNumber}} for "{{jobTitle}}".',
    emailBody: `<p>Hello <strong>{{recruiterName}}</strong>,</p>
      <p>Candidate <strong>{{candidateName}}</strong> has requested to reschedule Round {{roundNumber}} for <strong>{{jobTitle}}</strong>.</p>
      <p><strong>Requested Time:</strong> {{interviewDate}} {{interviewTime}} ({{timeZone}})</p>
      <p><strong>Reason:</strong> {{reason}}</p>`,
    actionLabel: 'Review Reschedule Request',
  },
  INTERVIEW_FEEDBACK_SUBMITTED: {
    category: 'INTERVIEW',
    subject: 'Interview Feedback Submitted: {{candidateName}} ({{jobTitle}})',
    title: 'Interview Feedback Submitted',
    inAppMessage: '{{interviewerName}} submitted evaluation feedback for {{candidateName}} (Round {{roundNumber}} - {{jobTitle}}).',
    emailBody: `<p>Hello <strong>{{recruiterName}}</strong>,</p>
      <p>Interviewer <strong>{{interviewerName}}</strong> submitted evaluation feedback for <strong>{{candidateName}}</strong> (Round {{roundNumber}} — <strong>{{jobTitle}}</strong>).</p>
      <p><strong>Recommendation:</strong> {{recommendation}}</p>`,
    actionLabel: 'Review Evaluation',
  },
  HIRING_DECISION_CANDIDATE: {
    category: 'HIRING',
    subject: 'Hiring Update: {{jobTitle}} at {{companyName}}',
    title: 'Hiring Update: {{jobTitle}}',
    inAppMessage: 'Your application for "{{jobTitle}}" at {{companyName}} has been updated to {{applicationStatus}}.',
    emailBody: `<p>Hello <strong>{{candidateName}}</strong>,</p>
      <p>There is an important hiring update regarding your application for <strong>{{jobTitle}}</strong> at <strong>{{companyName}}</strong>.</p>
      <p><strong>Current Stage:</strong> {{applicationStatus}}</p>`,
    actionLabel: 'View Application',
  },

  // ── Admin & Governance ─────────────────────────────────────────────────────
  ADMIN_COMPANY_REVIEW_REQUIRED: {
    category: 'ADMIN',
    subject: '[Admin] Company Pending Approval: {{companyName}}',
    title: 'Company Approval Required: {{companyName}}',
    inAppMessage: '{{companyName}} was submitted by {{recruiterName}} and is awaiting verification.',
    emailBody: `<p>Hello Administrator,</p>
      <p>Company <strong>{{companyName}}</strong> has been submitted by <strong>{{recruiterName}}</strong> and requires administrative verification.</p>`,
    actionLabel: 'Review Company',
  },
  ADMIN_MODERATION_REPORT_SUBMITTED: {
    category: 'ADMIN',
    subject: '[Admin] New {{entityType}} Report: {{reason}}',
    title: 'New Moderation Report ({{entityType}})',
    inAppMessage: 'A new {{entityType}} moderation report was submitted: "{{reason}}".',
    emailBody: `<p>Hello Moderator,</p>
      <p>A new <strong>{{entityType}}</strong> report has been submitted to the moderation queue.</p>
      <ul>
        <li><strong>Reason:</strong> {{reason}}</li>
        <li><strong>Entity ID:</strong> {{entityId}}</li>
      </ul>`,
    actionLabel: 'Open Moderation Queue',
  },
  ADMIN_SUSPICIOUS_ACTIVITY_ALERT: {
    category: 'SECURITY',
    subject: '[Security Alert] Suspicious Activity Detected',
    title: 'Security Alert: {{alertTitle}}',
    inAppMessage: 'Security alert detected: {{reason}}',
    emailBody: `<p>Hello Administrator,</p>
      <p>A security or suspicious activity event was recorded on the platform:</p>
      <p><strong>{{alertTitle}}:</strong> {{reason}}</p>`,
    actionLabel: 'View Audit Logs',
  },
});

module.exports = {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_CATEGORIES,
  DELIVERY_STATUSES,
  ESSENTIAL_CATEGORIES,
  ESSENTIAL_EVENT_TYPES,
  PREFERENCE_CATEGORY_METADATA,
  BUILTIN_TEMPLATES,
  escapeHtml,
  interpolateText,
  interpolateHtml,
  htmlToPlainText,
  sanitizeActionUrl,
  buildAbsoluteUrl,
  wrapEmailLayout,
};
