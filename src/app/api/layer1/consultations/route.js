/**
 * LAYER-1 API: Consultations
 * POST /api/layer1/consultations — Create a consultation
 * GET  /api/layer1/consultations — List consultations
 *
 * LAYER-111 FIX (Phase 2B):
 *  - case_status now seeds as "STARTED" (not "Active" which violates CHECK constraint)
 *  - Clinical fields no longer written to consultations table (they were dropped)
 *  - Clinical fields are written to consultation_clinical as a separate row
 */

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import { logActivity } from "@/lib/layer1/activityLogger";
import { incrementUsageCount } from "@/lib/layer1/diagnosisService";
import { insertOutboxEvent } from "@/lib/layer1/eventOutbox";

export async function POST(req) {
    try {
        const body = await req.json();
        const {
            care_episode_id,
            appointment_id,
            patient_id,
            doctor_id,
            specialty_id,
            // Clinical fields — kept in destructure for convenience but written to consultation_clinical
            primary_diagnosis_id,
            primary_diagnosis_custom,
            secondary_diagnoses,
            severity_level,
            chronicity,
            treatment_type,
            surgery_advised,
            chief_complaint,
            clinical_notes,
            vitals,
            // Non-clinical flow-control fields
            follow_up_required,
            follow_up_days,
            follow_up_date,
            source_type,
        } = body;

        // Validate required fields
        if (!care_episode_id || !patient_id || !doctor_id) {
            return NextResponse.json(
                { success: false, error: "care_episode_id, patient_id, and doctor_id are required" },
                { status: 400 }
            );
        }

        // ── STEP 1: Insert consultation (non-clinical flow-control fields ONLY) ──
        // Clinical fields were removed from this table by layer111_addition_complete.sql.
        // Inserting them here would cause a DB error (column does not exist).
        const { data, error } = await supabase
            .from("consultations")
            .insert({
                care_episode_id,
                appointment_id: appointment_id || null,
                patient_id,
                doctor_id,
                specialty_id: specialty_id || null,
                follow_up_required: follow_up_required || false,
                follow_up_days: follow_up_days || null,
                follow_up_date: follow_up_date || null,
                case_status: "STARTED",   // ← was "Active" — must match CHECK constraint enum
                source_type: source_type || "app",
            })
            .select()
            .single();

        if (error) throw error;

        // ── STEP 2: If clinical payload provided, write to consultation_clinical ──
        // (Layer-111 separation: clinical data lives in the extension table, not the base table)
        const hasClinical = primary_diagnosis_id || chief_complaint || clinical_notes || vitals;
        if (hasClinical) {
            const { error: clinicalErr } = await supabase
                .from("consultation_clinical")
                .insert({
                    consultation_id: data.id,
                    diagnosis_id: primary_diagnosis_id || null,
                    diagnosis_custom: primary_diagnosis_custom || null,
                    secondary_diagnoses: secondary_diagnoses || [],
                    severity: severity_level || null,
                    chronicity: chronicity || null,
                    treatment_type: treatment_type || null,
                    surgery_advised: surgery_advised || false,
                    complaint_id: chief_complaint || null,
                    clinical_notes: clinical_notes || null,
                    vitals: vitals || null,
                });
            if (clinicalErr) {
                console.error("consultation_clinical insert error:", clinicalErr.message);
                // Non-fatal — consultation created, clinical data can be added via manage endpoint
            }
        }

        // ── STEP 3: Track diagnosis usage ──
        if (primary_diagnosis_id) {
            await incrementUsageCount(primary_diagnosis_id);
        }

        // ── STEP 4: Log activity ──
        await logActivity({
            patient_id,
            care_episode_id,
            actor_id: doctor_id,
            module_type: "consultation",
            action_type: "created",
            reference_id: data.id,
            description: "Consultation created",
        });

        // ── STEP 5: Emit event to outbox (Layer-111 Rule) ──
        await insertOutboxEvent({
            event_type: "CONSULTATION_CREATED",
            consultation_id: data.id,
            care_episode_id,
            payload: { patient_id, doctor_id, specialty_id },
        });

        return NextResponse.json({ success: true, data }, { status: 201 });
    } catch (err) {
        console.error("Create consultation error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const patient_id = searchParams.get("patient_id");
        const doctor_id = searchParams.get("doctor_id");
        const care_episode_id = searchParams.get("care_episode_id");
        const case_status = searchParams.get("case_status");
        const page = parseInt(searchParams.get("page")) || 1;
        const limit = parseInt(searchParams.get("limit")) || 20;
        const offset = (page - 1) * limit;

        let query = supabase
            .from("consultations")
            .select(`
                *,
                specialty:specialty(id, name),
                care_episode:care_episodes(id, status, episode_type)
            `, { count: "exact" })
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (patient_id) query = query.eq("patient_id", patient_id);
        if (doctor_id) query = query.eq("doctor_id", doctor_id);
        if (care_episode_id) query = query.eq("care_episode_id", care_episode_id);
        if (case_status) query = query.eq("case_status", case_status);

        const { data, count, error } = await query;
        if (error) throw error;

        return NextResponse.json({
            success: true,
            data,
            pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
        });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
