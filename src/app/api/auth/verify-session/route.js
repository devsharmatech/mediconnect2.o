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
      SELECT u.id, u.role, u.phone_number, u.status, pd.full_name as patient_name
      FROM users u
      LEFT JOIN patient_details pd ON pd.id = u.id
      WHERE u.id = ${token}
      LIMIT 1
    `;

    if (!users || users.length === 0) {
      return NextResponse.json({ role: null, valid: false }, { status: 200 });
    }

    const u = users[0];
    const isDeletedOrAnonymized = 
      u.status === "deleted" ||
      String(u.phone_number || "").startsWith("ANONYMIZED_") ||
      u.patient_name === "DE-IDENTIFIED PATIENT";

    if (isDeletedOrAnonymized) {
      return NextResponse.json(
        { role: null, valid: false, is_deleted: true, error: "account_deleted" },
        { status: 401 }
      );
    }

    return NextResponse.json({ role: u.role, valid: true });
  } catch (error) {
    console.error("[verify-session] Session verification error:", error);
    return NextResponse.json({ role: null }, { status: 500 });
  }
}
