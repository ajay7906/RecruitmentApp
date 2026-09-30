const { ZodError } = require('zod');
const ApiError = require('../utils/ApiError');

exports.notFound = (_req, _res, next) => next(new ApiError(404, 'Route not found', 'NOT_FOUND'));

// eslint-disable-next-line no-unused-vars
exports.errorHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(422).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Invalid input',
      errors: err.issues.map((i) => ({ field: i.path.slice(1).join('.'), message: i.message })),
    });
  }
  if (err.code === '23505') {
    return res.status(409).json({ success: false, code: 'CONFLICT', message: 'Resource already exists' });
  }
  if (err instanceof ApiError) {
    return res.status(err.status).json({ success: false, code: err.code, message: err.message });
  }
  console.error(err);
  res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message: 'Something went wrong' });
};
