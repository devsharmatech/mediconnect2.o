import { success, failure } from "@/lib/response";
import sql from "@/lib/db";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get('user_id');

    if (!user_id) {
      return failure("Missing user_id", null, 400);
    }

    if (!UUID_REGEX.test(user_id)) {
      return success("Orders fetched successfully", [], 200);
    }

    const dbOrders = await sql`
      SELECT * FROM medicine_orders
      WHERE patient_id = ${user_id}
      ORDER BY created_at DESC
    `;

    const formattedOrders = (dbOrders || []).map(o => ({
      id: o.id,
      date: new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: o.status || 'Pending',
      items: 'Medicine Order',
      price: `₹${o.total_amount || 0}`,
      itemCount: 1
    }));

    return success("Orders fetched successfully", formattedOrders, 200);
  } catch (error) {
    console.error("Pharmacy Orders Fetch Error:", error);
    return failure("Internal Server Error", error.message, 500);
  }
}
