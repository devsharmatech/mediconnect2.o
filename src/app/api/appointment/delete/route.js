import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { executeOrchestration } from "@/lib/layer1/controlLayer";
import { randomUUID } from "crypto";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { appointment_id, user_id } = await req.json();
    if (!appointment_id || !user_id)
      return failure("appointment_id and user_id are required.", null, 400, { headers: corsHeaders });

    // Route via orchestration engine
    const orchestrationResult = await executeOrchestration({
      idempotencyKey: `cancel-${appointment_id}-${randomUUID()}`,
      actionType: "CANCEL_APPOINTMENT",
      actorId: user_id,
      actorType: "patient", // The router will do the actual permission checks against the DB
      careEpisodeId: null,
      payload: { appointment_id }
    });

    if (!orchestrationResult.success) {
      const isDuplicate = orchestrationResult.cached || orchestrationResult.isDuplicate;
      if (isDuplicate) {
        return success("Appointment already cancelled (Idempotent response)", orchestrationResult.data, 200, { headers: corsHeaders });
      }
      return failure(orchestrationResult.error || "Failed to cancel appointment", null, orchestrationResult.status || 500, { headers: corsHeaders });
    }

    return success("Appointment deleted successfully.", null, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("POST /api/appointment/delete error:", error);
    return failure("Failed to delete appointment.", error.message, 500, { headers: corsHeaders });
  }
}
