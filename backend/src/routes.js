const router = require('express').Router();

router.get('/health', (_req, res) => res.json({ status: 'ok' }));
router.use('/auth', require('./modules/auth/auth.routes'));
router.use('/profile', require('./modules/profile/profile.routes'));
router.use('/companies', require('./modules/companies/companies.routes'));
router.use('/jobs', require('./modules/jobs/jobs.routes'));

module.exports = router;
