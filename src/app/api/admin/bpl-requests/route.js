import { NextResponse } from "next/server";
import sql from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const url = new URL(request.url);

    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search");

    const offset = (page - 1) * limit;

    const conditions = [];

    if (status) {
      conditions.push(sql`status = ${status}`);
    }

    if (search) {
      const like = `%${search}%`;
      conditions.push(sql`(
        name ILIKE ${like} OR 
        mobile ILIKE ${like} OR 
        aadhaar_no ILIKE ${like} OR 
        ration_card_no ILIKE ${like}
      )`);
    }

    const whereClause = conditions.length > 0
      ? sql`WHERE ${conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`)}`
      : sql``;

    const [countRes, data] = await Promise.all([
      sql`SELECT count(*)::int as count FROM bpl_requests ${whereClause}`,
      sql`
        SELECT * 
        FROM bpl_requests 
        ${whereClause} 
        ORDER BY created_at DESC 
        LIMIT ${limit} OFFSET ${offset}
      `
    ]);

    const count = countRes[0]?.count || 0;

    return NextResponse.json({
      success: true,
      data,
      meta: { page, limit, total: count },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
