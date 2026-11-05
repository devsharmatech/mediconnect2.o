import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/**
 * POST /api/appointment/extend
 * Extends or reactivates an expired appointment slot for a doctor.
 * Body: { appointment_id, doctor_id, minutes = 15, mode = "now" }
 */
export async function POST(req) {
  try {
    let body = {};
    try {
      const text = await req.text();
      if (text && text.trim().length > 0) {
        body = JSON.parse(text);
      }
    } catch {
      body = {};
    }

    const url = new URL(req.url);
    const appointment_id = body.appointment_id || url.searchParams.get("appointment_id");
    const doctor_id = body.doctor_id || url.searchParams.get("doctor_id");
    const minutes = body.minutes || url.searchParams.get("minutes") || 15;
    const mode = body.mode || url.searchParams.get("mode") || "now";

    if (!appointment_id) {
      return failure("appointment_id is required.", null, 400, { headers: corsHeaders });
    }

    // Ensure columns exist (self-healing migration)
    try {
      await sql`
        ALTER TABLE appointments 
        ADD COLUMN IF NOT EXISTS original_appointment_time TIME,
        ADD COLUMN IF NOT EXISTS extended_until TIMESTAMPTZ;
      `;
    } catch (migErr) {
      console.warn("Migration warning in /api/appointment/extend:", migErr.message);
    }

    // Verify appointment in AWS RDS
    const [appointment] = await sql`
      SELECT id, doctor_id, patient_id, appointment_date, appointment_time, original_appointment_time, status, appointment_type
      FROM appointments
      WHERE id = ${appointment_id}
      LIMIT 1
    `;

    if (!appointment) {
      return failure("Appointment not found.", null, 404, { headers: corsHeaders });
    }

    if (doctor_id && String(appointment.doctor_id) !== String(doctor_id)) {
      return failure("Unauthorized: Doctor does not match appointment.", null, 403, { headers: corsHeaders });
    }

    const addMinutes = Math.max(0, parseInt(minutes, 10) || 15);
    const durationMinutes = addMinutes > 0 ? addMinutes : 30;

    // Preserve original booked slot time and extend slot window via extended_until
    const [updated] = await sql`
      UPDATE appointments
      SET 
        original_appointment_time = COALESCE(original_appointment_time, appointment_time),
        extended_until = (NOW() AT TIME ZONE 'Asia/Kolkata') + (${durationMinutes} || ' minutes')::interval,
        status = CASE WHEN status = 'expired' THEN 'approved' ELSE status END,
        updated_at = NOW()
      WHERE id = ${appointment_id}
      RETURNING 
        id, 
        doctor_id, 
        patient_id, 
        TO_CHAR(appointment_date, 'YYYY-MM-DD') AS appointment_date, 
        COALESCE(original_appointment_time, appointment_time)::text AS appointment_time,
        original_appointment_time::text AS original_appointment_time,
        extended_until,
        status,
        appointment_type
    `;

    return success(
      "Appointment time extended successfully.",
      { appointment: updated, extended_minutes: addMinutes, mode },
      200,
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("POST /api/appointment/extend error:", error);
    return failure("Failed to extend appointment time.", error.message, 500, { headers: corsHeaders });
  }
}
