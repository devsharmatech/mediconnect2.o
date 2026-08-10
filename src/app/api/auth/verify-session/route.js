import sql from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ role: null }, { status: 200 });
    }

    // Strict parameter hardening: enforce valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      return NextResponse.json({ role: null }, { status: 200 });
    }

    const users = await sql`
      SELECT role FROM users WHERE id = ${token} LIMIT 1
    `;

    if (!users || users.length === 0) {
      return NextResponse.json({ role: null }, { status: 200 });
    }

    return NextResponse.json({ role: users[0].role });
  } catch (error) {
    console.error("[verify-session] Session verification error:", error);
    return NextResponse.json({ role: null }, { status: 500 });
  }
}
