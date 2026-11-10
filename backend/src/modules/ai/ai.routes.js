const router = require('express').Router();
const { authenticate } = require('../../middlewares/authenticate');
const { requireRole } = require('../../middlewares/authorize');
const controller = require('./ai.controller');

router.use(authenticate);

// Recruiter / Admin AI Matching & Ranking endpoints
router.post('/jobs/:jobId/match', requireRole('recruiter', 'admin'), controller.startJobMatching);
router.get('/matching/:matchingId', requireRole('recruiter', 'admin'), controller.getMatchingStatus);
router.post('/matching/:matchingId/retry', requireRole('recruiter', 'admin'), controller.retryMatching);
router.post('/jobs/:jobId/rank', requireRole('recruiter', 'admin'), controller.rankCandidatesForJob);
router.get('/jobs/:jobId/ranking', requireRole('recruiter', 'admin'), controller.getJobRanking);

// Job Recommendations & Resume AI Status
router.post('/recommendations', requireRole('candidate', 'recruiter', 'admin'), controller.recommendJobs);
router.get('/resumes/:resumeId/status', requireRole('candidate', 'recruiter', 'admin'), controller.getResumeProcessingStatus);

module.exports = router;
