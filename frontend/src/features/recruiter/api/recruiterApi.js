import { apiClient } from "../../../lib/apiClient";

export const recruiterApi = {
  // ── Recruiter profile ──────────────────────────────────────────
  async getMyProfile() {
    const { data } = await apiClient.get("/profile/recruiter/me");
    return data;
  },

  async updateMyProfile(payload) {
    const { data } = await apiClient.put("/profile/recruiter/me", payload);
    return data;
  },

  // ── Companies ──────────────────────────────────────────────────
  async searchCompanies(query = "") {
    const { data } = await apiClient.get("/profile/companies", {
      params: { q: query },
    });
    return data;
  },

  async createCompany(payload) {
    const { data } = await apiClient.post("/profile/companies", payload);
    return data;
  },

  async updateCompany(companyId, payload) {
    const { data } = await apiClient.patch(
      `/profile/companies/${companyId}`,
      payload
    );
    return data;
  },
};
