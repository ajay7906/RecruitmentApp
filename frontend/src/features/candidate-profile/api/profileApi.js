import { apiClient } from "../../../lib/apiClient";

// Placeholder endpoint: replace with your existing candidate profile route.
export const profileApi = {
  async getMyProfile() {
    const { data } = await apiClient.get("/profile/candidate/me");
    return data;
  },
  async updateMyProfile(payload) {
    const { data } = await apiClient.patch("/profile/candidate", payload);
    return data;
  },
};
