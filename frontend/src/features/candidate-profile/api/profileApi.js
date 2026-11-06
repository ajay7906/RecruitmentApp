import { apiClient } from "../../../lib/apiClient";

export const profileApi = {
  // ── Full Candidate Profile & Completion ─────────────────────────────────
  async getFullCandidateData() {
    const { data } = await apiClient.get("/candidate/profile");
    return data;
  },

  async updateFullCandidateProfile(payload) {
    const { data } = await apiClient.put("/candidate/profile", payload);
    return data;
  },

  async getProfileCompletion() {
    const { data } = await apiClient.get("/candidate/profile/completion");
    return data;
  },

  // Backward-compatible methods
  async getMyProfile() {
    const { data } = await apiClient.get("/candidate/profile");
    return data;
  },

  async updateMyProfile(payload) {
    const { data } = await apiClient.put("/candidate/profile", payload);
    return data;
  },

  // ── Resumes Management (/candidate/resumes) ─────────────────────────────
  async listResumes() {
    const { data } = await apiClient.get("/candidate/resumes");
    return data;
  },

  async uploadResume(payload) {
    const { data } = await apiClient.post("/candidate/resumes", payload);
    return data;
  },

  async getResumeDetails(id) {
    const { data } = await apiClient.get(`/candidate/resumes/${id}`);
    return data;
  },

  async setPrimaryResume(id) {
    const { data } = await apiClient.patch(`/candidate/resumes/${id}/primary`);
    return data;
  },

  async replaceResume(id, payload) {
    const { data } = await apiClient.put(`/candidate/resumes/${id}`, payload);
    return data;
  },

  async deleteResume(id) {
    const { data } = await apiClient.delete(`/candidate/resumes/${id}`);
    return data;
  },

  async downloadResumeBlob(id, { download = true } = {}) {
    const response = await apiClient.get(`/candidate/resumes/${id}/download`, {
      params: { download: download ? "true" : "false" },
      responseType: "blob",
    });
    return response.data;
  },

  // ── Structured Skills (/candidate/skills) ───────────────────────────────
  async listSkills(params = {}) {
    const { data } = await apiClient.get("/candidate/skills", { params });
    return data;
  },

  async addSkill(payload) {
    const { data } = await apiClient.post("/candidate/skills", payload);
    return data;
  },

  async updateSkill(id, payload) {
    const { data } = await apiClient.put(`/candidate/skills/${id}`, payload);
    return data;
  },

  async deleteSkill(id) {
    const { data } = await apiClient.delete(`/candidate/skills/${id}`);
    return data;
  },

  // ── Education (/candidate/education) ────────────────────────────────────
  async listEducation() {
    const { data } = await apiClient.get("/candidate/education");
    return data;
  },

  async addEducation(payload) {
    const { data } = await apiClient.post("/candidate/education", payload);
    return data;
  },

  async updateEducation(id, payload) {
    const { data } = await apiClient.put(`/candidate/education/${id}`, payload);
    return data;
  },

  async deleteEducation(id) {
    const { data } = await apiClient.delete(`/candidate/education/${id}`);
    return data;
  },

  // ── Work Experience (/candidate/experience) ─────────────────────────────
  async listExperience() {
    const { data } = await apiClient.get("/candidate/experience");
    return data;
  },

  async addExperience(payload) {
    const { data } = await apiClient.post("/candidate/experience", payload);
    return data;
  },

  async updateExperience(id, payload) {
    const { data } = await apiClient.put(`/candidate/experience/${id}`, payload);
    return data;
  },

  async deleteExperience(id) {
    const { data } = await apiClient.delete(`/candidate/experience/${id}`);
    return data;
  },

  // ── Projects (/candidate/projects) ──────────────────────────────────────
  async listProjects() {
    const { data } = await apiClient.get("/candidate/projects");
    return data;
  },

  async addProject(payload) {
    const { data } = await apiClient.post("/candidate/projects", payload);
    return data;
  },

  async updateProject(id, payload) {
    const { data } = await apiClient.put(`/candidate/projects/${id}`, payload);
    return data;
  },

  async deleteProject(id) {
    const { data } = await apiClient.delete(`/candidate/projects/${id}`);
    return data;
  },

  // ── Certifications (/candidate/certifications) ──────────────────────────
  async listCertifications() {
    const { data } = await apiClient.get("/candidate/certifications");
    return data;
  },

  async addCertification(payload) {
    const { data } = await apiClient.post("/candidate/certifications", payload);
    return data;
  },

  async updateCertification(id, payload) {
    const { data } = await apiClient.put(`/candidate/certifications/${id}`, payload);
    return data;
  },

  async deleteCertification(id) {
    const { data } = await apiClient.delete(`/candidate/certifications/${id}`);
    return data;
  },

  // ── Achievements (/candidate/achievements) ──────────────────────────────
  async listAchievements() {
    const { data } = await apiClient.get("/candidate/achievements");
    return data;
  },

  async addAchievement(payload) {
    const { data } = await apiClient.post("/candidate/achievements", payload);
    return data;
  },

  async updateAchievement(id, payload) {
    const { data } = await apiClient.put(`/candidate/achievements/${id}`, payload);
    return data;
  },

  async deleteAchievement(id) {
    const { data } = await apiClient.delete(`/candidate/achievements/${id}`);
    return data;
  },

  // ── Languages (/candidate/languages) ────────────────────────────────────
  async listLanguages() {
    const { data } = await apiClient.get("/candidate/languages");
    return data;
  },

  async addLanguage(payload) {
    const { data } = await apiClient.post("/candidate/languages", payload);
    return data;
  },

  async updateLanguage(id, payload) {
    const { data } = await apiClient.put(`/candidate/languages/${id}`, payload);
    return data;
  },

  async deleteLanguage(id) {
    const { data } = await apiClient.delete(`/candidate/languages/${id}`);
    return data;
  },
};
