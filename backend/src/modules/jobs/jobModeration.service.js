const crypto = require('crypto');
const prisma = require('../../config/prisma');

// Track in-flight background moderation runs for idempotency
const inFlightModerationJobs = new Set();

const SEVERE_SCAM_PATTERNS = [
  /\b(registration|security|processing|training|onboarding|documentation)\s+(fee|deposit|charge|payment)\b/i,
  /\bpay\s+(upfront|money|rs\.?|usd|\$|inr)\s+(to|for|before)\s+(apply|joining|interview|offer)\b/i,
  /\b(bank\s+transfer|wire\s+transfer|crypto|usdt|bitcoin)\s+(required|mandatory|deposit)\b/i,
];

const SUSPICIOUS_CONTENT_PATTERNS = [
  {
    code: 'EXTERNAL_MESSENGER_SOLICITATION',
    weight: 35,
    regex: /\b(whatsapp|telegram)\s+(only|number|dm|message\s+us\s+on)\b/i,
    label: 'Directs candidates to unverified external messenger channels',
  },
  {
    code: 'UNREALISTIC_EARNINGS_CLAIM',
    weight: 40,
    regex: /\b(earn\s+daily|guaranteed\s+income|quick\s+money|work\s+1\s+hour\s+daily|no\s+interview\s+direct\s+joining)\b/i,
    label: 'Contains misleading or unrealistic income/hiring promises',
  },
  {
    code: 'FEE_MENTION',
    weight: 50,
    regex: /\b(refundable\s+deposit|id\s+card\s+fee|laptop\s+security\s+deposit|verification\s+charge)\b/i,
    label: 'Mentions candidate deposit or verification charges',
  },
  {
    code: 'OFF_PLATFORM_PERSONAL_DATA',
    weight: 35,
    regex: /\b(aadhaar|pan\s+card|bank\s+account\s+password|cvv|credit\s+card\s+number|ssn)\b/i,
    label: 'Requests sensitive financial or identity credentials in job text',
  },
];

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Generates an indexed fingerprint for fast duplicate detection without scanning full text in memory.
 */
function computeJobContentHash(payload = {}) {
  const normalized = [
    normalizeText(payload.title),
    normalizeText(payload.employmentType),
    normalizeText(payload.workMode),
    normalizeText(payload.city),
    normalizeText(payload.country),
    normalizeText(payload.description).slice(0, 600),
  ].join('|');

  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Synchronous pre-publish checks executed during job creation/publication:
 * 1. Blocks blatantly fraudulent fee-solicitation listings immediately.
 * 2. Prevents accidental exact duplicate active job postings within the same company.
 */
async function runPrePublishChecks({ companyId, payload, excludeJobId = null }) {
  const combinedText = [
    payload.title,
    payload.summary,
    payload.description,
    payload.additionalInfo,
    payload.applicationInstructions,
  ]
    .filter(Boolean)
    .join(' ');

  for (const pattern of SEVERE_SCAM_PATTERNS) {
    if (pattern.test(combinedText)) {
      return {
        allowed: false,
        code: 'PROHIBITED_JOB_CONTENT',
        message:
          'Job postings that request registration fees, security deposits, or upfront payments from candidates are strictly prohibited.',
      };
    }
  }

  const contentHash = computeJobContentHash(payload);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const duplicateWhere = {
    companyId,
    contentHash,
    status: 'PUBLISHED',
    createdAt: { gte: oneDayAgo },
    ...(excludeJobId ? { id: { not: excludeJobId } } : {}),
  };

  const recentExactDuplicate = await prisma.job.findFirst({
    where: duplicateWhere,
    select: { id: true, title: true, publishedAt: true },
  });

  if (recentExactDuplicate) {
    return {
      allowed: false,
      code: 'DUPLICATE_ACTIVE_JOB',
      message: `An identical active job posting ("${recentExactDuplicate.title}") was already published for this company within the last 24 hours.`,
    };
  }

  return {
    allowed: true,
    contentHash,
  };
}

/**
 * Performs targeted database and heuristic checks for a single job.
 * Never loads all jobs into memory.
 */
async function evaluateJobForModeration(jobId, trigger = 'JOB_PUBLISHED') {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      title: true,
      companyId: true,
      createdById: true,
      summary: true,
      description: true,
      additionalInfo: true,
      applicationInstructions: true,
      employmentType: true,
      workMode: true,
      city: true,
      country: true,
      minSalary: true,
      maxSalary: true,
      numberOfOpenings: true,
      status: true,
      moderationStatus: true,
      reportCount: true,
      contentHash: true,
      company: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
    },
  });

  if (!job) return null;

  // Do not overwrite manual administrator decisions unless triggered by new user reports
  if (
    job.moderationStatus === 'ACTION_REQUIRED' &&
    trigger !== 'USER_REPORT'
  ) {
    return job;
  }

  const flags = new Set();
  const reasons = [];
  let score = 0;

  const combinedText = [
    job.title,
    job.summary,
    job.description,
    job.additionalInfo,
    job.applicationInstructions,
  ]
    .filter(Boolean)
    .join('\n');

  // 1. Severe scam pattern check
  for (const pattern of SEVERE_SCAM_PATTERNS) {
    if (pattern.test(combinedText)) {
      flags.add('PROHIBITED_FEE_SOLICITATION');
      reasons.push('Detected language soliciting fees or deposits from candidates');
      score += 85;
    }
  }

  // 2. Suspicious content & misleading patterns
  for (const rule of SUSPICIOUS_CONTENT_PATTERNS) {
    if (rule.regex.test(combinedText)) {
      flags.add(rule.code);
      reasons.push(rule.label);
      score += rule.weight;
    }
  }

  // 3. Repeated/spammy text or very low information density
  const words = normalizeText(job.description).split(/\s+/).filter(Boolean);
  if (words.length >= 12) {
    const uniqueRatio = new Set(words).size / words.length;
    if (uniqueRatio < 0.28) {
      flags.add('REPEATED_SUSPICIOUS_CONTENT');
      reasons.push('Job description contains abnormally repetitive text');
      score += 35;
    }
  }

  // 4. Indexed duplicate check across active jobs in the same company
  const contentHash = job.contentHash || computeJobContentHash(job);
  const [hashDuplicatesCount, titleLocationDuplicatesCount] = await Promise.all([
    prisma.job.count({
      where: {
        id: { not: job.id },
        companyId: job.companyId,
        contentHash,
        status: { in: ['PUBLISHED', 'PAUSED', 'UNDER_REVIEW'] },
      },
    }),
    prisma.job.count({
      where: {
        id: { not: job.id },
        companyId: job.companyId,
        title: { equals: job.title, mode: 'insensitive' },
        city: job.city || null,
        workMode: job.workMode,
        status: 'PUBLISHED',
      },
    }),
  ]);

  if (hashDuplicatesCount > 0 || titleLocationDuplicatesCount >= 2) {
    flags.add('DUPLICATE_JOB_POSTING');
    reasons.push('Multiple active postings with identical title/location or content hash in the same company');
    score += 35;
  }

  // 5. Salary & openings anomaly check
  const minSal = job.minSalary != null ? Number(job.minSalary) : null;
  const maxSal = job.maxSalary != null ? Number(job.maxSalary) : null;
  if (minSal != null && maxSal != null && minSal > 0 && maxSal / minSal > 12) {
    flags.add('MISLEADING_SALARY_RANGE');
    reasons.push('Unusually wide salary spread (max salary exceeds 12x min salary)');
    score += 25;
  }
  if (job.numberOfOpenings > 500) {
    flags.add('HIGH_OPENINGS_COUNT');
    reasons.push(`Unusually high number of openings (${job.numberOfOpenings})`);
    score += 20;
  }

  // 6. Suspicious company velocity check (indexed count in last 1 hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCompanyJobsCount = await prisma.job.count({
    where: {
      companyId: job.companyId,
      createdAt: { gte: oneHourAgo },
    },
  });

  if (recentCompanyJobsCount > 15) {
    flags.add('SUSPICIOUS_COMPANY_VELOCITY');
    reasons.push(`High posting frequency (${recentCompanyJobsCount} jobs created in the past hour)`);
    score += 40;
  }

  // 7. Candidate/user reports check
  if (job.reportCount >= 1) {
    flags.add('USER_REPORTED');
    reasons.push(`Reported by ${job.reportCount} user(s)`);
    score += Math.min(job.reportCount * 25, 80);
  }

  const finalFlags = Array.from(flags);
  const finalScore = Math.min(score, 100);

  let nextModerationStatus = 'CLEARED';
  let nextJobStatus = job.status;
  let actionName = 'AUTO_CLEAR';

  if (finalScore >= 80) {
    nextModerationStatus = 'UNDER_REVIEW';
    if (job.status === 'PUBLISHED') {
      nextJobStatus = 'UNDER_REVIEW';
    }
    actionName = 'AUTO_PLACE_UNDER_REVIEW';
  } else if (finalFlags.length > 0 || finalScore >= 30) {
    nextModerationStatus = 'FLAGGED';
    actionName = 'AUTO_FLAG';
  }

  const moderationReason =
    reasons.length > 0 ? reasons.join('; ') : 'Passed automated moderation checks';

  const updated = await prisma.$transaction(async (tx) => {
    const updatedJob = await tx.job.update({
      where: { id: job.id },
      data: {
        status: nextJobStatus,
        moderationStatus: nextModerationStatus,
        moderationFlags: finalFlags,
        moderationScore: finalScore,
        moderationReason: reasons.length > 0 ? moderationReason : null,
        moderatedAt: new Date(),
        contentHash,
      },
    });

    await tx.jobModerationLog.create({
      data: {
        jobId: job.id,
        actorId: null,
        actorType: 'SYSTEM',
        action: actionName,
        previousStatus: job.status,
        newStatus: nextJobStatus,
        previousModerationStatus: job.moderationStatus,
        newModerationStatus: nextModerationStatus,
        reason: moderationReason,
        flags: finalFlags,
        metadata: {
          trigger,
          score: finalScore,
          recentCompanyJobsCount,
          reportCount: job.reportCount,
        },
      },
    });

    return updatedJob;
  });

  return updated;
}

/**
 * Schedules asynchronous, non-blocking background moderation after a job is published or updated.
 * Idempotent per jobId while a run is already in flight.
 */
function scheduleAsyncModeration(jobId, trigger = 'JOB_PUBLISHED') {
  if (!jobId || inFlightModerationJobs.has(jobId)) {
    return;
  }

  inFlightModerationJobs.add(jobId);

  setImmediate(async () => {
    try {
      await evaluateJobForModeration(jobId, trigger);
    } catch (err) {
      // Never crash or block normal job operations if background moderation encounters an error
      console.error(`[JobModeration] Background check failed for job ${jobId}:`, err.message);
    } finally {
      inFlightModerationJobs.delete(jobId);
    }
  });
}

module.exports = {
  computeJobContentHash,
  runPrePublishChecks,
  evaluateJobForModeration,
  scheduleAsyncModeration,
};
