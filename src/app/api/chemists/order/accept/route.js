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
      return failure("This broadcast has already concluded and an offer was chosen by the patient", null, 409, {
        headers: corsHeaders,
      });
    }

    if (new Date(broadcast.expires_at) < new Date()) {
      return failure("This broadcast window has expired", null, 410, {
        headers: corsHeaders,
      });
    }

    // 2. Fetch chemist details
    const chemistRows = await sql`
      SELECT id, pharmacy_name, owner_name, payment_qr_url, payment_qr_payload, address, mobile, rating, total_reviews
      FROM chemist_details 
      WHERE id = ${chemist_id} 
      LIMIT 1
    `;
    const chemist = chemistRows[0] || {};
    const pharmacyName = chemist.pharmacy_name || "Partner Pharmacy";
    const pharmacyAddress = chemist.address || "Registered Partner Pharmacy";
    const ratingVal = chemist.rating && Number(chemist.total_reviews || 0) > 0 ? Number(chemist.rating) : null;

    // 3. Calculate financial breakdown
    const finalAmount = parseFloat(estimated_cost || 350);
    const subtotal = finalAmount - parseFloat(delivery_charge || 0) + parseFloat(discount || 0);
    const deliveryMins = parseInt(delivery_time_minutes, 10) || 30;

    // 4. Create or update quote
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
          status = 'submitted',
          final_amount = ${finalAmount},
          estimated_cost = ${finalAmount},
          medicine_subtotal = ${subtotal},
          delivery_charge = ${delivery_charge},
          discount = ${discount},
          delivery_time_minutes = ${deliveryMins},
          created_at = NOW()
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
          'submitted',
          NOW()
        )
        RETURNING id
      `;
      quoteId = newQuoteRows[0]?.id;
    }

    const quotePayload = {
      id: quoteId,
      broadcast_id,
      chemist_id,
      estimated_cost: finalAmount,
      medicine_subtotal: subtotal,
      delivery_charge: parseFloat(delivery_charge || 0),
      discount: parseFloat(discount || 0),
      final_amount: finalAmount,
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
        quote_id: quoteId,
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
          message: `${pharmacyName} offered to fulfill your prescription for ₹${finalAmount} (ETA: ${deliveryMins} mins).`,
          type: "medicine_quote_received",
          metadata: {
            broadcast_id,
            quote_id: quoteId,
            chemist_id,
            amount: finalAmount,
          },
        });
      }
    } catch (notifErr) {
      console.warn("Patient notification warning:", notifErr.message);
    }

    return success("Quote submitted to patient", { quote: quotePayload }, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("Error in chemist quote/accept route:", err);
    return failure("Failed to submit quote", err.message, 500, { headers: corsHeaders });
  }
}
