import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { order_id, status, chemist_notes } = await req.json();

    if (!order_id || !status) {
      return failure("order_id and status required", null, 400, { headers: corsHeaders });
    }

    // Fetch previous status for immutable audit record
    const { data: currentOrder } = await supabase
      .from("medicine_orders")
      .select("status, chemist_id, patient_id")
      .eq("id", order_id)
      .maybeSingle();

    const previousStatus = currentOrder?.status || "unknown";

    const updatePayload = {
      status,
      chemist_notes,
      updated_at: new Date(),
    };

    if (status === "delivered" || status === "completed") {
      updatePayload.actual_delivery_at = new Date();
    }

    const { data, error } = await supabase
      .from("medicine_orders")
      .update(updatePayload)
      .eq("id", order_id)
      .select("*, chemist_details(pharmacy_name)")
      .maybeSingle();

    if (error) throw error;

    // Record immutable audit event (Section 11 V3 Spec)
    try {
      await supabase.from("activity_log").insert({
        patient_id: data?.patient_id || currentOrder?.patient_id,
        actor_id: data?.chemist_id || currentOrder?.chemist_id,
        reference_id: data?.id || order_id,
        module_type: "pharmacy",
        action_type: `ORDER_STATUS_${status.toUpperCase()}`,
        description: `Order ${order_id.slice(0, 8).toUpperCase()} status transitioned to ${status}.`,
        metadata: {
          order_id: data?.id || order_id,
          previous_state: previousStatus,
          new_state: status,
          chemist_notes,
          timestamp: new Date().toISOString()
        },
        created_at: new Date()
      });
    } catch (logErr) {
      console.warn("Activity log insertion warning:", logErr?.message);
    }

    if (data && data.patient_id) {
      const pharmacyName = data.chemist_details?.pharmacy_name || "the pharmacy";
      const statusLabels = {
        "fulfilment_released": "Fulfilment Released",
        "fulfilment_confirmed": "Fulfilment Confirmed",
        "packing": "Packing Medicines",
        "ready_for_dispatch": "Ready for Dispatch",
        "approved_preparing": "Approved & Preparing",
        "payment_verified": "Payment Verified",
        "out_for_delivery": "Out for Delivery",
        "delivered": "Delivered",
        "completed": "Completed",
        "rejected": "Rejected",
        "cancelled": "Cancelled"
      };
      
      const label = statusLabels[status] || status;
      
      const { error: notifErr } = await supabase.from("notifications").insert({
        user_id: data.patient_id,
        title: "Order Status Updated",
        message: `Your order status from ${pharmacyName} has been updated to: ${label}.`,
        type: "medicine_order_update",
        metadata: { order_id: data.id, status }
      });
      if (notifErr) console.error("Error inserting notification:", notifErr.message);
    }

    return success("Order status updated", data, 200, { headers: corsHeaders });
  } catch (err) {
    return failure("Error updating status", err.message, 500, { headers: corsHeaders });
  }
}
