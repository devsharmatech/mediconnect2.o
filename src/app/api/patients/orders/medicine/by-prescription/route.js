import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { prescription_id, patient_id } = await req.json();

    if (!prescription_id || !patient_id) {
      return failure("prescription_id & patient_id are required", null, 400, { headers: corsHeaders });
    }

    const orders = await sql`
      SELECT mo.*
      FROM medicine_orders mo
      WHERE mo.prescription_id = ${prescription_id} AND mo.patient_id = ${patient_id}
      ORDER BY mo.created_at DESC
    `;

    // Fetch items for returned orders
    const orderIds = orders.map((o) => o.id);
    let itemsByOrder = {};
    if (orderIds.length > 0) {
      const items = await sql`
        SELECT * FROM medicine_order_items
        WHERE order_id = ANY(${orderIds})
        ORDER BY created_at ASC
      `;
      items.forEach((item) => {
        if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
        itemsByOrder[item.order_id].push(item);
      });
    }

    const result = orders.map((o) => ({
      ...o,
      medicine_order_items: itemsByOrder[o.id] || [],
    }));

    return success("Medicine orders fetched successfully", result, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("Fetch medicine orders error:", err);
    return failure("Failed to fetch medicine orders.", err.message, 500, { headers: corsHeaders });
  }
}
