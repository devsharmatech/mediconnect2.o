import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { executeOrchestration } from "@/lib/layer1/controlLayer";
import { randomUUID } from "crypto";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { appointment_id, status, doctor_id } = await req.json();
    if (!appointment_id || !status || !doctor_id)
      return failure("appointment_id, status, and doctor_id required.", null, 400, { headers: corsHeaders });

    if (!["approved", "rejected"].includes(status))
      return failure("Invalid status. Must be approved or rejected.", null, 400, { headers: corsHeaders });

    // Route via orchestration engine
    const orchestrationResult = await executeOrchestration({
      idempotencyKey: `status-${appointment_id}-${status}-${randomUUID()}`,
      actionType: "UPDATE_APPOINTMENT_STATUS",
      actorId: doctor_id,
      actorType: "doctor",
      careEpisodeId: null, // Will map internally if needed
      payload: { appointment_id, status }
    });

    if (!orchestrationResult.success) {
      const isDuplicate = orchestrationResult.cached || orchestrationResult.isDuplicate;
      if (isDuplicate) {
        return success("Appointment status already updated (Idempotent response)", orchestrationResult.data, 200, { headers: corsHeaders });
      }
      return failure(orchestrationResult.error || "Failed to update appointment status", null, orchestrationResult.status || 500, { headers: corsHeaders });
    }

    return success(`Appointment ${status} successfully.`, orchestrationResult.data, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("POST /api/appointment/status error:", error);
    return failure("Failed to update appointment status.", error.message, 500, { headers: corsHeaders });
  }
}
