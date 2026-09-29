import express from 'express'; import helmet from 'helmet'; import cors from 'cors'; import rateLimit from 'express-rate-limit';
import {env} from './config/env.js'; import {errorHandler,notFound} from './middleware/errorHandler.js';
import auth from './modules/auth/auth.routes.js'; import profile from './modules/profile/profile.routes.js'; import candidate from './modules/candidate/candidate.routes.js'; import recruiter from './modules/recruiter/recruiter.routes.js'; import admin from './modules/admin/admin.routes.js';
const app=express(); app.disable('x-powered-by'); app.use(helmet()); app.use(cors({origin:env.CORS_ORIGIN.split(',').map(x=>x.trim()),credentials:false})); app.use(express.json({limit:'1mb'}));
const authLimit=rateLimit({windowMs:15*60*1000,limit:20,standardHeaders:true,legacyHeaders:false,message:{success:false,message:'Too many authentication requests. Try again later.',code:'RATE_LIMITED'}});
app.use('/api/auth',authLimit,auth); app.use('/api/profile',profile); app.use('/api/candidate',candidate); app.use('/api/recruiter',recruiter); app.use('/api/admin',admin); app.use(notFound); app.use(errorHandler); export default app;
