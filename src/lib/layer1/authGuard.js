/**
 * LAYER-111: Authorization Guard
 *
 * Verifies the caller identity against a required role.
 * Uses Bearer token (user_id) passed in request body or header,
 * validated strictly against the users table.
 */

import sql from "@/lib/db";

/**
 * Resolves the calling user from the Authorization header, x-user-id header, or fallback parameter.
 * Returns the user record or null if invalid/missing.
 *
 * @param {Request} req
 * @param {string|null} fallbackUserId
 * @returns {object|null} user
 */
export async function resolveCallerFromRequest(req, fallbackUserId = null) {
    const authHeader = req.headers.get("authorization") || req.headers.get("x-user-id") || "";
    let token = null;

    if (authHeader.startsWith("Bearer ")) {
        token = authHeader.replace("Bearer ", "").trim();
    } else if (authHeader) {
        token = authHeader.trim();
    }

    if (!token && fallbackUserId) {
        token = String(fallbackUserId).trim();
    }

    if (!token) return null;

    // Enforce valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
        console.warn(`[AuthGuard] Intercepted non-standard authorization parameter string format: ${token}`);
        return null;
    }

    try {
        if (sql) {
            const users = await sql`
                SELECT id, role, is_verified FROM users WHERE id = ${token} LIMIT 1
            `;
            if (users && users.length > 0) return users[0];
        }
    } catch (err) {
        console.error("[AuthGuard] SQL query error, checking Supabase Admin:", err.message);
    }

    try {
        const { supabase } = await import("@/lib/supabaseAdmin");
        const { data: user } = await supabase
            .from("users")
            .select("id, role, is_verified")
            .eq("id", token)
            .maybeSingle();

        if (user) return user;
    } catch (sErr) {
        console.error("[AuthGuard] Supabase query error:", sErr.message);
    }

    return null;
}

/**
 * Enforce that the current caller is a verified doctor
 * AND that their user ID matches the consultation's doctor_id.
 *
 * @param {Request} req
 * @param {string} expected_doctor_id  — doctor_id from the consultation record
 * @returns {{ ok: boolean, error?: string, status?: number }}
 */
export async function requireDoctorOwnership(req, expected_doctor_id) {
    const user = await resolveCallerFromRequest(req);

    if (!user) {
        return { ok: false, error: "Unauthorized — missing or invalid token", status: 401 };
    }

    if (user.role !== "doctor") {
        return { ok: false, error: "Forbidden — only doctors can complete consultations", status: 403 };
    }

    if (!user.is_verified) {
        return {
            ok: false,
            error: "Forbidden — Your account is not yet verified. Clinical actions are restricted until KYC completion.",
            status: 403,
        };
    }

    if (user.id !== expected_doctor_id) {
        return {
            ok: false,
            error: "Forbidden — caller identity does not match consultation doctor",
            status: 403,
        };
    }

    return { ok: true, user };
}

/**
 * Enforce that the current caller is the patient who owns the consultation.
 *
 * @param {Request} req
 * @param {string} expected_patient_id  — patient_id from the consultation record
 * @returns {{ ok: boolean, error?: string, status?: number }}
 */
export async function requirePatientOwnership(req, expected_patient_id) {
    const user = await resolveCallerFromRequest(req);

    if (!user) {
        return { ok: false, error: "Unauthorized — missing or invalid token", status: 401 };
    }

    if (user.role !== "patient") {
        return { ok: false, error: "Forbidden — only patients can submit outcomes", status: 403 };
    }

    if (user.id !== expected_patient_id) {
        return {
            ok: false,
            error: "Forbidden — caller identity does not match consultation patient",
            status: 403,
        };
    }

    return { ok: true, user };
}
