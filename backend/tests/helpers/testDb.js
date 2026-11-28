// const fs = require('fs');
// const path = require('path');
// const net = require('net');
// const { PGlite } = require('@electric-sql/pglite');
// const { citext } = require('@electric-sql/pglite/contrib/citext');
// const { pgcrypto } = require('@electric-sql/pglite/contrib/pgcrypto');
// const { vector } = require('@electric-sql/pglite/vector');
// const { PGLiteSocketServer } = require('@electric-sql/pglite-socket');

// const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'src', 'db', 'migrations');

// function freePort() {
//   return new Promise((resolve, reject) => { 
//     const srv = net.createServer();
//     srv.listen(0, '127.0.0.1', () => {
//       const { port } = srv.address();
//       srv.close(() => resolve(port));
//     });
//     srv.on('error', reject);
//   });
// }

// async function startTestDatabase({ upToMigration } = {}) {
//   const db = await PGlite.create({ extensions: { citext, pgcrypto, vector } });
//   const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
//   for (const file of files) {
//     if (upToMigration && file > upToMigration) break;
//     await db.exec(fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'));
//   }
//   const port = await freePort();
//   const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1', maxConnections: 50 });
//   await server.start();
//   return {
//     db,
//     port,
//     url: `postgresql://myuser:Ajay7906%40.com@122.161.48.175:5432/myapp_db `,
//     stop: async () => {
//       await server.stop();
//       await db.close();
//     },
//   };
// }

// module.exports = { startTestDatabase, MIGRATIONS_DIR };






const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'src', 'db', 'migrations');
const GCP_DB_URL = 'postgresql://myuser:Ajay7906%40.com@34.27.180.148:5432/myapp_db';

async function startTestDatabase({ upToMigration } = {}) {
  const pool = new Pool({ connectionString: GCP_DB_URL });

  // Clean public schema so every test run starts fresh
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');

  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    if (upToMigration && file > upToMigration) break;
    await pool.query(fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'));
  }

  return {
    db: pool,
    port: 5432,
    url: GCP_DB_URL,
    stop: async () => {
      await pool.end();
    },
  };
}

module.exports = { startTestDatabase, MIGRATIONS_DIR };