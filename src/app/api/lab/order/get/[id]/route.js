import { supabase } from "@/lib/supabaseAdmin";
import { corsHeaders } from "@/lib/cors";

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const orderId = id;

    // 1️⃣ Fetch main order data (NO patient_details here)
    const { data: order, error } = await supabase
      .from("lab_test_orders")
      .select(
        `
    *,
    patient:patient_id (*),
    prescription:prescription_id (
      id,
      unid,
      medicines,
      lab_tests,
      investigations,
      special_message,
      created_at,
      doctor:doctor_id (
        full_name,
        specialization,
        qualification,
        clinic_name,
        clinic_address,
        signature_url
      ),
      appointment:appointment_id (
        id,
        appointment_date,
        appointment_time,
        status,
        disease_info,
        call_started_at,
        call_ended_at
      )
    )
  `
      )
      .eq("id", orderId)
      .maybeSingle();

    if (error) throw error;

    if (!order) {
      return new Response(
        JSON.stringify({ status: false, message: "Order not found" }),
        { headers: corsHeaders }
      );
    }

    if (order.patient_id) {
      // 2️⃣ Fetch patient_details SEPARATELY
      const { data: patientDetails, error: pErr } = await supabase
        .from("patient_details")
        .select("*")
        .eq("id", order.patient_id)
        .maybeSingle();

      if (pErr) throw pErr;

      // Attach into order structure
      if (order.patient) {
        order.patient.details = patientDetails;
      }
    }

    // 3️⃣ Fetch order items
    const { data: items } = await supabase
      .from("lab_test_order_items")
      .select("*")
      .eq("order_id", orderId);

    return new Response(
      JSON.stringify({
        status: true,
        message: "Order details fetched",
        data: {
          ...order,
          items,
        },
      }),
      { headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        status: false,
        message: "Error fetching lab order details",
        error: err.message,
      }),
      { headers: corsHeaders }
    );
  }
}
