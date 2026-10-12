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

    // Verify appointment in AWS RDS
    const [appointment] = await sql`
      SELECT id, doctor_id, patient_id, appointment_date, appointment_time, status
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

    // If mode is 'now', set slot to current time so it's live right now
    // If mode is 'add', set slot to (CURRENT_TIME + addMinutes)
    let updated;
    if (mode === "now" || addMinutes === 0) {
      [updated] = await sql`
        UPDATE appointments
        SET 
          appointment_date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date,
          appointment_time = (TO_CHAR(NOW() AT TIME ZONE 'Asia/Kolkata', 'HH24:MI:00'))::time,
          updated_at = NOW()
        WHERE id = ${appointment_id}
        RETURNING id, doctor_id, patient_id, TO_CHAR(appointment_date, 'YYYY-MM-DD') AS appointment_date, appointment_time::text AS appointment_time, status
      `;
    } else {
      [updated] = await sql`
        UPDATE appointments
        SET 
          appointment_date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date,
          appointment_time = (TO_CHAR((NOW() AT TIME ZONE 'Asia/Kolkata') + (${addMinutes} || ' minutes')::interval, 'HH24:MI:00'))::time,
          updated_at = NOW()
        WHERE id = ${appointment_id}
        RETURNING id, doctor_id, patient_id, TO_CHAR(appointment_date, 'YYYY-MM-DD') AS appointment_date, appointment_time::text AS appointment_time, status
      `;
    }

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
