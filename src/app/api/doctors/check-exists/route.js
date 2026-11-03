import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const phone = searchParams.get("phone");
    const excludeId = searchParams.get("excludeId");

    if (email) {
      const rows = await sql`
        SELECT id
        FROM doctor_details
        WHERE LOWER(email) = LOWER(${email.trim()})
        LIMIT 1
      `;
      if (rows[0] && rows[0].id !== excludeId) {
        return NextResponse.json({ exists: true, message: "Email already exists" });
      }
    }

    if (phone) {
      const rows = await sql`
        SELECT id
        FROM users
        WHERE phone_number = ${phone.trim()}
        LIMIT 1
      `;
      if (rows[0] && rows[0].id !== excludeId) {
        return NextResponse.json({ exists: true, message: "Phone number already exists" });
      }
    }

    return NextResponse.json({ exists: false });
  } catch (error) {
    return NextResponse.json({ exists: false, error: error.message }, { status: 500 });
  }
}
