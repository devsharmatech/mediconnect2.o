/**
 * API: Doctor Session Agreement (PDF Part 3-9A)
 * 
 * GET  /api/doctors/session-agreement?doctor_id=xxx — Check if agreement exists today
 * POST /api/doctors/session-agreement — Accept daily liability agreement
 * 
 * Doctor must accept liability at first consultation of each day.
 * Frontend: Show modal before first consultation if no agreement today.
 */

import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";

/**
 * GET — Check if doctor has accepted agreement today
 */
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const doctor_id = searchParams.get("doctor_id");

        if (!doctor_id) return failure("doctor_id is required");

        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

        const { data: agreement } = await supabase
            .from("doctor_session_agreement")
            .select("*")
            .eq("doctor_id", doctor_id)
            .eq("session_date", today)
            .single();

        return success("Session agreement status", {
            accepted_today: !!agreement,
            agreement: agreement || null,
            session_date: today,
        });

    } catch (err) {
        console.error("GET /api/doctors/session-agreement error:", err);
        return failure("Internal server error", err.message, 500);
    }
}

/**
 * POST — Accept daily session agreement
 * Body: { doctor_id, ip_address?, device_info? }
 */
export async function POST(req) {
    try {
        const body = await req.json();
        const { doctor_id, ip_address, device_info } = body;

        if (!doctor_id) return failure("doctor_id is required");

        const today = new Date().toISOString().split("T")[0];

        // Check if already accepted today
        const { data: existing } = await supabase
            .from("doctor_session_agreement")
            .select("id")
            .eq("doctor_id", doctor_id)
            .eq("session_date", today)
            .single();

        if (existing) {
            return success("Agreement already accepted today", { already_accepted: true });
        }

        // Insert new agreement
        const { data, error } = await supabase
            .from("doctor_session_agreement")
            .insert({
                doctor_id,
                session_date: today,
                accepted_at: new Date().toISOString(),
                ip_address: ip_address || null,
                device_info: device_info || null,
            })
            .select()
            .single();

        if (error) throw error;

        return success("Session agreement accepted", data);

    } catch (err) {
        console.error("POST /api/doctors/session-agreement error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
