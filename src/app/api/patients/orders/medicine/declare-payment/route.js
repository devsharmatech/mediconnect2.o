import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { order_id, patient_id } = await req.json();

    if (!order_id || !patient_id) {
      return failure("order_id and patient_id are required", null, 400, { headers: corsHeaders });
    }

    // 1. Fetch order details to make sure it's valid
    const { data: order, error: orderErr } = await supabase
      .from("medicine_orders")
      .select("id, chemist_id")
      .eq("id", order_id)
      .eq("patient_id", patient_id)
      .single();

    if (orderErr || !order) {
      return failure("Order not found or unauthorized", null, 404, { headers: corsHeaders });
    }

    // 2. Update order status to payment_submitted
    const { data: updatedOrder, error: updateErr } = await supabase
      .from("medicine_orders")
      .update({
        status: "payment_submitted",
        payment_declaration_by_patient: true,
        updated_at: new Date(),
      })
      .eq("id", order_id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 3. Notify the chemist of the payment declaration
    try {
      const { data: patientUser } = await supabase
        .from("users")
        .select("phone_number")
        .eq("id", patient_id)
        .single();

      const { data: patientDetails } = await supabase
        .from("patient_details")
        .select("full_name")
        .eq("id", patient_id)
        .maybeSingle();

      const patientName = patientDetails?.full_name || patientUser?.phone_number || "Patient";

      await supabase.from("notifications").insert({
        user_id: order.chemist_id,
        title: "Payment Declared 💸",
        message: `${patientName} has declared UPI payment. Please verify the receipt!`,
        type: "medicine_payment",
        metadata: { order_id },
      });
    } catch (notifErr) {
      console.error("Failed to notify chemist of payment declaration:", notifErr.message);
    }

    return success("Payment declared successfully", updatedOrder, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("Error declaring payment:", err);
    return failure("Failed to declare payment", err.message, 500, { headers: corsHeaders });
  }
}
