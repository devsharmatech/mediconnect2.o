/**
 * API: Drug Safety Check
 * 
 * POST /api/consultation/safety-check — Run all drug safety checks for a consultation
 * GET  /api/consultation/safety-check — Get existing flags for a consultation
 */

import { success, failure } from "@/lib/response";
import { runAllSafetyChecks, normalizeDrug } from "@/lib/layer1/drugSafetyEngine";
import { supabase } from "@/lib/supabaseAdmin";

/**
 * POST — Run all drug safety checks
 * Body: { consultation_id }
 */
export async function POST(req) {
    try {
        const body = await req.json();
        const { consultation_id } = body;

        if (!consultation_id) {
            return failure("consultation_id is required");
        }

        const result = await runAllSafetyChecks(consultation_id);

        const statusCode = result.has_critical ? 422 : 200;
        const message = result.has_critical
            ? "Critical safety flags found — doctor acknowledgment required"
            : result.has_warnings
                ? "Safety warnings found — review recommended"
                : "No safety issues found";

        return success(message, result, statusCode);

    } catch (err) {
        console.error("POST /api/consultation/safety-check error:", err);
        return failure("Internal server error", err.message, 500);
    }
}

/**
 * GET — Retrieve existing safety flags for a consultation
 * Query: ?consultation_id=xxx
 */
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const consultation_id = searchParams.get("consultation_id");

        if (!consultation_id) {
            return failure("consultation_id query parameter is required");
        }

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(consultation_id)) {
            return failure("Invalid consultation_id format — must be a valid UUID");
        }

        const { data: flags, error } = await supabase
            .from("consultation_flags")
            .select("*")
            .eq("consultation_id", consultation_id)
            .order("created_at", { ascending: false });

        if (error) throw error;

        const summary = {
            total: flags?.length || 0,
            high: flags?.filter(f => f.severity === "HIGH").length || 0,
            medium: flags?.filter(f => f.severity === "MEDIUM").length || 0,
            low: flags?.filter(f => f.severity === "LOW").length || 0,
            acknowledged: flags?.filter(f => f.acknowledged === true).length || 0,
        };

        return success("Flags retrieved", { flags, summary });

    } catch (err) {
        console.error("GET /api/consultation/safety-check error:", err);
        return failure("Internal server error", err.message, 500);
    }
}

/**
 * PUT — Acknowledge a safety flag (doctor confirms awareness)
 * Body: { flag_id, override_reason }
 */
export async function PUT(req) {
    try {
        const body = await req.json();
        const { flag_id, override_reason } = body;

        if (!flag_id) {
            return failure("flag_id is required");
        }

        const { data, error } = await supabase
            .from("consultation_flags")
            .update({
                acknowledged: true,
                acknowledged_at: new Date().toISOString(),
                override_reason: override_reason || null,
            })
            .eq("id", flag_id)
            .select()
            .single();

        if (error) throw error;

        return success("Flag acknowledged", data);

    } catch (err) {
        console.error("PUT /api/consultation/safety-check error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
