import { apiClient } from "../../../lib/apiClient";

const unwrap = (res) => res?.data?.data ?? res?.data;

export const adminApi = {
  // Profile
  getCurrentAdmin: () => apiClient.get("/admin/me").then(unwrap),

  // Dashboard
  getDashboardStats: (params = {}) =>
    apiClient.get("/admin/dashboard/stats", { params }).then(unwrap),
  getDashboardActivities: (params = {}) =>
    apiClient.get("/admin/dashboard/activities", { params }).then(unwrap),

  // Users
  listUsers: (params = {}) =>
    apiClient.get("/admin/users", { params }).then(unwrap),
  getUserDetails: (id) =>
    apiClient.get(`/admin/users/${id}`).then(unwrap),
  updateUser: (id, payload) =>
    apiClient.patch(`/admin/users/${id}`, payload).then(unwrap),
  updateUserStatus: (id, payload) =>
    apiClient.patch(`/admin/users/${id}/status`, payload).then(unwrap),
  getUserActivities: (id, params = {}) =>
    apiClient.get(`/admin/users/${id}/activities`, { params }).then(unwrap),

  // Companies
  listCompanies: (params = {}) =>
    apiClient.get("/admin/companies", { params }).then(unwrap),
  getCompanyDetails: (id) =>
    apiClient.get(`/admin/companies/${id}`).then(unwrap),
  approveCompany: (id, payload = {}) =>
    apiClient.patch(`/admin/companies/${id}/approve`, payload).then(unwrap),
  rejectCompany: (id, payload) =>
    apiClient.patch(`/admin/companies/${id}/reject`, payload).then(unwrap),
  suspendCompany: (id, payload) =>
    apiClient.patch(`/admin/companies/${id}/suspend`, payload).then(unwrap),
  activateCompany: (id, payload = {}) =>
    apiClient.patch(`/admin/companies/${id}/activate`, payload).then(unwrap),

  // Jobs
  listJobs: (params = {}) =>
    apiClient.get("/admin/jobs", { params }).then(unwrap),
  getJobDetails: (id) =>
    apiClient.get(`/admin/jobs/${id}`).then(unwrap),
  approveJob: (id, payload = {}) =>
    apiClient.patch(`/admin/jobs/${id}/approve`, payload).then(unwrap),
  rejectJob: (id, payload) =>
    apiClient.patch(`/admin/jobs/${id}/reject`, payload).then(unwrap),
  closeJob: (id, payload) =>
    apiClient.patch(`/admin/jobs/${id}/close`, payload).then(unwrap),
  suspendJob: (id, payload) =>
    apiClient.patch(`/admin/jobs/${id}/suspend`, payload).then(unwrap),
  flagJob: (id, payload) =>
    apiClient.post(`/admin/jobs/${id}/flag`, payload).then(unwrap),

  // Applications
  listApplications: (params = {}) =>
    apiClient.get("/admin/applications", { params }).then(unwrap),
  getApplicationDetails: (id) =>
    apiClient.get(`/admin/applications/${id}`).then(unwrap),

  // Audit Logs & Activities
  listAuditLogs: (params = {}) =>
    apiClient.get("/admin/audit-logs", { params }).then(unwrap),
  listActivities: (params = {}) =>
    apiClient.get("/admin/activities", { params }).then(unwrap),

  // Reports & Moderation Queue
  createReport: (payload) =>
    apiClient.post("/reports", payload).then(unwrap),
  listReports: (params = {}) =>
    apiClient.get("/admin/reports", { params }).then(unwrap),
  getReportDetails: (id) =>
    apiClient.get(`/admin/reports/${id}`).then(unwrap),
  updateReportStatus: (id, payload) =>
    apiClient.patch(`/admin/reports/${id}/status`, payload).then(unwrap),
  assignReport: (id, payload) =>
    apiClient.patch(`/admin/reports/${id}/assign`, payload).then(unwrap),
  addReportNote: (id, payload) =>
    apiClient.post(`/admin/reports/${id}/notes`, payload).then(unwrap),

  // Analytics
  getUserAnalytics: (params = {}) =>
    apiClient.get("/admin/analytics/users", { params }).then(unwrap),
  getCompanyAnalytics: (params = {}) =>
    apiClient.get("/admin/analytics/companies", { params }).then(unwrap),
  getJobAnalytics: (params = {}) =>
    apiClient.get("/admin/analytics/jobs", { params }).then(unwrap),
  getRecruitmentAnalytics: (params = {}) =>
    apiClient.get("/admin/analytics/recruitment", { params }).then(unwrap),

  // Administrators & Permissions
  listAdministrators: () =>
    apiClient.get("/admin/administrators").then(unwrap),
  createAdministrator: (payload) =>
    apiClient.post("/admin/administrators", payload).then(unwrap),
  updateAdministratorRole: (id, payload) =>
    apiClient.patch(`/admin/administrators/${id}/role`, payload).then(unwrap),
  updateAdministratorPermissions: (id, payload) =>
    apiClient.patch(`/admin/administrators/${id}/permissions`, payload).then(unwrap),
  getPermissionsCatalog: () =>
    apiClient.get("/admin/permissions").then(unwrap),
  updateRolePermissions: (role, payload) =>
    apiClient.put(`/admin/permissions/roles/${role}`, payload).then(unwrap),
};
