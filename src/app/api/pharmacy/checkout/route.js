import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { user_id, cart, total_amount, payment_method } = body;

    if (!user_id || !cart || !total_amount) {
      return failure("Missing required checkout fields", null, 400, { headers: corsHeaders });
    }

    // Mocking a successful checkout
    const orderId = 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase();

    return success("Checkout successful.", { orderId, status: 'Processing' }, 200, { headers: corsHeaders });
  } catch (error) {
    return failure("Unexpected server error", error.message, 500, { headers: corsHeaders });
  }
}
