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
      return failure("This broadcast has already concluded and an offer was selected by the patient", null, 409, {
        headers: corsHeaders,
      });
    }

    if (new Date(broadcast.expires_at) < new Date()) {
      return failure("This broadcast window has expired", null, 410, {
        headers: corsHeaders,
      });
    }

    // 3. Fetch chemist details
    const chemistRows = await sql`
      SELECT id, pharmacy_name, owner_name, payment_qr_url, payment_qr_payload, address, mobile, rating, total_reviews
      FROM chemist_details WHERE id = ${chemist_id} LIMIT 1
    `;
    const chemist = chemistRows[0] || {};
    const pharmacyName = chemist.pharmacy_name || "Partner Pharmacy";
    const pharmacyAddress = chemist.address || "Registered Partner Pharmacy";
    const ratingVal = chemist.rating && Number(chemist.total_reviews || 0) > 0 ? Number(chemist.rating) : null;

    // 4. Create or update quote
    const existingQuotes = await sql`
      SELECT id FROM medicine_order_quotes 
      WHERE broadcast_id = ${broadcast_id} AND chemist_id = ${chemist_id} 
      LIMIT 1
    `;

    let quote = null;

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
          status = 'submitted',
          created_at = NOW()
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
          'submitted',
          NOW()
        )
        RETURNING *
      `;
      quote = newQuoteRows[0];
    }

    // 5. Notify patient and push real-time event to SSE stream
    const quotePayload = {
      id: quote.id,
      broadcast_id: broadcast_id,
      chemist_id: chemist_id,
      estimated_cost: finalAmt,
      medicine_subtotal: subtotal,
      delivery_charge: delCharge,
      discount: disc,
      final_amount: finalAmt,
      delivery_time_minutes: deliveryMins,
      status: "submitted",
      pharmacy_name: pharmacyName,
      address: pharmacyAddress,
      rating: ratingVal,
      chemist: {
        pharmacy_name: pharmacyName,
        address: pharmacyAddress,
        mobile: chemist.mobile || "",
        rating: ratingVal
      }
    };

    try {
      broadcastEmitter.emit(`quote:${broadcast_id}`, quotePayload);
      broadcastEmitter.emit(`status:${broadcast_id}`, {
        status: "quoted",
        quote_id: quote.id,
        chemist_name: pharmacyName,
      });
    } catch (e) {
      console.warn("BroadcastEmitter error:", e.message);
    }

    try {
      if (broadcast.patient_id) {
        await sendPushAndInAppNotification({
          userId: broadcast.patient_id,
          title: "New Pharmacy Offer Received 💊",
          message: `${pharmacyName} offered to fulfill your prescription for ₹${finalAmt} (ETA: ${deliveryMins} mins).`,
          type: "medicine_quote_received",
          metadata: {
            broadcast_id,
            quote_id: quote.id,
            chemist_id,
            amount: finalAmt,
          },
        });
      }
    } catch (notifErr) {
      console.warn("Patient notification warning:", notifErr.message);
    }

    return success(
      "Quote submitted successfully to patient",
      { quote: quotePayload },
      201,
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("Error submitting chemist quote:", err);
    return failure("Failed to submit quote", err.message, 500, { headers: corsHeaders });
  }
}
