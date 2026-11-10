/**
 * Test harness: an in-process PostgreSQL (PGlite) that runs the project's real SQL migrations,
 * exposed over a loopback socket so the app's normal Prisma + pg adapter code path is exercised.
 * No external database or Docker is required.
 */
const fs = require('fs');
const path = require('path');
const net = require('net');
const { PGlite } = require('@electric-sql/pglite');
const { citext } = require('@electric-sql/pglite/contrib/citext');
const { pgcrypto } = require('@electric-sql/pglite/contrib/pgcrypto');
const { vector } = require('@electric-sql/pglite/vector');
const { PGLiteSocketServer } = require('@electric-sql/pglite-socket');

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'src', 'db', 'migrations');

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

async function startTestDatabase({ upToMigration } = {}) {
  const db = await PGlite.create({ extensions: { citext, pgcrypto, vector } });
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    if (upToMigration && file > upToMigration) break;
    await db.exec(fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'));
  }
  const port = await freePort();
  const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1', maxConnections: 50 });
  await server.start();
  return {
    db,
    port,
    url: `postgres://postgres:postgres@127.0.0.1:${port}/postgres`,
    stop: async () => {
      await server.stop();
      await db.close();
    },
  };
}

module.exports = { startTestDatabase, MIGRATIONS_DIR };
