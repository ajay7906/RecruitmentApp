'use strict';

const { z } = require('zod');
const { REPORT_DEFINITIONS } = require('./reports.service');

const REPORT_TYPES = Object.keys(REPORT_DEFINITIONS);
const DATE_RANGES = ['today', '7d', '30d', '90d', 'this_month', 'last_month', 'custom', 'all'];

const reportTypeParam = {
  type: z.enum(REPORT_TYPES, {
    errorMap: () => ({ message: `Invalid report type. Supported types: ${REPORT_TYPES.join(', ')}` }),
  }),
};

const baseReportFilters = {
  range: z.enum(DATE_RANGES).optional().default('all'),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  q: z.string().trim().max(150).optional(),
  role: z.string().trim().max(50).optional(),
  status: z.string().trim().max(50).optional(),
  companyId: z.string().uuid('Invalid company ID').optional(),
  jobId: z.string().uuid('Invalid job ID').optional(),
  employmentType: z.string().trim().max(50).optional(),
  workMode: z.string().trim().max(50).optional(),
  decision: z.string().trim().max(50).optional(),
};

const getReportSchema = z.object({
  params: z.object(reportTypeParam),
  query: z.object({
    ...baseReportFilters,
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

const exportReportSchema = z.object({
  params: z.object(reportTypeParam),
  query: z.object({
    ...baseReportFilters,
    format: z.enum(['csv', 'xlsx', 'json']).optional().default('csv'),
  }),
});

module.exports = {
  getReportSchema,
  exportReportSchema,
};
