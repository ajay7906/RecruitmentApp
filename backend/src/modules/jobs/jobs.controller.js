const asyncHandler = require('../../utils/asyncHandler');
const service = require('./jobs.service');

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

// Public endpoints
exports.listPublicJobs = asyncHandler(async (req, res) => {
  const result = await service.listPublicJobs(req.query);
  ok(res, result);
});

exports.getPublicJobDetails = asyncHandler(async (req, res) => {
  const job = await service.getPublicJobDetails(req.params.id);
  ok(res, { job });
});

// Recruiter & Admin endpoints
exports.createJob = asyncHandler(async (req, res) => {
  const job = await service.createJob(req.user, req.body);
  const message =
    job.status === 'PUBLISHED'
      ? 'Job vacancy published automatically!'
      : 'Job saved in DRAFT status';
  ok(res, { job, message }, 201);
});

exports.getMyJobs = asyncHandler(async (req, res) => {
  const result = await service.getMyJobs(req.user, req.query);
  ok(res, result);
});

exports.listAdminJobs = asyncHandler(async (req, res) => {
  const result = await service.listAdminJobs(req.user, req.query);
  ok(res, result);
});

exports.getJobDetails = asyncHandler(async (req, res) => {
  const job = await service.getJobDetails(req.user, req.params.id);
  ok(res, { job });
});

exports.updateJob = asyncHandler(async (req, res) => {
  const job = await service.updateJob(req.user, req.params.id, req.body);
  ok(res, { job, message: 'Job updated successfully' });
});

exports.deleteJob = asyncHandler(async (req, res) => {
  await service.deleteJob(req.user, req.params.id);
  ok(res, { message: 'Job deleted successfully' });
});

exports.publishJob = asyncHandler(async (req, res) => {
  const job = await service.publishJob(req.user, req.params.id, req.body);
  ok(res, { job, message: 'Job published automatically!' });
});

exports.pauseJob = asyncHandler(async (req, res) => {
  const job = await service.pauseJob(req.user, req.params.id);
  ok(res, { job, message: 'Job paused' });
});

exports.resumeJob = asyncHandler(async (req, res) => {
  const job = await service.resumeJob(req.user, req.params.id);
  ok(res, { job, message: 'Job resumed and published' });
});

exports.closeJob = asyncHandler(async (req, res) => {
  const job = await service.closeJob(req.user, req.params.id);
  ok(res, { job, message: 'Job vacancy closed' });
});

exports.archiveJob = asyncHandler(async (req, res) => {
  const job = await service.archiveJob(req.user, req.params.id);
  ok(res, { job, message: 'Job archived' });
});

exports.approveJob = asyncHandler(async (req, res) => {
  const job = await service.approveJob(req.user, req.params.id, req.body?.reason);
  ok(res, { job, message: 'Job cleared and restored to PUBLISHED' });
});

exports.rejectJob = asyncHandler(async (req, res) => {
  const job = await service.rejectJob(req.user, req.params.id, req.body.reason);
  ok(res, { job, message: 'Job restricted and marked as REJECTED' });
});

exports.reportJob = asyncHandler(async (req, res) => {
  const result = await service.reportJob(req.user, req.params.id, req.body);
  ok(
    res,
    {
      ...result,
      message: 'Thank you. Your report has been submitted for moderation review.',
    },
    201
  );
});

exports.getJobModerationDetails = asyncHandler(async (req, res) => {
  const result = await service.getJobModerationDetails(req.user, req.params.id);
  ok(res, result);
});

exports.moderateJob = asyncHandler(async (req, res) => {
  const job = await service.moderateJob(req.user, req.params.id, req.body);
  const actionLabels = {
    CLEAR_FLAGS: 'Moderation flags cleared',
    PLACE_UNDER_REVIEW: 'Job placed under moderation review',
    RESTRICT_JOB: 'Job paused and restricted',
    REJECT_JOB: 'Job rejected by moderation',
    RESTORE_JOB: 'Job restored and published',
  };
  ok(res, {
    job,
    message: actionLabels[req.body.action] || 'Moderation action applied',
  });
});
