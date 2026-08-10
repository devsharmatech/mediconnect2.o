import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import { logActivity } from "@/lib/layer1/activityLogger";

/**
 * GET /api/external/shared-prescription/[id]
 * Fetch a shared prescription using the share ID.
 * This endpoint is for Chemists and Labs to view the structured medical data.
 */
export async function GET(req, { params }) {
    try {
        const { id } = params;

        if (!id) {
            return NextResponse.json({ success: false, error: "Share ID is required" }, { status: 400 });
        }

        // 1. Verify the share exists and is active
        const { data: share, error: shareErr } = await supabase
            .from("prescription_shares")
            .select(`
                *,
                prescription:prescriptions(*)
            `)
            .eq("id", id)
            .eq("status", "active")
            .single();

        if (shareErr || !share) {
            return NextResponse.json({ success: false, error: "Shared record not found or expired" }, { status: 404 });
        }

        // 2. Log Access Activity
        await logActivity({
            patient_id: share.shared_by,
            actor_id: share.shared_with_id,
            module_type: share.shared_with_type === "chemist" ? "pharmacy" : "lab",
            action_type: "shared_record_accessed",
            reference_id: id,
            description: `${share.shared_with_type} accessed shared prescription ${share.prescription_id}`,
            metadata: { share_id: id, type: share.shared_with_type },
        });

        // 3. Return structured data (filtered for external use)
        // We only return what the chemist/lab needs.
        const isChemist = share.shared_with_type === "chemist";

        const responseData = {
            share_info: {
                id: share.id,
                shared_at: share.created_at,
                type: share.shared_with_type
            },
            prescription: {
                id: share.prescription.id,
                doctor_id: share.prescription.doctor_id,
                patient_id: share.prescription.patient_id,
                medicines: share.prescription.medicines || [],
                // Omit clinical diagnosis, vitals, and lab tests for chemist fulfillment compliance
                lab_tests: isChemist ? [] : (share.prescription.lab_tests || []),
                vital_signs: isChemist ? {} : (share.prescription.vital_signs || {}),
                diagnosis: isChemist ? null : (share.prescription.diagnosis || null),
                special_instructions: isChemist ? "" : (share.prescription.special_instructions || ""),
                status: share.prescription.status,
                signed_at: share.prescription.signed_at
            }
        };

        return NextResponse.json({ success: true, data: responseData }, { status: 200 });
    } catch (err) {
        console.error("GET /api/external/shared-prescription error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
