const apiError = require('../utils/ApiError');

exports.requireRole = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return next(new apiError(403, 'You have not access to this resource', 'FORBIDDEN'));
    }
    next();
}