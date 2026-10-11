import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { executeOrchestration } from "@/lib/layer1/controlLayer";
import { randomUUID } from "crypto";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { new_date, new_time, new_type, user_id, payment_id, razorpay_order_id } = body;

    if (!id || !new_date || !new_time) {
      return failure("appointment id, new_date, and new_time are required.", null, 400, { headers: corsHeaders });
    }

    // Resolve user/actor ID if not directly provided
    let actorId = user_id;
    if (!actorId) {
      const appts = await sql`
        SELECT patient_id, doctor_id FROM appointments WHERE id = ${id} LIMIT 1
      `;
      if (appts.length > 0) {
        actorId = appts[0].patient_id || appts[0].doctor_id;
      }
    }

    if (!actorId) {
      return failure("Appointment not found or actor could not be resolved.", null, 404, { headers: corsHeaders });
    }

    // Route via Control Layer Orchestration (AWS RDS PostgreSQL)
    const orchestrationResult = await executeOrchestration({
      idempotencyKey: `reschedule-${id}-${new_date}-${new_time}-${randomUUID()}`,
      actionType: "RESCHEDULE_APPOINTMENT",
      actorId,
      actorType: "patient",
      careEpisodeId: null,
      payload: {
        appointment_id: id,
        new_date,
        new_time,
        new_type,
        payment_id,
        razorpay_order_id,
      }
    });

    if (!orchestrationResult.success) {
      const isDuplicate = orchestrationResult.cached || orchestrationResult.isDuplicate;
      if (isDuplicate) {
        return success("Appointment already rescheduled", orchestrationResult.data, 200, { headers: corsHeaders });
      }
      return failure(orchestrationResult.error || "Failed to reschedule appointment", null, orchestrationResult.status || 500, { headers: corsHeaders });
    }

    return success("Appointment rescheduled successfully.", orchestrationResult.data, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Reschedule Appointment API Error:", error);
    return failure("Failed to reschedule appointment.", error.message, 500, { headers: corsHeaders });
  }
}
