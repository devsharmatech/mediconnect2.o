import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { logAudit } from "@/lib/layer1/auditLogger";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/**
 * GET — Check if chemist has accepted DPDP consent today (Asia/Kolkata timezone)
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const chemist_id = searchParams.get("chemist_id");

    if (!chemist_id) {
      return failure("chemist_id is required", null, 400, { headers: corsHeaders });
    }

    // Fetch the last audit log for daily consent
    const { data: logs, error } = await supabase
      .from("audit_log")
      .select("changed_at, new_state")
      .eq("entity_type", "chemist")
      .eq("entity_id", chemist_id)
      .order("changed_at", { ascending: false })
      .limit(1);

    if (error) throw error;

    const lastLog = logs && logs[0];
    let acceptedToday = false;

    if (lastLog) {
      // Robust comparison in Indian Standard Time (IST, Asia/Kolkata)
      const options = { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" };
      const formatter = new Intl.DateTimeFormat("en-US", options);
      
      const logDateStr = formatter.format(new Date(lastLog.changed_at));
      const todayDateStr = formatter.format(new Date());

      acceptedToday = logDateStr === todayDateStr;
    }

    return success(
      "Daily DPDP consent status",
      {
        accepted_today: acceptedToday,
        last_accepted_at: lastLog ? lastLog.changed_at : null,
      },
      200,
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("GET /api/chemists/dpdp-consent error:", err);
    return failure("Internal server error", err.message, 500, { headers: corsHeaders });
  }
}

/**
 * POST — Record daily DPDP consent for a chemist
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { chemist_id, ip_address, device_info } = body || {};

    if (!chemist_id) {
      return failure("chemist_id is required", null, 400, { headers: corsHeaders });
    }

    const now = new Date().toISOString();

    // Log to audit trail
    await logAudit({
      entity_type: "chemist",
      entity_id: chemist_id,
      previous_state: { dpdp_consented: false },
      new_state: {
        dpdp_consented: true,
        consented_at: now,
        ip_address: ip_address || null,
        device_info: device_info || null,
        compliance: "DPDP_ACT_2023",
        version: "1.0",
      },
      change_description: "Chemist accepted daily DPDP consent",
      changed_by: chemist_id,
    });

    return success("DPDP Consent recorded successfully", { chemist_id, consented_at: now }, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("POST /api/chemists/dpdp-consent error:", err);
    return failure("Internal server error", err.message, 500, { headers: corsHeaders });
  }
}
