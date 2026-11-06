const router = require('express').Router();
const c = require('./applications.controller');
const v = require('./applications.validation');
const validate = require('../../middlewares/validate');
const { authenticate } = require('../../middlewares/authenticate');
const { requireRole } = require('../../middlewares/authorize');

router.use(authenticate);
router.use(requireRole('recruiter', 'admin'));

router.get(
  '/',
  validate(v.listRecruiterApplications),
  c.listRecruiterApplications
);

router.get(
  '/stats',
  validate(v.recruiterStatsQuery),
  c.getRecruiterStats
);

router.get(
  '/:id',
  validate(v.applicationIdParam),
  c.getRecruiterApplicationDetails
);

router.patch(
  '/:id/status',
  validate(v.updateApplicationStatus),
  c.updateApplicationStatus
);

router.post(
  '/:id/notes',
  validate(v.addRecruiterNote),
  c.addRecruiterNote
);

router.get(
  '/:id/resume',
  validate(v.applicationIdParam),
  c.getApplicationResume
);

module.exports = router;
