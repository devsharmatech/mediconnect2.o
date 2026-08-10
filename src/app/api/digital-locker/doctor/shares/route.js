import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

/**
 * GET /api/digital-locker/doctor/shares?doctor_id={id}
 * 
 * Logic:
 * 1. Fetch from 'document_shares' table for doctor_id
 * 2. Join with 'patient_details' for patient names
 * 3. Join with 'digital_locker' for document details
 * 4. Filter by status='ACTIVE' and verify expiry
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const doctorId = searchParams.get("doctor_id");

        if (!doctorId) {
            return NextResponse.json({ success: false, error: "Doctor ID is required" }, { status: 400 });
        }

        // Fetch shares for doctor
        // Using two-stage fetch for robustness
        const { data: shares, error: shareError } = await supabase
            .from("document_shares")
            .select("id, status, expires_at, created_at, document_id, patient_id, appointment_id")
            .eq("doctor_id", doctorId)
            .order("created_at", { ascending: false });

        if (shareError) throw shareError;

        if (!shares || shares.length === 0) {
            return NextResponse.json({ success: true, shares: [] });
        }

        // Fetch Patient Details
        const patientIds = [...new Set(shares.map(s => s.patient_id))];
        const { data: patientDetails, error: patientError } = await supabase
            .from("patient_details")
            .select("id, full_name")
            .in("id", patientIds);

        // Fetch Document Details
        const documentIds = [...new Set(shares.map(s => s.document_id))];
        const { data: documentDetails, error: docError } = await supabase
            .from("digital_locker_documents")
            .select("id, document_name, document_type, document_url, file_size")
            .in("id", documentIds);

        const patientMap = (patientDetails || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
        const docMap = (documentDetails || []).reduce((acc, d) => ({ ...acc, [d.id]: d }), {});

        const formattedShares = shares.map(s => {
            const isExpired = new Date(s.expires_at) < new Date();
            const currentStatus = s.status === "ACTIVE" && isExpired ? "EXPIRED" : s.status;
            
            return {
                ...s,
                status: currentStatus,
                patient_details: patientMap[s.patient_id] || { full_name: "Unknown Patient" },
                digital_locker: docMap[s.document_id] || null
            };
        });

        return NextResponse.json({
            success: true,
            shares: formattedShares
        });

    } catch (error) {
        console.error("Fetch doctor shares error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
