'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const service = require('./analytics.service');

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

exports.getCandidateAnalytics = asyncHandler(async (req, res) => {
  const data = await service.getCandidateAnalytics(req.user, req.query);
  ok(res, data);
});

exports.getRecruiterAnalytics = asyncHandler(async (req, res) => {
  const data = await service.getRecruiterAnalytics(req.user, req.query);
  ok(res, data);
});

exports.getCompanyAnalytics = asyncHandler(async (req, res) => {
  const companyId = req.params.companyId || req.query.companyId;
  const data = await service.getCompanyAnalytics(req.user, companyId, req.query);
  ok(res, data);
});

exports.getAdminOverviewAnalytics = asyncHandler(async (req, res) => {
  const data = await service.getAdminOverviewAnalytics(req.query);
  ok(res, data);
});

exports.getAdminApplicationAnalytics = asyncHandler(async (req, res) => {
  const data = await service.getAdminApplicationAnalytics(req.query);
  ok(res, data);
});

exports.getAdminInterviewAnalytics = asyncHandler(async (req, res) => {
  const data = await service.getAdminInterviewAnalytics(req.query);
  ok(res, data);
});

exports.getAdminHiringAnalytics = asyncHandler(async (req, res) => {
  const data = await service.getAdminHiringAnalytics(req.query);
  ok(res, data);
});
