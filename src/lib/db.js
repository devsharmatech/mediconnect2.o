import postgres from 'postgres';

const globalForDb = globalThis;

const dbHost = process.env.DB_HOST || 'mediconnect-stag-db.c7iqgcom8eml.ap-south-1.rds.amazonaws.com';
const dbPort = parseInt(process.env.DB_PORT || '5432', 10);
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || 'vcMQixBUD7XldJsxFkJQ';
const dbName = process.env.DB_NAME || 'mediconnect';
const useSsl = process.env.DB_SSL === 'true' || true;
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
  // Keep pool appropriately sized for concurrent requests
  max: process.env.DB_MAX_CONNECTIONS ? parseInt(process.env.DB_MAX_CONNECTIONS, 10) : 20,
  // 30s connect timeout prevents false write CONNECT_TIMEOUT errors across WAN/internet to AWS RDS
  connect_timeout: 30,
  // Keep connections warm for 120s to avoid latency overhead of repeated TLS handshakes
  idle_timeout: 120,
  // Recycle after 5 min to prevent AWS RDS forced disconnects
  max_lifetime: 300,
  // Disable prepared statements — prevents conflicts on Next.js hot-reload
  prepare: false,
});

if (process.env.NODE_ENV !== 'production') {
  globalForDb.sql = sql;
}

export default sql;

