/**
 * LAYER-1 API: Consultation Status (State Machine)
 * PATCH /api/layer1/consultations/[id]/status — Update case status via state machine
 * GET   /api/layer1/consultations/[id]/status — Get allowed transitions
 *
 * LAYER-111 FIX (Phase 2E):
 *  - Added resolveCallerFromRequest auth guard to PATCH
 *  - user_id is now resolved from auth token, NOT from request body
 *    (prevents anyone from impersonating a user_id by injecting it in body)
 */

import { NextResponse } from "next/server";
import { updateConsultationStatus, getAllowedTransitions } from "@/lib/layer1/consultationStateMachine";
import { resolveCallerFromRequest } from "@/lib/layer1/authGuard";

export async function PATCH(req, { params }) {
    try {
        const { id } = await params;

        // ── AUTH: resolve caller identity from token, NOT from body ──
        const caller = await resolveCallerFromRequest(req);
        if (!caller) {
            return NextResponse.json(
                { success: false, error: "Unauthorized — valid Bearer token required" },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { new_status, reason } = body;
        // user_id intentionally NOT taken from body — only from verified token
        const user_id = caller.id;

        if (!new_status) {
            return NextResponse.json(
                { success: false, error: "new_status is required" },
                { status: 400 }
            );
        }

        const result = await updateConsultationStatus(id, new_status, user_id, reason);

        if (!result.success) {
            return NextResponse.json(result, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

/**
 * GET /api/layer1/consultations/[id]/status — Get allowed transitions for a consultation
 */
export async function GET(req, { params }) {
    try {
        const { id } = await params;

        const { supabase } = await import("@/lib/supabaseAdmin");
        const { data, error } = await supabase
            .from("consultations")
            .select("case_status")
            .eq("id", id)
            .single();

        if (error) throw error;

        const allowed = getAllowedTransitions(data.case_status);

        return NextResponse.json({
            success: true,
            current_status: data.case_status,
            allowed_transitions: allowed,
        });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
