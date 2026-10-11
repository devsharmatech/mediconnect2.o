/**
 * API: Doctor Session Agreement (MC-3)
 *
 * POST /api/doctor/session-agreement
 *
 * Records the doctor's daily session agreement to the doctor_session_agreement
 * table for full DB auditability. Called immediately when the doctor clicks
 * "I Understand & Agree" in the DoctorDashboardLayout gate.
 *
 * Layer-111 Rule: Session agreements must be DB-persisted for medico-legal audit trails.
 * sessionStorage alone is insufficient for compliance.
 */

import { success, failure } from "@/lib/response";
import sql from "@/lib/db";
import { resolveCallerFromRequest } from "@/lib/layer1/authGuard";

export async function POST(req) {
    try {
        // Resolve identity from token — never trust body-sourced doctor_id
        const caller = await resolveCallerFromRequest(req);
        if (!caller || caller.role !== "doctor") {
            return failure("Unauthorized — valid doctor Bearer token required", null, 401);
        }

        const doctor_id = caller.id;
        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

        // Check if already agreed today (idempotent)
        const existing = await sql`
            SELECT id FROM doctor_session_agreement
            WHERE doctor_id = ${doctor_id}::uuid AND session_date = ${today}::date
            LIMIT 1
        `;

        if (existing && existing.length > 0) {
            return success("Session agreement already recorded for today", { already_agreed: true });
        }

        // Parse optional metadata from body
        let ip_address = null;
        let device_info = null;
        try {
            const body = await req.json();
            ip_address = body?.ip_address || null;
            device_info = body?.device_info || null;
        } catch {
            // body is optional — silent ignore
        }

        // Resolve client IP from headers if not provided
        if (!ip_address) {
            ip_address =
                req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                req.headers.get("x-real-ip") ||
                null;
        }

        // Resolve UA from headers if not provided
        if (!device_info) {
            device_info = req.headers.get("user-agent") || null;
        }

        // Insert session agreement
        const inserted = await sql`
            INSERT INTO doctor_session_agreement (
                doctor_id, session_date, accepted_at, ip_address, device_info
            ) VALUES (
                ${doctor_id}::uuid, ${today}::date, NOW(), ${ip_address}, ${device_info}
            )
            RETURNING id, session_date
        `;

        return success("Session agreement recorded", { id: inserted[0]?.id, session_date: today });

    } catch (err) {
        console.error("POST /api/doctor/session-agreement error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
