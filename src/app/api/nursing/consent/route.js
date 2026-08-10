/**
 * Nursing Consent Logs API (READ-ONLY)
 * GET - View consent logs for auditing
 * No POST/PUT/DELETE - consent is logged during request submission only
 */
import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const lead_id = searchParams.get("lead_id");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("nursing_consent_logs")
      .select("*, nursing_leads(lead_id, name, phone)", { count: "exact" });

    if (lead_id) {
      query = query.eq("lead_id", lead_id);
    }

    query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return failure("Failed to fetch consent logs", error.message, 500);
    }

    return success("Consent logs fetched", {
      logs: data || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (err) {
    return failure("Internal server error", err.message, 500);
  }
}
