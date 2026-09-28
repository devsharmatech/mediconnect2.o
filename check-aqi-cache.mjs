import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = postgres({
  host: process.env.DB_HOST_IP || process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

async function clean() {
  try {
    // Delete any stale/polluted rows in aqi_cache
    const res = await sql`DELETE FROM aqi_cache WHERE location ILIKE '%Jaipur%'`;
    console.log('Cleaned Jaipur rows from aqi_cache:', res.count);
    const delAll = await sql`DELETE FROM aqi_cache WHERE fetched_at < NOW() - INTERVAL '1 hour'`;
    console.log('Cleaned old cache entries (>1h):', delAll.count);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sql.end();
  }
}

clean();
