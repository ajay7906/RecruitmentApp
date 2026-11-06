const asyncHandler = require('../../utils/asyncHandler');
const service = require('./applications.service');

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

// ── Candidate Endpoints ──────────────────────────────────────────────────

exports.submitApplication = asyncHandler(async (req, res) => {
  const application = await service.submitApplication(req.user, req.body);
  ok(
    res,
    {
      application,
      message: 'Your job application has been submitted successfully!',
    },
    201
  );
});

exports.checkJobApplication = asyncHandler(async (req, res) => {
  const result = await service.checkApplicationStatusForJob(req.user, req.params.jobId);
  ok(res, result);
});

exports.getMyApplications = asyncHandler(async (req, res) => {
  const result = await service.getMyApplications(req.user, req.query);
  ok(res, result);
});

exports.getCandidateApplicationDetails = asyncHandler(async (req, res) => {
  const application = await service.getCandidateApplicationDetails(req.user, req.params.id);
  ok(res, { application });
});

exports.getCandidateApplicationHistory = asyncHandler(async (req, res) => {
  const history = await service.getCandidateApplicationHistory(req.user, req.params.id);
  ok(res, { history });
});

exports.withdrawApplication = asyncHandler(async (req, res) => {
  const application = await service.withdrawApplication(req.user, req.params.id, req.body);
  ok(res, {
    application,
    message: 'Your application has been withdrawn.',
  });
});

// ── Recruiter / Admin Endpoints ──────────────────────────────────────────

exports.listRecruiterApplications = asyncHandler(async (req, res) => {
  const result = await service.listRecruiterApplications(req.user, req.query);
  ok(res, result);
});

exports.getRecruiterStats = asyncHandler(async (req, res) => {
  const stats = await service.getRecruiterDashboardStats(req.user, req.query);
  ok(res, { stats });
});

exports.getRecruiterApplicationDetails = asyncHandler(async (req, res) => {
  const application = await service.getRecruiterApplicationDetails(req.user, req.params.id);
  ok(res, { application });
});

exports.updateApplicationStatus = asyncHandler(async (req, res) => {
  const application = await service.updateApplicationStatus(req.user, req.params.id, req.body);
  ok(res, {
    application,
    message: `Application status updated to ${application.status.replace(/_/g, ' ')}.`,
  });
});

exports.addRecruiterNote = asyncHandler(async (req, res) => {
  const application = await service.addRecruiterNote(req.user, req.params.id, req.body);
  ok(
    res,
    {
      application,
      message: 'Internal note added.',
    },
    201
  );
});

// ── Authorized Resume Streaming (Candidate Owner OR Authorized Recruiter) ─

exports.getApplicationResume = asyncHandler(async (req, res) => {
  const { buffer, mimeType, fileName } = await service.getApplicationResumeStream(
    req.user,
    req.params.id
  );
  const disposition = req.query.download === 'true' ? 'attachment' : 'inline';
  res.setHeader('Content-Type', mimeType);
  res.setHeader(
    'Content-Disposition',
    `${disposition}; filename="${encodeURIComponent(fileName)}"`
  );
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
});
