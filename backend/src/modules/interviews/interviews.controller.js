const asyncHandler = require('../../utils/asyncHandler');
const service = require('./interviews.service');

exports.createInterview = asyncHandler(async (req, res) => {
  const interview = await service.createInterview(req.user, req.body);
  res.status(201).json({
    message: 'Interview scheduled successfully',
    interview,
  });
});

exports.listRecruiterInterviews = asyncHandler(async (req, res) => {
  const result = await service.listRecruiterInterviews(req.user, req.query);
  res.json(result);
});

exports.getRecruiterInterviewById = asyncHandler(async (req, res) => {
  const interview = await service.getRecruiterInterviewById(req.user, req.params.id);
  res.json({ interview });
});

exports.updateInterview = asyncHandler(async (req, res) => {
  const interview = await service.updateInterview(req.user, req.params.id, req.body);
  res.json({
    message: 'Interview updated successfully',
    interview,
  });
});

exports.rescheduleInterview = asyncHandler(async (req, res) => {
  const interview = await service.rescheduleInterview(req.user, req.params.id, req.body);
  res.json({
    message: 'Interview rescheduled successfully',
    interview,
  });
});

exports.cancelInterview = asyncHandler(async (req, res) => {
  const interview = await service.cancelInterview(req.user, req.params.id, req.body);
  res.json({
    message: 'Interview cancelled',
    interview,
  });
});

exports.completeInterview = asyncHandler(async (req, res) => {
  const interview = await service.completeOrUpdateStatus(req.user, req.params.id, req.body);
  res.json({
    message: `Interview marked as ${interview.status}`,
    interview,
  });
});

exports.assignInterviewers = asyncHandler(async (req, res) => {
  const interview = await service.assignInterviewers(req.user, req.params.id, req.body);
  res.json({
    message: 'Interviewers assigned successfully',
    interview,
  });
});

exports.removeInterviewer = asyncHandler(async (req, res) => {
  const interview = await service.removeInterviewer(
    req.user,
    req.params.id,
    req.params.assignmentId
  );
  res.json({
    message: 'Interviewer removed',
    interview,
  });
});

exports.listInterviewers = asyncHandler(async (req, res) => {
  const result = await service.listInterviewers(req.user, req.params.id);
  res.json(result);
});

exports.submitFeedback = asyncHandler(async (req, res) => {
  const feedback = await service.submitFeedback(req.user, req.params.id, req.body);
  res.status(201).json({
    message: 'Interview evaluation feedback submitted',
    feedback,
  });
});

exports.getInterviewFeedback = asyncHandler(async (req, res) => {
  const result = await service.getInterviewFeedback(req.user, req.params.id);
  res.json(result);
});

exports.updateFeedback = asyncHandler(async (req, res) => {
  const feedback = await service.updateFeedback(
    req.user,
    req.params.id,
    req.params.feedbackId,
    req.body
  );
  res.json({
    message: 'Interview feedback updated',
    feedback,
  });
});

exports.makeHiringDecision = asyncHandler(async (req, res) => {
  const decision = await service.makeHiringDecision(req.user, req.params.id, req.body);
  res.status(201).json({
    message: `Hiring decision (${decision.decision}) recorded successfully`,
    decision,
  });
});

exports.getHiringDecision = asyncHandler(async (req, res) => {
  const result = await service.getApplicationHiringDecisions(req.user, req.params.id);
  res.json(result);
});

exports.getInterviewStats = asyncHandler(async (req, res) => {
  const stats = await service.getInterviewDashboardStats(req.user, req.query);
  res.json({ stats });
});

exports.getHiringStats = asyncHandler(async (req, res) => {
  const stats = await service.getHiringDashboardStats(req.user, req.query);
  res.json({ stats });
});

// Candidate endpoints
exports.listCandidateInterviews = asyncHandler(async (req, res) => {
  const result = await service.listCandidateInterviews(req.user, req.query);
  res.json(result);
});

exports.getCandidateInterviewById = asyncHandler(async (req, res) => {
  const interview = await service.getCandidateInterviewById(req.user, req.params.id);
  res.json({ interview });
});

exports.confirmCandidateAttendance = asyncHandler(async (req, res) => {
  const interview = await service.confirmCandidateAttendance(req.user, req.params.id);
  res.json({
    message: 'Interview attendance confirmed',
    interview,
  });
});

exports.requestCandidateReschedule = asyncHandler(async (req, res) => {
  const request = await service.requestCandidateReschedule(
    req.user,
    req.params.id,
    req.body
  );
  res.status(201).json({
    message: 'Reschedule request submitted to the hiring team',
    request,
  });
});

exports.getCandidateInterviewHistory = asyncHandler(async (req, res) => {
  const result = await service.getCandidateInterviewHistory(req.user, req.params.id);
  res.json(result);
});
