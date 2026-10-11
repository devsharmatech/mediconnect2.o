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
import sql from "@/lib/db";

/**
 * GET — Check if doctor has accepted agreement today
 */
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const doctor_id = searchParams.get("doctor_id");

        if (!doctor_id) return failure("doctor_id is required");

        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

        const rows = await sql`
            SELECT * FROM doctor_session_agreement
            WHERE doctor_id = ${doctor_id}::uuid AND session_date = ${today}::date
            LIMIT 1
        `;
        const agreement = rows[0] || null;

        return success("Session agreement status", {
            accepted_today: !!agreement,
            agreement,
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
        const existing = await sql`
            SELECT id FROM doctor_session_agreement
            WHERE doctor_id = ${doctor_id}::uuid AND session_date = ${today}::date
            LIMIT 1
        `;

        if (existing && existing.length > 0) {
            return success("Agreement already accepted today", { already_accepted: true });
        }

        // Insert new agreement
        const inserted = await sql`
            INSERT INTO doctor_session_agreement (
                doctor_id, session_date, accepted_at, ip_address, device_info
            ) VALUES (
                ${doctor_id}::uuid, ${today}::date, NOW(), ${ip_address || null}, ${device_info || null}
            )
            RETURNING *
        `;

        return success("Session agreement accepted", inserted[0]);

    } catch (err) {
        console.error("POST /api/doctors/session-agreement error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
