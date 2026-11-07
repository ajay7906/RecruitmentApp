'use strict';

const router = require('express').Router();
const c = require('./reports.controller');
const v = require('./reports.validation');
const validate = require('../../middlewares/validate');
const { authenticate } = require('../../middlewares/authenticate');
const adminController = require('../admin/admin.controller');
const adminValidation = require('../admin/admin.validation');

router.use(authenticate);

// Submit moderation report (User / Company / Job abuse report)
router.post('/', validate(adminValidation.createReportBody), adminController.createReport);

// List available business reports for current user's role & permissions
router.get('/', c.listAvailableReports);
router.get('/catalog', c.listAvailableReports);

// Export filtered report (CSV, XLSX, JSON)
router.get('/:type/export', validate(v.exportReportSchema), c.exportReport);

// Generate & paginate report
router.get('/:type', validate(v.getReportSchema), c.getReport);

module.exports = router;
