/**
 * POST /api/whatsapp/bot/appointment-link
 * Generates a pre-filled doctor appointment checkout link.
 */
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { buildAppointmentLink } from "@/lib/whatsappBot";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders() });
}

export async function POST(req) {
  try {
    const { doctor_id, slot_date, slot_time, phone } = await req.json();

    if (!doctor_id) {
      return failure("doctor_id is required.", null, 400);
    }

    const checkout_url = buildAppointmentLink(doctor_id, slot_date, slot_time, phone);

    return success("Appointment link generated.", { checkout_url }, 200);
  } catch (err) {
    console.error("[WA BOT] appointment-link error:", err.message);
    return failure("Failed to generate appointment link.", err.message, 500);
  }
}
