import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './errorHandler.js';
export function authenticate(req,res,next) {
  const [kind,token] = (req.get('authorization') || '').split(' ');
  if (kind !== 'Bearer' || !token) return next(new AppError(401,'UNAUTHENTICATED','Authentication required.'));
  try { const payload=jwt.verify(token,env.JWT_SECRET,{algorithms:['HS256']}); if (!payload.sub) throw new Error(); req.user={id:payload.sub}; next(); }
  catch { next(new AppError(401,'INVALID_TOKEN','Access token is invalid or expired.')); }
}
