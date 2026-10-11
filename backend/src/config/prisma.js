const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const env = require('./env');

// Prisma 7 talks to Postgres through a driver adapter (it uses the same `pg` driver you had before).
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

// ONE shared instance for the whole app. Never call `new PrismaClient()` in other files.
const prisma = new PrismaClient({
  adapter,
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;
