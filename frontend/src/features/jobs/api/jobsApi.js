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

  // ── Lifecycle Transitions ────────────────────────────────────────
  async publishJob(id, { submitForApproval = false } = {}) {
    const { data } = await apiClient.post(`/jobs/${id}/publish`, {
      submitForApproval,
    });
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

  // ── Admin Approval Transitions ───────────────────────────────────
  async approveJob(id) {
    const { data } = await apiClient.post(`/jobs/${id}/approve`);
    return data;
  },

  async rejectJob(id, reason) {
    const { data } = await apiClient.post(`/jobs/${id}/reject`, { reason });
    return data;
  },
};
