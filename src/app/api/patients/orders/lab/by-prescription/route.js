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
      return failure("prescription_id & patient_id are required", null, 400, {
        headers: corsHeaders,
      });
    }

    const orders = await sql`
      SELECT 
        lto.*,
        ld.lab_name,
        ld.address as lab_address
      FROM lab_test_orders lto
      LEFT JOIN lab_details ld ON ld.id = lto.lab_id
      WHERE lto.prescription_id = ${prescription_id} 
        AND lto.patient_id = ${patient_id}
      ORDER BY lto.created_at DESC
    `;

    const orderIds = orders.map((o) => o.id);
    let itemsByOrder = {};

    if (orderIds.length > 0) {
      const items = await sql`
        SELECT * FROM lab_test_order_items
        WHERE order_id = ANY(${orderIds})
        ORDER BY unid ASC
      `;
      items.forEach((item) => {
        if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
        itemsByOrder[item.order_id].push(item);
      });
    }

    const result = orders.map((o) => ({
      ...o,
      lab_test_order_items: itemsByOrder[o.id] || [],
    }));

    return success("Lab orders fetched successfully", result, 200, {
      headers: corsHeaders,
    });

  } catch (err) {
    console.error("Fetch lab orders error:", err);
    return failure("Failed to fetch lab orders.", err.message, 500, {
      headers: corsHeaders,
    });
  }
}
