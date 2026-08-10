/**
 * POST /api/whatsapp/bot/lab-link
 * Generates a pre-filled lab test checkout link.
 */
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { buildLabLink } from "@/lib/whatsappBot";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders() });
}

export async function POST(req) {
  try {
    const { test_id, phone } = await req.json();

    if (!test_id) {
      return failure("test_id is required.", null, 400);
    }

    const checkout_url = buildLabLink(test_id, phone);

    return success("Lab test link generated.", { checkout_url }, 200);
  } catch (err) {
    console.error("[WA BOT] lab-link error:", err.message);
    return failure("Failed to generate lab test link.", err.message, 500);
  }
}
