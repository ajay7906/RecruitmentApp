const router = require('express').Router();
const c = require('./interviews.controller');
const v = require('./interviews.validation');
const validate = require('../../middlewares/validate');
const { authenticate } = require('../../middlewares/authenticate');
const { requireRole } = require('../../middlewares/authorize');

router.use(authenticate);
router.use(requireRole('recruiter', 'admin'));

// Dashboard stats
router.get('/stats', validate(v.statsQuery), c.getInterviewStats);
router.get('/hiring/stats', validate(v.statsQuery), c.getHiringStats);

// Interview CRUD & lifecycle
router.post('/', validate(v.createInterview), c.createInterview);
router.get('/', validate(v.listRecruiterInterviews), c.listRecruiterInterviews);
router.get('/:id', validate(v.interviewIdParam), c.getRecruiterInterviewById);
router.put('/:id', validate(v.updateInterview), c.updateInterview);
router.post('/:id/reschedule', validate(v.rescheduleInterview), c.rescheduleInterview);
router.post('/:id/cancel', validate(v.cancelInterview), c.cancelInterview);
router.post('/:id/complete', validate(v.completeInterview), c.completeInterview);

// Interviewer management
router.get('/:id/interviewers', validate(v.interviewIdParam), c.listInterviewers);
router.post('/:id/interviewers', validate(v.assignInterviewers), c.assignInterviewers);
router.delete(
  '/:id/interviewers/:assignmentId',
  validate(v.removeInterviewer),
  c.removeInterviewer
);

// Feedback & evaluation
router.get('/:id/feedback', validate(v.interviewIdParam), c.getInterviewFeedback);
router.post('/:id/feedback', validate(v.submitFeedback), c.submitFeedback);
router.put('/:id/feedback/:feedbackId', validate(v.updateFeedback), c.updateFeedback);

module.exports = router;
