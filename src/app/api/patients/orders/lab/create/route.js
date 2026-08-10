import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { prescription_id, patient_id, lab_id, tests, patient_notes } = await req.json();

    if (!patient_id) {
      return failure("patient_id required", null, 400, { headers: corsHeaders });
    }

    let totalAmount = 0;
    if (Array.isArray(tests)) {
      totalAmount = tests.reduce((sum, t) => sum + (parseFloat(t.price) || 0), 0);
    }

    const { data: order, error } = await supabase
      .from("lab_test_orders")
      .insert([
        {
          prescription_id,
          patient_id,
          lab_id,
          status: lab_id ? "booked" : "pending",
          patient_notes,
          total_amount: totalAmount,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    if (Array.isArray(tests)) {
      const items = tests.map((t) => ({
        order_id: order.id,
        test_name: t.test_name || t.name || "",
        price: t.price || null,
        notes: t.notes || null,
      }));

      const { error: itemErr } = await supabase
        .from("lab_test_order_items")
        .insert(items);

      if (itemErr) throw itemErr;
    }

    // ── Send notifications (Parallelized & optimized) ──
    try {
      const [labRes, patientRes, userRes] = await Promise.all([
        lab_id ? supabase.from("lab_details").select("lab_name").eq("id", lab_id).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from("patient_details").select("full_name").eq("id", patient_id).maybeSingle(),
        supabase.from("users").select("phone_number").eq("id", patient_id).maybeSingle()
      ]);

      const labName = labRes?.data?.lab_name || "the Laboratory";
      const patientName = patientRes?.data?.full_name || userRes?.data?.phone_number || "Patient";

      const notifs = [
        supabase.from("notifications").insert({
          user_id: patient_id,
          title: "Lab Order Placed",
          message: `Your lab test order has been successfully placed with ${labName}. Estimated Total: ₹${totalAmount}.`,
          type: "lab_order",
          metadata: { order_id: order.id, lab_id },
        })
      ];

      if (lab_id) {
        notifs.push(
          supabase.from("notifications").insert({
            user_id: lab_id,
            title: "New Lab Order",
            message: `You have received a new lab test order from ${patientName}.`,
            type: "lab_order",
            metadata: { order_id: order.id, patient_id },
          })
        );
      }

      // Fire and forget or quick wait
      Promise.all(notifs).catch(e => console.error("Notification trigger failed:", e.message));
    } catch (notifErr) {
      console.error("Failed to insert lab order notifications:", notifErr.message);
    }

    return success("Lab test order created", order, 201, { headers: corsHeaders });
  } catch (err) {
    return failure("Failed creating test order", err.message, 500, { headers: corsHeaders });
  }
}
