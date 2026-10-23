import { apiClient } from "../../../lib/apiClient";

// Adjust paths and payloads to match the existing backend.
export const authApi = {
  async login(payload) {
    const { data } = await apiClient.post("/auth/login", payload);
    return data;
  },
  async register(payload) {
    const { data } = await apiClient.post("/auth/register", payload);
    return data;
  },
  async logout() {
    const { data } = await apiClient.post("/auth/logout");
    return data;
  },
  async getSession() {
    const { data } = await apiClient.get("/auth/me");
    return data;
  },
};
