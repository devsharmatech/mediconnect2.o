import { NextResponse } from "next/server";
import sql from "@/lib/db";

/**
 * GET /api/digital-locker/shares?patient_id={id}
 * Queries AWS RDS PostgreSQL for a patient's document sharing history.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patient_id");

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: "Patient ID is required" },
        { status: 400 }
      );
    }

    const rows = await sql`
      SELECT
        ds.id,
        ds.status,
        ds.expires_at,
        ds.created_at,
        ds.document_id,
        ds.doctor_id,
        ds.appointment_id,
        dd.full_name AS doctor_full_name,
        dd.specialization AS doctor_specialization,
        d.id AS doc_id,
        d.document_name,
        d.document_type,
        d.file_size
      FROM document_shares ds
      LEFT JOIN doctor_details dd ON dd.id = ds.doctor_id
      LEFT JOIN digital_locker_documents d ON d.id = ds.document_id
      WHERE ds.patient_id = ${patientId}
      ORDER BY ds.created_at DESC
    `;

    const formattedShares = (rows || []).map((s) => ({
      id: s.id,
      status: s.status,
      expires_at: s.expires_at,
      created_at: s.created_at,
      document_id: s.document_id,
      doctor_id: s.doctor_id,
      appointment_id: s.appointment_id,
      doctor_details: {
        full_name: s.doctor_full_name || "Doctor",
        specialization: s.doctor_specialization || "General",
      },
      digital_locker: s.doc_id
        ? {
            id: s.doc_id,
            document_name: s.document_name,
            document_type: s.document_type,
            file_size: s.file_size,
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      shares: formattedShares,
    });
  } catch (error) {
    console.error("Fetch shares error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/digital-locker/shares?share_id={id}
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get("share_id");

    if (!shareId) {
      return NextResponse.json(
        { success: false, error: "Share ID is required" },
        { status: 400 }
      );
    }

    await sql`
      UPDATE document_shares
      SET status = 'REVOKED'
      WHERE id = ${shareId}
    `;

    return NextResponse.json({
      success: true,
      message: "Share revoked successfully",
    });
  } catch (error) {
    console.error("Revoke share error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
