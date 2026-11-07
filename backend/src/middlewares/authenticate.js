const jwt = require('jsonwebtoken');
const env = require('../config/env');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');

exports.authenticate = async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new ApiError(401, 'Authentication required', 'NO_TOKEN'));

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
  } catch {
    return next(new ApiError(401, 'Invalid or expired token', 'INVALID_TOKEN'));
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        adminRole: true,
        status: true,
        emailVerifiedAt: true,
      },
    });

    if (!user) {
      return next(new ApiError(401, 'Account no longer exists', 'USER_NOT_FOUND'));
    }

    if (user.status === 'suspended') {
      return next(new ApiError(403, 'Account is suspended', 'ACCOUNT_SUSPENDED'));
    }

    if (user.status === 'inactive') {
      return next(new ApiError(403, 'Account is deactivated', 'ACCOUNT_INACTIVE'));
    }

    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      adminRole: user.adminRole || null,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
    };

    next();
  } catch (err) {
    next(err);
  }
};

exports.authorize = (...roles) => (req, _res, next) =>
  roles.includes(req.user?.role) ? next() : next(new ApiError(403, 'Forbidden', 'FORBIDDEN'));
