const router = require('express').Router();
const c = require('./jobs.controller');
const v = require('./jobs.validation');
const validate = require('../../middlewares/validate');
const { authenticate } = require('../../middlewares/authenticate');
const { requireRole } = require('../../middlewares/authorize');

// ── Public Candidate Job Discovery Routes (No auth required) ──────────
router.get('/public', validate(v.listPublicJobs), c.listPublicJobs);
router.get('/public/:id', validate(v.jobIdParam), c.getPublicJobDetails);

// ── Authenticated Routes ──────────────────────────────────────────────
router.use(authenticate);

// Default GET /jobs -> returns public jobs for candidates, or accessible jobs for recruiters/admins
router.get('/', validate(v.listPublicJobs), c.listPublicJobs);

// Recruiter: Get accessible jobs & dashboard stats
router.get('/my', requireRole('recruiter', 'admin'), validate(v.listRecruiterJobs), c.getMyJobs);

// Admin: List all jobs requiring administration
router.get('/admin', requireRole('admin'), validate(v.listRecruiterJobs), c.listAdminJobs);

// Create a new job in DRAFT status
router.post('/', requireRole('recruiter', 'admin'), validate(v.createJob), c.createJob);

// Get single job details (role-aware)
router.get('/:id', validate(v.jobIdParam), c.getJobDetails);

// Update job details
router.put('/:id', requireRole('recruiter', 'admin'), validate(v.updateJob), c.updateJob);

// Delete job (only DRAFT, REJECTED, ARCHIVED)
router.delete('/:id', requireRole('recruiter', 'admin'), validate(v.jobIdParam), c.deleteJob);

// Lifecycle transitions
router.post('/:id/publish', requireRole('recruiter', 'admin'), validate(v.publishJob), c.publishJob);
router.post('/:id/pause', requireRole('recruiter', 'admin'), validate(v.jobIdParam), c.pauseJob);
router.post('/:id/resume', requireRole('recruiter', 'admin'), validate(v.jobIdParam), c.resumeJob);
router.post('/:id/close', requireRole('recruiter', 'admin'), validate(v.jobIdParam), c.closeJob);
router.post('/:id/archive', requireRole('recruiter', 'admin'), validate(v.jobIdParam), c.archiveJob);

// Admin approval workflow transitions
router.post('/:id/approve', requireRole('admin'), validate(v.jobIdParam), c.approveJob);
router.post('/:id/reject', requireRole('admin'), validate(v.rejectJob), c.rejectJob);

module.exports = router;
