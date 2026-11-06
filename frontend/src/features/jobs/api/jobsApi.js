import { apiClient } from "../../../lib/apiClient";

export const jobsApi = {
  // ── Public Candidate Endpoints ───────────────────────────────────
  async listPublic(params = {}) {
    const { data } = await apiClient.get("/jobs/public", { params });
    return data;
  },

  async getPublicById(id) {
    const { data } = await apiClient.get(`/jobs/public/${id}`);
    return data;
  },

  // Backward-compatible aliases
  async list(params = {}) {
    const { data } = await apiClient.get("/jobs/public", { params });
    return data;
  },

  async getById(id) {
    const { data } = await apiClient.get(`/jobs/${id}`);
    return data;
  },

  // ── Recruiter & Admin Endpoints ──────────────────────────────────
  async getMyJobs(params = {}) {
    const { data } = await apiClient.get("/jobs/my", { params });
    return data;
  },

  async listAdminJobs(params = {}) {
    const { data } = await apiClient.get("/jobs/admin", { params });
    return data;
  },

  async createJob(payload) {
    const { data } = await apiClient.post("/jobs", payload);
    return data;
  },

  async updateJob(id, payload) {
    const { data } = await apiClient.put(`/jobs/${id}`, payload);
    return data;
  },

  async deleteJob(id) {
    const { data } = await apiClient.delete(`/jobs/${id}`);
    return data;
  },

  // ── Lifecycle Transitions (Automatic Publishing) ─────────────────
  async publishJob(id) {
    const { data } = await apiClient.post(`/jobs/${id}/publish`, {});
    return data;
  },

  async pauseJob(id) {
    const { data } = await apiClient.post(`/jobs/${id}/pause`);
    return data;
  },

  async resumeJob(id) {
    const { data } = await apiClient.post(`/jobs/${id}/resume`);
    return data;
  },

  async closeJob(id) {
    const { data } = await apiClient.post(`/jobs/${id}/close`);
    return data;
  },

  async archiveJob(id) {
    const { data } = await apiClient.post(`/jobs/${id}/archive`);
    return data;
  },

  // ── Candidate / User Job Reporting ───────────────────────────────
  async reportJob(id, payload) {
    const { data } = await apiClient.post(`/jobs/${id}/report`, payload);
    return data;
  },

  // ── Admin Moderation & Audit Logs ────────────────────────────────
  async getJobModeration(id) {
    const { data } = await apiClient.get(`/jobs/${id}/moderation`);
    return data;
  },

  async moderateJob(id, payload) {
    const { data } = await apiClient.post(`/jobs/${id}/moderation`, payload);
    return data;
  },

  async approveJob(id, reason = "Cleared and restored by administrator") {
    const { data } = await apiClient.post(`/jobs/${id}/moderation`, {
      action: "RESTORE_JOB",
      reason,
    });
    return data;
  },

  async rejectJob(id, reason) {
    const { data } = await apiClient.post(`/jobs/${id}/moderation`, {
      action: "REJECT_JOB",
      reason,
    });
    return data;
  },
};
