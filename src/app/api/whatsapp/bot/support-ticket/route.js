/**
 * POST /api/whatsapp/bot/support-ticket
 * Saves a customer support message from WhatsApp to the database.
 * Staff can see and respond to these from the admin dashboard.
 */
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { supabase } from "@/lib/supabaseAdmin";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders() });
}

export async function POST(req) {
  try {
    const { phone, message, name } = await req.json();

    if (!phone || !message) {
      return failure("phone and message are required.", null, 400);
    }

    const { data, error } = await supabase
      .from("whatsapp_support_tickets")
      .insert({
        phone,
        name: name || null,
        message,
        status: "open",
      })
      .select()
      .single();

    if (error) throw error;

    return success("Support ticket created. Our team will respond shortly.", { ticket_id: data.id }, 201);
  } catch (err) {
    console.error("[WA BOT] support-ticket error:", err.message);
    return failure("Failed to create support ticket.", err.message, 500);
  }
}

/**
 * GET /api/whatsapp/bot/support-ticket
 * Lists all open support tickets for the staff admin dashboard.
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "open";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from("whatsapp_support_tickets")
      .select("*", { count: "exact" })
      .eq("status", status)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return success("Support tickets fetched.", { tickets: data, total: count, page, limit }, 200);
  } catch (err) {
    console.error("[WA BOT] support-ticket GET error:", err.message);
    return failure("Failed to fetch support tickets.", err.message, 500);
  }
}

/**
 * PATCH /api/whatsapp/bot/support-ticket
 * Updates a ticket status (e.g., open → resolved) and saves staff reply.
 */
export async function PATCH(req) {
  try {
    const { ticket_id, status, staff_reply } = await req.json();

    if (!ticket_id) {
      return failure("ticket_id is required.", null, 400);
    }

    const updatePayload = {};
    if (status) updatePayload.status = status;
    if (staff_reply) updatePayload.staff_reply = staff_reply;
    updatePayload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("whatsapp_support_tickets")
      .update(updatePayload)
      .eq("id", ticket_id)
      .select()
      .single();

    if (error) throw error;

    return success("Ticket updated.", data, 200);
  } catch (err) {
    console.error("[WA BOT] support-ticket PATCH error:", err.message);
    return failure("Failed to update support ticket.", err.message, 500);
  }
}
