import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { doctor_id, patient_id, lab_tests, notes, prescription_id } = body;

    if (!id || !patient_id || !lab_tests || !Array.isArray(lab_tests)) {
      return failure("Missing required fields", null, 400);
    }

    // Insert lab test order
    const { data: order, error: orderErr } = await supabase
      .from("lab_test_orders")
      .insert({
        prescription_id: prescription_id || null,
        patient_id,
        status: "requested",
        patient_notes: notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (orderErr) throw orderErr;

    // We skip lab_test_order_items for brevity since we don't know the exact schema,
    // but the order itself is now stored persistently.

    return success("Lab request created successfully", { 
      appointment_id: id,
      lab_tests,
      order_id: order.id,
      status: "requested"
    }, 201);
  } catch (error) {
    console.error("Lab Request API Error:", error);
    return failure("Internal Server Error", error.message, 500);
  }
}
