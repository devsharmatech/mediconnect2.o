import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET — Check if lab has accepted DPDP consent today (Asia/Kolkata timezone)
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const lab_id = searchParams.get("lab_id");

    if (!lab_id || !UUID_REGEX.test(lab_id)) {
      return failure("valid lab_id is required", null, 400, { headers: corsHeaders });
    }

    const logs = await sql`
      SELECT created_at, details
      FROM lab_activity_logs
      WHERE lab_id = ${lab_id} AND action = 'DAILY_DPDP_CONSENT'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const lastLog = logs && logs[0];
    let acceptedToday = false;

    if (lastLog) {
      const options = { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" };
      const formatter = new Intl.DateTimeFormat("en-US", options);
      
      const logDateStr = formatter.format(new Date(lastLog.created_at));
      const todayDateStr = formatter.format(new Date());

      acceptedToday = logDateStr === todayDateStr;
    }

    return success(
      "Daily DPDP consent status",
      {
        accepted_today: acceptedToday,
        last_accepted_at: lastLog ? lastLog.created_at : null,
      },
      200,
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("GET /api/lab/dpdp-consent error:", err);
    return failure("Internal server error", err.message, 500, { headers: corsHeaders });
  }
}

/**
 * POST — Record daily DPDP consent for a lab
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { lab_id, ip_address, device_info } = body || {};

    if (!lab_id || !UUID_REGEX.test(lab_id)) {
      return failure("valid lab_id is required", null, 400, { headers: corsHeaders });
    }

    const now = new Date().toISOString();

    const [data] = await sql`
      INSERT INTO lab_activity_logs (lab_id, action, details, created_at)
      VALUES (
        ${lab_id},
        'DAILY_DPDP_CONSENT',
        ${sql.json({
          timestamp: now,
          ip_address: ip_address || null,
          device_info: device_info || null,
          compliance: "DPDP_ACT_2023",
          version: "1.0",
        })},
        NOW()
      )
      RETURNING *
    `;

    return success("DPDP Consent recorded successfully", data, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("POST /api/lab/dpdp-consent error:", err);
    return failure("Internal server error", err.message, 500, { headers: corsHeaders });
  }
}
