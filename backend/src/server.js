import app from './app.js'; import {env} from './config/env.js'; import {prisma} from './config/database.js';
const server=app.listen(env.PORT,()=>console.log(`API listening on ${env.PORT}`));
for (const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>server.close(async()=>{await prisma.$disconnect();process.exit(0);}));
