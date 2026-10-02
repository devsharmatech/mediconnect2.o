import { NextResponse } from "next/server";
import sql from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function PATCH(request) {
  try {
    const { request_id, status } = await request.json();

    // Basic validation
    if (!request_id || !["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "request_id and valid status required" },
        { status: 400 }
      );
    }

    // Get request details
    const existingReq = await sql`
      SELECT * FROM bpl_requests WHERE id = ${request_id} LIMIT 1
    `;

    if (!existingReq || existingReq.length === 0) {
      return NextResponse.json(
        { success: false, error: "BPL request not found" },
        { status: 404 }
      );
    }

    const bplReq = existingReq[0];

    // Update request status
    await sql`
      UPDATE bpl_requests 
      SET status = ${status} 
      WHERE id = ${request_id}
    `;

    // Update is_bpl in patient_details if user_id exists
    const is_bpl = status === "approved";
    if (bplReq.user_id) {
      await sql`
        UPDATE patient_details 
        SET is_bpl = ${is_bpl} 
        WHERE id = ${bplReq.user_id}
      `;
    }

    return NextResponse.json({
      success: true,
      message: "Status updated successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
