const router = require('express').Router();

router.get('/health', (_req, res) => res.json({ status: 'ok' }));
router.use('/auth', require('./modules/auth/auth.routes'));
// Next modules plug in here:
// router.use('/candidates', require('./modules/candidates/candidates.routes'));
// router.use('/recruiters', require('./modules/recruiters/recruiters.routes'));
// router.use('/jobs',       require('./modules/jobs/jobs.routes'));

module.exports = router;
