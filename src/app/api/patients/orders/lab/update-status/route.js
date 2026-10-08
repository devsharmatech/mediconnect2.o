import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { order_id, id, status, lab_notes, cancelled_by } = await req.json();
    const targetId = order_id || id;

    if (!targetId || !status) {
      return failure("order_id & status required", null, 400, {
        headers: corsHeaders,
      });
    }

    const rows = await sql`
      UPDATE lab_test_orders
      SET 
        status = ${status},
        lab_notes = ${lab_notes !== undefined ? lab_notes : sql`lab_notes`},
        cancelled_at = ${status === 'cancelled' ? sql`NOW()` : sql`cancelled_at`},
        updated_at = NOW()
      WHERE id = ${targetId}
      RETURNING *
    `;

    if (rows.length === 0) {
      return failure("Order not found", null, 404, { headers: corsHeaders });
    }

    return success("Lab order status updated", rows[0], 200, {
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("Update lab order status error:", err);
    return failure("Failed to update status", err.message, 500, {
      headers: corsHeaders,
    });
  }
}
