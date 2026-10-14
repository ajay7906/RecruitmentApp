const router = require('express').Router();
const c = require('./profile.controller');
const v = require('./profile.validation');
const validate = require('../../middlewares/validate');
const { authenticate } = require('../../middlewares/authenticate');
const { requireRole } = require('../../middlewares/authorize');

router.use(authenticate);

// candidate
router.get('/candidate/me', requireRole('candidate'), c.getCandidate);
router.put('/candidate/me', requireRole('candidate'), validate(v.updateCandidate), c.updateCandidate);

// recruiter
router.get('/recruiter/me', requireRole('recruiter'), c.getRecruiter);
router.put('/recruiter/me', requireRole('recruiter'), validate(v.updateRecruiter), c.updateRecruiter);

// company (recruiter only)
router.get('/companies', requireRole('recruiter'), c.searchCompanies);
router.post('/companies', requireRole('recruiter'), validate(v.createCompany), c.createCompany);
router.patch('/companies/:id', requireRole('recruiter'), validate(v.updateCompany), c.updateCompany);

module.exports = router;