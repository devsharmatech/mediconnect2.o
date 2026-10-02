import { NextResponse } from "next/server";
import sql from "@/lib/db";

export const dynamic = 'force-dynamic';

// Extend an existing invitation token's expiry without resending email
export async function POST(request) {
  try {
    const { token, expiry_days = 30 } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token is required" },
        { status: 400 }
      );
    }

    const newExpiry = new Date(
      Date.now() + expiry_days * 24 * 60 * 60 * 1000
    ).toISOString();

    const updated = await sql`
      UPDATE doctor_onboarding_status
      SET 
        token_expires_at = ${newExpiry},
        updated_at = NOW()
      WHERE invitation_token = ${token}
      RETURNING doctor_id, token_expires_at
    `;

    if (!updated || updated.length === 0) {
      return NextResponse.json(
        { success: false, error: "Token not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Token extended by ${expiry_days} days`,
      new_expiry: newExpiry,
      doctor_id: updated[0].doctor_id,
    });
  } catch (error) {
    console.error("Error extending token:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
