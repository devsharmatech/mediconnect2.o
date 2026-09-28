import { supabase } from "@/lib/supabaseAdmin";
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
      delivery_time_minutes,
      medicine_subtotal,
      delivery_charge = 0,
      discount = 0,
      final_amount,
      delivery_window,
      items = []
    } = await req.json();

    const rawCost = estimated_cost !== undefined ? estimated_cost : final_amount;

    if (!broadcast_id || !chemist_id || rawCost === undefined || !delivery_time_minutes) {
      return failure("Missing required fields: broadcast_id, chemist_id, estimated_cost (or final_amount), delivery_time_minutes", null, 400, { headers: corsHeaders });
    }

    // 1. Validate Price Arithmetic (V3 Master Spec Page 6: Backend validates price arithmetic)
    const subtotal = parseFloat(medicine_subtotal !== undefined ? medicine_subtotal : rawCost);
    const delCharge = parseFloat(delivery_charge || 0);
    const disc = parseFloat(discount || 0);
    const finalAmt = parseFloat(final_amount !== undefined ? final_amount : rawCost);

    if (medicine_subtotal !== undefined && final_amount !== undefined) {
      const expected = parseFloat((subtotal + delCharge - disc).toFixed(2));
      if (Math.abs(expected - finalAmt) > 0.05) {
        return failure(`Price calculation mismatch: Subtotal (${subtotal}) + Delivery (${delCharge}) - Discount (${disc}) must equal Final Amount (${finalAmt})`, null, 400, { headers: corsHeaders });
      }
    }

    // 2. Check if broadcast exists and is still active
    const { data: broadcast, error: broadcastErr } = await supabase
      .from("medicine_order_broadcasts")
      .select("*")
      .eq("id", broadcast_id)
      .single();

    if (broadcastErr || !broadcast) {
      return failure("Broadcast request not found", null, 404, { headers: corsHeaders });
    }

    if (broadcast.status !== "broadcasting" || new Date() > new Date(broadcast.expires_at)) {
      return failure("Broadcast response window has closed", null, 410, { headers: corsHeaders });
    }

    // 3. Check if this chemist already submitted a quote
    const { data: existingQuote } = await supabase
      .from("medicine_order_quotes")
      .select("id")
      .eq("broadcast_id", broadcast_id)
      .eq("chemist_id", chemist_id)
      .maybeSingle();

    if (existingQuote) {
      return failure("You have already submitted a quote for this request", null, 409, { headers: corsHeaders });
    }

    // 4. Create the quote in database
    const { data: quote, error: quoteErr } = await supabase
      .from("medicine_order_quotes")
      .insert([
        {
          broadcast_id,
          chemist_id,
          estimated_cost: finalAmt,
          medicine_subtotal: subtotal,
          delivery_charge: delCharge,
          discount: disc,
          final_amount: finalAmt,
          delivery_time_minutes: parseInt(delivery_time_minutes, 10),
          status: "pending",
        },
      ])
      .select()
      .single();

    if (quoteErr) throw quoteErr;

    // 5. Fetch Chemist details for real-time push payload
    const { data: chemistInfo } = await supabase
      .from("chemist_details")
      .select("pharmacy_name, address, mobile")
      .eq("id", chemist_id)
      .maybeSingle();

    const enrichedQuote = {
      id: quote.id,
      broadcast_id,
      chemist_id,
      estimated_cost: finalAmt,
      delivery_time_minutes: parseInt(delivery_time_minutes, 10),
      medicine_subtotal: subtotal,
      delivery_charge: delCharge,
      discount: disc,
      final_amount: finalAmt,
      delivery_window: delivery_window || `${delivery_time_minutes} mins`,
      items: items || [],
      status: "pending",
      created_at: quote.created_at || new Date().toISOString(),
      chemist: chemistInfo || { pharmacy_name: "Verified Pharmacy" }
    };

    // 6. REAL-TIME PUSH: Emit SSE event to patient's active stream (<10ms latency, 0 DB poll)
    try {
      broadcastEmitter.emit(`quote:${broadcast_id}`, enrichedQuote);
    } catch (emitterErr) {
      console.warn("Could not emit real-time SSE quote event:", emitterErr?.message);
    }

    // 7. REAL-TIME PUSH: Dispatch FCM push notification to patient
    if (broadcast.patient_id) {
      sendPushAndInAppNotification({
        user_id: broadcast.patient_id,
        title: "New Pharmacy Offer Received 💊",
        message: `${chemistInfo?.pharmacy_name || "A pharmacy"} quoted ₹${finalAmt} with ${delivery_time_minutes} min delivery.`,
        type: "pharmacy_quote_received",
        metadata: {
          broadcast_id,
          quote_id: quote.id,
          final_amount: String(finalAmt)
        }
      }).catch(err => console.warn("FCM quote notification failed:", err.message));
    }

    return success("Quote submitted successfully and broadcast in real time", enrichedQuote, 201, { headers: corsHeaders });
  } catch (err) {
    console.error("Error submitting quote:", err);
    return failure("Failed to submit quote", err.message, 500, { headers: corsHeaders });
  }
}
