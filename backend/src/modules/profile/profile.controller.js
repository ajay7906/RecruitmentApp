const asyncHandler = require('../../utils/asyncHandler');
const service = require('./profile.service');

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

// candidate
exports.getCandidate = asyncHandler(async (req, res) =>
  ok(res, { profile: await service.getCandidateProfile(req.user.id) }));

exports.updateCandidate = asyncHandler(async (req, res) =>
  ok(res, { profile: await service.updateCandidateProfile(req.user.id, req.body) }));

// recruiter
exports.getRecruiter = asyncHandler(async (req, res) =>
  ok(res, { profile: await service.getRecruiter(req.user.id) }));

exports.updateRecruiter = asyncHandler(async (req, res) =>
  ok(res, { profile: await service.updateRecruiterProfile(req.user.id, req.body) }));

// company
exports.createCompany = asyncHandler(async (req, res) =>
  ok(res, { company: await service.createCompanyForRecruiter(req.user.id, req.body) }, 201));

exports.updateCompany = asyncHandler(async (req, res) =>
  ok(res, { company: await service.updateCompany(req.user.id, req.params.id, req.body) }));

exports.searchCompanies = asyncHandler(async (req, res) =>
  ok(res, { companies: await service.searchCompanies(req.query.q) }));