import sql from "@/lib/db";
import { corsHeaders } from "@/lib/cors";

const safeUuid = (val) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) ? val : null);

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { item_id, status, price, notes } = await req.json();
    const cleanId = safeUuid(item_id);

    if (!cleanId) {
      return new Response(JSON.stringify({ status: false, message: "Valid item_id required" }), {
        headers: corsHeaders,
        status: 400,
      });
    }

    if (status === undefined && price === undefined && notes === undefined) {
      return new Response(
        JSON.stringify({ status: false, message: "Nothing to update" }),
        { headers: corsHeaders, status: 400 }
      );
    }

    await sql`
      UPDATE lab_test_order_items
      SET
        status = COALESCE(${status ?? null}, status),
        price = COALESCE(${price !== undefined ? Number(price) : null}, price),
        notes = COALESCE(${notes ?? null}, notes)
      WHERE id = ${cleanId}
    `;

    return new Response(
      JSON.stringify({ status: true, message: "Item updated successfully" }),
      { headers: corsHeaders, status: 200 }
    );
  } catch (err) {
    console.error("POST lab order update-item-status error:", err);
    return new Response(
      JSON.stringify({ status: false, message: err.message }),
      { headers: corsHeaders, status: 500 }
    );
  }
}
