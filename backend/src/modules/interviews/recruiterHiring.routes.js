const router = require('express').Router();
const c = require('./interviews.controller');
const v = require('./interviews.validation');
const validate = require('../../middlewares/validate');
const { authenticate } = require('../../middlewares/authenticate');
const { requireRole } = require('../../middlewares/authorize');

router.use(authenticate);
router.use(requireRole('recruiter', 'admin'));

router.get('/stats', validate(v.statsQuery), c.getHiringStats);

module.exports = router;
