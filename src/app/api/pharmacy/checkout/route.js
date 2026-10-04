import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import sql from "@/lib/db";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function safeUuid(val) {
  if (!val || typeof val !== "string") return null;
  return UUID_REGEX.test(val.trim()) ? val.trim() : null;
}

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { user_id, cart, total_amount, payment_method, address } = body;

    if (!user_id || !cart || (Array.isArray(cart) && cart.length === 0)) {
      return failure("Missing required checkout fields", null, 400, { headers: corsHeaders });
    }

    const patientUuid = safeUuid(user_id);

    // Save order directly into AWS RDS PostgreSQL
    const [order] = await sql`
      INSERT INTO pharmacy_orders (
        patient_id, status, delivery_address, created_at, updated_at
      )
      VALUES (
        ${patientUuid}, 'CONFIRMED', ${address || 'Standard Delivery'}, NOW(), NOW()
      )
      RETURNING id, status, created_at
    `;

    if (order && Array.isArray(cart)) {
      for (const item of cart) {
        const itemUuid = safeUuid(item.id || item.medicine_id);
        const qty = Number(item.quantity || item.qty || 1);
        const dosage = item.dosage || item.strength || '';
        await sql`
          INSERT INTO pharmacy_order_items (order_id, medicine_id, quantity, dosage, created_at)
          VALUES (${order.id}, ${itemUuid}, ${qty}, ${dosage}, NOW())
        `;
      }
    }

    return success("Checkout successful and recorded in AWS RDS", { 
      orderId: order?.id, 
      status: 'CONFIRMED',
      total_amount: Number(total_amount) || 0
    }, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Pharmacy Checkout Error:", error);
    return failure("Unexpected server error", error.message, 500, { headers: corsHeaders });
  }
}
