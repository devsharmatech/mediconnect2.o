import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { broadcastEmitter } from "@/lib/broadcastEmitter";
import { sendPushAndInAppNotification } from "@/lib/notificationHelper";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const {
      broadcast_id,
      chemist_id,
      estimated_cost,
      delivery_time_minutes = 30,
      delivery_charge = 0,
      discount = 0,
    } = await req.json();

    if (!broadcast_id || !chemist_id) {
      return failure("broadcast_id and chemist_id are required", null, 400, {
        headers: corsHeaders,
      });
    }

    // 1. Fetch broadcast and verify it's still available in pool
    const broadcastRows = await sql`
      SELECT * FROM medicine_order_broadcasts WHERE id = ${broadcast_id} LIMIT 1
    `;
    const broadcast = broadcastRows[0];

    if (!broadcast) {
      return failure("Broadcast request not found", null, 404, { headers: corsHeaders });
    }

    if (broadcast.status === "completed") {
      return failure("This order has already been accepted by a pharmacy", null, 409, {
        headers: corsHeaders,
      });
    }

    // 2. Fetch chemist details
    const chemistRows = await sql`
      SELECT id, pharmacy_name, owner_name, payment_qr_url, payment_qr_payload, address, mobile
      FROM chemist_details 
      WHERE id = ${chemist_id} 
      LIMIT 1
    `;
    const chemist = chemistRows[0] || {
      id: chemist_id,
      pharmacy_name: "Apex MediConnect Pharmacy",
    };

    // 3. Calculate financial breakdown & SLA
    const finalAmount = parseFloat(estimated_cost || 350);
    const subtotal = finalAmount - parseFloat(delivery_charge || 0) + parseFloat(discount || 0);
    const deliveryMins = parseInt(delivery_time_minutes, 10) || 30;

    const now = new Date();
    const promisedDeliveryAt = new Date(now.getTime() + deliveryMins * 60 * 1000);
    const warningAt = new Date(now.getTime() + Math.floor(deliveryMins * 0.8) * 60 * 1000);
    const breachAt = promisedDeliveryAt;

    // 4. Mark broadcast as 'completed' (claimed & accepted)
    await sql`
      UPDATE medicine_order_broadcasts 
      SET status = 'completed'
      WHERE id = ${broadcast_id}
    `;

    // 5. Create or update quote
    const existingQuotes = await sql`
      SELECT id FROM medicine_order_quotes 
      WHERE broadcast_id = ${broadcast_id} AND chemist_id = ${chemist_id} 
      LIMIT 1
    `;

    let quoteId = null;
    if (existingQuotes.length > 0) {
      quoteId = existingQuotes[0].id;
      await sql`
        UPDATE medicine_order_quotes 
        SET 
          status = 'selected',
          final_amount = ${finalAmount},
          estimated_cost = ${finalAmount},
          delivery_time_minutes = ${deliveryMins}
        WHERE id = ${quoteId}
      `;
    } else {
      const newQuoteRows = await sql`
        INSERT INTO medicine_order_quotes (
          broadcast_id,
          chemist_id,
          estimated_cost,
          medicine_subtotal,
          delivery_charge,
          discount,
          final_amount,
          delivery_time_minutes,
          status,
          created_at
        ) VALUES (
          ${broadcast_id},
          ${chemist_id},
          ${finalAmount},
          ${subtotal},
          ${delivery_charge},
          ${discount},
          ${finalAmount},
          ${deliveryMins},
          'selected',
          NOW()
        )
        RETURNING id
      `;
      quoteId = newQuoteRows[0]?.id;
    }

    // 6. Generate sequential BIGINT UNID for the order
    const maxUnidRows = await sql`
      SELECT COALESCE(MAX(unid), 25) + 1 AS next_unid FROM medicine_orders
    `;
    const nextUnid = maxUnidRows[0]?.next_unid || 26;

    // 7. Insert confirmed order into medicine_orders with status 'approved'
    const newOrderRows = await sql`
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
        ${chemist_id},
        'approved',
        ${subtotal},
        ${delivery_charge},
        ${discount},
        ${finalAmount},
        ${chemist.payment_qr_url || null},
        ${chemist.payment_qr_payload || null},
        ${promisedDeliveryAt},
        ${warningAt},
        ${breachAt},
        'ON_TRACK',
        'delivery',
        ${`Accepted by ${chemist.pharmacy_name} — Delivery in ${deliveryMins} mins`},
        NOW(),
        NOW()
      )
      RETURNING *
    `;
    const order = newOrderRows[0];

    // 8. Fetch medicines from prescription and insert into medicine_order_items
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

        if (Array.isArray(parsedMeds) && parsedMeds.length > 0) {
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

    // 9. Emit real-time status event
    try {
      broadcastEmitter.emit(`status:${broadcast_id}`, {
        status: "completed",
        selected_quote_id: quoteId,
        order_id: order.id,
        chemist_name: chemist.pharmacy_name,
      });
    } catch (e) {
      console.warn("Emitter error (non-fatal):", e.message);
    }

    // 10. Notify Patient immediately: Order Accepted!
    try {
      if (broadcast.patient_id) {
        await sendPushAndInAppNotification({
          userId: broadcast.patient_id,
          title: "Order Accepted by Pharmacy! 💊",
          message: `${chemist.pharmacy_name} has accepted your prescription order (#${nextUnid}). Preparation started.`,
          type: "medicine_order_accepted",
          metadata: {
            order_id: order.id,
            broadcast_id,
            chemist_id,
            amount: finalAmount,
            delivery_mins: deliveryMins,
          },
        });
      }
    } catch (notifErr) {
      console.warn("Patient notification warning:", notifErr.message);
    }

    // 11. Audit log
    try {
      await sql`
        INSERT INTO activity_log (
          patient_id,
          actor_id,
          reference_id,
          module_type,
          action_type,
          description,
          metadata,
          created_at
        ) VALUES (
          ${broadcast.patient_id},
          ${chemist_id},
          ${order.id},
          'pharmacy',
          'ORDER_INSTANT_ACCEPTED',
          ${`Order #${nextUnid} accepted by ${chemist.pharmacy_name} from order pool.`},
          ${JSON.stringify({
            order_id: order.id,
            unid: nextUnid,
            final_amount: finalAmount,
            delivery_time_minutes: deliveryMins,
          })},
          NOW()
        )
      `;
    } catch (auditErr) {
      console.warn("Audit log insert warning:", auditErr.message);
    }

    return success("Order accepted and confirmed successfully", { order }, 200, {
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("Error accepting order from pool:", err);
    return failure("Failed to accept order", err.message, 500, { headers: corsHeaders });
  }
}
