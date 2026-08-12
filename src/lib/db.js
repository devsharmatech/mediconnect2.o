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

const sql = globalForDb.sql || postgres({
  host: dbHost,
  port: dbPort,
  database: dbName,
  username: dbUser,
  password: dbPassword,
  ssl: sslConfig,
  max: process.env.DB_MAX_CONNECTIONS ? parseInt(process.env.DB_MAX_CONNECTIONS, 10) : 50, // Increased max connections
  idle_timeout: 30, // idle connection timeout in seconds
  connect_timeout: 30, // Increased connect timeout in seconds
});

if (process.env.NODE_ENV !== 'production') {
  globalForDb.sql = sql;
}

export default sql;
