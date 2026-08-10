import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { item_id, status } = await req.json();

    if (!item_id || !status) {
      return failure("item_id & status required", null, 400, { headers: corsHeaders });
    }

    const { data, error } = await supabase
      .from("medicine_order_items")
      .update({ status })
      .eq("id", item_id)
      .select()
      .single();

    if (error) throw error;

    return success("Item updated", data, 200, { headers: corsHeaders });
  } catch (err) {
    return failure("Failed updating item", err.message, 500, { headers: corsHeaders });
  }
}
