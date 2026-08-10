import { success, failure } from "@/lib/response";

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
 * GET /api/admin/payouts
 * Returns paginated provider_payout_ledger with summary stats.
 * Query params: page, limit, status (PENDING|SETTLED), provider_id
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page       = parseInt(searchParams.get("page") || "1");
    const limit      = parseInt(searchParams.get("limit") || "20");
    const status     = searchParams.get("status");
    const providerId = searchParams.get("provider_id");
    const offset     = (page - 1) * limit;

    let filters = `order=created_at.desc&limit=${limit}&offset=${offset}`;
    if (status)     filters += `&status=eq.${status}`;
    if (providerId) filters += `&provider_id=eq.${providerId}`;

    const res   = await dbFetch(`provider_payout_ledger?${filters}`, { headers: { Prefer: "count=exact" } });
    const items = await res.json();
    const total = parseInt(res.headers.get("content-range")?.split("/")[1] || "0", 10);

    // Resolve provider un_id and role dynamically
    if (Array.isArray(items) && items.length > 0) {
      const providerIds = [...new Set(items.map(item => item.provider_id).filter(Boolean))];
      if (providerIds.length > 0) {
        const userRes = await dbFetch(`users?id=in.(${providerIds.join(",")})&select=id,un_id,role`);
        const users = await userRes.json().catch(() => []);
        if (Array.isArray(users)) {
          const userMap = {};
          users.forEach(u => {
            userMap[u.id] = { un_id: u.un_id, role: u.role };
          });
          items.forEach(item => {
            const u = userMap[item.provider_id] || {};
            item.provider_un_id = u.un_id || null;
            item.provider_role = u.role || null;
          });
        }
      }
    }

    // Summary aggregations
    const [pendingRes, settledRes] = await Promise.all([
      dbFetch("provider_payout_ledger?status=eq.PENDING&select=net_payout,platform_fee"),
      dbFetch("provider_payout_ledger?status=eq.SETTLED&select=net_payout,platform_fee"),
    ]);

    const pendingItems  = await pendingRes.json().catch(() => []);
    const settledItems  = await settledRes.json().catch(() => []);

    const totalPending   = Array.isArray(pendingItems) ? pendingItems.reduce((s, r) => s + (parseFloat(r.net_payout) || 0), 0) : 0;
    const totalSettled   = Array.isArray(settledItems) ? settledItems.reduce((s, r) => s + (parseFloat(r.net_payout) || 0), 0) : 0;
    const totalFees      = [...(Array.isArray(pendingItems) ? pendingItems : []), ...(Array.isArray(settledItems) ? settledItems : [])]
      .reduce((s, r) => s + (parseFloat(r.platform_fee) || 0), 0);

    const summary = {
      pending_count:  Array.isArray(pendingItems) ? pendingItems.length : 0,
      settled_count:  Array.isArray(settledItems) ? settledItems.length : 0,
      total_pending:  totalPending,
      total_settled:  totalSettled,
      total_platform_fees: totalFees,
    };

    return success("Provider payout ledger fetched", {
      items: Array.isArray(items) ? items : [],
      summary,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("GET /api/admin/payouts error:", err);
    return failure("Failed to fetch payouts", err.message, 500);
  }
}

/**
 * PATCH /api/admin/payouts
 * Body: { payout_id, razorpay_payout_id, admin_id, reason }
 * Marks a payout as SETTLED.
 */
export async function PATCH(req) {
  try {
    const { payout_id, razorpay_payout_id, admin_id, reason } = await req.json();

    if (!payout_id || !admin_id || !reason) {
      return failure("payout_id, admin_id, and reason are required", null, 400);
    }

    const patchRes = await dbFetch(`provider_payout_ledger?id=eq.${payout_id}&status=eq.PENDING`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        status:             "SETTLED",
        razorpay_payout_id: razorpay_payout_id || null,
        settled_at:         new Date().toISOString(),
      }),
    });

    const updated = await patchRes.json().catch(() => null);

    if (!patchRes.ok || !updated?.length) {
      return failure("Payout not found, already settled, or update failed", null, 400);
    }

    // Log admin action
    await dbFetch("admin_action_log", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([{
        admin_id,
        action_type:   "SETTLE_PAYOUT",
        target_table:  "provider_payout_ledger",
        target_id:     payout_id,
        reason,
        input_payload: { payout_id, razorpay_payout_id },
        status:        "SUCCESS",
      }]),
    });

    return success("Payout marked as settled", { payout_id, status: "SETTLED" });
  } catch (err) {
    console.error("PATCH /api/admin/payouts error:", err);
    return failure("Failed to settle payout", err.message, 500);
  }
}
