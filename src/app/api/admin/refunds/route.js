import { success, failure } from "@/lib/response";
import { initiateRefund } from "@/lib/layer1/refundEngine";

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
 * GET /api/admin/refunds
 * Returns paginated refund_requests with summary counts.
 * Query params: page, limit, status (PENDING|PROCESSING|COMPLETED|FAILED), patient_id
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page      = parseInt(searchParams.get("page") || "1");
    const limit     = parseInt(searchParams.get("limit") || "20");
    const status    = searchParams.get("status");
    const patientId = searchParams.get("patient_id");
    const offset    = (page - 1) * limit;

    let filters = `order=created_at.desc&limit=${limit}&offset=${offset}`;
    if (status)    filters += `&status=eq.${status}`;
    if (patientId) filters += `&patient_id=eq.${patientId}`;

    const res   = await dbFetch(`refund_requests?${filters}`, { headers: { Prefer: "count=exact" } });
    const items = await res.json();
    const total = parseInt(res.headers.get("content-range")?.split("/")[1] || "0", 10);

    // Resolve patient un_id and role dynamically
    if (Array.isArray(items) && items.length > 0) {
      const patientIds = [...new Set(items.map(item => item.patient_id).filter(Boolean))];
      if (patientIds.length > 0) {
        const userRes = await dbFetch(`users?id=in.(${patientIds.join(",")})&select=id,un_id,role`);
        const users = await userRes.json().catch(() => []);
        if (Array.isArray(users)) {
          const userMap = {};
          users.forEach(u => {
            userMap[u.id] = { un_id: u.un_id, role: u.role };
          });
          items.forEach(item => {
            const u = userMap[item.patient_id] || {};
            item.patient_un_id = u.un_id || null;
            item.patient_role = u.role || null;
          });
        }
      }
    }

    // Summary
    const [pendingRes, completedRes, failedRes, totalAmtRes] = await Promise.all([
      dbFetch("refund_requests?status=eq.PENDING&select=id",    { headers: { Prefer: "count=exact" } }),
      dbFetch("refund_requests?status=eq.COMPLETED&select=id",  { headers: { Prefer: "count=exact" } }),
      dbFetch("refund_requests?status=eq.FAILED&select=id",     { headers: { Prefer: "count=exact" } }),
      dbFetch("refund_requests?status=eq.COMPLETED&select=amount"),
    ]);
    const completedItems = await totalAmtRes.json().catch(() => []);
    const totalRefunded  = Array.isArray(completedItems)
      ? completedItems.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
      : 0;

    const summary = {
      pending:          parseInt(pendingRes.headers.get("content-range")?.split("/")[1] || "0", 10),
      completed:        parseInt(completedRes.headers.get("content-range")?.split("/")[1] || "0", 10),
      failed:           parseInt(failedRes.headers.get("content-range")?.split("/")[1] || "0", 10),
      total_refunded:   totalRefunded,
    };

    return success("Refund requests fetched", {
      items: Array.isArray(items) ? items : [],
      summary,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("GET /api/admin/refunds error:", err);
    return failure("Failed to fetch refunds", err.message, 500);
  }
}

/**
 * POST /api/admin/refunds
 * Body: { patient_id, care_episode_id, consultation_id, original_payment_id, amount, reason, admin_id }
 * Manually triggers a refund via RefundEngine.
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { patient_id, care_episode_id, consultation_id, original_payment_id, amount, reason, admin_id } = body;

    if (!patient_id || !original_payment_id || !amount || !reason || !admin_id) {
      return failure("patient_id, original_payment_id, amount, reason, and admin_id are required", null, 400);
    }

    const result = await initiateRefund({
      patient_id,
      care_episode_id,
      consultation_id,
      original_payment_id,
      amount: parseFloat(amount),
      reason,
      initiated_by: `admin:${admin_id}`,
    });

    // Log admin action
    await dbFetch("admin_action_log", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([{
        admin_id,
        action_type:   "MANUAL_REFUND",
        target_table:  "refund_requests",
        reason,
        input_payload: { patient_id, amount, original_payment_id },
        result_payload: result,
        status:        result.success ? "SUCCESS" : "FAILED",
      }]),
    });

    if (!result.success) return failure("Refund initiation failed", result.error, 500);

    return success("Refund initiated successfully", { refund_id: result.refund_id, amount: result.amount });
  } catch (err) {
    console.error("POST /api/admin/refunds error:", err);
    return failure("Failed to initiate refund", err.message, 500);
  }
}
