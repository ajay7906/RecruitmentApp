import { apiClient } from "../../../lib/apiClient";

const unwrap = (res) => res?.data?.data ?? res?.data;

export const notificationsApi = {
  // ── In-App Notifications ──
  listNotifications: (params = {}) =>
    apiClient.get("/notifications", { params }).then(unwrap),
  getUnreadCount: () =>
    apiClient.get("/notifications/unread-count").then(unwrap),
  getNotificationDetails: (id) =>
    apiClient.get(`/notifications/${id}`).then(unwrap),
  markAsRead: (id) =>
    apiClient.patch(`/notifications/${id}/read`).then(unwrap),
  markAsUnread: (id) =>
    apiClient.patch(`/notifications/${id}/unread`).then(unwrap),
  markAllAsRead: (category = "ALL") =>
    apiClient.patch("/notifications/read-all", { category }).then(unwrap),
  dismissNotification: (id) =>
    apiClient.delete(`/notifications/${id}`).then(unwrap),

  // ── Preferences & History ──
  getPreferences: () =>
    apiClient.get("/notifications/preferences").then(unwrap),
  updatePreferences: (preferences) =>
    apiClient.patch("/notifications/preferences", { preferences }).then(unwrap),
  getHistory: (params = {}) =>
    apiClient.get("/notifications/history", { params }).then(unwrap),

  // ── Analytics ──
  getCandidateAnalytics: (params = {}) =>
    apiClient.get("/analytics/candidate", { params }).then(unwrap),
  getRecruiterAnalytics: (params = {}) =>
    apiClient.get("/analytics/recruiter", { params }).then(unwrap),
  getCompanyAnalytics: (companyId, params = {}) =>
    apiClient
      .get(`/analytics/company/${companyId}`, { params })
      .then(unwrap),

  // ── Business Reports & Export ──
  listAvailableReports: () =>
    apiClient.get("/reports").then(unwrap),
  getReport: (type, params = {}) =>
    apiClient.get(`/reports/${type}`, { params }).then(unwrap),
  exportReport: async (type, params = {}) => {
    const res = await apiClient.get(`/reports/${type}/export`, {
      params,
      responseType: "blob",
    });
    const disposition = res.headers?.["content-disposition"] || "";
    const match = disposition.match(/filename="?([^"]+)"?/i);
    const format = (params.format || "csv").toLowerCase();
    const ext = format === "xlsx" ? "xls" : format;
    const fileName = match
      ? decodeURIComponent(match[1])
      : `${type}-report.${ext}`;

    const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = blobUrl;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
    return { fileName };
  },

  // ── Admin Notification Monitoring ──
  listAdminDeliveries: (params = {}) =>
    apiClient.get("/admin/notifications", { params }).then(unwrap),
  listFailedAdminDeliveries: (params = {}) =>
    apiClient.get("/admin/notifications/failed", { params }).then(unwrap),
  getAdminDeliveryDetails: (id) =>
    apiClient.get(`/admin/notifications/${id}`).then(unwrap),
  retryAdminDelivery: (id) =>
    apiClient.post(`/admin/notifications/${id}/retry`).then(unwrap),
};
