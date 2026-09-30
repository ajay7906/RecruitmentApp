const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../../config/env');
const { withTransaction } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { randomToken, sha256 } = require('../../utils/crypto');
const repo = require('./auth.repository');
const mail = require('../../services/email.service');

const HOUR = 60 * 60 * 1000;
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 12); // equalises timing for unknown emails

const publicUser = (u) => ({
  id: u.id,
  email: u.email,
  fullName: u.full_name,
  role: u.role,
  emailVerified: !!u.email_verified_at,
});

const signAccessToken = (user) =>
  jwt.sign({ role: user.role }, env.JWT_ACCESS_SECRET, { subject: user.id, expiresIn: env.ACCESS_TOKEN_TTL });

async function issueRefreshToken(user, meta, familyId, client) {
  const raw = randomToken();
  const row = await repo.createRefreshToken(
    {
      userId: user.id,
      familyId: familyId || crypto.randomUUID(),
      tokenHash: sha256(raw),
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * HOUR),
      userAgent: meta.userAgent,
      ip: meta.ip,
    },
    client
  );
  return { raw, id: row.id };
}

async function createAndSendToken(user, type, ttlMs, sender, client) {
  const raw = randomToken();
  await repo.invalidateAuthTokens(user.id, type, client);
  await repo.createAuthToken(
    { userId: user.id, type, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + ttlMs) },
    client
  );
  return () => sender(user.email, raw).catch((e) => console.error('Email failed', e.message));
}

exports.register = async ({ fullName, email, password, role }) => {
  if (await repo.findUserByEmail(email)) throw new ApiError(409, 'Email already registered', 'EMAIL_EXISTS');
  const passwordHash = await bcrypt.hash(password, 12);

  const { user, sendMail } = await withTransaction(async (client) => {
    const user = await repo.createUser({ email, passwordHash, fullName, role }, client);
    const sendMail = await createAndSendToken(user, 'email_verification', 24 * HOUR, mail.sendVerificationEmail, client);
    return { user, sendMail };
  });
  sendMail(); // after commit; swap for a BullMQ job when you add the queue
  return publicUser(user);
};

exports.login = async ({ email, password }, meta) => {
  const user = await repo.findUserByEmail(email);
  const ok = await bcrypt.compare(password, user?.password_hash || DUMMY_HASH);
  if (!user || !ok) throw new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  if (user.status !== 'active') throw new ApiError(403, 'Account suspended', 'ACCOUNT_SUSPENDED');
  if (!user.email_verified_at) throw new ApiError(403, 'Please verify your email first', 'EMAIL_NOT_VERIFIED');

  const refresh = await issueRefreshToken(user, meta);
  return { user: publicUser(user), accessToken: signAccessToken(user), refreshToken: refresh.raw };
};

exports.refresh = async (rawToken, meta) => {
  if (!rawToken) throw new ApiError(401, 'No refresh token', 'NO_REFRESH_TOKEN');

  // Reuse detection must persist even though we throw -> handled outside the failing transaction
  let reuseDetectedFamily = null;
  try {
    return await withTransaction(async (client) => {
      const existing = await repo.findRefreshToken(sha256(rawToken), client);
      if (!existing) throw new ApiError(401, 'Invalid refresh token', 'INVALID_REFRESH_TOKEN');
      if (existing.revoked_at) {
        reuseDetectedFamily = existing.family_id;
        throw new ApiError(401, 'Session expired, please log in again', 'REFRESH_REUSE');
      }
      if (existing.expires_at < new Date()) throw new ApiError(401, 'Session expired', 'REFRESH_EXPIRED');

      const user = await repo.findUserById(existing.user_id);
      if (!user || user.status !== 'active') throw new ApiError(401, 'Account unavailable', 'ACCOUNT_UNAVAILABLE');

      const next = await issueRefreshToken(user, meta, existing.family_id, client);
      await repo.revokeRefreshToken(existing.id, next.id, client);
      return { user: publicUser(user), accessToken: signAccessToken(user), refreshToken: next.raw };
    });
  } catch (err) {
    if (reuseDetectedFamily) await repo.revokeFamily(reuseDetectedFamily); // token theft suspected
    throw err;
  }
};

exports.logout = async (rawToken) => {
  if (!rawToken) return;
  await withTransaction(async (client) => {
    const existing = await repo.findRefreshToken(sha256(rawToken), client);
    if (existing && !existing.revoked_at) await repo.revokeRefreshToken(existing.id, null, client);
  });
};

exports.verifyEmail = async (token) => {
  await withTransaction(async (client) => {
    const row = await repo.consumeAuthToken(sha256(token), 'email_verification', client);
    if (!row) throw new ApiError(400, 'Invalid or expired token', 'INVALID_TOKEN');
    await repo.markEmailVerified(row.user_id, client);
  });
};

exports.resendVerification = async (email) => {
  const user = await repo.findUserByEmail(email);
  if (!user || user.email_verified_at) return; // never reveal account state
  const sendMail = await withTransaction((client) =>
    createAndSendToken(user, 'email_verification', 24 * HOUR, mail.sendVerificationEmail, client)
  );
  sendMail();
};

exports.forgotPassword = async (email) => {
  const user = await repo.findUserByEmail(email);
  if (!user || user.status !== 'active') return; // same response either way
  const sendMail = await withTransaction((client) =>
    createAndSendToken(user, 'password_reset', HOUR, mail.sendPasswordResetEmail, client)
  );
  sendMail();
};

exports.resetPassword = async ({ token, newPassword }) => {
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await withTransaction(async (client) => {
    const row = await repo.consumeAuthToken(sha256(token), 'password_reset', client);
    if (!row) throw new ApiError(400, 'Invalid or expired token', 'INVALID_TOKEN');
    await repo.updatePassword(row.user_id, passwordHash, client);
    await repo.markEmailVerified(row.user_id, client); // they proved inbox ownership
    await repo.revokeAllUserTokens(row.user_id, client); // log out everywhere
  });
};

exports.changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await repo.findUserById(userId);
  if (!user?.password_hash || !(await bcrypt.compare(currentPassword, user.password_hash))) {
    throw new ApiError(400, 'Current password is incorrect', 'WRONG_PASSWORD');
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await withTransaction(async (client) => {
    await repo.updatePassword(userId, passwordHash, client);
    await repo.revokeAllUserTokens(userId, client);
  });
};

exports.me = async (userId) => {
  const user = await repo.findUserById(userId);
  if (!user) throw new ApiError(404, 'User not found', 'NOT_FOUND');
  return publicUser(user);
};
