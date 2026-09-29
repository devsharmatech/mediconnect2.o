import sql from "@/lib/db";
import { broadcastEmitter } from "@/lib/broadcastEmitter";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { sendPushAndInAppNotification } from "@/lib/notificationHelper";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { broadcast_id, quote_id } = await req.json();

    if (!broadcast_id || !quote_id) {
      return failure("broadcast_id and quote_id are required", null, 400, { headers: corsHeaders });
    }

    // 1. Fetch broadcast details
    const broadcastRows = await sql`
      SELECT * FROM medicine_order_broadcasts WHERE id = ${broadcast_id} LIMIT 1
    `;
    const broadcast = broadcastRows[0];

    if (!broadcast) {
      return failure("Broadcast not found", null, 404, { headers: corsHeaders });
    }

    if (broadcast.status === "completed") {
      return failure("An offer has already been selected for this broadcast", null, 409, { headers: corsHeaders });
    }

    // 2. Fetch the selected quote with chemist details
    const quoteRows = await sql`
      SELECT 
        q.*,
        cd.pharmacy_name,
        cd.address as chemist_address,
        cd.payment_qr_url,
        cd.payment_qr_payload
      FROM medicine_order_quotes q
      LEFT JOIN chemist_details cd ON cd.id = q.chemist_id
      WHERE q.id = ${quote_id} AND q.broadcast_id = ${broadcast_id}
      LIMIT 1
    `;
    const quote = quoteRows[0];

    if (!quote) {
      return failure("Selected quote not found", null, 404, { headers: corsHeaders });
    }

    // 3. Financial calculations & SLA
    const now = new Date();
    const deliveryMins = Number(quote.delivery_time_minutes || 30);
    const promisedDeliveryAt = new Date(now.getTime() + deliveryMins * 60 * 1000);
    const warningAt = new Date(now.getTime() + Math.floor(deliveryMins * 0.8) * 60 * 1000);
    const breachAt = promisedDeliveryAt;

    const finalAmount = Number(quote.final_amount || quote.estimated_cost);
    const medicineSubtotal = Number(quote.medicine_subtotal || quote.estimated_cost);
    const deliveryCharge = Number(quote.delivery_charge || 0);
    const discount = Number(quote.discount || 0);

    // 4. Mark chosen quote as selected, others as not_selected
    await sql`
      UPDATE medicine_order_quotes 
      SET status = 'selected' 
      WHERE id = ${quote_id}
    `;

    await sql`
      UPDATE medicine_order_quotes 
      SET status = 'not_selected' 
      WHERE broadcast_id = ${broadcast_id} AND id != ${quote_id}
    `;

    // 5. Complete broadcast status
    await sql`
      UPDATE medicine_order_broadcasts 
      SET status = 'completed' 
      WHERE id = ${broadcast_id}
    `;

    try {
      broadcastEmitter.emit(`status:${broadcast_id}`, {
        status: "completed",
        selected_quote_id: quote_id,
      });
    } catch (e) {
      console.warn("Emitter warning:", e.message);
    }

    // 6. Generate sequential BIGINT UNID
    const maxUnidRows = await sql`
      SELECT COALESCE(MAX(unid), 25) + 1 AS next_unid FROM medicine_orders
    `;
    const nextUnid = maxUnidRows[0]?.next_unid || 26;

    const orderRows = await sql`
      INSERT INTO medicine_orders (
        unid,
        prescription_id,
        patient_id,
        chemist_id,
        status,
        medicine_subtotal,
        delivery_charge,
        discount,
        total_amount,
        payment_qr_url,
        payment_qr_payload,
        promised_delivery_at,
        warning_at,
        breach_at,
        sla_status,
        delivery_type,
        patient_notes,
        created_at,
        updated_at
      ) VALUES (
        ${nextUnid},
        ${broadcast.prescription_id},
        ${broadcast.patient_id},
        ${quote.chemist_id},
        'payment_pending',
        ${medicineSubtotal},
        ${deliveryCharge},
        ${discount},
        ${finalAmount},
        ${quote.payment_qr_url || null},
        ${quote.payment_qr_payload || null},
        ${promisedDeliveryAt},
        ${warningAt},
        ${breachAt},
        'ON_TRACK',
        'delivery',
        ${`Offer Selected: ₹${finalAmount} — Promised Delivery: ${deliveryMins} mins`},
        NOW(),
        NOW()
      )
      RETURNING *
    `;
    const order = orderRows[0];

    // 7. Extract prescription medicines and insert into medicine_order_items
    if (broadcast.prescription_id) {
      const rxRows = await sql`
        SELECT medicines FROM prescriptions WHERE id = ${broadcast.prescription_id} LIMIT 1
      `;
      const rx = rxRows[0];

      if (rx?.medicines) {
        let parsedMeds = [];
        try {
          parsedMeds = typeof rx.medicines === "string" ? JSON.parse(rx.medicines) : rx.medicines;
        } catch (e) {
          parsedMeds = [];
        }

        if (Array.isArray(parsedMeds)) {
          for (const m of parsedMeds) {
            await sql`
              INSERT INTO medicine_order_items (
                order_id,
                medicine_name,
                dosage,
                frequency,
                duration,
                quantity,
                price
              ) VALUES (
                ${order.id},
                ${m.name || m.medicine_name || "Prescribed Medicine"},
                ${m.dosage || m.dosage_instruction || ""},
                ${m.frequency || ""},
                ${m.duration || ""},
                ${parseInt(m.quantity || "1", 10)},
                ${parseFloat(m.price || 0)}
              )
            `;
          }
        }
      }
    }

    // 8. Notifications
    try {
      await sendPushAndInAppNotification({
        userId: quote.chemist_id,
        title: "Offer Selected 🎉",
        message: `Your offer of ₹${finalAmount} was selected by patient! Order #${nextUnid} created.`,
        type: "medicine_order_accepted",
        metadata: { order_id: order.id, broadcast_id },
      });
    } catch (notifErr) {
      console.warn("Chemist notification warning:", notifErr.message);
    }

    return success("Offer selected and order confirmed", { order }, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("Error in select-quote route:", err);
    return failure("Failed to select quote", err.message, 500, { headers: corsHeaders });
  }
}
