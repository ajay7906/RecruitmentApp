'use strict';

const router = require('express').Router();
const c = require('./analytics.controller');
const v = require('./analytics.validation');
const validate = require('../../middlewares/validate');
const { authenticate } = require('../../middlewares/authenticate');
const { requireRole } = require('../../middlewares/authorize');

router.use(authenticate);

// Candidate Analytics (Candidate only)
router.get(
  '/candidate',
  requireRole('candidate'),
  validate(v.candidateAnalyticsQuery),
  c.getCandidateAnalytics
);

// Recruiter Analytics (Recruiter & Admin)
router.get(
  '/recruiter',
  requireRole('recruiter', 'admin'),
  validate(v.recruiterAnalyticsQuery),
  c.getRecruiterAnalytics
);

// Company Analytics (Company Owner / Company Admin / Platform Admin)
router.get(
  '/company',
  requireRole('recruiter', 'admin'),
  validate(v.companyAnalyticsQuery),
  c.getCompanyAnalytics
);
router.get(
  '/company/:companyId',
  requireRole('recruiter', 'admin'),
  validate(v.companyAnalyticsQuery),
  c.getCompanyAnalytics
);

module.exports = router;
