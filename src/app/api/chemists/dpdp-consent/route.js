import sql from "@/lib/db";
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

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(chemist_id)) {
      return success("Daily DPDP consent status", { accepted_today: false, last_accepted_at: null }, 200, { headers: corsHeaders });
    }

    // Fetch the last audit log for daily consent
    const logs = await sql`
      SELECT changed_at, new_state
      FROM audit_log
      WHERE entity_type = 'chemist' AND entity_id = ${chemist_id}
      ORDER BY changed_at DESC
      LIMIT 1
    `;

    const lastLog = logs && logs[0];
    let acceptedToday = false;

    if (lastLog) {
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
