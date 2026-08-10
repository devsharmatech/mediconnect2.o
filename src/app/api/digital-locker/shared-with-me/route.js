import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import { getPresignedUploadUrl, getPresignedDownloadUrl, extractKeyFromUrl } from "@/lib/s3";

/**
 * API: Get Documents Shared with a Doctor by a Patient
 * 
 * Flow:
 * 1. Query 'document_shares' for active shares from patient to doctor
 * 2. Join with 'digital_locker' to get document details
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const doctorId = searchParams.get("doctor_id");
        const patientId = searchParams.get("patient_id");

        if (!doctorId || !patientId) {
            return NextResponse.json({ success: false, error: "Missing required IDs" }, { status: 400 });
        }

        // Fetch active shares with document details
        const { data: shares, error } = await supabase
            .from("document_shares")
            .select(`
                id,
                expires_at,
                status,
                document_id,
                appointment_id,
                digital_locker_documents:document_id (
                    id,
                    document_name,
                    description,
                    document_url,
                    document_type,
                    file_size,
                    created_at
                )
            `)
            .eq("doctor_id", doctorId)
            .eq("patient_id", patientId)
            .eq("status", "ACTIVE")
            .gt("expires_at", new Date().toISOString())
            .order("created_at", { ascending: false });

        if (error) throw error;

        // Clean up response and generate signed URLs
        const documents = await Promise.all(shares.map(async (s) => {
            const doc = s.digital_locker_documents;
            if (!doc) {
                return {
                    share_id: s.id,
                    expires_at: s.expires_at,
                    appointment_id: s.appointment_id,
                    document_name: "Document Unavailable",
                    is_missing: true
                };
            }

            // Calculate remaining seconds for the signed URL
            const expiresAt = new Date(s.expires_at);
            const now = new Date();
            const expiresIn = Math.max(Math.floor((expiresAt - now) / 1000), 60); // Min 60s for buffer

            // Extract storage path from public URL
            // Format: .../storage/v1/object/public/digital-locker/filename.ext
            const urlParts = doc.document_url.split("/digital-locker/");
            const storagePath = urlParts.length > 1 ? urlParts[1] : null;

            let secureUrl = doc.document_url;
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
                share_id: s.id,
                expires_at: s.expires_at,
                appointment_id: s.appointment_id,
                id: doc.id,
                document_name: doc.document_name,
                description: doc.description,
                file_url: secureUrl, // This is now a temporary signed URL
                file_type: doc.document_type,
                file_size: doc.file_size,
                created_at: doc.created_at,
                is_secure: true
            };
        }));

        return NextResponse.json({
            success: true,
            documents
        });

    } catch (error) {
        console.error("Shared documents fetch error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
