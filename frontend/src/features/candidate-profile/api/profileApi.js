import { apiClient } from "../../../lib/apiClient";

export const profileApi = {
  async getMyProfile() {
    const { data } = await apiClient.get("/profile/candidate/me");
    return data;
  },
  async updateMyProfile(payload) {
    const { data } = await apiClient.put("/profile/candidate/me", payload);
    return data;
  },
  async uploadMyResume(payload) {
    const { data } = await apiClient.put("/profile/candidate/me/resume", payload);
    return data;
  },
  async deleteMyResume() {
    const { data } = await apiClient.delete("/profile/candidate/me/resume");
    return data;
  },
  async downloadMyResumeBlob() {
    const response = await apiClient.get("/profile/candidate/me/resume", {
      params: { download: "true" },
      responseType: "blob",
    });
    return response.data;
  },
};
