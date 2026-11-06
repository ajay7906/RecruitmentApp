const nodemailer = require('nodemailer');
const env = require('../config/env');

const transporter = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : null;

async function send({ to, subject, html }) {
  if (!to) return;
  if (!transporter) {
    console.log(`\n[DEV EMAIL] to=${to}\nsubject=${subject}\n${html}\n`);
    return;
  }
  await transporter.sendMail({ from: env.MAIL_FROM, to, subject, html });
}

function sendAsync(payload) {
  Promise.resolve()
    .then(() => send(payload))
    .catch((err) => {
      console.error(`[NOTIFICATION FAILURE] Failed to send email to ${payload?.to}:`, err?.message || err);
    });
}

exports.sendVerificationEmail = (to, token) => {
  const link = `${env.CLIENT_URL}/verify-email?token=${token}`;
  return send({
    to,
    subject: 'Verify your email',
    html: `<p>Verify your email: <a href="${link}">${link}</a></p><p>Valid for 24 hours.</p>`,
  });
};

exports.sendPasswordResetEmail = (to, token) => {
  const link = `${env.CLIENT_URL}/reset-password?token=${token}`;
  return send({
    to,
    subject: 'Reset your password',
    html: `<p>Reset your password: <a href="${link}">${link}</a></p><p>Valid for 1 hour.</p>`,
  });
};

exports.notifyCandidateInterviewScheduled = ({ to, candidateName, jobTitle, companyName, roundNumber, interviewType, startTime, endTime, timeZone, interviewMode, meetingLink, location }) => {
  sendAsync({
    to,
    subject: `Interview Scheduled: Round ${roundNumber} (${interviewType}) - ${jobTitle} at ${companyName}`,
    html: `<p>Hello ${candidateName || 'Candidate'},</p>
      <p>Your <strong>Round ${roundNumber}: ${interviewType}</strong> interview for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been scheduled.</p>
      <ul>
        <li><strong>Start:</strong> ${new Date(startTime).toUTCString()} (${timeZone})</li>
        <li><strong>End:</strong> ${new Date(endTime).toUTCString()} (${timeZone})</li>
        <li><strong>Mode:</strong> ${interviewMode}</li>
        ${meetingLink ? `<li><strong>Meeting Link:</strong> <a href="${meetingLink}">${meetingLink}</a></li>` : ''}
        ${location ? `<li><strong>Location:</strong> ${location}</li>` : ''}
      </ul>`,
  });
};

exports.notifyCandidateInterviewRescheduled = ({ to, candidateName, jobTitle, companyName, roundNumber, startTime, endTime, timeZone, reason }) => {
  sendAsync({
    to,
    subject: `Interview Rescheduled: Round ${roundNumber} - ${jobTitle} at ${companyName}`,
    html: `<p>Hello ${candidateName || 'Candidate'},</p>
      <p>Your Round ${roundNumber} interview for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been rescheduled.</p>
      <ul>
        <li><strong>New Start:</strong> ${new Date(startTime).toUTCString()} (${timeZone})</li>
        <li><strong>New End:</strong> ${new Date(endTime).toUTCString()} (${timeZone})</li>
        ${reason ? `<li><strong>Reason:</strong> ${reason}</li>` : ''}
      </ul>`,
  });
};

exports.notifyCandidateInterviewCancelled = ({ to, candidateName, jobTitle, companyName, roundNumber, reason }) => {
  sendAsync({
    to,
    subject: `Interview Cancelled: Round ${roundNumber} - ${jobTitle} at ${companyName}`,
    html: `<p>Hello ${candidateName || 'Candidate'},</p>
      <p>Your Round ${roundNumber} interview for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been cancelled.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}`,
  });
};

exports.notifyInterviewerAssigned = ({ to, interviewerName, candidateName, jobTitle, companyName, roundNumber, interviewType, role, startTime, timeZone }) => {
  sendAsync({
    to,
    subject: `New Interview Assignment: ${candidateName} (${jobTitle})`,
    html: `<p>Hello ${interviewerName || 'Interviewer'},</p>
      <p>You have been assigned as <strong>${role}</strong> for <strong>Round ${roundNumber}: ${interviewType}</strong> with candidate <strong>${candidateName}</strong> for <strong>${jobTitle}</strong> (${companyName}).</p>
      <p><strong>Scheduled Time:</strong> ${new Date(startTime).toUTCString()} (${timeZone})</p>`,
  });
};

exports.notifyRecruiterRescheduleRequest = ({ to, candidateName, jobTitle, roundNumber, requestedStartTime, timeZone, reason }) => {
  sendAsync({
    to,
    subject: `Reschedule Request from ${candidateName} (Round ${roundNumber} - ${jobTitle})`,
    html: `<p>Candidate <strong>${candidateName}</strong> has requested to reschedule Round ${roundNumber} for <strong>${jobTitle}</strong>.</p>
      <ul>
        <li><strong>Requested Time:</strong> ${new Date(requestedStartTime).toUTCString()} (${timeZone})</li>
        <li><strong>Reason:</strong> ${reason}</li>
      </ul>`,
  });
};

exports.notifyRecruiterFeedbackSubmitted = ({ to, interviewerName, candidateName, jobTitle, roundNumber, recommendation }) => {
  sendAsync({
    to,
    subject: `Interview Feedback Submitted: ${candidateName} (Round ${roundNumber})`,
    html: `<p><strong>${interviewerName}</strong> submitted evaluation feedback for <strong>${candidateName}</strong> (Round ${roundNumber} - ${jobTitle}).</p>
      <p><strong>Recommendation:</strong> ${recommendation}</p>`,
  });
};

exports.notifyCandidateHiringDecision = ({ to, candidateName, jobTitle, companyName, decision, newApplicationStatus }) => {
  sendAsync({
    to,
    subject: `Application Update: ${jobTitle} at ${companyName}`,
    html: `<p>Hello ${candidateName || 'Candidate'},</p>
      <p>There is an update on your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong>.</p>
      <p><strong>Current Stage:</strong> ${newApplicationStatus || decision}</p>`,
  });
};
