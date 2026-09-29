import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { order_id, status, chemist_id } = await req.json();

    if (!order_id || !status) {
      return failure("order_id & status required", null, 400, { headers: corsHeaders });
    }

    // Build WHERE clause — optionally scope to chemist for safety
    let updated;
    if (chemist_id) {
      updated = await sql`
        UPDATE medicine_orders
        SET status = ${status}, updated_at = NOW()
        WHERE id = ${order_id} AND chemist_id = ${chemist_id}
        RETURNING *
      `;
    } else {
      updated = await sql`
        UPDATE medicine_orders
        SET status = ${status}, updated_at = NOW()
        WHERE id = ${order_id}
        RETURNING *
      `;
    }

    const data = updated[0];
    if (!data) {
      return failure("Order not found or unauthorized", null, 404, { headers: corsHeaders });
    }

    return success("Order status updated", data, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("Update order status error:", err);
    return failure("Failed updating status", err.message, 500, { headers: corsHeaders });
  }
}
