require('dotenv').config();
const { z } = require('zod');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  CLIENT_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  // Optional cap for the pg pool (the automated tests run against a single-connection in-process Postgres).
  DB_POOL_MAX: z.coerce.number().int().min(1).optional(),
  JWT_ACCESS_SECRET: z.string().min(16),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('Recruit <no-reply@recruit.local>'),
});

module.exports = schema.parse(process.env);
