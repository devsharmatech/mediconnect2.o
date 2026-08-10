import { success, failure } from "@/lib/response";
import { updateIncidentStatus, getOpenIncidents } from "@/lib/layer1/incidentService";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function dbFetch(path, opts = {}) {
  const { headers, ...restOpts } = opts;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { 
      apikey: SERVICE_KEY, 
      Authorization: `Bearer ${SERVICE_KEY}`, 
      "Content-Type": "application/json", 
      ...headers 
    },
    ...restOpts,
  });
  return res;
}

/**
 * GET /api/admin/incidents
 * Returns paginated ops_incident_log with summary counts.
 * Query params: page, limit, priority (P1|P2|P3), status (OPEN|RESOLVED|INVESTIGATING), source
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page     = parseInt(searchParams.get("page") || "1");
    const limit    = parseInt(searchParams.get("limit") || "20");
    const priority = searchParams.get("priority");
    const status   = searchParams.get("status");
    const source   = searchParams.get("source");
    const offset   = (page - 1) * limit;

    let filters = `order=created_at.desc&limit=${limit}&offset=${offset}`;
    if (priority) filters += `&priority=eq.${priority}`;
    if (status)   filters += `&status=eq.${status}`;
    if (source)   filters += `&source=eq.${source}`;

    const res   = await dbFetch(`ops_incident_log?${filters}`, { headers: { Prefer: "count=exact" } });
    const items = await res.json();
    const total = parseInt(res.headers.get("content-range")?.split("/")[1] || "0", 10);

    // Summary counts by priority and status
    const [p1Res, p2Res, openRes, resolvedRes] = await Promise.all([
      dbFetch("ops_incident_log?priority=eq.P1&status=eq.OPEN&select=id", { headers: { Prefer: "count=exact" } }),
      dbFetch("ops_incident_log?priority=eq.P2&status=eq.OPEN&select=id", { headers: { Prefer: "count=exact" } }),
      dbFetch("ops_incident_log?status=eq.OPEN&select=id",                { headers: { Prefer: "count=exact" } }),
      dbFetch("ops_incident_log?status=eq.RESOLVED&select=id",            { headers: { Prefer: "count=exact" } }),
    ]);

    const summary = {
      p1_open:  parseInt(p1Res.headers.get("content-range")?.split("/")[1] || "0", 10),
      p2_open:  parseInt(p2Res.headers.get("content-range")?.split("/")[1] || "0", 10),
      total_open:     parseInt(openRes.headers.get("content-range")?.split("/")[1] || "0", 10),
      total_resolved: parseInt(resolvedRes.headers.get("content-range")?.split("/")[1] || "0", 10),
    };

    return success("Incidents fetched", {
      items: Array.isArray(items) ? items : [],
      summary,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("GET /api/admin/incidents error:", err);
    return failure("Failed to fetch incidents", err.message, 500);
  }
}

/**
 * PATCH /api/admin/incidents
 * Body: { incident_id, status, admin_id, reason }
 * Updates incident status (RESOLVED | INVESTIGATING | SUPPRESSED).
 */
export async function PATCH(req) {
  try {
    const { incident_id, status, admin_id, reason } = await req.json();

    if (!incident_id || !status || !admin_id || !reason) {
      return failure("incident_id, status, admin_id, and reason are required", null, 400);
    }

    const allowedStatuses = ["RESOLVED", "INVESTIGATING", "SUPPRESSED", "OPEN"];
    if (!allowedStatuses.includes(status)) {
      return failure(`status must be one of: ${allowedStatuses.join(", ")}`, null, 400);
    }

    await updateIncidentStatus(incident_id, status, admin_id);

    // Log admin action
    await dbFetch("admin_action_log", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([{
        admin_id,
        action_type:   "RESOLVE_INCIDENT",
        target_table:  "ops_incident_log",
        target_id:     incident_id,
        reason,
        input_payload: { incident_id, status },
        status:        "SUCCESS",
      }]),
    });

    return success("Incident status updated", { incident_id, new_status: status });
  } catch (err) {
    console.error("PATCH /api/admin/incidents error:", err);
    return failure("Failed to update incident", err.message, 500);
  }
}
