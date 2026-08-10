/**
 * LAYER-1 API: Single Consultation
 * GET   /api/layer1/consultations/[id] — Get consultation details
 * PATCH /api/layer1/consultations/[id] — Update non-clinical flow-control fields
 *
 * LAYER-111 FIX (Phase 2C):
 *  - Removed all clinical fields from allowedFields (they live in consultation_clinical)
 *  - Added requireDoctorOwnership auth guard to PATCH
 */

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import { requireDoctorOwnership } from "@/lib/layer1/authGuard";

export async function GET(req, { params }) {
    try {
        const { id } = await params;

        const { data, error } = await supabase
            .from("consultations")
            .select(`
                *,
                specialty:specialty(id, name),
                care_episode:care_episodes(id, status, episode_type, created_at),
                doctor:users!consultations_doctor_id_fkey(id, phone_number, details),
                patient:users!consultations_patient_id_fkey(id, phone_number, details),
                consultation_clinical(*)
            `)
            .eq("id", id)
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function PATCH(req, { params }) {
    try {
        const { id } = await params;
        const body = await req.json();

        // ── AUTH GUARD: only the owning doctor can patch ──
        const { data: existing, error: fetchErr } = await supabase
            .from("consultations")
            .select("doctor_id")
            .eq("id", id)
            .single();

        if (fetchErr || !existing) {
            return NextResponse.json({ success: false, error: "Consultation not found" }, { status: 404 });
        }

        const authCheck = await requireDoctorOwnership(req, existing.doctor_id);
        if (!authCheck.ok) {
            return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
        }

        // ── Only allow updating non-clinical flow-control fields ──
        // Clinical fields (diagnosis, notes, vitals, etc.) were removed from
        // the consultations table by layer111_addition_complete.sql.
        // Use POST /api/consultation/manage to update clinical data.
        const allowedFields = [
            "specialty_id",
            "follow_up_required",
            "follow_up_days",
            "follow_up_date",
            "consultation_mode",
            "source_type",
        ];

        const updates = {};
        for (const key of allowedFields) {
            if (body[key] !== undefined) {
                updates[key] = body[key];
            }
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json(
                { success: false, error: "No valid fields to update. To update clinical data, use POST /api/consultation/manage." },
                { status: 400 }
            );
        }

        updates.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from("consultations")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
