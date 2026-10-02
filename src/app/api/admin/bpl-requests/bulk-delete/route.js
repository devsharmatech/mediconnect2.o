import { NextResponse } from "next/server";
import sql from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "ids array is required" },
        { status: 400 }
      );
    }

    await sql`
      DELETE FROM bpl_requests
      WHERE id = ANY(${ids})
    `;

    return NextResponse.json({
      success: true,
      deleted: ids.length,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
