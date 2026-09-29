import { z } from 'zod';
export const registerSchema=z.object({email:z.string().email().max(320),password:z.string().min(12).max(128),role:z.string().default('CANDIDATE'),firstName:z.string().trim().min(1).max(100),lastName:z.string().trim().max(100).optional(),phone:z.string().trim().max(32).optional(),companyId:z.string().uuid().optional()}).strict().superRefine((d,c)=>{if(d.role==='CANDIDATE'&&d.companyId)c.addIssue({code:'custom',path:['companyId'],message:'Candidates cannot set a company.'});});
export const loginSchema=z.object({email:z.string().email().max(320),password:z.string().min(1).max(128)}).strict();
export const changePasswordSchema=z.object({currentPassword:z.string().min(1).max(128),newPassword:z.string().min(12).max(128)}).strict();
