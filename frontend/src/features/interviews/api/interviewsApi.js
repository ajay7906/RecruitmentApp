import { http } from '../../../services/http'

export const interviewsApi = {
  // Recruiter Interview APIs
  getRecruiterInterviewStats: async (params = {}) => {
    const res = await http.get('/recruiter/interviews/stats', { params })
    return res.data
  },

  getRecruiterHiringStats: async (params = {}) => {
    const res = await http.get('/recruiter/hiring/stats', { params })
    return res.data
  },

  listRecruiterInterviews: async (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined),
    )
    const res = await http.get('/recruiter/interviews', { params: cleanParams })
    return res.data
  },

  getRecruiterInterviewById: async (id) => {
    const res = await http.get(`/recruiter/interviews/${id}`)
    return res.data
  },

  createInterview: async (payload) => {
    const res = await http.post('/recruiter/interviews', payload)
    return res.data
  },

  updateInterview: async (id, payload) => {
    const res = await http.put(`/recruiter/interviews/${id}`, payload)
    return res.data
  },

  rescheduleInterview: async (id, payload) => {
    const res = await http.post(`/recruiter/interviews/${id}/reschedule`, payload)
    return res.data
  },

  cancelInterview: async (id, payload) => {
    const res = await http.post(`/recruiter/interviews/${id}/cancel`, payload)
    return res.data
  },

  completeInterview: async (id, payload) => {
    const res = await http.post(`/recruiter/interviews/${id}/complete`, payload)
    return res.data
  },

  // Interviewer Assignment APIs
  listInterviewers: async (interviewId) => {
    const res = await http.get(`/recruiter/interviews/${interviewId}/interviewers`)
    return res.data
  },

  assignInterviewers: async (interviewId, interviewers) => {
    const res = await http.post(`/recruiter/interviews/${interviewId}/interviewers`, {
      interviewers,
    })
    return res.data
  },

  removeInterviewer: async (interviewId, assignmentId) => {
    const res = await http.delete(
      `/recruiter/interviews/${interviewId}/interviewers/${assignmentId}`,
    )
    return res.data
  },

  // Feedback APIs
  getInterviewFeedback: async (interviewId) => {
    const res = await http.get(`/recruiter/interviews/${interviewId}/feedback`)
    return res.data
  },

  submitFeedback: async (interviewId, payload) => {
    const res = await http.post(`/recruiter/interviews/${interviewId}/feedback`, payload)
    return res.data
  },

  updateFeedback: async (interviewId, feedbackId, payload) => {
    const res = await http.put(
      `/recruiter/interviews/${interviewId}/feedback/${feedbackId}`,
      payload,
    )
    return res.data
  },

  // Hiring Decision APIs
  makeHiringDecision: async (applicationId, payload) => {
    const res = await http.post(
      `/recruiter/applications/${applicationId}/decision`,
      payload,
    )
    return res.data
  },

  getHiringDecision: async (applicationId) => {
    const res = await http.get(`/recruiter/applications/${applicationId}/decision`)
    return res.data
  },

  // Candidate Interview APIs
  listCandidateInterviews: async (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined),
    )
    const res = await http.get('/candidate/interviews', { params: cleanParams })
    return res.data
  },

  getCandidateInterviewById: async (id) => {
    const res = await http.get(`/candidate/interviews/${id}`)
    return res.data
  },

  confirmAttendance: async (id) => {
    const res = await http.post(`/candidate/interviews/${id}/confirm`)
    return res.data
  },

  requestReschedule: async (id, payload) => {
    const res = await http.post(
      `/candidate/interviews/${id}/reschedule-request`,
      payload,
    )
    return res.data
  },

  getCandidateInterviewHistory: async (id) => {
    const res = await http.get(`/candidate/interviews/${id}/history`)
    return res.data
  },
}
