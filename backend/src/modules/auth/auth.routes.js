import { Router } from 'express';
import { register,login } from './auth.service.js';
import { registerSchema,loginSchema } from './auth.validation.js';
const router=Router();
router.post('/register',async(req,res,next)=>{try{const data=registerSchema.parse(req.body);res.status(201).json({success:true,message:'Registration successful',data:await register(data)});}catch(e){next(e);}});
router.post('/login',async(req,res,next)=>{try{res.json({success:true,message:'Login successful',data:await login(loginSchema.parse(req.body))});}catch(e){next(e);}});
export default router;
