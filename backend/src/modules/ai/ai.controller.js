const asyncHandler = require('../../utils/asyncHandler');
const ApiError = require('../../utils/ApiError');
const aiService = require('./ai.service');
const {
  uuidSchema,
  startMatchingSchema,
  rankCandidatesSchema,
  recommendationsSchema,
} = require('./ai.validation');

function parseOrThrow(schema, data) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues?.[0];
    throw new ApiError(
      400,
      firstIssue ? `${firstIssue.path.join('.')}: ${firstIssue.message}` : 'Validation error',
      'VALIDATION_ERROR'
    );
  }
  return parsed.data;
}

exports.startJobMatching = asyncHandler(async (req, res) => {
  const jobId = parseOrThrow(uuidSchema, req.params.jobId);
  const payload = parseOrThrow(startMatchingSchema, req.body || {});
  const result = await aiService.startJobMatching(jobId, payload, req.user);
  res.status(result.status === 'QUEUED' ? 202 : 200).json(result);
});

exports.getMatchingStatus = asyncHandler(async (req, res) => {
  const matchingId = parseOrThrow(uuidSchema, req.params.matchingId);
  const result = await aiService.getMatchingStatus(matchingId, req.user);
  res.status(200).json(result);
});

exports.retryMatching = asyncHandler(async (req, res) => {
  const matchingId = parseOrThrow(uuidSchema, req.params.matchingId);
  const result = await aiService.retryMatching(matchingId, req.user);
  res.status(200).json(result);
});

exports.rankCandidatesForJob = asyncHandler(async (req, res) => {
  const jobId = parseOrThrow(uuidSchema, req.params.jobId);
  const payload = parseOrThrow(rankCandidatesSchema, req.body || {});
  const result = await aiService.rankCandidatesForJob(jobId, payload, req.user);
  res.status(200).json(result);
});

exports.getJobRanking = asyncHandler(async (req, res) => {
  const jobId = parseOrThrow(uuidSchema, req.params.jobId);
  const result = await aiService.getJobRanking(jobId, req.query || {}, req.user);
  res.status(200).json(result);
});

exports.recommendJobs = asyncHandler(async (req, res) => {
  const payload = parseOrThrow(recommendationsSchema, req.body || {});
  const result = await aiService.recommendJobs(payload, req.user);
  res.status(200).json(result);
});

exports.getResumeProcessingStatus = asyncHandler(async (req, res) => {
  const resumeId = parseOrThrow(uuidSchema, req.params.resumeId);
  const result = await aiService.getResumeProcessingStatus(resumeId, req.user);
  res.status(200).json(result);
});
