const router = require('express').Router();

router.get('/health', (_req, res) => res.json({ status: 'ok' }));
router.use('/auth', require('./modules/auth/auth.routes'));
router.use('/profile', require('./modules/profile/profile.routes'));
router.use('/candidate/interviews', require('./modules/interviews/candidateInterviews.routes'));
router.use('/candidate', require('./modules/candidate-data/candidateData.routes'));
router.use('/companies', require('./modules/companies/companies.routes'));
router.use('/jobs', require('./modules/jobs/jobs.routes'));
router.use('/applications', require('./modules/applications/applications.routes'));
router.use('/recruiter/applications', require('./modules/applications/recruiterApplications.routes'));
router.use('/recruiter/interviews', require('./modules/interviews/recruiterInterviews.routes'));
router.use('/recruiter/hiring', require('./modules/interviews/recruiterHiring.routes'));
router.use('/notifications', require('./modules/notifications/notifications.routes'));
router.use('/analytics', require('./modules/analytics/analytics.routes'));
router.use('/reports', require('./modules/reports/reports.routes'));
router.use('/admin', require('./modules/admin/admin.routes'));

module.exports = router;
