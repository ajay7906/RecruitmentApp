import { apiClient } from "../lib/apiClient";

export const aiApi = {
  /**
   * Start AI Candidate Matching for a job
   * Default: top 5 candidates
   */
  async startJobMatching(jobId, payload = {}) {
    const { data } = await apiClient.post(`/ai/jobs/${jobId}/match`, {
      top_k: payload.top_k ?? 5,
      shortlist_size: payload.shortlist_size,
      force_refresh: payload.force_refresh ?? false,
      async_execution: payload.async_execution ?? true,
      filters: payload.filters || {},
      weights: payload.weights || {},
    });
    return data;
  },

  /**
   * Poll or retrieve matching status & top candidates
   */
  async getMatchingStatus(matchingId) {
    const { data } = await apiClient.get(`/ai/matching/${matchingId}`);
    return data;
  },

  /**
   * Retry failed or recalculate matching
   */
  async retryMatching(matchingId) {
    const { data } = await apiClient.post(`/ai/matching/${matchingId}/retry`);
    return data;
  },

  /**
   * Rank candidates for a job
   */
  async rankCandidatesForJob(jobId, payload = {}) {
    const { data } = await apiClient.post(`/ai/jobs/${jobId}/rank`, payload);
    return data;
  },

  async getJobRanking(jobId, params = {}) {
    const { data } = await apiClient.get(`/ai/jobs/${jobId}/ranking`, { params });
    return data;
  },

  /**
   * Candidate: Find Top Relevant Published Jobs Based on Profile & Resume
   */
  async getJobRecommendations(payload = {}) {
    const { data } = await apiClient.post("/ai/recommendations", {
      limit: payload.limit ?? 5,
      min_skill_overlap: payload.min_skill_overlap ?? 0,
      experience_tolerance_years: payload.experience_tolerance_years ?? 2,
      force_refresh: payload.force_refresh ?? false,
    });
    return data;
  },

  /**
   * Get resume extraction & embedding processing status
   */
  async getResumeProcessingStatus(resumeId) {
    const { data } = await apiClient.get(`/ai/resumes/${resumeId}/status`);
    return data;
  },

  /**
   * AI-powered job description generator
   */
  async generateJobDescription(payload) {
    const { data } = await apiClient.post("/ai/jobs/generate-description", payload);
    return data?.data ?? data;
  },

  /**
   * Tailored AI Interview Question Generator & Scorecard Kit
   */
  async generateTailoredInterviewQuestions(payload) {
    const { data } = await apiClient.post("/ai/interviews/tailored-questions", payload);
    return data?.data ?? data;
  },
};
