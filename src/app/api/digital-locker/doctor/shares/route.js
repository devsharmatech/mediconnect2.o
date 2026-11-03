import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { getPresignedDownloadUrl, extractKeyFromUrl } from "@/lib/s3";

function resolveS3Key(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const cleanUrl = rawUrl.split("?")[0];
  const fromHelper = extractKeyFromUrl(cleanUrl);
  if (fromHelper) return fromHelper;
  const parts = cleanUrl.split("/digital-locker/");
  if (parts.length > 1) return `digital-locker/${parts[1]}`;
  return null;
}

/**
 * GET /api/digital-locker/doctor/shares?doctor_id={id}
 * Queries AWS RDS PostgreSQL for documents shared with a doctor and generates presigned S3 URLs.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get("doctor_id");

    if (!doctorId) {
      return NextResponse.json(
        { success: false, error: "Doctor ID is required" },
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
        ds.patient_id,
        ds.appointment_id,
        pd.full_name AS patient_full_name,
        d.id AS doc_id,
        d.document_name,
        d.document_type,
        d.document_url,
        d.file_size,
        d.mime_type
      FROM document_shares ds
      LEFT JOIN patient_details pd ON pd.id = ds.patient_id
      LEFT JOIN digital_locker_documents d ON d.id = ds.document_id
      WHERE ds.doctor_id = ${doctorId}
      ORDER BY ds.created_at DESC
    `;

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: true, shares: [] });
    }

    const now = new Date();
    const formattedShares = await Promise.all(
      rows.map(async (s) => {
        const expiresAt = s.expires_at ? new Date(s.expires_at) : now;
        const isExpired = expiresAt < now;
        const currentStatus =
          s.status === "ACTIVE" && isExpired ? "EXPIRED" : s.status;

        let secureUrl = s.document_url || null;
        if (secureUrl && currentStatus === "ACTIVE") {
          const expiresIn = Math.max(
            Math.floor((expiresAt.getTime() - now.getTime()) / 1000),
            300
          );
          const s3Key = resolveS3Key(secureUrl);
          if (s3Key) {
            try {
              const signed = await getPresignedDownloadUrl(s3Key, expiresIn);
              if (signed) secureUrl = signed;
            } catch (e) {
              console.warn("Presigned URL fallback:", e.message);
            }
          }
        }

        return {
          id: s.id,
          status: currentStatus,
          expires_at: s.expires_at,
          created_at: s.created_at,
          document_id: s.document_id,
          patient_id: s.patient_id,
          appointment_id: s.appointment_id,
          patient_details: {
            full_name: s.patient_full_name || "Patient",
          },
          digital_locker: s.doc_id
            ? {
                id: s.doc_id,
                document_name: s.document_name || "Medical Record",
                document_type: s.document_type || "medical_record",
                document_url: secureUrl,
                file_url: secureUrl,
                file_size: s.file_size,
                mime_type: s.mime_type,
              }
            : null,
        };
      })
    );

    return NextResponse.json({
      success: true,
      shares: formattedShares,
    });
  } catch (error) {
    console.error("Doctor shares fetch error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
