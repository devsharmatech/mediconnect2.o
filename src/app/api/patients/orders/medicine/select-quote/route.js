import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { broadcast_id, quote_id } = await req.json();

    if (!broadcast_id || !quote_id) {
      return failure("broadcast_id and quote_id are required", null, 400, { headers: corsHeaders });
    }

    // 1. Fetch the selected quote to get the chemist details
    const { data: quote, error: quoteErr } = await supabase
      .from("medicine_order_quotes")
      .select("*")
      .eq("id", quote_id)
      .eq("broadcast_id", broadcast_id)
      .single();

    if (quoteErr || !quote) {
      return failure("Selected quote not found", null, 404, { headers: corsHeaders });
    }

    // 2. Fetch the broadcast details to get prescription/patient info
    const { data: broadcast, error: broadcastErr } = await supabase
      .from("medicine_order_broadcasts")
      .select("*")
      .eq("id", broadcast_id)
      .single();

    if (broadcastErr || !broadcast) {
      return failure("Broadcast not found", null, 404, { headers: corsHeaders });
    }

    // 3. Mark the chosen quote as 'selected'
    await supabase
      .from("medicine_order_quotes")
      .update({ status: "selected" })
      .eq("id", quote_id);

    // 4. Mark all other quotes as 'ignored'
    await supabase
      .from("medicine_order_quotes")
      .update({ status: "ignored" })
      .eq("broadcast_id", broadcast_id)
      .neq("id", quote_id);

    // 5. Complete the broadcast status
    await supabase
      .from("medicine_order_broadcasts")
      .update({ status: "completed" })
      .eq("id", broadcast_id);

    // 6. Create the final order row in medicine_orders
    const { data: order, error: orderErr } = await supabase
      .from("medicine_orders")
      .insert([
        {
          prescription_id: broadcast.prescription_id,
          patient_id: broadcast.patient_id,
          chemist_id: quote.chemist_id,
          status: "waiting_for_bill",
          total_amount: quote.estimated_cost, // Estimated cost acts as initial total
          patient_notes: `Order created from broadcast selection. Estimated delivery: ${quote.delivery_time_minutes} mins.`,
        },
      ])
      .select()
      .single();

    if (orderErr) throw orderErr;

    // 7. Extract medicines list from prescription and insert into medicine_order_items
    const { data: prescription, error: prescriptionErr } = await supabase
      .from("prescriptions")
      .select("medicines")
      .eq("id", broadcast.prescription_id)
      .single();

    if (!prescriptionErr && prescription?.medicines) {
      const parsedMedicines = typeof prescription.medicines === "string" 
        ? JSON.parse(prescription.medicines) 
        : prescription.medicines;

      if (Array.isArray(parsedMedicines)) {
        const orderItems = parsedMedicines.map((m) => ({
          order_id: order.id,
          medicine_name: m.name,
          dosage: m.dosage || m.dosage_instruction || "",
          frequency: m.frequency || "",
          duration: m.duration || "",
          quantity: parseInt(m.quantity || "1", 10),
        }));

        const { error: itemsErr } = await supabase
          .from("medicine_order_items")
          .insert(orderItems);

        if (itemsErr) console.error("Error inserting medicine order items:", itemsErr.message);
      }
    }

    // 8. Notify the selected chemist to finalize the bill
    try {
      const { data: patientUser } = await supabase
        .from("users")
        .select("phone_number")
        .eq("id", broadcast.patient_id)
        .single();

      const { data: patientDetails } = await supabase
        .from("patient_details")
        .select("full_name")
        .eq("id", broadcast.patient_id)
        .maybeSingle();

      const patientName = patientDetails?.full_name || patientUser?.phone_number || "Patient";

      await supabase.from("notifications").insert({
        user_id: quote.chemist_id,
        title: "Order Request Confirmed 🎉",
        message: `You were selected by ${patientName}! Please prepare and send the final bill.`,
        type: "medicine_order",
        metadata: { order_id: order.id },
      });
    } catch (notifErr) {
      console.error("Failed to notify chemist of selection:", notifErr.message);
    }

    return success("Quote selected, order created", order, 201, { headers: corsHeaders });

  } catch (err) {
    console.error("Error selecting quote:", err);
    return failure("Failed to select quote", err.message, 500, { headers: corsHeaders });
  }
}
