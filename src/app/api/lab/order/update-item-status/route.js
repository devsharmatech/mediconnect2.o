import { supabase } from "@/lib/supabaseAdmin";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { item_id, status, price, notes } = await req.json();

    if (!item_id)
      return new Response(JSON.stringify({ status: false, message: "Missing item_id" }), {
        headers: corsHeaders,
      });

    // Build a dynamic payload – only update fields that were passed
    const updatePayload = {};
    if (status !== undefined) updatePayload.status = status;
    if (price !== undefined) updatePayload.price = parseFloat(price);
    if (notes !== undefined) updatePayload.notes = notes;

    if (Object.keys(updatePayload).length === 0) {
      return new Response(
        JSON.stringify({ status: false, message: "Nothing to update" }),
        { headers: corsHeaders }
      );
    }

    const { error } = await supabase
      .from("lab_test_order_items")
      .update(updatePayload)
      .eq("id", item_id);

    if (error) throw error;

    return new Response(
      JSON.stringify({ status: true, message: "Item updated successfully" }),
      { headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ status: false, message: err.message }),
      { headers: corsHeaders }
    );
  }
}
