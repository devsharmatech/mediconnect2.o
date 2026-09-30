import postgres from 'postgres';

const globalForDb = globalThis;

const dbHost = process.env.DB_HOST || 'mediconnect-stag-db.c7iqgcom8eml.ap-south-1.rds.amazonaws.com';
const dbPort = parseInt(process.env.DB_PORT || '5432', 10);
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbName = process.env.DB_NAME;
const useSsl = process.env.DB_SSL === 'true';
const isAwsRds = dbHost && (dbHost.includes('rds.amazonaws.com') || dbHost.includes('amazonaws.com'));
const sslConfig = (useSsl || isAwsRds) ? { rejectUnauthorized: false } : false;

const hostToUse = process.env.DB_HOST_IP || dbHost;

const sql = globalForDb.sql || postgres({
  host: hostToUse,
  port: dbPort,
  database: dbName,
  username: dbUser,
  password: dbPassword,
  ssl: sslConfig,
  // Keep pool small — avoids exhausting RDS connection limit
  max: process.env.DB_MAX_CONNECTIONS ? parseInt(process.env.DB_MAX_CONNECTIONS, 10) : 10,
  // Fail fast — 5s so API routes don't chain-hang (3 queries x 10s = 30s hang)
  connect_timeout: 5,
  // Recycle idle connections quickly to avoid stale AWS socket errors
  idle_timeout: 20,
  // Recycle after 5 min to prevent AWS RDS forced disconnects
  max_lifetime: 300,
  // Disable prepared statements — prevents conflicts on Next.js hot-reload
  prepare: false,
});

if (process.env.NODE_ENV !== 'production') {
  globalForDb.sql = sql;
}

export default sql;

