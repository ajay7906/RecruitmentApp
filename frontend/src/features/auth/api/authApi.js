import { apiClient } from "../../../lib/apiClient";

export const authApi = {
  async login(payload) {
    const { data } = await apiClient.post("/auth/login", payload);
    return data;
  },
  async register(payload) {
    const { data } = await apiClient.post("/auth/register", payload);
    return data;
  },
  async refresh() {
    const { data } = await apiClient.post("/auth/refresh");
    return data;
  },
  async logout() {
    const { data } = await apiClient.post("/auth/logout");
    return data;
  },
  async verifyEmail(token) {
    const { data } = await apiClient.post("/auth/verify-email", { token });
    return data;
  },
  async resendVerification(email) {
    const { data } = await apiClient.post("/auth/resend-verification", { email });
    return data;
  },
  async getSession() {
    const { data } = await apiClient.get("/auth/me");
    return data;
  },
};
