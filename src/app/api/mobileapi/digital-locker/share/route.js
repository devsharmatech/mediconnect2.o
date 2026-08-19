import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

/**
 * API: Share Digital Document with Consent
 * 
 * Flow:
 * 1. Log DPDP-compliant consent
 * 2. Create time-bound share record
 */
export async function POST(request) {
    try {
        const { document_id, patient_id, doctor_id, appointment_id, expiry_minutes, consent_message } = await request.json();

        if (!document_id || !patient_id || !doctor_id || !expiry_minutes) {
            return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
        }

        // 1. Log Consent (Layer-111 Mandatory)
        const { data: consent, error: consentErr } = await supabase
            .from("consent_logs")
            .insert([{
                patient_id,
                consent_type: "DOCUMENT_SHARING",
                metadata: {
                    document_id,
                    doctor_id,
                    appointment_id,
                    message: consent_message,
                    expiry_minutes
                }
            }])
            .select()
            .single();

        if (consentErr) throw consentErr;

        // 2. Create Share Record
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + parseInt(expiry_minutes));

        const { data: share, error: shareErr } = await supabase
            .from("document_shares")
            .insert([{
                document_id,
                patient_id,
                doctor_id,
                appointment_id,
                consent_log_id: consent.id,
                expires_at: expiresAt.toISOString(),
                status: 'ACTIVE'
            }])
            .select()
            .single();

        if (shareErr) throw shareErr;

        return NextResponse.json({
            success: true,
            message: "Document shared successfully",
            share_id: share.id,
            expires_at: expiresAt
        });

    } catch (error) {
        console.error("Document sharing error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
