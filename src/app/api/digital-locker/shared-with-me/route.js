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
 * API: Get Documents Shared with a Doctor by a Patient (AWS RDS PostgreSQL)
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const doctorId = searchParams.get("doctor_id");
        const patientId = searchParams.get("patient_id");

        if (!doctorId || !patientId) {
            return NextResponse.json({ success: false, error: "Missing required IDs" }, { status: 400 });
        }

        const shares = await sql`
            SELECT 
                ds.id as share_id,
                ds.expires_at,
                ds.status,
                ds.document_id,
                ds.appointment_id,
                d.id as doc_id,
                d.document_name,
                d.description,
                d.document_url,
                d.document_type,
                d.file_size,
                d.mime_type,
                d.created_at as doc_created_at
            FROM document_shares ds
            JOIN digital_locker_documents d ON d.id = ds.document_id
            WHERE ds.doctor_id = ${doctorId}
              AND ds.patient_id = ${patientId}
              AND ds.status = 'ACTIVE'
              AND ds.expires_at > NOW()
            ORDER BY ds.created_at DESC
        `;

        const documents = await Promise.all(shares.map(async (s) => {
            if (!s.document_url) {
                return {
                    share_id: s.share_id,
                    expires_at: s.expires_at,
                    appointment_id: s.appointment_id,
                    document_name: s.document_name || "Document Unavailable",
                    is_missing: true,
                };
            }

            const expiresAt = new Date(s.expires_at);
            const now = new Date();
            const expiresIn = Math.max(Math.floor((expiresAt - now) / 1000), 300);

            let secureUrl = s.document_url;
            const s3Key = resolveS3Key(s.document_url);

            if (s3Key) {
                try {
                    const signedUrl = await getPresignedDownloadUrl(s3Key, expiresIn);
                    if (signedUrl) {
                        secureUrl = signedUrl;
                    }
                } catch (err) {
                    console.error("Failed to generate presigned URL, falling back to public URL:", err);
                }
            }

            return {
                share_id: s.share_id,
                expires_at: s.expires_at,
                appointment_id: s.appointment_id,
                id: s.doc_id,
                document_name: s.document_name,
                description: s.description,
                file_url: secureUrl,
                document_url: secureUrl,
                file_type: s.document_type,
                document_type: s.document_type,
                mime_type: s.mime_type,
                file_size: s.file_size,
                created_at: s.doc_created_at,
                is_secure: true,
            };
        }));

        return NextResponse.json({
            success: true,
            documents,
        });

    } catch (error) {
        console.error("Shared documents fetch error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
