'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const service = require('./admin.service');

// ---------------- Dashboard ----------------
exports.getDashboardStats = asyncHandler(async (req, res) => {
  const data = await service.getDashboardStats(req.query);
  res.json({ success: true, data });
});

exports.getDashboardActivities = asyncHandler(async (req, res) => {
  const data = await service.listPlatformActivities(req.query);
  res.json({ success: true, data });
});

// ---------------- Users ----------------
exports.listUsers = asyncHandler(async (req, res) => {
  const data = await service.listUsers(req.user, req.query);
  res.json({ success: true, data });
});

exports.getUserDetails = asyncHandler(async (req, res) => {
  const data = await service.getUserDetails(req.user, req.params.id);
  res.json({ success: true, data });
});

exports.updateUser = asyncHandler(async (req, res) => {
  const data = await service.updateUser(req.user, req.params.id, req.body, req);
  res.json({ success: true, data });
});

exports.updateUserStatus = asyncHandler(async (req, res) => {
  const data = await service.updateUserStatus(req.user, req.params.id, req.body, req);
  res.json({ success: true, data });
});

exports.getUserActivities = asyncHandler(async (req, res) => {
  const data = await service.getUserActivities(req.params.id, req.query);
  res.json({ success: true, data });
});

// ---------------- Companies ----------------
exports.listCompanies = asyncHandler(async (req, res) => {
  const data = await service.listCompanies(req.user, req.query);
  res.json({ success: true, data });
});

exports.getCompanyDetails = asyncHandler(async (req, res) => {
  const data = await service.getCompanyDetails(req.user, req.params.id);
  res.json({ success: true, data });
});

exports.approveCompany = asyncHandler(async (req, res) => {
  const data = await service.approveCompany(req.user, req.params.id, req.body, req);
  res.json({ success: true, data });
});

exports.rejectCompany = asyncHandler(async (req, res) => {
  const data = await service.rejectCompany(req.user, req.params.id, req.body, req);
  res.json({ success: true, data });
});

exports.suspendCompany = asyncHandler(async (req, res) => {
  const data = await service.suspendCompany(req.user, req.params.id, req.body, req);
  res.json({ success: true, data });
});

exports.activateCompany = asyncHandler(async (req, res) => {
  const data = await service.activateCompany(req.user, req.params.id, req.body, req);
  res.json({ success: true, data });
});

// ---------------- Jobs ----------------
exports.listJobs = asyncHandler(async (req, res) => {
  const data = await service.listJobs(req.user, req.query);
  res.json({ success: true, data });
});

exports.getJobDetails = asyncHandler(async (req, res) => {
  const data = await service.getJobDetails(req.user, req.params.id);
  res.json({ success: true, data });
});

exports.approveJob = asyncHandler(async (req, res) => {
  const data = await service.approveJob(req.user, req.params.id, req.body, req);
  res.json({ success: true, data });
});

exports.rejectJob = asyncHandler(async (req, res) => {
  const data = await service.rejectJob(req.user, req.params.id, req.body, req);
  res.json({ success: true, data });
});

exports.closeJob = asyncHandler(async (req, res) => {
  const data = await service.closeJob(req.user, req.params.id, req.body, req);
  res.json({ success: true, data });
});

exports.suspendJob = asyncHandler(async (req, res) => {
  const data = await service.suspendJob(req.user, req.params.id, req.body, req);
  res.json({ success: true, data });
});

exports.flagJob = asyncHandler(async (req, res) => {
  const data = await service.flagJob(req.user, req.params.id, req.body, req);
  res.json({ success: true, data });
});

// ---------------- Applications ----------------
exports.listApplications = asyncHandler(async (req, res) => {
  const data = await service.listApplications(req.user, req.query);
  res.json({ success: true, data });
});

exports.getApplicationDetails = asyncHandler(async (req, res) => {
  const data = await service.getApplicationDetails(req.user, req.params.id);
  res.json({ success: true, data });
});

// ---------------- Audit Logs & Activities ----------------
exports.listAuditLogs = asyncHandler(async (req, res) => {
  const data = await service.listAuditLogs(req.query);
  res.json({ success: true, data });
});

exports.listActivities = asyncHandler(async (req, res) => {
  const data = await service.listPlatformActivities(req.query);
  res.json({ success: true, data });
});

// ---------------- Reports ----------------
exports.createReport = asyncHandler(async (req, res) => {
  const data = await service.createReport(req.user, req.body);
  res.status(201).json({ success: true, data });
});

exports.listReports = asyncHandler(async (req, res) => {
  const data = await service.listReports(req.query);
  res.json({ success: true, data });
});

exports.getReportDetails = asyncHandler(async (req, res) => {
  const data = await service.getReportDetails(req.params.id);
  res.json({ success: true, data });
});

exports.updateReportStatus = asyncHandler(async (req, res) => {
  const data = await service.updateReportStatus(req.user, req.params.id, req.body, req);
  res.json({ success: true, data });
});

exports.assignReport = asyncHandler(async (req, res) => {
  const data = await service.assignReport(req.user, req.params.id, req.body, req);
  res.json({ success: true, data });
});

exports.addReportNote = asyncHandler(async (req, res) => {
  const data = await service.addReportNote(req.user, req.params.id, req.body, req);
  res.status(201).json({ success: true, data });
});

// ---------------- Analytics ----------------
exports.getUserAnalytics = asyncHandler(async (req, res) => {
  const data = await service.getUserAnalytics(req.query);
  res.json({ success: true, data });
});

exports.getCompanyAnalytics = asyncHandler(async (req, res) => {
  const data = await service.getCompanyAnalytics(req.query);
  res.json({ success: true, data });
});

exports.getJobAnalytics = asyncHandler(async (req, res) => {
  const data = await service.getJobAnalytics(req.query);
  res.json({ success: true, data });
});

exports.getRecruitmentAnalytics = asyncHandler(async (req, res) => {
  const data = await service.getRecruitmentAnalytics(req.query);
  res.json({ success: true, data });
});

// ---------------- Administrators & Permissions ----------------
exports.getCurrentAdmin = asyncHandler(async (req, res) => {
  const data = await service.getCurrentAdminProfile(req.user);
  res.json({ success: true, data });
});

exports.listAdministrators = asyncHandler(async (req, res) => {
  const data = await service.listAdministrators();
  res.json({ success: true, data });
});

exports.createAdministrator = asyncHandler(async (req, res) => {
  const data = await service.createAdministrator(req.user, req.body, req);
  res.status(201).json({ success: true, data });
});

exports.updateAdministratorRole = asyncHandler(async (req, res) => {
  const data = await service.updateAdministratorRole(req.user, req.params.id, req.body, req);
  res.json({ success: true, data });
});

exports.updateAdministratorPermissions = asyncHandler(async (req, res) => {
  const data = await service.updateAdministratorPermissions(req.user, req.params.id, req.body, req);
  res.json({ success: true, data });
});

exports.getPermissionsCatalog = asyncHandler(async (req, res) => {
  const data = await service.getPermissionsCatalogAndMatrix();
  res.json({ success: true, data });
});

exports.updateRolePermissions = asyncHandler(async (req, res) => {
  const data = await service.updateRolePermissions(req.user, req.params.role, req.body, req);
  res.json({ success: true, data });
});
