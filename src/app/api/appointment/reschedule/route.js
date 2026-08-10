import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { executeOrchestration } from "@/lib/layer1/controlLayer";
import { randomUUID } from "crypto";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { appointment_id, new_date, new_time, user_id } = await req.json();

    if (!appointment_id || !new_date || !new_time || !user_id) {
      return failure("appointment_id, new_date, new_time, and user_id are required.", null, 400, { headers: corsHeaders });
    }

    // Route via orchestration engine
    const orchestrationResult = await executeOrchestration({
      idempotencyKey: `reschedule-${appointment_id}-${new_date}-${new_time}-${randomUUID()}`,
      actionType: "RESCHEDULE_APPOINTMENT",
      actorId: user_id,
      actorType: "patient", // or doctor, depending on context. The router handles both permissions via DB check
      careEpisodeId: null,
      payload: { appointment_id, new_date, new_time }
    });

    if (!orchestrationResult.success) {
      const isDuplicate = orchestrationResult.cached || orchestrationResult.isDuplicate;
      if (isDuplicate) {
        return success("Appointment already rescheduled (Idempotent response)", orchestrationResult.data, 200, { headers: corsHeaders });
      }
      return failure(orchestrationResult.error || "Failed to reschedule appointment", null, orchestrationResult.status || 500, { headers: corsHeaders });
    }

    return success("Appointment rescheduled successfully.", orchestrationResult.data, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("POST /api/appointment/reschedule error:", error);
    return failure("Failed to reschedule appointment.", error.message, 500, { headers: corsHeaders });
  }
}
