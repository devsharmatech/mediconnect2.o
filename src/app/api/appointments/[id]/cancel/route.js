import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";
import { corsHeaders } from "@/lib/cors";
import { executeOrchestration } from "@/lib/layer1/controlLayer";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    
    if (!id) {
      return failure("appointment id is required", null, 400, { headers: corsHeaders });
    }

    const body = await req.json().catch(() => ({}));
    let actorId = body.user_id || body.actorId;

    if (!actorId) {
      const { data: appt } = await supabase
        .from("appointments")
        .select("patient_id, doctor_id")
        .eq("id", id)
        .maybeSingle();

      actorId = appt?.patient_id || appt?.doctor_id;
    }

    if (!actorId) {
      return failure("Appointment not found or unable to resolve actor.", null, 404, { headers: corsHeaders });
    }

    const orchestrationResult = await executeOrchestration({
      idempotencyKey: `cancel-${id}-${randomUUID()}`,
      actionType: "CANCEL_APPOINTMENT",
      actorId,
      actorType: "patient",
      careEpisodeId: null,
      payload: { appointment_id: id }
    });

    if (!orchestrationResult.success) {
      const isDuplicate = orchestrationResult.cached || orchestrationResult.isDuplicate;
      if (isDuplicate) {
        return success("Appointment already cancelled", orchestrationResult.data, 200, { headers: corsHeaders });
      }
      return failure(orchestrationResult.error || "Failed to cancel appointment", null, orchestrationResult.status || 500, { headers: corsHeaders });
    }

    return success("Appointment cancelled successfully", orchestrationResult.data, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Cancel Appointment API Error:", error);
    return failure("Internal Server Error", error.message, 500, { headers: corsHeaders });
  }
}

