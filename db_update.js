const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnv();

const required = ['DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT', 'DB_NAME'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Faltam variáveis no .env: ${missing.join(', ')}`);
  process.exit(1);
}

const connectionString = `postgres://${encodeURIComponent(process.env.DB_USER)}:${encodeURIComponent(process.env.DB_PASSWORD)}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

const client = new Client({ connectionString });

async function run() {
  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL!');

    const sql = fs.readFileSync(path.join(__dirname, 'architecture', 'supabase_schema.sql'), 'utf8');
    await client.query(sql);
    console.log('Schema executed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error connecting or executing SQL:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}
run();
