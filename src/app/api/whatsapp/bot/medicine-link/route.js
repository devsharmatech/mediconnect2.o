/**
 * POST /api/whatsapp/bot/medicine-link
 * Generates a pre-filled medicine order link, optionally with a prescription upload URL.
 */
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { buildMedicineLink } from "@/lib/whatsappBot";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders() });
}

export async function POST(req) {
  try {
    const { phone, medicine_name } = await req.json();

    const params = new URLSearchParams();
    if (phone) params.set("phone", phone.replace(/\D/g, ""));
    if (medicine_name) params.set("q", medicine_name);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mediconnect.fit";
    const checkout_url = `${appUrl}/website/medicine-order?${params.toString()}`;

    return success("Medicine order link generated.", { checkout_url }, 200);
  } catch (err) {
    console.error("[WA BOT] medicine-link error:", err.message);
    return failure("Failed to generate medicine link.", err.message, 500);
  }
}
