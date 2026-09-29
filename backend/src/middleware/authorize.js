import { prisma } from '../config/database.js';
import { AppError } from './errorHandler.js';
export const requireRole = (...names) => async (req,res,next) => {
  try { const found=await prisma.userRole.findMany({where:{userId:req.user.id,role:{name:{in:names}}},select:{roleId:true}}); if (!found.length) throw new AppError(403,'FORBIDDEN','You do not have permission to perform this action.'); next(); } catch(e){next(e);}
};
export const requirePermission = (resource,action) => async (req,res,next) => {
  try {
    const count=await prisma.rolePermission.count({where:{role:{users:{some:{userId:req.user.id}},},permission:{resource,action}}});
    if (!count) throw new AppError(403,'FORBIDDEN','You do not have permission to perform this action.');
    next();
  } catch(e){next(e);}
};
