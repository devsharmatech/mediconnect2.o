import { supabase } from "@/lib/supabaseAdmin";
import admin from "@/lib/firebaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders() });
}

export async function GET(req) {
  return runSlaCheck();
}

export async function POST(req) {
  return runSlaCheck();
}

async function runSlaCheck() {
  try {
    const now = new Date();

    // 1. Fetch active fulfilment orders that have SLA timestamps defined
    const { data: activeOrders, error } = await supabase
      .from("medicine_orders")
      .select(`
        id,
        patient_id,
        chemist_id,
        status,
        sla_status,
        promised_delivery_at,
        warning_at,
        breach_at
      `)
      .in("status", [
        "payment_verified",
        "fulfilment_released",
        "fulfilment_confirmed",
        "packing",
        "ready_for_dispatch",
        "out_for_delivery"
      ])
      .not("breach_at", "is", null);

    if (error) throw error;

    if (!activeOrders || activeOrders.length === 0) {
      return success("SLA check completed. No active orders requiring evaluation.", {
        evaluated: 0,
        warned: 0,
        breached: 0
      }, 200);
    }

    let warnedCount = 0;
    let breachedCount = 0;

    for (const order of activeOrders) {
      const breachAt = new Date(order.breach_at);
      const warningAt = order.warning_at ? new Date(order.warning_at) : null;
      const orderRef = order.id.slice(0, 8).toUpperCase();

      // Check 1: Breach Condition
      if (now >= breachAt && order.sla_status !== "SLA_BREACHED") {
        await supabase
          .from("medicine_orders")
          .update({
            sla_status: "SLA_BREACHED",
            updated_at: new Date()
          })
          .eq("id", order.id);

        // a. Alert Pharmacist Dashboard
        await supabase.from("notifications").insert({
          user_id: order.chemist_id,
          title: "Delivery Commitment Missed 🚨",
          message: `Delivery commitment missed for Order #${orderRef}. Immediate action required.`,
          type: "sla_breached",
          metadata: { order_id: order.id, sla_event: "SLA_BREACHED" }
        }).catch(() => null);

        // b. Push notification to Chemist device
        try {
          const { data: chemistUser } = await supabase
            .from("users")
            .select("fcm_token")
            .eq("id", order.chemist_id)
            .maybeSingle();

          if (chemistUser?.fcm_token) {
            await admin.messaging().send({
              token: chemistUser.fcm_token,
              notification: {
                title: "Delivery Commitment Missed 🚨",
                body: `Order #${orderRef} has passed its delivery window. Please update status immediately.`
              },
              data: { type: "sla_breached", order_id: order.id }
            }).catch(() => null);
          }
        } catch {}

        // c. Alert Patient
        await supabase.from("notifications").insert({
          user_id: order.patient_id,
          title: "Order Delivery Status",
          message: "Your pharmacy delivery is taking longer than the committed time. We are checking the status with the pharmacy.",
          type: "order_delayed",
          metadata: { order_id: order.id }
        }).catch(() => null);

        // d. Alert Operations / Admin (Section 9 Page 7)
        try {
          const { data: adminUsers } = await supabase
            .from("users")
            .select("id")
            .eq("role", "admin");

          if (adminUsers && adminUsers.length > 0) {
            const adminNotifs = adminUsers.map((adm) => ({
              user_id: adm.id,
              title: "Pharmacy Delivery SLA Breached 🚨",
              message: `Order #${orderRef} SLA breached. Chemist ID: ${order.chemist_id}. Intervention required.`,
              type: "ops_sla_breach",
              metadata: { order_id: order.id, chemist_id: order.chemist_id }
            }));
            await supabase.from("notifications").insert(adminNotifs).catch(() => null);
          }
        } catch {}

        // e. Record immutable audit
        try {
          await supabase.from("activity_log").insert({
            user_id: order.chemist_id,
            action: "SLA_BREACHED",
            details: JSON.stringify({
              order_id: order.id,
              promised_delivery_at: order.promised_delivery_at,
              breached_at: now
            }),
            created_at: new Date()
          }).catch(() => null);
        } catch {}

        breachedCount++;
      }
      // Check 2: Approaching Warning Condition
      else if (warningAt && now >= warningAt && now < breachAt && order.sla_status === "ON_TRACK") {
        await supabase
          .from("medicine_orders")
          .update({
            sla_status: "SLA_AT_RISK",
            updated_at: new Date()
          })
          .eq("id", order.id);

        // Alert Pharmacist Dashboard (Approaching SLA)
        await supabase.from("notifications").insert({
          user_id: order.chemist_id,
          title: "Delivery Commitment Approaching ⚠️",
          message: `Delivery commitment is approaching for Order #${orderRef}. Please update the order status.`,
          type: "sla_approaching",
          metadata: { order_id: order.id, sla_event: "SLA_AT_RISK" }
        }).catch(() => null);

        warnedCount++;
      }
    }

    return success("SLA check completed successfully", {
      evaluated: activeOrders.length,
      warned: warnedCount,
      breached: breachedCount,
      timestamp: now
    }, 200);

  } catch (err) {
    console.error("SLA check error:", err);
    return failure("SLA check failed", err.message, 500);
  }
}
