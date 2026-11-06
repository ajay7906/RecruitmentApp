const router = require('express').Router();
const c = require('./companies.controller');
const v = require('./companies.validation');
const validate = require('../../middlewares/validate');
const { authenticate } = require('../../middlewares/authenticate');
const { requireRole } = require('../../middlewares/authorize');

router.use(authenticate);

// Recruiter / Admin: Register a new company
router.post('/', requireRole('recruiter', 'admin'), validate(v.createCompany), c.registerCompany);

// Recruiter / Admin: Get companies associated with logged-in user
router.get('/my', requireRole('recruiter', 'admin'), validate(v.listCompanies), c.getMyCompanies);

// Admin: List all companies with pagination, search & status filter
router.get('/', requireRole('admin', 'recruiter'), validate(v.listCompanies), c.listCompanies);

// Get company details
router.get('/:id', requireRole('recruiter', 'admin', 'candidate'), validate(v.companyIdParam), c.getCompanyDetails);

// Update company details (Company Owner / Company Admin / System Admin)
router.put('/:id', requireRole('recruiter', 'admin'), validate(v.updateCompany), c.updateCompanyDetails);

// Upload or update company logo
router.patch('/:id/logo', requireRole('recruiter', 'admin'), validate(v.updateLogo), c.updateCompanyLogo);

// Submit company for approval (Company Owner / Company Admin)
router.post('/:id/submit', requireRole('recruiter', 'admin'), validate(v.companyIdParam), c.submitCompany);

// Admin approval workflow transitions (System Admin only)
router.patch('/:id/approve', requireRole('admin'), validate(v.companyIdParam), c.approveCompany);
router.patch('/:id/reject', requireRole('admin'), validate(v.reasonBody), c.rejectCompany);
router.patch('/:id/suspend', requireRole('admin'), validate(v.reasonBody), c.suspendCompany);

// Company membership & ownership management
router.post('/:id/members', requireRole('recruiter', 'admin'), validate(v.addMember), c.addMember);
router.patch(
  '/:id/members/:membershipId',
  requireRole('recruiter', 'admin'),
  validate(v.updateMemberRole),
  c.updateMemberRole
);
router.delete(
  '/:id/members/:membershipId',
  requireRole('recruiter', 'admin'),
  validate(v.removeMember),
  c.removeMember
);

module.exports = router;
