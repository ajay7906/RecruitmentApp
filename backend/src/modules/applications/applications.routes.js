const router = require('express').Router();
const c = require('./applications.controller');
const v = require('./applications.validation');
const validate = require('../../middlewares/validate');
const { authenticate } = require('../../middlewares/authenticate');
const { requireRole } = require('../../middlewares/authorize');

router.use(authenticate);

// Candidate endpoints
router.post(
  '/',
  requireRole('candidate'),
  validate(v.submitApplication),
  c.submitApplication
);

router.get(
  '/my',
  requireRole('candidate'),
  validate(v.listCandidateApplications),
  c.getMyApplications
);

router.get(
  '/check/:jobId',
  requireRole('candidate'),
  validate(v.jobIdParam),
  c.checkJobApplication
);

// Recruiter convenience aliases under /applications/recruiter/*
router.get(
  '/recruiter',
  requireRole('recruiter', 'admin'),
  validate(v.listRecruiterApplications),
  c.listRecruiterApplications
);

router.get(
  '/recruiter/stats',
  requireRole('recruiter', 'admin'),
  validate(v.recruiterStatsQuery),
  c.getRecruiterStats
);

router.get(
  '/recruiter/:id',
  requireRole('recruiter', 'admin'),
  validate(v.applicationIdParam),
  c.getRecruiterApplicationDetails
);

router.patch(
  '/recruiter/:id/status',
  requireRole('recruiter', 'admin'),
  validate(v.updateApplicationStatus),
  c.updateApplicationStatus
);

router.post(
  '/recruiter/:id/notes',
  requireRole('recruiter', 'admin'),
  validate(v.addRecruiterNote),
  c.addRecruiterNote
);

router.get(
  '/recruiter/:id/resume',
  requireRole('recruiter', 'admin'),
  validate(v.applicationIdParam),
  c.getApplicationResume
);

// Candidate / Shared by ID endpoints
router.get(
  '/:id',
  requireRole('candidate'),
  validate(v.applicationIdParam),
  c.getCandidateApplicationDetails
);

router.post(
  '/:id/withdraw',
  requireRole('candidate'),
  validate(v.withdrawApplication),
  c.withdrawApplication
);

router.get(
  '/:id/history',
  requireRole('candidate'),
  validate(v.applicationIdParam),
  c.getCandidateApplicationHistory
);

router.get(
  '/:id/resume',
  requireRole('candidate', 'recruiter', 'admin'),
  validate(v.applicationIdParam),
  c.getApplicationResume
);

module.exports = router;
