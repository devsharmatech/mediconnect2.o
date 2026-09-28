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
      medicine_subtotal,
      delivery_charge = 0,
      discount = 0,
      final_amount,
      auto_accept = true,
      items = [],
    } = await req.json();

    const rawCost = estimated_cost !== undefined ? estimated_cost : final_amount;

    if (!broadcast_id || !chemist_id || rawCost === undefined) {
      return failure(
        "Missing required fields: broadcast_id, chemist_id, estimated_cost (or final_amount)",
        null,
        400,
        { headers: corsHeaders }
      );
    }

    // 1. Price Arithmetic
    const subtotal = parseFloat(medicine_subtotal !== undefined ? medicine_subtotal : rawCost);
    const delCharge = parseFloat(delivery_charge || 0);
    const disc = parseFloat(discount || 0);
    const finalAmt = parseFloat(final_amount !== undefined ? final_amount : rawCost);
    const deliveryMins = parseInt(delivery_time_minutes, 10) || 30;

    // 2. Check if broadcast exists and is active
    const broadcastRows = await sql`
      SELECT * FROM medicine_order_broadcasts WHERE id = ${broadcast_id} LIMIT 1
    `;
    const broadcast = broadcastRows[0];

    if (!broadcast) {
      return failure("Broadcast request not found", null, 404, { headers: corsHeaders });
    }

    if (broadcast.status === "completed") {
      return failure("This order has already been claimed and accepted", null, 409, {
        headers: corsHeaders,
      });
    }

    // 3. Fetch chemist info
    const chemistRows = await sql`
      SELECT pharmacy_name, owner_name, payment_qr_url, payment_qr_payload, address, mobile
      FROM chemist_details WHERE id = ${chemist_id} LIMIT 1
    `;
    const chemistName = chemistRows[0]?.pharmacy_name || "A local pharmacy";

    // 4. Create or update quote
    const existingQuotes = await sql`
      SELECT id FROM medicine_order_quotes 
      WHERE broadcast_id = ${broadcast_id} AND chemist_id = ${chemist_id} 
      LIMIT 1
    `;

    let quote = null;
    const quoteStatus = auto_accept ? "selected" : "submitted";

    if (existingQuotes.length > 0) {
      const updatedQuotes = await sql`
        UPDATE medicine_order_quotes 
        SET 
          estimated_cost = ${finalAmt},
          final_amount = ${finalAmt},
          medicine_subtotal = ${subtotal},
          delivery_charge = ${delCharge},
          discount = ${disc},
          delivery_time_minutes = ${deliveryMins},
          status = ${quoteStatus}
        WHERE id = ${existingQuotes[0].id}
        RETURNING *
      `;
      quote = updatedQuotes[0];
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
          ${finalAmt},
          ${subtotal},
          ${delCharge},
          ${disc},
          ${finalAmt},
          ${deliveryMins},
          ${quoteStatus},
          NOW()
        )
        RETURNING *
      `;
      quote = newQuoteRows[0];
    }

    let createdOrder = null;

    // 5. If auto_accept is enabled: IMMEDIATELY CLAIM & ACCEPT ORDER (No long wait in pool!)
    if (auto_accept) {
      // Mark broadcast completed
      await sql`
        UPDATE medicine_order_broadcasts 
        SET status = 'completed'
        WHERE id = ${broadcast_id}
      `;

      // Generate sequential BIGINT UNID
      const maxUnidRows = await sql`
        SELECT COALESCE(MAX(unid), 25) + 1 AS next_unid FROM medicine_orders
      `;
      const nextUnid = maxUnidRows[0]?.next_unid || 26;

      const promisedDeliveryAt = new Date(Date.now() + deliveryMins * 60 * 1000);
      const warningAt = new Date(Date.now() + Math.floor(deliveryMins * 0.8) * 60 * 1000);

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
          ${chemist_id},
          'approved',
          ${subtotal},
          ${delCharge},
          ${disc},
          ${finalAmt},
          ${chemistRows[0]?.payment_qr_url || null},
          ${chemistRows[0]?.payment_qr_payload || null},
          ${promisedDeliveryAt},
          ${warningAt},
          ${promisedDeliveryAt},
          'ON_TRACK',
          'delivery',
          ${`Accepted by ${chemistName} — Delivery in ${deliveryMins} mins`},
          NOW(),
          NOW()
        )
        RETURNING *
      `;
      createdOrder = orderRows[0];

      // Copy medicines into medicine_order_items
      if (broadcast.prescription_id) {
        const rxRows = await sql`
          SELECT medicines FROM prescriptions WHERE id = ${broadcast.prescription_id} LIMIT 1
        `;
        if (rxRows[0]?.medicines) {
          let parsedMeds = [];
          try {
            parsedMeds =
              typeof rxRows[0].medicines === "string"
                ? JSON.parse(rxRows[0].medicines)
                : rxRows[0].medicines;
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
                  ${createdOrder.id},
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

      // Notify patient of instant acceptance
      try {
        if (broadcast.patient_id) {
          await sendPushAndInAppNotification({
            userId: broadcast.patient_id,
            title: "Order Accepted by Pharmacy! 💊",
            message: `${chemistName} has accepted your prescription order (#${nextUnid}). Preparation started.`,
            type: "medicine_order_accepted",
            metadata: {
              order_id: createdOrder.id,
              broadcast_id,
              chemist_id,
              amount: finalAmt,
            },
          });
        }
      } catch (notifErr) {
        console.warn("Patient notification warning:", notifErr.message);
      }
    }

    // 6. Broadcast event
    try {
      broadcastEmitter.emit(`status:${broadcast_id}`, {
        status: auto_accept ? "completed" : "quoted",
        selected_quote_id: quote.id,
        order_id: createdOrder?.id || null,
        chemist_name: chemistName,
      });
    } catch (e) {
      console.warn("BroadcastEmitter error:", e.message);
    }

    return success(
      auto_accept ? "Order accepted and claimed into your active orders!" : "Quote submitted successfully",
      { quote, order: createdOrder, auto_accepted: auto_accept },
      201,
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("Error submitting chemist quote / accepting order:", err);
    return failure("Failed to process order", err.message, 500, { headers: corsHeaders });
  }
}
