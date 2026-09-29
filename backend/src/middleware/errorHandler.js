export class AppError extends Error { constructor(status, code, message) { super(message); this.status=status; this.code=code; } }
export function notFound(req,res,next) { next(new AppError(404,'NOT_FOUND','Route not found.')); }
export function errorHandler(err,req,res,next) {
  if (res.headersSent) return next(err);
  const known = err instanceof AppError;
  const status = known ? err.status : (err.name === 'ZodError' ? 400 : 500);
  const code = known ? err.code : (err.name === 'ZodError' ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR');
  const message = known ? err.message : (err.name === 'ZodError' ? 'Request validation failed.' : 'An unexpected error occurred.');
  if (status >= 500) console.error(err);
  res.status(status).json({success:false,message,code});
}
