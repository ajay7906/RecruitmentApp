import { apiClient } from "../../../lib/apiClient";

export const companiesApi = {
  async registerCompany(payload) {
    const { data } = await apiClient.post("/companies", payload);
    return data;
  },

  async getMyCompanies(params = {}) {
    const { data } = await apiClient.get("/companies/my", { params });
    return data;
  },

  async listCompanies(params = {}) {
    const { data } = await apiClient.get("/companies", { params });
    return data;
  },

  async getCompanyById(id) {
    const { data } = await apiClient.get(`/companies/${id}`);
    return data;
  },

  async updateCompany(id, payload) {
    const { data } = await apiClient.put(`/companies/${id}`, payload);
    return data;
  },

  async updateCompanyLogo(id, logoUrl) {
    const { data } = await apiClient.patch(`/companies/${id}/logo`, { logoUrl });
    return data;
  },

  async submitForApproval(id) {
    const { data } = await apiClient.post(`/companies/${id}/submit`);
    return data;
  },

  async approveCompany(id) {
    const { data } = await apiClient.patch(`/companies/${id}/approve`);
    return data;
  },

  async rejectCompany(id, reason) {
    const { data } = await apiClient.patch(`/companies/${id}/reject`, { reason });
    return data;
  },

  async suspendCompany(id, reason) {
    const { data } = await apiClient.patch(`/companies/${id}/suspend`, { reason });
    return data;
  },

  async addMember(companyId, payload) {
    const { data } = await apiClient.post(`/companies/${companyId}/members`, payload);
    return data;
  },

  async updateMemberRole(companyId, membershipId, role) {
    const { data } = await apiClient.patch(
      `/companies/${companyId}/members/${membershipId}`,
      { role }
    );
    return data;
  },

  async removeMember(companyId, membershipId) {
    const { data } = await apiClient.delete(
      `/companies/${companyId}/members/${membershipId}`
    );
    return data;
  },
};
