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

    const { data, error } = await supabase
      .from("medicine_orders")
      .update({
        status,
        chemist_notes,
        updated_at: new Date(),
      })
      .eq("id", order_id)
      .select("*, chemist_details(pharmacy_name)")
      .maybeSingle();

    if (error) throw error;

    if (data && data.patient_id) {
      const pharmacyName = data.chemist_details?.pharmacy_name || "the pharmacy";
      const statusLabels = {
        "approved_preparing": "Approved & Preparing",
        "payment_verified": "Payment Verified",
        "out_for_delivery": "Out for Delivery",
        "delivered": "Delivered",
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
