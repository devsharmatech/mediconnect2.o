import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

/**
 * GET /api/digital-locker/shares?patient_id={id}
 * 
 * Logic:
 * 1. Fetch from 'document_shares' table
 * 2. Join with 'doctor_details' for doctor names
 * 3. Join with 'digital_locker' for document names
 * 4. Return sorted by created_at DESC
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const patientId = searchParams.get("patient_id");

        if (!patientId) {
            return NextResponse.json({ success: false, error: "Patient ID is required" }, { status: 400 });
        }

        // 1. Fetch raw shares
        const { data: shares, error: shareError } = await supabase
            .from("document_shares")
            .select("id, status, expires_at, created_at, document_id, doctor_id, appointment_id")
            .eq("patient_id", patientId)
            .order("created_at", { ascending: false });

        if (shareError) throw shareError;

        if (!shares || shares.length === 0) {
            return NextResponse.json({ success: true, shares: [] });
        }

        // 2. Fetch Doctor Details
        const doctorIds = [...new Set(shares.map(s => s.doctor_id))];
        const { data: doctorDetails, error: doctorError } = await supabase
            .from("doctor_details")
            .select("id, full_name, specialization")
            .in("id", doctorIds);

        // 3. Fetch Document Details
        const documentIds = [...new Set(shares.map(s => s.document_id))];
        const { data: documentDetails, error: docError } = await supabase
            .from("digital_locker_documents")
            .select("id, document_name, document_type, file_size")
            .in("id", documentIds);

        // 4. Map everything together
        const doctorMap = (doctorDetails || []).reduce((acc, d) => ({ ...acc, [d.id]: d }), {});
        const docMap = (documentDetails || []).reduce((acc, d) => ({ ...acc, [d.id]: d }), {});

        const formattedShares = shares.map(s => ({
            ...s,
            doctor_details: doctorMap[s.doctor_id] || { full_name: "Unknown Doctor", specialization: "General" },
            digital_locker: docMap[s.document_id] || null
        }));

        return NextResponse.json({
            success: true,
            shares: formattedShares
        });

    } catch (error) {
        console.error("Fetch shares error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * DELETE /api/digital-locker/shares?share_id={id}
 * 
 * Logic:
 * 1. Update status to 'REVOKED'
 */
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const shareId = searchParams.get("share_id");

        if (!shareId) {
            return NextResponse.json({ success: false, error: "Share ID is required" }, { status: 400 });
        }

        const { error } = await supabase
            .from("document_shares")
            .update({ status: "REVOKED" })
            .eq("id", shareId);

        if (error) throw error;

        return NextResponse.json({ success: true, message: "Share revoked successfully" });

    } catch (error) {
        console.error("Revoke share error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
