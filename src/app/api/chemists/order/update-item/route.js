import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req) {
  try {
    const { item_id, status, price, quantity } = await req.json();

    if (!item_id || !status || !UUID_REGEX.test(item_id)) {
      return failure("valid item_id and status required", null, 400, { headers: corsHeaders });
    }

    if (price !== undefined && price < 0) {
      return failure("Invalid price", null, 422, { headers: corsHeaders });
    }

    // 1️⃣ Update item
    const [item] = await sql`
      UPDATE medicine_order_items
      SET 
        status = ${status},
        price = COALESCE(${price !== undefined ? price : null}, price),
        quantity = COALESCE(${quantity !== undefined ? quantity : null}, quantity)
      WHERE id = ${item_id}
      RETURNING order_id
    `;

    if (!item) return failure("Order item not found", null, 404, { headers: corsHeaders });

    // 2️⃣ Recalculate order total
    const items = await sql`
      SELECT price, quantity
      FROM medicine_order_items
      WHERE order_id = ${item.order_id} AND status != 'rejected'
    `;

    const totalAmount = (items || []).reduce(
      (sum, i) => sum + (Number(i.price || 0) * Number(i.quantity || 1)),
      0
    );

    // 3️⃣ Update order total
    await sql`
      UPDATE medicine_orders
      SET total_amount = ${totalAmount}, updated_at = NOW()
      WHERE id = ${item.order_id}
    `;

    return success("Item updated & order recalculated", {
      order_id: item.order_id,
      total_amount: totalAmount
    }, 200, { headers: corsHeaders });

  } catch (err) {
    console.error("Update item error:", err);
    return failure("Error updating item", err.message, 500, { headers: corsHeaders });
  }
}
