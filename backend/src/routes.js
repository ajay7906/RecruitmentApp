const router = require('express').Router();
const validate = require('./middlewares/validate');
const { authenticate } = require('./middlewares/authenticate');
const adminController = require('./modules/admin/admin.controller');
const adminValidation = require('./modules/admin/admin.validation');

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
router.post('/reports', authenticate, validate(adminValidation.createReportBody), adminController.createReport);
router.use('/admin', require('./modules/admin/admin.routes'));

module.exports = router;
