import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { item_id, status, price, quantity } = await req.json();

    if (!item_id || !status) {
      return failure("item_id and status required", null, 400, { headers: corsHeaders });
    }

    if (price !== undefined && price < 0) {
      return failure("Invalid price", null, 422, { headers: corsHeaders });
    }

    // 1️⃣ Update item
    const { data: item, error } = await supabase
      .from("medicine_order_items")
      .update({ status, price, quantity })
      .eq("id", item_id)
      .select("order_id")
      .single();

    if (error) throw error;

    // 2️⃣ Recalculate order total (all items except rejected ones)
    const { data: items } = await supabase
      .from("medicine_order_items")
      .select("price, quantity")
      .eq("order_id", item.order_id)
      .neq("status", "rejected");

    const totalAmount = (items || []).reduce(
      (sum, i) => sum + (Number(i.price || 0) * Number(i.quantity || 1)),
      0
    );

    // 3️⃣ Update order total
    await supabase
      .from("medicine_orders")
      .update({
        total_amount: totalAmount,
        updated_at: new Date()
      })
      .eq("id", item.order_id);

    return success("Item updated & order recalculated", {
      order_id: item.order_id,
      total_amount: totalAmount
    }, 200, { headers: corsHeaders });

  } catch (err) {
    return failure("Error updating item", err.message, 500, { headers: corsHeaders });
  }
}
