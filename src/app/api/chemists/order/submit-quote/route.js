import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { broadcast_id, chemist_id, estimated_cost, delivery_time_minutes } = await req.json();

    if (!broadcast_id || !chemist_id || estimated_cost === undefined || !delivery_time_minutes) {
      return failure("Missing required fields: broadcast_id, chemist_id, estimated_cost, delivery_time_minutes", null, 400, { headers: corsHeaders });
    }

    // 1. Check if broadcast exists and is still active
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

    // 2. Check if this chemist already submitted a quote
    const { data: existingQuote } = await supabase
      .from("medicine_order_quotes")
      .select("id")
      .eq("broadcast_id", broadcast_id)
      .eq("chemist_id", chemist_id)
      .maybeSingle();

    if (existingQuote) {
      return failure("You have already submitted a quote for this request", null, 409, { headers: corsHeaders });
    }

    // 3. Create the quote
    const { data: quote, error: quoteErr } = await supabase
      .from("medicine_order_quotes")
      .insert([
        {
          broadcast_id,
          chemist_id,
          estimated_cost: parseFloat(estimated_cost),
          delivery_time_minutes: parseInt(delivery_time_minutes, 10),
          status: "pending",
        },
      ])
      .select()
      .single();

    if (quoteErr) throw quoteErr;

    // Check if we hit 3 quotes now, and update status if so
    const { data: allQuotes } = await supabase
      .from("medicine_order_quotes")
      .select("id")
      .eq("broadcast_id", broadcast_id);

    if (allQuotes && allQuotes.length >= 3) {
      await supabase
        .from("medicine_order_broadcasts")
        .update({ status: "completed" })
        .eq("id", broadcast_id);
    }

    return success("Quote submitted successfully", quote, 201, { headers: corsHeaders });
  } catch (err) {
    console.error("Error submitting quote:", err);
    return failure("Failed to submit quote", err.message, 500, { headers: corsHeaders });
  }
}
