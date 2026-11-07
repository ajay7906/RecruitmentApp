const ApiError = require('../utils/ApiError');
const { resolveUserPermissions } = require('../modules/admin/admin.permissions');

exports.requireRole = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new ApiError(403, 'You do not have access to this resource', 'FORBIDDEN'));
  }
  next();
};

exports.requireAdmin = () => (req, _res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return next(new ApiError(403, 'Administrative privileges required', 'ADMIN_REQUIRED'));
  }
  next();
};

exports.requireAdminRole = (...adminRoles) => (req, _res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return next(new ApiError(403, 'Administrative privileges required', 'ADMIN_REQUIRED'));
  }
  const effectiveAdminRole = req.user.adminRole || 'ADMIN';
  if (!adminRoles.includes(effectiveAdminRole)) {
    return next(new ApiError(403, 'Insufficient administrative role', 'INSUFFICIENT_ADMIN_ROLE'));
  }
  next();
};

exports.requirePermission = (...requiredPermissions) => async (req, _res, next) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new ApiError(403, 'Administrative privileges required', 'ADMIN_REQUIRED'));
    }

    const effectiveAdminRole = req.user.adminRole || 'ADMIN';

    if (!Array.isArray(req.user.permissions)) {
      req.user.permissions = await resolveUserPermissions(req.user.id, effectiveAdminRole);
    }

    const missing = requiredPermissions.filter((perm) => !req.user.permissions.includes(perm));
    if (missing.length > 0) {
      return next(
        new ApiError(
          403,
          `Missing required permission(s): ${missing.join(', ')}`,
          'INSUFFICIENT_PERMISSIONS',
          { missingPermissions: missing }
        )
      );
    }

    next();
  } catch (err) {
    next(err);
  }
};

exports.requireAnyPermission = (...anyOfPermissions) => async (req, _res, next) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new ApiError(403, 'Administrative privileges required', 'ADMIN_REQUIRED'));
    }

    const effectiveAdminRole = req.user.adminRole || 'ADMIN';

    if (!Array.isArray(req.user.permissions)) {
      req.user.permissions = await resolveUserPermissions(req.user.id, effectiveAdminRole);
    }

    const hasAny = anyOfPermissions.some((perm) => req.user.permissions.includes(perm));
    if (!hasAny) {
      return next(
        new ApiError(
          403,
          `Requires at least one of: ${anyOfPermissions.join(', ')}`,
          'INSUFFICIENT_PERMISSIONS',
          { requiredAnyOf: anyOfPermissions }
        )
      );
    }

    next();
  } catch (err) {
    next(err);
  }
};
