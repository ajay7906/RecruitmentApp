'use strict';

const { spawn } = require('node:child_process');
const path = require('node:path');
const { startTestDatabase } = require('../../backend/tests/helpers/testDb');

(async () => {
  console.log('[PGlite Runner] Starting PGlite + pgvector test database...');
  const srv = await startTestDatabase();
  const psycopgUrl =
    srv.url.replace('postgres://', 'postgresql+psycopg://') +
    '?sslmode=disable&gssencmode=disable';
  console.log('[PGlite Runner] Database ready at', psycopgUrl);

  const py = spawn(
    'python',
    ['-m', 'pytest', 'LLM/tests/test_ai_engine.py', '-v', '-s'],
    {
      cwd: path.resolve(__dirname, '../..'),
      stdio: 'inherit',
      env: {
        ...process.env,
        APP_ENV: 'test',
        DATABASE_URL: psycopgUrl,
        PGLITE_EXTERNAL_SERVER: '1',
        DB_POOL_SIZE: '1',
        CELERY_TASK_ALWAYS_EAGER: 'true',
        INTERNAL_API_SECRET: 'test_internal_secret_2026',
      },
    }
  );

  py.on('exit', async (code) => {
    await srv.stop();
    process.exit(code ?? 1);
  });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
