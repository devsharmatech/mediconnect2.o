import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { resolveCallerFromRequest } from "@/lib/layer1/authGuard";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { prescription_id, patient_id, chemist_id, medicines, patient_notes } = body;

    if (!prescription_id || !patient_id) {
      return failure("prescription_id & patient_id required", null, 400, { headers: corsHeaders });
    }

    const caller = await resolveCallerFromRequest(req);
    if (!caller) {
      return failure("Unauthorized - missing or invalid token.", null, 401, { headers: corsHeaders });
    }
    if (caller.id !== patient_id && caller.role !== "admin") {
      return failure("Forbidden - you do not have permission to place this order.", null, 403, { headers: corsHeaders });
    }

    const { data: order, error: orderErr } = await supabase
      .from("medicine_orders")
      .insert([
        {
          prescription_id,
          patient_id,
          chemist_id: chemist_id || null,
          status: chemist_id ? "sent_to_chemist" : "pending",
          patient_notes,
        },
      ])
      .select()
      .single();

    if (orderErr) throw orderErr;

    if (Array.isArray(medicines)) {
      const items = medicines.map((m) => ({
        order_id: order.id,
        medicine_name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        quantity: m.quantity || 1,
      }));

      const { error: itemsErr } = await supabase
        .from("medicine_order_items")
        .insert(items);

      if (itemsErr) throw itemsErr;
    }

    // ── Send notifications (Parallelized & optimized) ──
    try {
      const [chemistRes, patientRes, userRes] = await Promise.all([
        chemist_id ? supabase.from("chemist_details").select("pharmacy_name").eq("id", chemist_id).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from("patient_details").select("full_name").eq("id", patient_id).maybeSingle(),
        supabase.from("users").select("phone_number").eq("id", patient_id).maybeSingle()
      ]);

      const chemistName = chemistRes?.data?.pharmacy_name || "the Pharmacy";
      const patientName = patientRes?.data?.full_name || userRes?.data?.phone_number || "Patient";

      const notifs = [
        supabase.from("notifications").insert({
          user_id: patient_id,
          title: "Medicine Order Placed",
          message: `Your medicine order has been successfully placed with ${chemistName}.`,
          type: "medicine_order",
          metadata: { order_id: order.id, chemist_id },
        })
      ];

      if (chemist_id) {
        notifs.push(
          supabase.from("notifications").insert({
            user_id: chemist_id,
            title: "New Medicine Order",
            message: `You have received a new medicine order from ${patientName}.`,
            type: "medicine_order",
            metadata: { order_id: order.id, patient_id },
          })
        );
      }

      // Fire and forget or quick wait
      Promise.all(notifs).catch(e => console.error("Notification trigger failed:", e.message));
    } catch (notifErr) {
      console.error("Failed to insert medicine order notifications:", notifErr.message);
    }

    return success("Medicine order created", order, 201, { headers: corsHeaders });
  } catch (err) {
    return failure("Failed to create order", err.message, 500, { headers: corsHeaders });
  }
}
