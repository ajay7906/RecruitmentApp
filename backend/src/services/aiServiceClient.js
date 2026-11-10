const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');

const DEFAULT_AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
const DEFAULT_INTERNAL_SECRET =
  process.env.INTERNAL_API_SECRET || 'internal_ai_recruitment_engine_secret_key_2026';

function getAiServiceUrl() {
  return (process.env.AI_SERVICE_URL || DEFAULT_AI_SERVICE_URL).replace(/\/+$/, '');
}

function getInternalSecret() {
  return process.env.INTERNAL_API_SECRET || DEFAULT_INTERNAL_SECRET;
}

function buildInternalHeaders(context = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Internal-Secret': getInternalSecret(),
  };
  if (context.companyId) {
    headers['X-Company-Id'] = String(context.companyId);
  }
  if (context.actorId) {
    headers['X-Actor-Id'] = String(context.actorId);
  }
  if (context.actorRole) {
    headers['X-Actor-Role'] = String(context.actorRole);
  }
  return headers;
}

async function requestPythonService(path, { method = 'GET', body = null, context = {}, timeoutMs = 30000 } = {}) {
  const url = `${getAiServiceUrl()}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers: buildInternalHeaders(context),
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = data?.detail || data;
      const errCode = detail?.code || 'AI_SERVICE_ERROR';
      const errMsg = detail?.message || detail?.error || `AI Service returned HTTP ${response.status}`;
      throw new ApiError(response.status, errMsg, errCode);
    }
    return data;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(
      503,
      `AI Recruitment Engine service unavailable: ${err.message}`,
      'AI_SERVICE_UNAVAILABLE'
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Records a reliable outbox event in `ai.outbox_events` and attempts non-blocking dispatch
 * to the Python AI service so resume uploads in Node.js never fail if Python is offline.
 */
async function enqueueResumeProcessingEvent({
  eventType = 'RESUME_UPLOADED',
  resumeId,
  candidateId,
  resumeVersion = 1,
  storageKey = null,
  fileType = 'PDF',
}) {
  let outboxId = null;
  const payload = {
    resume_id: resumeId,
    candidate_id: candidateId,
    resume_version: resumeVersion,
    storage_key: storageKey,
    file_type: fileType,
    async_execution: true,
  };

  try {
    const rows = await prisma.$queryRawUnsafe(
      `
      INSERT INTO ai.outbox_events (event_type, entity_type, entity_id, candidate_id, version, payload, status)
      VALUES ($1, 'RESUME', $2::uuid, $3::uuid, $4, $5::jsonb, 'PENDING')
      RETURNING id
      `,
      eventType,
      String(resumeId),
      String(candidateId),
      Number(resumeVersion || 1),
      JSON.stringify(payload)
    );
    outboxId = rows?.[0]?.id || null;
  } catch (_err) {
    // Ignore if ai schema not yet migrated in isolated unit test
  }

  // Non-blocking fire-and-forget dispatch to Python /internal/v1/resumes/process
  setImmediate(async () => {
    try {
      await requestPythonService('/internal/v1/resumes/process', {
        method: 'POST',
        body: payload,
        context: { actorId: candidateId, actorRole: 'candidate' },
        timeoutMs: 8000,
      });
      if (outboxId) {
        await prisma.$executeRawUnsafe(
          `UPDATE ai.outbox_events SET status = 'PROCESSED', processed_at = NOW(), updated_at = NOW() WHERE id = $1::uuid`,
          String(outboxId)
        );
      }
    } catch (err) {
      if (outboxId) {
        await prisma
          .$executeRawUnsafe(
            `UPDATE ai.outbox_events SET attempt_count = attempt_count + 1, last_error = $2, updated_at = NOW() WHERE id = $1::uuid`,
            String(outboxId),
            String(err.message || 'Dispatch failed').slice(0, 500)
          )
          .catch(() => {});
      }
    }
  });

  return { outboxId, payload };
}

async function triggerResumeProcessing(payload, context = {}) {
  return requestPythonService('/internal/v1/resumes/process', {
    method: 'POST',
    body: payload,
    context,
  });
}

async function getResumeProcessingStatus(resumeId, context = {}) {
  return requestPythonService(`/internal/v1/resumes/${encodeURIComponent(resumeId)}/status`, {
    method: 'GET',
    context,
  });
}

async function startJobMatching(payload, context = {}) {
  return requestPythonService('/internal/v1/matching', {
    method: 'POST',
    body: payload,
    context,
  });
}

async function getMatchingStatus(matchingId, context = {}) {
  const qs = context.companyId ? `?company_id=${encodeURIComponent(context.companyId)}` : '';
  return requestPythonService(`/internal/v1/matching/${encodeURIComponent(matchingId)}${qs}`, {
    method: 'GET',
    context,
  });
}

async function retryMatching(matchingId, context = {}) {
  const qs = context.companyId ? `?company_id=${encodeURIComponent(context.companyId)}` : '';
  return requestPythonService(`/internal/v1/matching/${encodeURIComponent(matchingId)}/retry${qs}`, {
    method: 'POST',
    context,
  });
}

async function generateJobEmbeddings(jobId, payload, context = {}) {
  return requestPythonService(`/internal/v1/jobs/${encodeURIComponent(jobId)}/embeddings`, {
    method: 'POST',
    body: payload,
    context,
  });
}

async function rankCandidatesForJob(payload, context = {}) {
  return requestPythonService('/internal/v1/ranking', {
    method: 'POST',
    body: payload,
    context,
  });
}

async function getJobRanking(jobId, { companyId, topK = 10 } = {}, context = {}) {
  const params = new URLSearchParams();
  if (companyId) params.set('company_id', String(companyId));
  if (topK) params.set('top_k', String(topK));
  return requestPythonService(`/internal/v1/jobs/${encodeURIComponent(jobId)}/ranking?${params.toString()}`, {
    method: 'GET',
    context: { ...context, companyId: companyId || context.companyId },
  });
}

async function recommendJobsForCandidate(payload, context = {}) {
  return requestPythonService('/internal/v1/recommendations', {
    method: 'POST',
    body: payload,
    context,
  });
}

module.exports = {
  enqueueResumeProcessingEvent,
  triggerResumeProcessing,
  getResumeProcessingStatus,
  startJobMatching,
  getMatchingStatus,
  retryMatching,
  generateJobEmbeddings,
  rankCandidatesForJob,
  getJobRanking,
  recommendJobsForCandidate,
};
