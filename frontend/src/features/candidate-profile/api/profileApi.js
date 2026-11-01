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
};
