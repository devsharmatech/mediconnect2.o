export const dynamic = 'force-dynamic';
import sql from "@/lib/db";

export async function GET() {
  try {
    const [{ now }] = await sql`SELECT NOW() as now`;
    return Response.json({
      success: true,
      database: "AWS RDS PostgreSQL",
      connected: true,
      db_time: now,
      host: process.env.DB_HOST ? `${process.env.DB_HOST.slice(0, 12)}...` : 'configured'
    });
  } catch (err) {
    return Response.json({
      success: false,
      database: "AWS RDS PostgreSQL",
      connected: false,
      error: err.message
    }, { status: 500 });
  }
}
