import { apiClient } from "../../../lib/apiClient";

// Placeholder endpoint. Align path and query parameters with your backend.
export const jobsApi = {
  async list(params = {}) {
    const { data } = await apiClient.get("/jobs", { params });
    return data;
  },
  async getById(id) {
    const { data } = await apiClient.get(`/jobs/${id}`);
    return data;
  },
};
