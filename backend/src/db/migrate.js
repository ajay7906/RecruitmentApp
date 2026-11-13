const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function run() {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);

  const dir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const { rows } = await pool.query('SELECT name FROM schema_migrations');
  const done = new Set(rows.map((r) => r.name));

  // If database already contains pre-migration tables from manual setup, baseline them safely
  if (done.size === 0) {
    const { rows: existingTables } = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users', 'candidate_profiles')"
    );
    if (existingTables.length > 0) {
      await pool.query(
        "INSERT INTO schema_migrations (name) VALUES ('001_init.sql'), ('002_candidate_profiles.sql') ON CONFLICT DO NOTHING"
      );
      done.add('001_init.sql');
      done.add('002_candidate_profiles.sql');
      console.log('Baselined pre-existing migrations: 001_init.sql, 002_candidate_profiles.sql');
    }
  }

  for (const file of files) {
    if (done.has(file)) continue;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(fs.readFileSync(path.join(dir, file), 'utf8'));
      await client.query('INSERT INTO schema_migrations(name) VALUES($1)', [file]);
      await client.query('COMMIT');
      console.log('applied', file);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
  await pool.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
