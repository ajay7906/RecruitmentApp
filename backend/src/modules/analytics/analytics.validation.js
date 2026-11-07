'use strict';

const { z } = require('zod');

const DATE_RANGES = ['today', '7d', '30d', '90d', 'this_month', 'last_month', 'custom', 'all'];

const baseAnalyticsQuery = {
  range: z.enum(DATE_RANGES).optional().default('30d'),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
};

const candidateAnalyticsQuery = z.object({
  query: z.object({
    ...baseAnalyticsQuery,
  }),
});

const recruiterAnalyticsQuery = z.object({
  query: z.object({
    ...baseAnalyticsQuery,
    companyId: z.string().uuid('Invalid company ID').optional(),
    jobId: z.string().uuid('Invalid job ID').optional(),
    jobStatus: z.string().trim().optional(),
    applicationStatus: z.string().trim().optional(),
  }),
});

const companyAnalyticsQuery = z.object({
  params: z
    .object({
      companyId: z.string().uuid('Invalid company ID').optional(),
    })
    .optional(),
  query: z.object({
    ...baseAnalyticsQuery,
    companyId: z.string().uuid('Invalid company ID').optional(),
  }),
});

const adminAnalyticsQuery = z.object({
  query: z.object({
    ...baseAnalyticsQuery,
  }),
});

module.exports = {
  candidateAnalyticsQuery,
  recruiterAnalyticsQuery,
  companyAnalyticsQuery,
  adminAnalyticsQuery,
};
