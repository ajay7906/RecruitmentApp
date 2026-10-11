const prisma = require('../../config/prisma');

// Every function takes an optional `db`. Pass the `tx` from prisma.$transaction(...)
// to run inside a transaction; omit it to use the normal client.

// ---------- users ----------
exports.findUserByEmail = (email, db = prisma) => db.user.findUnique({ where: { email } });

exports.findUserById = (id, db = prisma) => db.user.findUnique({ where: { id } });

exports.createUser = ({ email, passwordHash, fullName, role }, db = prisma) =>
  db.user.create({
    data: { email, passwordHash, fullName, role },
    select: { id: true, email: true, fullName: true, role: true, status: true, emailVerifiedAt: true, createdAt: true },
  });

exports.markEmailVerified = (userId, db = prisma) =>
  db.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });

exports.updatePassword = (userId, passwordHash, db = prisma) =>
  db.user.update({ where: { id: userId }, data: { passwordHash } });

// ---------- one-time auth tokens ----------
exports.createAuthToken = ({ userId, type, tokenHash, expiresAt }, db = prisma) =>
  db.authToken.create({ data: { userId, type, tokenHash, expiresAt } });

exports.invalidateAuthTokens = (userId, type, db = prisma) =>
  db.authToken.updateMany({ where: { userId, type, usedAt: null }, data: { usedAt: new Date() } });

// Consume once: returns { userId } only if the token is valid, unused and not expired.
// The `usedAt: null` guard on the updateMany makes it safe if two requests race.
exports.consumeAuthToken = async (tokenHash, type, db = prisma) => {
  const now = new Date();
  const row = await db.authToken.findFirst({
    where: { tokenHash, type, usedAt: null, expiresAt: { gt: now } },
    select: { id: true, userId: true },
  });
  if (!row) return null;
  const { count } = await db.authToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: now } });
  return count === 1 ? { userId: row.userId } : null;
};

// ---------- refresh tokens ----------
exports.createRefreshToken = ({ userId, familyId, tokenHash, expiresAt, userAgent, ip }, db = prisma) =>
  db.refreshToken.create({
    data: { userId, familyId, tokenHash, expiresAt, userAgent, ip },
    select: { id: true },
  });

exports.findRefreshToken = (tokenHash, db = prisma) => db.refreshToken.findUnique({ where: { tokenHash } });

// Revoke only if still active. Returns { count } -> 0 means someone else already used it (race / reuse).
exports.revokeActiveRefreshToken = (id, replacedBy, db = prisma) =>
  db.refreshToken.updateMany({
    where: { id, revokedAt: null },
    data: { revokedAt: new Date(), replacedBy: replacedBy || null },
  });

exports.revokeFamily = (familyId, db = prisma) =>
  db.refreshToken.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: new Date() } });

exports.revokeAllUserTokens = (userId, db = prisma) =>
  db.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
