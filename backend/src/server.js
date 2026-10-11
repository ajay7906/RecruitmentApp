const app = require('./app');
const env = require('./config/env');
const prisma = require('./config/prisma');

const server = app.listen(env.PORT, () => console.log(`API running on :${env.PORT}`));

const shutdown = () => server.close(async () => { await prisma.$disconnect(); process.exit(0); });
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
