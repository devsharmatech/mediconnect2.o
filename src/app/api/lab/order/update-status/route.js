import sql from "@/lib/db";
import { corsHeaders } from "@/lib/cors";

const safeUuid = (val) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) ? val : null);

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { order_id, status, payment_status } = await req.json();
    const cleanId = safeUuid(order_id);

    if (!cleanId) {
      return new Response(JSON.stringify({ status: false, message: "Valid order_id required" }), {
        headers: corsHeaders,
        status: 400,
      });
    }

    if (!status && !payment_status) {
      return new Response(JSON.stringify({ status: false, message: "No fields provided to update" }), {
        headers: corsHeaders,
        status: 400,
      });
    }

    await sql`
      UPDATE lab_test_orders
      SET
        status = COALESCE(${status ?? null}, status),
        payment_status = COALESCE(${payment_status ?? null}, payment_status),
        updated_at = NOW()
      WHERE id = ${cleanId}
    `;

    return new Response(
      JSON.stringify({ status: true, message: "Order updated successfully" }),
      { headers: corsHeaders, status: 200 }
    );
  } catch (err) {
    console.error("POST lab order update-status error:", err);
    return new Response(JSON.stringify({ status: false, message: err.message }), {
      headers: corsHeaders,
      status: 500,
    });
  }
}
