import postgres from 'postgres';

const globalForDb = globalThis;

const dbHost = process.env.DB_HOST;
const dbPort = parseInt(process.env.DB_PORT || '5432', 10);
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbName = process.env.DB_NAME;
const useSsl = process.env.DB_SSL === 'true';
const isAwsRds = dbHost && (dbHost.includes('rds.amazonaws.com') || dbHost.includes('amazonaws.com'));
const sslConfig = (useSsl || isAwsRds) ? { rejectUnauthorized: false } : false;

// In dev on Windows, local router DNS often fails or times out on CNAMEs (causing ENOTFOUND).
// Using the resolved RDS IP bypasses DNS latency and ensures 100% connection stability.
const awsRdsIpFallback = '3.111.228.139';
const hostToUse = (process.env.NODE_ENV !== 'production' && isAwsRds)
  ? (process.env.DB_HOST_IP || awsRdsIpFallback)
  : dbHost;

const sql = globalForDb.sql || postgres({
  host: hostToUse,
  port: dbPort,
  database: dbName,
  username: dbUser,
  password: dbPassword,
  ssl: sslConfig,
  max: process.env.DB_MAX_CONNECTIONS ? parseInt(process.env.DB_MAX_CONNECTIONS, 10) : 50,
  idle_timeout: 30,
  connect_timeout: 30,
});

if (process.env.NODE_ENV !== 'production') {
  globalForDb.sql = sql;
}

export default sql;
