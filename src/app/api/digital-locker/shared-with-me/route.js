import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { getPresignedDownloadUrl } from "@/lib/s3";

/**
 * API: Get Documents Shared with a Doctor by a Patient (AWS RDS PostgreSQL)
 * 
 * Flow:
 * 1. Query 'document_shares' for active shares from patient to doctor in AWS RDS
 * 2. Join with 'digital_locker_documents' to get document details
 * 3. Generate presigned S3 URLs if applicable
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const doctorId = searchParams.get("doctor_id");
        const patientId = searchParams.get("patient_id");

        if (!doctorId || !patientId) {
            return NextResponse.json({ success: false, error: "Missing required IDs" }, { status: 400 });
        }

        // Fetch active shares with document details directly from AWS RDS
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
                d.created_at as doc_created_at
            FROM document_shares ds
            JOIN digital_locker_documents d ON d.id = ds.document_id
            WHERE ds.doctor_id = ${doctorId}
              AND ds.patient_id = ${patientId}
              AND ds.status = 'ACTIVE'
              AND ds.expires_at > NOW()
            ORDER BY ds.created_at DESC
        `;

        // Clean up response and generate signed URLs
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

            // Calculate remaining seconds for the signed URL
            const expiresAt = new Date(s.expires_at);
            const now = new Date();
            const expiresIn = Math.max(Math.floor((expiresAt - now) / 1000), 60);

            // Extract storage path from CloudFront / S3 URL
            let secureUrl = s.document_url;
            const urlParts = s.document_url.split("/digital-locker/");
            const storagePath = urlParts.length > 1 ? urlParts[1] : null;

            if (storagePath) {
                try {
                    const signedUrl = await getPresignedDownloadUrl(`digital-locker/${storagePath}`, expiresIn);
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
                file_type: s.document_type,
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
