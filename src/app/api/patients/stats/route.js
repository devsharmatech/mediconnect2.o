import { NextResponse } from "next/server";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [stats] = await sql`
      SELECT 
        COUNT(u.id)::int AS total,
        COUNT(CASE WHEN u.status = 1 OR u.status IS NULL THEN 1 END)::int AS active,
        COUNT(CASE WHEN pd.gender ILIKE 'male' THEN 1 END)::int AS male,
        COUNT(CASE WHEN pd.gender ILIKE 'female' THEN 1 END)::int AS female,
        COUNT(CASE WHEN u.created_at >= ${startOfMonth}::timestamptz THEN 1 END)::int AS "thisMonth"
      FROM users u
      LEFT JOIN patient_details pd ON pd.id = u.id
      WHERE u.role = 'patient'
    `;

    return NextResponse.json({
      success: true,
      data: {
        total: stats?.total || 0,
        active: stats?.active || 0,
        male: stats?.male || 0,
        female: stats?.female || 0,
        thisMonth: stats?.thisMonth || 0,
      },
    });
  } catch (err) {
    console.error("Error fetching patient stats from AWS RDS:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
