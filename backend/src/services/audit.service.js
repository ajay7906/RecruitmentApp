'use strict';

const prisma = require('../config/prisma');

const SENSITIVE_KEY_PATTERN = /^(password|password_?hash|current_?password|new_?password|token|token_?hash|refresh_?token|access_?token|secret|api_?key|authorization|cookie|otp|code_?hash)$/i;

/**
 * Recursively redact sensitive keys from audit log payloads so credentials/tokens are never persisted.
 */
function sanitizeAuditPayload(value, depth = 0) {
  if (depth > 8 || value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditPayload(item, depth + 1));
  }
  if (typeof value === 'object') {
    const clean = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEY_PATTERN.test(k)) {
        clean[k] = '[REDACTED]';
      } else {
        clean[k] = sanitizeAuditPayload(v, depth + 1);
      }
    }
    return clean;
  }
  return value;
}

function extractRequestMeta(req) {
  if (!req) return { ipAddress: null, userAgent: null };
  const forwarded = req.headers?.['x-forwarded-for'];
  const ipAddress =
    (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null) ||
    req.ip ||
    req.socket?.remoteAddress ||
    null;
  const userAgent = req.headers?.['user-agent'] || null;
  return { ipAddress, userAgent };
}

/**
 * Appends an immutable record to `audit_logs`.
 * @param {object} params
 * @param {object} [params.actor] - { id, role, adminRole }
 * @param {string} params.action - e.g. 'USER_SUSPENDED', 'COMPANY_APPROVED'
 * @param {string} params.entityType - e.g. 'USER', 'COMPANY', 'JOB', 'ADMIN_ROLE', 'REPORT'
 * @param {string} [params.entityId]
 * @param {object} [params.previousValue]
 * @param {object} [params.newValue]
 * @param {string} [params.reason]
 * @param {object} [params.req] - Express request for IP and User-Agent
 * @param {object} [db] - Optional Prisma transaction client
 */
async function recordAudit(
  { actor, action, entityType, entityId, previousValue, newValue, reason, req },
  db = prisma
) {
  const { ipAddress, userAgent } = extractRequestMeta(req);
  const actorRole = actor?.adminRole || actor?.role || 'SYSTEM';

  return db.auditLog.create({
    data: {
      actorId: actor?.id || null,
      actorRole: String(actorRole),
      action: String(action),
      entityType: String(entityType),
      entityId: entityId ? String(entityId) : null,
      previousValue: previousValue !== undefined ? sanitizeAuditPayload(previousValue) : undefined,
      newValue: newValue !== undefined ? sanitizeAuditPayload(newValue) : undefined,
      reason: reason || null,
      ipAddress,
      userAgent,
    },
  });
}

module.exports = {
  recordAudit,
  sanitizeAuditPayload,
};
