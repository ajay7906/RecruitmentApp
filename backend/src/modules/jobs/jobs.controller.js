'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const service = require('./jobs.service');
const notificationsService = require('../notifications/notifications.service');

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
  if (job.status === 'PUBLISHED') {
    notificationsService
      .notifyUser({
        recipientId: req.user.id,
        templateKey: 'JOB_PUBLISHED',
        eventType: 'JOB_PUBLISHED',
        category: 'JOB',
        variables: {
          recruiterName: req.user.fullName || 'Recruiter',
          jobTitle: job.title,
          companyName: job.company?.name || 'your company',
        },
        relatedEntityType: 'JOB',
        relatedEntityId: job.id,
        actionUrl: `/app/jobs/${job.id}/manage`,
        idempotencyKey: `job-published:${job.id}`,
      })
      .catch(() => {});
  }
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
  notificationsService
    .notifyUser({
      recipientId: job.createdById || req.user.id,
      templateKey: 'JOB_PUBLISHED',
      eventType: 'JOB_PUBLISHED',
      category: 'JOB',
      variables: {
        recruiterName: req.user.fullName || 'Recruiter',
        jobTitle: job.title,
        companyName: job.company?.name || 'your company',
      },
      relatedEntityType: 'JOB',
      relatedEntityId: job.id,
      actionUrl: `/app/jobs/${job.id}/manage`,
    })
    .catch(() => {});
  ok(res, { job, message: 'Job published automatically!' });
});

exports.pauseJob = asyncHandler(async (req, res) => {
  const job = await service.pauseJob(req.user, req.params.id);
  notificationsService
    .notifyUser({
      recipientId: job.createdById || req.user.id,
      templateKey: 'JOB_PAUSED',
      eventType: 'JOB_PAUSED',
      category: 'JOB',
      variables: {
        recruiterName: req.user.fullName || 'Recruiter',
        jobTitle: job.title,
        companyName: job.company?.name || 'your company',
      },
      relatedEntityType: 'JOB',
      relatedEntityId: job.id,
      actionUrl: `/app/jobs/${job.id}/manage`,
    })
    .catch(() => {});
  ok(res, { job, message: 'Job paused' });
});

exports.resumeJob = asyncHandler(async (req, res) => {
  const job = await service.resumeJob(req.user, req.params.id);
  notificationsService
    .notifyUser({
      recipientId: job.createdById || req.user.id,
      templateKey: 'JOB_PUBLISHED',
      eventType: 'JOB_RESUMED',
      category: 'JOB',
      variables: {
        recruiterName: req.user.fullName || 'Recruiter',
        jobTitle: job.title,
        companyName: job.company?.name || 'your company',
      },
      relatedEntityType: 'JOB',
      relatedEntityId: job.id,
      actionUrl: `/app/jobs/${job.id}/manage`,
    })
    .catch(() => {});
  ok(res, { job, message: 'Job resumed and published' });
});

exports.closeJob = asyncHandler(async (req, res) => {
  const job = await service.closeJob(req.user, req.params.id);
  notificationsService
    .notifyUser({
      recipientId: job.createdById || req.user.id,
      templateKey: 'JOB_CLOSED',
      eventType: 'JOB_CLOSED',
      category: 'JOB',
      variables: {
        recruiterName: req.user.fullName || 'Recruiter',
        jobTitle: job.title,
        companyName: job.company?.name || 'your company',
        reason: '',
      },
      relatedEntityType: 'JOB',
      relatedEntityId: job.id,
      actionUrl: `/app/jobs/${job.id}/manage`,
    })
    .catch(() => {});
  ok(res, { job, message: 'Job vacancy closed' });
});

exports.archiveJob = asyncHandler(async (req, res) => {
  const job = await service.archiveJob(req.user, req.params.id);
  ok(res, { job, message: 'Job archived' });
});

exports.approveJob = asyncHandler(async (req, res) => {
  const job = await service.approveJob(req.user, req.params.id, req.body?.reason);
  if (job.createdById) {
    notificationsService
      .notifyUser({
        recipientId: job.createdById,
        templateKey: 'JOB_MODERATION_RESOLVED',
        eventType: 'JOB_MODERATION_RESOLVED',
        category: 'JOB',
        variables: {
          jobTitle: job.title,
          companyName: job.company?.name || 'your company',
        },
        relatedEntityType: 'JOB',
        relatedEntityId: job.id,
        actionUrl: `/app/jobs/${job.id}/manage`,
      })
      .catch(() => {});
  }
  ok(res, { job, message: 'Job cleared and restored to PUBLISHED' });
});

exports.rejectJob = asyncHandler(async (req, res) => {
  const job = await service.rejectJob(req.user, req.params.id, req.body.reason);
  if (job.createdById) {
    notificationsService
      .notifyUser({
        recipientId: job.createdById,
        templateKey: 'JOB_RESTRICTED',
        eventType: 'JOB_RESTRICTED',
        category: 'JOB',
        variables: {
          jobTitle: job.title,
          companyName: job.company?.name || 'your company',
          moderationStatus: 'REJECTED',
          reason: req.body.reason,
        },
        relatedEntityType: 'JOB',
        relatedEntityId: job.id,
        actionUrl: `/app/jobs/${job.id}/moderation`,
      })
      .catch(() => {});
  }
  ok(res, { job, message: 'Job restricted and marked as REJECTED' });
});

exports.reportJob = asyncHandler(async (req, res) => {
  const result = await service.reportJob(req.user, req.params.id, req.body);
  notificationsService
    .notifyAdminsByPermission({
      permission: 'reports.read',
      templateKey: 'ADMIN_MODERATION_REPORT_SUBMITTED',
      eventType: 'ADMIN_MODERATION_REPORT_SUBMITTED',
      category: 'ADMIN',
      variables: {
        entityType: 'JOB',
        entityId: req.params.id,
        reason: req.body.category,
      },
      relatedEntityType: 'JOB',
      relatedEntityId: req.params.id,
      actionUrl: '/admin/reports',
    })
    .catch(() => {});
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
  ok(res, { job, message: 'Moderation decision applied successfully' });
});

exports.listModerationQueue = asyncHandler(async (req, res) => {
  const result = await service.listModerationQueue(req.user, req.query);
  ok(res, result);
});
