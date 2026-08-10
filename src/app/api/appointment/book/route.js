import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { executeOrchestration } from "@/lib/layer1/controlLayer";
import { randomUUID } from "crypto";
import { resolveCallerFromRequest } from "@/lib/layer1/authGuard";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      doctor_id,
      patient_id,
      screening_id,
      appointment_date,
      appointment_time,
      disease_info,
      appointment_type,
      payment_id,
      razorpay_order_id,
      consents,
      care_episode_id,
      idempotency_key,
      attempt_id,
      clinic_name,
      clinic_address,
    } = body || {};

    // 1. Basic Validation
    if (!doctor_id || !patient_id || !appointment_date || !appointment_time) {
      return failure("doctor_id, patient_id, appointment_date, and appointment_time are required.", null, 400, { headers: corsHeaders });
    }

    let caller = await resolveCallerFromRequest(req);
    if (!caller && patient_id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(patient_id)) {
        const { supabase } = await import("@/lib/supabaseAdmin");
        const { data: fallbackUser } = await supabase
          .from("users")
          .select("id, role")
          .eq("id", patient_id)
          .maybeSingle();
        if (fallbackUser) caller = fallbackUser;
      }
    }

    if (!caller) {
      return failure("Unauthorized - missing or invalid token.", null, 401, { headers: corsHeaders });
    }
    if (caller.id !== patient_id && caller.role !== "admin") {
      return failure("Forbidden - you do not have permission to book this appointment.", null, 403, { headers: corsHeaders });
    }

    if (!consents || !consents.data_sharing || !consents.teleconsultation) {
      return failure("Mandatory consents (Data Sharing & Teleconsultation) are required under DPDP Act 2023.", null, 422, { headers: corsHeaders });
    }

    console.log("[SERVER-SIDE API BOOKING] Received request body:", JSON.stringify(body, null, 2));

    // Generate idempotency key if not provided (for older clients)
    const idempotencyKey = idempotency_key || `book-${patient_id}-${doctor_id}-${appointment_date}-${appointment_time}-${randomUUID()}`;

    // 2. Dispatch to Orchestration Engine (Control Layer)
    console.log("[SERVER-SIDE API BOOKING] Dispatching to control layer with idempotencyKey:", idempotencyKey);
    const orchestrationResult = await executeOrchestration({
      idempotencyKey,
      actionType: "BOOK_APPOINTMENT",
      actorId: patient_id,
      actorType: "patient",
      careEpisodeId: care_episode_id || null, // Optional at this stage, will be auto-created if null
      payload: {
        doctor_id,
        patient_id,
        screening_id,
        appointment_date,
        appointment_time,
        disease_info,
        appointment_type,
        payment_id,
        razorpay_order_id,
        consents,
        clinic_name,
        clinic_address,
      }
    });

    if (!orchestrationResult.success) {
      console.warn("[SERVER-SIDE API BOOKING] Orchestration failed:", orchestrationResult);
      const isDuplicate = orchestrationResult.cached || orchestrationResult.isDuplicate;
      if (isDuplicate) {
        console.log("[SERVER-SIDE API BOOKING] Returning idempotent cached success response.");
        return success("Appointment already booked (Idempotent response)", orchestrationResult.data, 200, { headers: corsHeaders });
      }
      return failure(orchestrationResult.error || "Failed to book appointment", null, orchestrationResult.status || 500, { headers: corsHeaders });
    }

    // 3. Update attempt status if attempt_id is provided
    if (attempt_id) {
      const { supabase } = await import("@/lib/supabaseClient");
      await supabase
        .from("booking_attempts")
        .update({ status: "completed" })
        .eq("id", attempt_id);
    }

    // 4. Return successfully orchestrated data
    console.log("[SERVER-SIDE API BOOKING] Orchestration succeeded. Returning data:", JSON.stringify(orchestrationResult.data, null, 2));
    return success("Appointment booked successfully.", orchestrationResult.data, 201, { headers: corsHeaders });

  } catch (error) {
    console.error("[SERVER-SIDE API BOOKING] Unhandled catch block error:", error);
    return failure("Failed to book appointment.", error.message, 500, { headers: corsHeaders });
  }
}
