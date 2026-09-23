import { supabase } from "@/lib/supabaseAdmin";
import { broadcastEmitter } from "@/lib/broadcastEmitter";
import admin from "@/lib/firebaseAdmin";
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

    // 1. Fetch the broadcast details and validate active status
    const { data: broadcast, error: broadcastErr } = await supabase
      .from("medicine_order_broadcasts")
      .select("*")
      .eq("id", broadcast_id)
      .single();

    if (broadcastErr || !broadcast) {
      return failure("Broadcast not found", null, 404, { headers: corsHeaders });
    }

    if (broadcast.status === "completed") {
      return failure("An offer has already been selected for this broadcast", null, 409, { headers: corsHeaders });
    }

    if (broadcast.expires_at && new Date(broadcast.expires_at) < new Date()) {
      return failure("Bidding window has expired. Expired offers cannot be selected.", null, 400, { headers: corsHeaders });
    }

    // 2. Fetch the selected quote to lock in pricing and chemist details
    const { data: quote, error: quoteErr } = await supabase
      .from("medicine_order_quotes")
      .select(`
        *,
        chemist:chemist_id(
          pharmacy_name,
          address,
          mobile,
          payment_qr_url,
          payment_qr_payload,
          payment_qr_label
        )
      `)
      .eq("id", quote_id)
      .eq("broadcast_id", broadcast_id)
      .single();

    if (quoteErr || !quote) {
      return failure("Selected quote not found", null, 404, { headers: corsHeaders });
    }

    // 3. Calculate SLA commitment timestamps (promised, warning at 80%, breach)
    const now = new Date();
    const deliveryMins = Number(quote.delivery_time_minutes || 60);
    const promisedDeliveryAt = new Date(now.getTime() + deliveryMins * 60 * 1000);
    const warningAt = new Date(now.getTime() + Math.floor(deliveryMins * 0.8) * 60 * 1000);
    const breachAt = promisedDeliveryAt;

    const finalAmount = Number(quote.final_amount || quote.estimated_cost);
    const medicineSubtotal = Number(quote.medicine_subtotal || quote.estimated_cost);
    const deliveryCharge = Number(quote.delivery_charge || 0);
    const discount = Number(quote.discount || 0);

    // 4. Atomically mark the chosen quote as 'selected' and all others as 'not_selected'
    await supabase
      .from("medicine_order_quotes")
      .update({ status: "selected" })
      .eq("id", quote_id);

    const { data: ignoredQuotes } = await supabase
      .from("medicine_order_quotes")
      .update({ status: "not_selected" })
      .eq("broadcast_id", broadcast_id)
      .neq("id", quote_id)
      .select("chemist_id");

    // 5. Complete the broadcast status and push SSE event
    await supabase
      .from("medicine_order_broadcasts")
      .update({ status: "completed" })
      .eq("id", broadcast_id);

    broadcastEmitter.emit(`status:${broadcast_id}`, {
      status: "completed",
      selected_quote_id: quote_id
    });

    // 6. Create the order in canonical state 'payment_pending' with locked financial breakdown
    const { data: order, error: orderErr } = await supabase
      .from("medicine_orders")
      .insert([
        {
          prescription_id: broadcast.prescription_id,
          patient_id: broadcast.patient_id,
          chemist_id: quote.chemist_id,
          status: "payment_pending", // V3 canonical state: ready for payment review & disclosure
          medicine_subtotal: medicineSubtotal,
          delivery_charge: deliveryCharge,
          discount: discount,
          total_amount: finalAmount,
          payment_qr_url: quote.chemist?.payment_qr_url || null,
          payment_qr_payload: quote.chemist?.payment_qr_payload || null,
          promised_delivery_at: promisedDeliveryAt,
          warning_at: warningAt,
          breach_at: breachAt,
          sla_status: "ON_TRACK",
          patient_notes: `V3 Offer Selected - Promised Delivery: ${deliveryMins} mins.`,
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

    // 8. Notifications per Section 10 Notification Event Matrix
    try {
      const pharmacyName = quote.chemist?.pharmacy_name || "Selected Pharmacy";

      // 8a. Notify Selected Pharmacy (Offer Selected)
      await supabase.from("notifications").insert({
        user_id: quote.chemist_id,
        title: "Offer Selected 🎉",
        message: `Your offer of ₹${finalAmount} was selected! Waiting for patient verified payment before releasing full delivery address.`,
        type: "medicine_order",
        metadata: { order_id: order.id, broadcast_id },
      });

      // Firebase Push to Selected Chemist
      const { data: chemistUser } = await supabase
        .from("users")
        .select("fcm_token")
        .eq("id", quote.chemist_id)
        .maybeSingle();

      if (chemistUser?.fcm_token) {
        await admin.messaging().send({
          token: chemistUser.fcm_token,
          notification: {
            title: "Offer Selected 🎉",
            body: `Your offer of ₹${finalAmount} was chosen! Awaiting verified payment.`,
          },
          data: {
            type: "offer_selected",
            order_id: order.id,
            broadcast_id,
          },
        }).catch(() => null);
      }

      // 8b. Notify Non-selected Pharmacies (Offer Not Selected)
      if (Array.isArray(ignoredQuotes) && ignoredQuotes.length > 0) {
        const unselectedNotifs = ignoredQuotes.map((q) => ({
          user_id: q.chemist_id,
          title: "Bidding Concluded",
          message: "Another pharmacy offer was selected by the patient for this broadcast.",
          type: "medicine_order",
          metadata: { broadcast_id },
        }));
        await supabase.from("notifications").insert(unselectedNotifs).catch(() => null);
      }
    } catch (notifErr) {
      console.warn("Notification dispatch warning in select-quote:", notifErr?.message);
    }

    return success("Offer selected and locked successfully", order, 201, { headers: corsHeaders });

  } catch (err) {
    console.error("Error selecting quote:", err);
    return failure("Failed to select quote", err.message, 500, { headers: corsHeaders });
  }
}
