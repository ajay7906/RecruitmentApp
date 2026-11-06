import { apiClient } from "../../../lib/apiClient";

export const applicationsApi = {
  // ── Candidate Endpoints ─────────────────────────────────────────────────
  async submitApplication(payload) {
    const { data } = await apiClient.post("/applications", payload);
    return data;
  },

  async checkJobApplication(jobId) {
    const { data } = await apiClient.get(`/applications/check/${jobId}`);
    return data;
  },

  async getMyApplications(params = {}) {
    const { data } = await apiClient.get("/applications/my", { params });
    return data;
  },

  async getCandidateApplicationById(id) {
    const { data } = await apiClient.get(`/applications/${id}`);
    return data;
  },

  async getCandidateApplicationHistory(id) {
    const { data } = await apiClient.get(`/applications/${id}/history`);
    return data;
  },

  async withdrawApplication(id, payload = {}) {
    const { data } = await apiClient.post(`/applications/${id}/withdraw`, payload);
    return data;
  },

  // ── Recruiter / Admin Endpoints ─────────────────────────────────────────
  async listRecruiterApplications(params = {}) {
    const { data } = await apiClient.get("/recruiter/applications", { params });
    return data;
  },

  async getRecruiterStats(params = {}) {
    const { data } = await apiClient.get("/recruiter/applications/stats", { params });
    return data;
  },

  async getRecruiterApplicationById(id) {
    const { data } = await apiClient.get(`/recruiter/applications/${id}`);
    return data;
  },

  async updateApplicationStatus(id, payload) {
    const { data } = await apiClient.patch(
      `/recruiter/applications/${id}/status`,
      payload
    );
    return data;
  },

  async addRecruiterNote(id, payload) {
    const { data } = await apiClient.post(
      `/recruiter/applications/${id}/notes`,
      payload
    );
    return data;
  },

  // ── Authorized Resume Blob Fetch (Candidate or Recruiter) ───────────────
  async fetchApplicationResumeBlob(id, { download = false, asRecruiter = false } = {}) {
    const endpoint = asRecruiter
      ? `/recruiter/applications/${id}/resume`
      : `/applications/${id}/resume`;

    const response = await apiClient.get(endpoint, {
      params: { download: download ? "true" : "false" },
      responseType: "blob",
    });

    return response.data;
  },
};
