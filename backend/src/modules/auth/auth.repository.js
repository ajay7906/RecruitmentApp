const { query } = require('../../config/db');

const run = (client) => (client ? client.query.bind(client) : query);

// ---------- users ----------
exports.findUserByEmail = async (email) =>
  (await query('SELECT * FROM users WHERE email = $1', [email])).rows[0];

exports.findUserById = async (id) =>
  (await query('SELECT * FROM users WHERE id = $1', [id])).rows[0];

exports.createUser = async ({ email, passwordHash, fullName, role }, client) =>
  (
    await run(client)(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1,$2,$3,$4)
       RETURNING id, email, full_name, role, status, email_verified_at, created_at`,
      [email, passwordHash, fullName, role]
    )
  ).rows[0];

exports.markEmailVerified = (userId, client) =>
  run(client)('UPDATE users SET email_verified_at = now(), updated_at = now() WHERE id = $1', [userId]);

exports.updatePassword = (userId, passwordHash, client) =>
  run(client)('UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1', [userId, passwordHash]);

// ---------- one-time auth tokens ----------
exports.createAuthToken = ({ userId, type, tokenHash, expiresAt }, client) =>
  run(client)(
    'INSERT INTO auth_tokens (user_id, type, token_hash, expires_at) VALUES ($1,$2,$3,$4)',
    [userId, type, tokenHash, expiresAt]
  );

exports.invalidateAuthTokens = (userId, type, client) =>
  run(client)('UPDATE auth_tokens SET used_at = now() WHERE user_id=$1 AND type=$2 AND used_at IS NULL', [userId, type]);

// Atomically consume: returns the row only if valid, unused and not expired
exports.consumeAuthToken = async (tokenHash, type, client) =>
  (
    await run(client)(
      `UPDATE auth_tokens SET used_at = now()
       WHERE token_hash=$1 AND type=$2 AND used_at IS NULL AND expires_at > now()
       RETURNING user_id`,
      [tokenHash, type]
    )
  ).rows[0];

// ---------- refresh tokens ----------
exports.createRefreshToken = async ({ userId, familyId, tokenHash, expiresAt, userAgent, ip }, client) =>
  (
    await run(client)(
      `INSERT INTO refresh_tokens (user_id, family_id, token_hash, expires_at, user_agent, ip)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [userId, familyId, tokenHash, expiresAt, userAgent, ip]
    )
  ).rows[0];

exports.findRefreshToken = async (tokenHash, client) =>
  (await run(client)('SELECT * FROM refresh_tokens WHERE token_hash=$1 FOR UPDATE', [tokenHash])).rows[0];

exports.revokeRefreshToken = (id, replacedBy, client) =>
  run(client)('UPDATE refresh_tokens SET revoked_at = now(), replaced_by = $2 WHERE id=$1', [id, replacedBy || null]);

exports.revokeFamily = (familyId, client) =>
  run(client)('UPDATE refresh_tokens SET revoked_at = now() WHERE family_id=$1 AND revoked_at IS NULL', [familyId]);

exports.revokeAllUserTokens = (userId, client) =>
  run(client)('UPDATE refresh_tokens SET revoked_at = now() WHERE user_id=$1 AND revoked_at IS NULL', [userId]);
