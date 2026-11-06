const router = require('express').Router();
const c = require('./interviews.controller');
const v = require('./interviews.validation');
const validate = require('../../middlewares/validate');
const { authenticate } = require('../../middlewares/authenticate');
const { requireRole } = require('../../middlewares/authorize');

router.use(authenticate);
router.use(requireRole('candidate'));

router.get('/', validate(v.listCandidateInterviews), c.listCandidateInterviews);
router.get('/:id', validate(v.interviewIdParam), c.getCandidateInterviewById);
router.post('/:id/confirm', validate(v.interviewIdParam), c.confirmCandidateAttendance);
router.post(
  '/:id/reschedule-request',
  validate(v.candidateRescheduleRequest),
  c.requestCandidateReschedule
);
router.get('/:id/history', validate(v.interviewIdParam), c.getCandidateInterviewHistory);

module.exports = router;
